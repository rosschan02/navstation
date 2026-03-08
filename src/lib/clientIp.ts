import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';

function normalizeIpCandidate(value: string | null | undefined): string {
  if (!value) return '';
  const candidate = value.trim();
  if (!candidate) return '';
  if (candidate.startsWith('::ffff:')) {
    return candidate.slice(7);
  }
  return candidate;
}

export function extractClientIpFromHeadersMap(input: {
  get(name: string): string | null;
}): string {
  const forwardedFor = input.get('x-forwarded-for');
  if (forwardedFor) {
    const ip = normalizeIpCandidate(forwardedFor.split(',')[0]);
    if (ip) return ip;
  }

  const realIp = normalizeIpCandidate(input.get('x-real-ip'));
  if (realIp) return realIp;

  return '';
}

export function getClientIpFromRequest(request: NextRequest): string {
  return extractClientIpFromHeadersMap(request.headers);
}

export async function getClientIpFromServerHeaders(): Promise<string> {
  const headerStore = await headers();
  return extractClientIpFromHeadersMap(headerStore);
}
