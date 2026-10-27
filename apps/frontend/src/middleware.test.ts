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
});
