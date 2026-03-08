import { NextRequest, NextResponse } from 'next/server';
import { recordAnalyticsEvent } from '@/lib/analyticsEvents';
import { getClientIpFromRequest } from '@/lib/clientIp';

export const dynamic = 'force-dynamic';

// Upgraded to v3: returns town + town_code (4-level hierarchy)
const BAIDU_PLACE_SEARCH_ENDPOINT = 'https://api.map.baidu.com/place/v3/region';

interface BaiduPlaceResult {
  uid?: string;
  name?: string;
  location?: {
    lat?: number;
    lng?: number;
  };
  street_id?: string;
  detail?: number;
  province?: string;
  city?: string;
  area?: string;
  town?: string;
  town_code?: number;
  address?: string;
}

interface BaiduPlaceSearchResponse {
  status?: number;
  message?: string;
  result_type?: string;
  query_type?: string;
  total?: number;
  results?: BaiduPlaceResult[];
}

function safeTrim(value: string | null, maxLength: number): string {
  if (!value) return '';
  return value.trim().slice(0, maxLength);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = safeTrim(searchParams.get('query'), 80);
  const region = safeTrim(searchParams.get('region'), 40);
  const visitorId = safeTrim(searchParams.get('sid'), 64) || 'anon';
  const page = safeTrim(searchParams.get('page'), 32) || 'home';

  if (!query) {
    return NextResponse.json({ error: '查询关键词不能为空' }, { status: 400 });
  }

  if (!region) {
    return NextResponse.json({ error: '省份不能为空' }, { status: 400 });
  }

  const ak = process.env.BAIDU_MAP_AK || process.env.BAIDU_AK;
  if (!ak) {
    return NextResponse.json({ error: '未配置百度地图 AK（BAIDU_MAP_AK）' }, { status: 500 });
  }

  // v3 does not need output=json (always returns JSON)
  const params = new URLSearchParams({ query, region, ak });

  try {
    const response = await fetch(`${BAIDU_PLACE_SEARCH_ENDPOINT}?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ error: '请求百度接口失败' }, { status: 502 });
    }

    const payload = (await response.json()) as BaiduPlaceSearchResponse;
    if (payload.status !== 0) {
      return NextResponse.json(
        { error: payload.message || '百度接口返回错误', status: payload.status ?? -1 },
        { status: 502 }
      );
    }

    const items = Array.isArray(payload.results)
      ? payload.results.map((item) => ({
          uid: item.uid || '',
          name: item.name || '',
          location: {
            lat: typeof item.location?.lat === 'number' ? item.location.lat : null,
            lng: typeof item.location?.lng === 'number' ? item.location.lng : null,
          },
          street_id: item.street_id || '',
          detail: Number(item.detail) || 0,
          province: item.province || '',
          city: item.city || '',
          area: item.area || '',
          // v3 additions
          town: item.town || '',
          town_code: typeof item.town_code === 'number' ? String(item.town_code) : '',
          address: item.address || '',
        }))
      : [];

    try {
      await recordAnalyticsEvent({
        eventType: 'region_online_query',
        targetType: 'tool',
        targetName: '行政区域查询',
        page,
        visitorId,
        clientIp: getClientIpFromRequest(request),
        searchQuery: query,
        metadata: {
          region,
          total: Number(payload.total) || items.length,
          result_type: payload.result_type || '',
          query_type: payload.query_type || '',
        },
      });
    } catch (analyticsError) {
      console.error('Failed to record region analytics event:', analyticsError);
    }

    return NextResponse.json({
      status: payload.status ?? 0,
      message: payload.message || 'ok',
      resultType: payload.result_type || '',
      queryType: payload.query_type || '',
      total: Number(payload.total) || items.length,
      items,
    });
  } catch (error) {
    console.error('Baidu region search failed:', error);
    return NextResponse.json({ error: '行政区域查询失败，请稍后重试' }, { status: 500 });
  }
}
