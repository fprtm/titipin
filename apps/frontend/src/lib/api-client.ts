import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;

    // Do not attempt to refresh if originalRequest is absent or is an authentication route (login/refresh)
    const isAuthRoute =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh');

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRoute
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await apiClient.post('/auth/refresh');
        const newToken = data.data.accessToken;
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        failedQueue.forEach((promiseItem) => promiseItem.resolve(newToken));
        failedQueue = [];
        return apiClient(originalRequest);
      } catch (refreshError) {
        failedQueue.forEach((promiseItem) => promiseItem.reject(refreshError));
        failedQueue = [];
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);
