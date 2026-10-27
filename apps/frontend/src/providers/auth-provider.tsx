'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, setAccessToken, getAccessToken } from '../lib/api-client';
import type { UserItem, LoginFormValues, Role } from '@titipin/shared';

interface AuthContextType {
  user: UserItem | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginFormValues) => Promise<UserItem>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserItem | null>(null);
  const [accessToken, setTokenState] = useState<string | null>(getAccessToken());
  const [isLoading, setIsLoading] = useState(true);

  const initAuth = useCallback(async () => {
    try {
      // Attempt silent refresh on initial load
      const refreshRes = await apiClient.post('/auth/refresh');
      const token = refreshRes.data.data.accessToken || refreshRes.data.data.access_token;
      setAccessToken(token);
      setTokenState(token);

      const profileRes = await apiClient.get('/auth/me');
      const userData = profileRes.data.data || profileRes.data;
      setUser(userData);
    } catch {
      setAccessToken(null);
      setTokenState(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = useCallback(
    async (credentials: LoginFormValues): Promise<UserItem> => {
      const response = await apiClient.post('/auth/login', credentials);
      const data = response.data.data;
      const token = data.accessToken || data.access_token;
      const loggedInUser: UserItem = data.user;

      setAccessToken(token);
      setTokenState(token);
      setUser(loggedInUser);

      // Route based on role per 01-login.md
      if (loggedInUser.role === ('CASHIER' as Role)) {
        router.push('/pos');
      } else {
        router.push('/dashboard');
      }

      return loggedInUser;
    },
    [router],
  );

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      setAccessToken(null);
      setTokenState(null);
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  const refreshProfile = useCallback(async () => {
    try {
      const profileRes = await apiClient.get('/auth/me');
      const userData = profileRes.data.data || profileRes.data;
      setUser(userData);
    } catch {
      // Ignore
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: !!user && !!accessToken,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
