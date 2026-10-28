import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/pos',
  '/products',
  '/customers',
  '/orders',
  '/users',
  '/audit-logs',
];

const ADMIN_ONLY_PREFIXES = ['/users', '/audit-logs'];

function getRoleFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const jsonStr = atob(padded);
    const payload = JSON.parse(jsonStr);
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const jsonStr = atob(padded);
    const payload = JSON.parse(jsonStr);
    if (typeof payload.exp === 'number') {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      return payload.exp <= nowInSeconds;
    }
    return false;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const refreshTokenCookie = request.cookies.get('refresh_token');
  const tokenValue = refreshTokenCookie?.value;
  const hasRefreshToken = !!tokenValue;
  const tokenExpired = hasRefreshToken && isTokenExpired(tokenValue);

  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  const isAdminOnlyRoute = ADMIN_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  const isLoginPage = pathname === '/login';
  const hasAuthError = searchParams.has('error') || searchParams.has('session');

  // If accessing /login:
  if (isLoginPage) {
    // If arriving with an auth error or an expired token, allow /login and purge the dead cookie
    if (hasAuthError || tokenExpired) {
      const response = NextResponse.next();
      if (hasRefreshToken) {
        response.cookies.delete('refresh_token');
      }
      return response;
    }

    // Only redirect active, non-expired sessions away from /login
    if (hasRefreshToken) {
      const role = getRoleFromToken(tokenValue);
      const destination = role === 'CASHIER' ? '/pos' : '/dashboard';
      return NextResponse.redirect(new URL(destination, request.url));
    }

    return NextResponse.next();
  }

  // 1. If trying to access protected route without refresh token or with expired token, redirect to /login
  if (isProtectedRoute && (!hasRefreshToken || tokenExpired)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    const response = NextResponse.redirect(loginUrl);
    if (tokenExpired) {
      response.cookies.delete('refresh_token');
    }
    return response;
  }

  // 2. RBAC Guard: If logged in as CASHIER and accessing admin-only routes, redirect to /pos with forbidden notice
  if (isAdminOnlyRoute && hasRefreshToken && !tokenExpired && tokenValue) {
    const role = getRoleFromToken(tokenValue);
    if (role === 'CASHIER') {
      const posUrl = new URL('/pos', request.url);
      posUrl.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(posUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
