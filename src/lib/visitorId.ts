const VISITOR_ID_KEY = 'navstation_visitor_id';

export function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') {
    return 'anon';
  }

  try {
    const existing = localStorage.getItem(VISITOR_ID_KEY);
    if (existing) {
      return existing;
    }

    const generated = Math.random().toString(36).slice(2, 14);
    localStorage.setItem(VISITOR_ID_KEY, generated);
    return generated;
  } catch {
    return 'anon';
  }
}
