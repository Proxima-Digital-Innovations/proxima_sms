import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

const PUBLIC_ROUTES = [
  '/login',
  '/api/auth',
  '/_next',
  '/favicon.ico',
];

export default auth(async (req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const hostname = req.headers.get('host') || '';
  const pathname = nextUrl.pathname;

  // 1. Skip public assets and internal next routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route)) || pathname.includes('.')) {
    return NextResponse.next();
  }

  // 2. Determine Subdomain (Tenant)
  const host = hostname.replace(':9002', ''); 
  const chunks = host.split('.');
  let subdomain = chunks.length > 2 ? chunks[chunks.length - 3] : null;

  // 3. Main Domain Logic
  if (!subdomain || subdomain === 'www' || subdomain === 'app') {
    if (pathname.startsWith('/super-admin')) {
      if (!isLoggedIn || !req.auth?.user?.isSuperAdmin) {
        return NextResponse.redirect(new URL('/login', req.url));
      }
    }
    return NextResponse.next();
  }

  // 4. Authenticated Session Check
  if (!isLoggedIn) {
    let callbackUrl = nextUrl.pathname;
    if (nextUrl.search) {
      callbackUrl += nextUrl.search;
    }
    const encodedCallbackUrl = encodeURIComponent(callbackUrl);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodedCallbackUrl}`, req.url));
  }

  // 5. Tenant Routing (Rewrite to [school])
  // We defer school license/status checks to the server layout for Prisma access
  if (!pathname.startsWith(`/${subdomain}`)) {
     const url = nextUrl.clone();
     url.pathname = `/${subdomain}${pathname}`;
     const response = NextResponse.rewrite(url);
     
     // Inject security headers
     response.headers.set('X-Content-Type-Options', 'nosniff');
     response.headers.set('X-Frame-Options', 'DENY');
     response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
     
     return response;
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
