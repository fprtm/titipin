import { describe, it, expect, vi } from 'vitest';
import { apiClient } from './api-client';

interface InterceptorHandler {
  rejected?: (error: unknown) => Promise<never>;
}

interface InterceptorManagerWithHandlers {
  handlers: (InterceptorHandler | null)[];
}

describe('apiClient response interceptor', () => {
  it('does not trigger token refresh when /auth/login fails with 401', async () => {
    const postSpy = vi.spyOn(apiClient, 'post');

    const authLoginError = {
      config: { url: '/auth/login', headers: {} },
      response: { status: 401, data: { success: false, message: 'Invalid credentials' } },
    };

    const responseManager = apiClient.interceptors
      .response as unknown as InterceptorManagerWithHandlers;
    const errorHandler = responseManager.handlers[0]?.rejected;
    expect(errorHandler).toBeDefined();

    if (errorHandler) {
      await expect(errorHandler(authLoginError)).rejects.toMatchObject({
        response: { status: 401 },
      });
    }

    // Verify /auth/refresh was NOT called
    expect(postSpy).not.toHaveBeenCalledWith('/auth/refresh');
    postSpy.mockRestore();
  });

  it('does not recursively call /auth/refresh when /auth/refresh fails with 401', async () => {
    const postSpy = vi.spyOn(apiClient, 'post');

    const refreshError = {
      config: { url: '/auth/refresh', headers: {} },
      response: { status: 401, data: { success: false, message: 'Refresh token expired' } },
    };

    const responseManager = apiClient.interceptors
      .response as unknown as InterceptorManagerWithHandlers;
    const errorHandler = responseManager.handlers[0]?.rejected;
    expect(errorHandler).toBeDefined();

    if (errorHandler) {
      await expect(errorHandler(refreshError)).rejects.toMatchObject({
        response: { status: 401 },
      });
    }

    // Verify /auth/refresh was NOT recursively invoked
    expect(postSpy).not.toHaveBeenCalled();
    postSpy.mockRestore();
  });
});
