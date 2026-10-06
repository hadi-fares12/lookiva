import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);
const localeSet = new Set(routing.locales);

export default function middleware(request: NextRequest) {
  const segments = request.nextUrl.pathname.split('/').filter(Boolean);

  // Normalize accidental duplicate locale prefixes such as:
  // /en/en/location-permission -> /en/location-permission
  // /ar/ar/home -> /ar/home
  if (
    segments.length >= 2 &&
    localeSet.has(segments[0] as (typeof routing.locales)[number]) &&
    segments[0] === segments[1]
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/' + [segments[0], ...segments.slice(2)].join('/');
    return NextResponse.redirect(url);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|static|.*\\..*).*)',
  ],
};
