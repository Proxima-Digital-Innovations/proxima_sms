import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/verify',
  '/result-checker',
  '/admissions',
  '/unauthorized',
  '/license-expired',
];

export default auth(async (req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const pathname = nextUrl.pathname;

  // 1. Skip public assets and internal next routes
  if (pathname === '/' || PUBLIC_ROUTES.some(route => route !== '/' && pathname.startsWith(route)) || pathname.includes('.')) {
    return NextResponse.next();
  }

  // 2. Hub routes: require authentication
  if (pathname.startsWith('/hub')) {
    if (!isLoggedIn) {
      const loginUrl = nextUrl.clone();
      loginUrl.pathname = '/login';
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 3. Authenticated Session Check
  if (!isLoggedIn) {
    let callbackUrl = nextUrl.pathname;
    if (nextUrl.search) {
      callbackUrl += nextUrl.search;
    }
    const loginUrl = nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = `?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
