import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/db';
import { recordAnalyticsEvent } from '@/lib/analyticsEvents';
import { getClientIpFromRequest } from '@/lib/clientIp';
import { getWeatherDefaults } from '@/lib/weatherDefaults';

export const dynamic = 'force-dynamic';

const BAIDU_WEATHER_ENDPOINT = 'https://api.map.baidu.com/weather/v1/';
const DISTRICT_ID_PATTERN = /^\d{6,12}$/;
const LOCATION_PATTERN = /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/;
const ALLOWED_COORD_TYPES = new Set(['wgs84', 'bd09ll', 'bd09mc', 'gcj02']);

const CACHE_TTL_MINUTES = Math.min(
  Math.max(Number(process.env.WEATHER_CACHE_TTL_MINUTES || 30), 1),
  1440
);

let ensureTablePromise: Promise<void> | null = null;
let districtRowsCache: WeatherDistrictRow[] | null = null;
let districtRowsLoadedAt = 0;
const DISTRICT_ROWS_CACHE_MS = 5 * 60 * 1000;

type WeatherPayload = {
  status?: number;
  message?: string;
  result?: unknown;
};

type WeatherDistrictRow = {
  district_id: string;
  province: string;
  city: string;
  district: string;
};

function normalizeText(value: string | null, maxLength: number): string {
  if (!value) return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function normalizeLocation(value: string | null): string {
  if (!value) return '';
  return value.trim().replace(/\s+/g, '');
}

function normalizeCoordType(value: string | null): string {
  const normalized = normalizeText(value, 16).toLowerCase();
  return ALLOWED_COORD_TYPES.has(normalized) ? normalized : 'wgs84';
}

function isForceRefresh(value: string | null): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'y'].includes(value.toLowerCase());
}

function shouldTrackAnalytics(value: string | null): boolean {
  if (!value) return true;
  return !['0', 'false', 'no', 'n', 'off'].includes(value.toLowerCase());
}

function buildCacheKey(fingerprint: string): string {
  return createHash('sha1').update(fingerprint).digest('hex');
}

