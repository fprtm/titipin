import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

describe('Edge SSR Middleware', () => {
  it('redirects unauthenticated users from protected /dashboard to /login', () => {
    const request = new NextRequest('http://localhost:3000/dashboard');

    const response = middleware(request);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?callbackUrl=%2Fdashboard',
    );
  });

  it('redirects unauthenticated users from protected /pos to /login', () => {
    const request = new NextRequest('http://localhost:3000/pos');

    const response = middleware(request);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/login?callbackUrl=%2Fpos');
  });

  it('allows authenticated users with refresh_token cookie to access /dashboard', () => {
    const request = new NextRequest('http://localhost:3000/dashboard', {
      headers: {
        cookie: 'refresh_token=valid-jwt-token',
      },
    });

    const response = middleware(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects authenticated users on /login to /dashboard', () => {
    const request = new NextRequest('http://localhost:3000/login', {
      headers: {
        cookie: 'refresh_token=valid-jwt-token',
      },
    });

    const response = middleware(request);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('allows unauthenticated users to access /login', () => {
    const request = new NextRequest('http://localhost:3000/login');

    const response = middleware(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('TEST-09: redirects cashier away from admin-only /users route to /pos with forbidden error', () => {
    const cashierPayload = Buffer.from(JSON.stringify({ role: 'CASHIER' })).toString('base64');
    const cashierToken = `fakeheader.${cashierPayload}.fakesig`;
    const request = new NextRequest('http://localhost:3000/users', {
      headers: {
        cookie: `refresh_token=${cashierToken}`,
      },
    });

    const response = middleware(request);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/pos?error=forbidden');
  });

  it('allows admin to access admin-only /users route', () => {
    const adminPayload = Buffer.from(JSON.stringify({ role: 'ADMIN' })).toString('base64');
    const adminToken = `fakeheader.${adminPayload}.fakesig`;
    const request = new NextRequest('http://localhost:3000/users', {
      headers: {
        cookie: `refresh_token=${adminToken}`,
      },
    });

    const response = middleware(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });
});
