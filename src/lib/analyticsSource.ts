export interface AnalyticsSourceInput {
  page?: string;
  visitorId?: string;
  category?: string | number | null;
  hasSearch?: boolean;
}

export interface ParsedAnalyticsSource {
  raw: string;
  page: string;
  visitorId: string;
  category: string;
  hasSearch: boolean;
  isV2: boolean;
}

const SOURCE_VERSION = 'v2';
const DEFAULT_PAGE = 'direct';
const DEFAULT_VISITOR_ID = 'legacy';
const DEFAULT_CATEGORY = 'all';
const MAX_TOKEN_LENGTH = 24;

function sanitizeToken(value: string, fallback: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!normalized) {
    return fallback;
  }
  return normalized.slice(0, MAX_TOKEN_LENGTH);
}

export function buildAnalyticsSource(input: AnalyticsSourceInput): string {
  const page = sanitizeToken(input.page || DEFAULT_PAGE, DEFAULT_PAGE);
  const visitorId = sanitizeToken(input.visitorId || 'anon', 'anon');
  const category = sanitizeToken(
    input.category === null || input.category === undefined ? DEFAULT_CATEGORY : String(input.category),
    DEFAULT_CATEGORY
  );
  const hasSearch = input.hasSearch ? '1' : '0';

  return `${SOURCE_VERSION}|p:${page}|sid:${visitorId}|cat:${category}|q:${hasSearch}`;
}

export function parseAnalyticsSource(raw: string | null | undefined): ParsedAnalyticsSource {
  const source = (raw || '').trim();
  if (!source) {
    return {
      raw: '',
      page: DEFAULT_PAGE,
      visitorId: DEFAULT_VISITOR_ID,
      category: DEFAULT_CATEGORY,
      hasSearch: false,
      isV2: false,
    };
  }

  if (!source.startsWith(`${SOURCE_VERSION}|`)) {
    return {
      raw: source,
      page: sanitizeToken(source, DEFAULT_PAGE),
      visitorId: DEFAULT_VISITOR_ID,
      category: DEFAULT_CATEGORY,
      hasSearch: false,
      isV2: false,
    };
  }

  let page = DEFAULT_PAGE;
  let visitorId = 'anon';
  let category = DEFAULT_CATEGORY;
  let hasSearch = false;

  const segments = source.split('|');
  for (const segment of segments) {
    const [key, value = ''] = segment.split(':');
    if (key === 'p') page = sanitizeToken(value, DEFAULT_PAGE);
    if (key === 'sid') visitorId = sanitizeToken(value, 'anon');
    if (key === 'cat') category = sanitizeToken(value, DEFAULT_CATEGORY);
    if (key === 'q') hasSearch = value === '1';
  }

  return {
    raw: source,
    page,
    visitorId,
    category,
    hasSearch,
    isV2: true,
  };
}