async function ensureWeatherCacheTable(): Promise<void> {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS weather_districts (
          district_id VARCHAR(12) PRIMARY KEY,
          province VARCHAR(32) NOT NULL,
          city VARCHAR(32) NOT NULL,
          city_geocode VARCHAR(12) NOT NULL,
          district VARCHAR(32) NOT NULL,
          district_geocode VARCHAR(12) NOT NULL,
          lon DOUBLE PRECISION,
          lat DOUBLE PRECISION,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_weather_districts_province
        ON weather_districts(province)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_weather_districts_city
        ON weather_districts(city)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_weather_districts_district
        ON weather_districts(district)
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS weather_cache (
          cache_key VARCHAR(40) PRIMARY KEY,
          cache_fingerprint TEXT NOT NULL,
          payload JSONB NOT NULL,
          fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_weather_cache_expires_at
        ON weather_cache(expires_at)
      `);
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }
  await ensureTablePromise;
}

function normalizeRegionName(value: string): string {
  let next = value.trim().replace(/\s+/g, '');
  const suffixes = [
    '特别行政区',
    '维吾尔自治区',
    '壮族自治区',
    '回族自治区',
    '自治区',
    '自治州',
    '自治县',
    '地区',
    '盟',
    '省',
    '市',
    '区',
    '县',
    '旗',
  ];

  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of suffixes) {
      if (next.endsWith(suffix) && next.length > suffix.length) {
        next = next.slice(0, -suffix.length);
        changed = true;
      }
    }
  }
  return next;
}

async function getDistrictRows(): Promise<WeatherDistrictRow[]> {
  await ensureWeatherCacheTable();
  const now = Date.now();
  if (districtRowsCache && now - districtRowsLoadedAt < DISTRICT_ROWS_CACHE_MS) {
    return districtRowsCache;
  }

  const { rows } = await pool.query<WeatherDistrictRow>(
    `SELECT district_id, province, city, district FROM weather_districts`
  );
  districtRowsCache = rows;
  districtRowsLoadedAt = now;
  return rows;
}

async function resolveDistrictIdFromTable(
  province: string,
  city: string,
  district: string
): Promise<string | null> {
  const rows = await getDistrictRows();
  if (!rows.length) return null;

  const districtNorm = normalizeRegionName(district);
  if (!districtNorm) return null;

  const cityNorm = city ? normalizeRegionName(city) : '';
  const provinceNorm = province ? normalizeRegionName(province) : '';

  let best: { id: string; score: number } | null = null;

  for (const row of rows) {
    const rowDistrictNorm = normalizeRegionName(row.district);
    const rowCityNorm = normalizeRegionName(row.city);
    const rowProvinceNorm = normalizeRegionName(row.province);

    if (rowDistrictNorm !== districtNorm && row.district !== district) {
      continue;
    }
    if (cityNorm && rowCityNorm !== cityNorm && row.city !== city) {
      continue;
    }
    if (provinceNorm && rowProvinceNorm !== provinceNorm && row.province !== province) {
      continue;
    }

    let score = row.district === district ? 10 : 7;
    if (cityNorm) score += row.city === city ? 6 : 3;
    if (provinceNorm) score += row.province === province ? 4 : 2;

    if (!best || score > best.score) {
      best = { id: row.district_id, score };
    }
  }

  return best?.id || null;
}

async function getWeatherCache(cacheKey: string): Promise<WeatherPayload | null> {
  await ensureWeatherCacheTable();
  const { rows } = await pool.query<{ payload: WeatherPayload }>(
    `SELECT payload
     FROM weather_cache
     WHERE cache_key = $1
       AND expires_at > NOW()
     LIMIT 1`,
    [cacheKey]
  );
  return rows[0]?.payload ?? null;
}

async function saveWeatherCache(cacheKey: string, fingerprint: string, payload: WeatherPayload): Promise<void> {
  await ensureWeatherCacheTable();
  await pool.query(
    `INSERT INTO weather_cache (cache_key, cache_fingerprint, payload, fetched_at, expires_at)
     VALUES ($1, $2, $3::jsonb, NOW(), NOW() + make_interval(mins => $4))
     ON CONFLICT (cache_key) DO UPDATE SET
       cache_fingerprint = EXCLUDED.cache_fingerprint,
       payload = EXCLUDED.payload,
       fetched_at = EXCLUDED.fetched_at,
       expires_at = EXCLUDED.expires_at`,
    [cacheKey, fingerprint, JSON.stringify(payload), CACHE_TTL_MINUTES]
  );
}

export async function GET(request: NextRequest) {
  const { defaultDistrictId, defaultDistrictName } = getWeatherDefaults();
  const { searchParams } = new URL(request.url);
  const visitorId = normalizeText(searchParams.get('sid'), 64) || 'anon';
  const page = normalizeText(searchParams.get('page'), 32) || 'home';
  const districtIdParam = normalizeText(searchParams.get('district_id'), 20);
  const locationParam = normalizeLocation(searchParams.get('location'));
  const province = normalizeText(searchParams.get('province'), 24);
  const city = normalizeText(searchParams.get('city'), 24);
  const districtFromQuery = normalizeText(searchParams.get('district'), 24);
  const quickQuery = normalizeText(searchParams.get('q'), 24);
  const district = districtFromQuery || quickQuery;
  const coordtype = normalizeCoordType(searchParams.get('coordtype'));
  const forceRefresh = isForceRefresh(searchParams.get('force'));
  const shouldTrack = shouldTrackAnalytics(searchParams.get('track'));
  const clientIp = getClientIpFromRequest(request);

  const ak = process.env.BAIDU_WEATHER_AK || process.env.BAIDU_MAP_AK;
  if (!ak) {
    return NextResponse.json({ error: '未配置百度天气 AK（BAIDU_WEATHER_AK）' }, { status: 500 });
  }

  let mode: 'district_id' | 'location' | 'district_name' = 'district_id';
  const params = new URLSearchParams();

  if (districtIdParam) {
    if (!DISTRICT_ID_PATTERN.test(districtIdParam)) {
      return NextResponse.json({ error: 'district_id 格式无效，应为 6-12 位数字' }, { status: 400 });
    }
    mode = 'district_id';
    params.set('district_id', districtIdParam);
  } else if (locationParam) {
    if (!LOCATION_PATTERN.test(locationParam)) {
      return NextResponse.json({ error: 'location 格式无效，应为 \"lng,lat\"' }, { status: 400 });
    }
    mode = 'location';
    params.set('location', locationParam);
    params.set('coordtype', coordtype);
  } else if (district) {
    const resolvedDistrictId = await resolveDistrictIdFromTable(province, city, district);
    if (resolvedDistrictId && DISTRICT_ID_PATTERN.test(resolvedDistrictId)) {
      mode = 'district_id';
      params.set('district_id', resolvedDistrictId);
    } else {
      mode = 'district_name';
      params.set('district', district);
      if (province) params.set('province', province);
      if (city) params.set('city', city);
    }
  } else {
    mode = 'district_id';
    params.set('district_id', defaultDistrictId);
  }

  params.set('data_type', 'all');
  params.set('output', 'json');

  const fingerprint = (() => {
    if (mode === 'district_id') return `district_id=${params.get('district_id') || defaultDistrictId}&data_type=all`;
    if (mode === 'location') return `location=${params.get('location')}&coordtype=${params.get('coordtype')}&data_type=all`;
    return `province=${params.get('province') || ''}&city=${params.get('city') || ''}&district=${params.get('district') || ''}&data_type=all`;
  })();
  const cacheKey = buildCacheKey(fingerprint);
  const searchIntent = districtIdParam || district || locationParam || defaultDistrictName;

  try {
    if (!forceRefresh) {
      const cached = await getWeatherCache(cacheKey);
      if (cached) {
        if (shouldTrack) {
          try {
            await recordAnalyticsEvent({
              eventType: 'weather_query',
              targetType: 'tool',
              targetName: '天气速查',
              page,
              visitorId,
              clientIp,
              searchQuery: searchIntent,
              metadata: {
                mode,
                province,
                city,
                district,
                district_id: params.get('district_id') || '',
                location: params.get('location') || '',
                coordtype: params.get('coordtype') || '',
                cache_hit: true,
                force_refresh: forceRefresh,
                upstream_status: cached.status ?? 0,
              },
            });
          } catch (analyticsError) {
            console.error('Failed to record weather analytics event:', analyticsError);
          }
        }
        return NextResponse.json(cached);
      }
    }

    params.set('ak', ak);
    const response = await fetch(`${BAIDU_WEATHER_ENDPOINT}?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ error: '请求百度天气接口失败' }, { status: 502 });
    }

    const payload = (await response.json()) as WeatherPayload;
    if (payload.status !== 0) {
      return NextResponse.json(
        { error: payload.message || '百度天气接口返回错误', status: payload.status ?? -1 },
        { status: 502 }
      );
    }

    await saveWeatherCache(cacheKey, fingerprint, payload);

    if (shouldTrack) {
      try {
        await recordAnalyticsEvent({
          eventType: 'weather_query',
          targetType: 'tool',
          targetName: '天气速查',
          page,
          visitorId,
          clientIp,
          searchQuery: searchIntent,
          metadata: {
            mode,
            province,
            city,
            district,
            district_id: params.get('district_id') || '',
            location: params.get('location') || '',
            coordtype: params.get('coordtype') || '',
            cache_hit: false,
            force_refresh: forceRefresh,
            upstream_status: payload.status ?? 0,
          },
        });
      } catch (analyticsError) {
        console.error('Failed to record weather analytics event:', analyticsError);
      }
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Baidu weather query failed:', error);
    return NextResponse.json({ error: '天气查询失败，请稍后重试' }, { status: 500 });
  }
}
