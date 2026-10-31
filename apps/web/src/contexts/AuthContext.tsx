'use client';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Use a ref to keep the latest token without dealing with useEffect firing order
  const tokenRef = React.useRef<string | null>(null);

  // Setup interceptor dinamis (hanya sekali saat mount)
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use((config) => {
      if (tokenRef.current && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${tokenRef.current}`;
      }
      return config;
    });

    let refreshPromise: Promise<string> | null = null;

    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Prevent infinite loops if /auth/refresh itself returns 401
        // Also don't attempt to refresh if login/register fails with 401
        if (
          error.response?.status === 401 &&
          originalRequest &&
          !originalRequest._retry &&
          ![
            '/auth/refresh',
            '/auth/login',
            '/auth/register',
            '/auth/logout',
          ].includes(originalRequest.url)
        ) {
          originalRequest._retry = true;

          try {
            if (!refreshPromise) {
              refreshPromise = api
                .post('/auth/refresh')
                .then((res) => {
                  const newToken = res.data.accessToken;
                  setAccessToken(newToken);
                  tokenRef.current = newToken;
                  return newToken;
                })
                .finally(() => {
                  refreshPromise = null;
                });
            }

            const newToken = await refreshPromise;
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          } catch (refreshError) {
            setAccessToken(null);
            setUser(null);
            tokenRef.current = null;
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      },
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Handle refresh token on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await api.post('/auth/refresh');
        // Do not overwrite if login() was already called while refresh was in flight
        if (!tokenRef.current) {
          const newToken = res.data.accessToken;
          tokenRef.current = newToken;
          setAccessToken(newToken);
          setUser(res.data.user);
        }
      } catch {
        // Refresh token invalid atau tidak ada — jangan timpa jika login() sudah dipanggil
        if (!tokenRef.current) {
          tokenRef.current = null;
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = useCallback((token: string, userData: User) => {
    tokenRef.current = token;
    setAccessToken(token);
    setUser(userData);
    setIsLoading(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    tokenRef.current = null;
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, accessToken, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
