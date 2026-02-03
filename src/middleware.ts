import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';

  // 检测 IE 8/9/10/11
  const isIE = /MSIE [89]\.0|MSIE 10\.0|Trident\/7\.0/.test(userAgent);

  if (isIE && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/legacy', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/',
};
