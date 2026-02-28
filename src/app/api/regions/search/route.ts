import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BAIDU_PLACE_SEARCH_ENDPOINT = 'https://api.map.baidu.com/place/v2/search';

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

  const params = new URLSearchParams({
    query,
    region,
    output: 'json',
    ak,
  });

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
          address: item.address || '',
        }))
      : [];

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
