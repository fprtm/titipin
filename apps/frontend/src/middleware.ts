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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const refreshTokenCookie = request.cookies.get('refresh_token');
  const tokenValue = refreshTokenCookie?.value;
  const hasRefreshToken = !!tokenValue;

  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  const isAdminOnlyRoute = ADMIN_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  const isLoginPage = pathname === '/login';

  // 1. If trying to access protected route without refresh token cookie, redirect to /login
  if (isProtectedRoute && !hasRefreshToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. If already logged in (has refresh token) and accessing /login, redirect to /dashboard
  if (isLoginPage && hasRefreshToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 3. RBAC Guard: If logged in as CASHIER and accessing admin-only routes, redirect to /pos with forbidden notice
  if (isAdminOnlyRoute && hasRefreshToken && tokenValue) {
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
