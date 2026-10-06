'use client';

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import { APIPaths, type ErrorEnvelope } from '@lookiva/api-contracts';
import { resolveBrowserApiBase } from './runtime-url';

const ACCESS_KEY = 'lookiva-access';
const REFRESH_KEY = 'lookiva-refresh';
const LOCALE_KEY = 'lookiva-locale';

let currentLocale: string | null = null;

export function setCurrentLocale(locale: string) {
  currentLocale = locale;
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // ignore
  }
}

export function getStoredLocale(): string {
  try {
    return currentLocale ?? localStorage.getItem(LOCALE_KEY) ?? 'en';
  } catch {
    return 'en';
  }
}

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setAuthTokens(access: string, refresh: string) {
  try {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  } catch {
    // ignore
  }
}

export function clearAuthTokens() {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // ignore
  }
}

function extractMessage(error: AxiosError<ErrorEnvelope>, fallback: string): string {
  const data = error.response?.data;
  if (!data) return fallback;
  if (typeof data.message === 'string') return data.message;
  if (Array.isArray((data as unknown as { errors?: Array<{ message: string }> }).errors) && (data as unknown as { errors: Array<{ message: string }> }).errors?.[0]?.message) {
    return (data as unknown as { errors: Array<{ message: string }> }).errors[0].message;
  }
  return data.message ?? fallback;
}

const configuredApiBase =
  (typeof process !== 'undefined' && (process?.env?.NEXT_PUBLIC_API_URL || process?.env?.NEXT_PUBLIC_API_BASE_URL)) || '';
if (!configuredApiBase && typeof process !== 'undefined' && process?.env?.NODE_ENV === 'production') {
  throw new Error('NEXT_PUBLIC_API_URL is required for production builds');
}

const api = axios.create({
  baseURL: resolveBrowserApiBase(configuredApiBase),
  timeout: 15000,
  withCredentials: false,
});

let isRefreshing = false;
let pendingQueue: Array<(access: string) => void> = [];

function pushPending(resolve: (access: string) => void) {
  pendingQueue.push(resolve);
}

function resolvePending(access: string) {
  pendingQueue.forEach((cb) => cb(access));
  pendingQueue = [];
}

function rejectPending(error: unknown) {
  pendingQueue = [];
  throw error;
}

async function refreshAccessToken(): Promise<string> {
  const refresh = getRefreshToken();
  if (!refresh) {
    clearAuthTokens();
    throw new Error('No refresh token available');
  }

  try {
    const { data: refreshEnvelope } = await axios.post<{ data?: { accessToken: string; refreshToken: string }; accessToken?: string; refreshToken?: string }>(
      `${api.defaults.baseURL}/auth/refresh`,
      { refreshToken: refresh } satisfies import('@lookiva/api-contracts').RefreshTokenRequest,
      {
        headers: {
          'Accept-Language': getStoredLocale(),
          'Content-Type': 'application/json',
        },
      }
    );
    const data = refreshEnvelope?.data ?? refreshEnvelope;
    if (data?.accessToken) {
      setAuthTokens(data.accessToken, data.refreshToken ?? refresh);
      return data.accessToken;
    }
    throw new Error('Invalid refresh response');
  } catch (err) {
    clearAuthTokens();
    throw err;
  }
}

api.interceptors.request.use(
  (config) => {
    const typedConfig = config as InternalAxiosRequestConfig;
    if (!typedConfig.headers) {
      typedConfig.headers = {} as InternalAxiosRequestConfig['headers'];
    }

    if (typedConfig.url?.startsWith('/api/v1/')) {
      typedConfig.url = typedConfig.url.slice('/api/v1'.length);
    } else if (typedConfig.url === '/api/v1') {
      typedConfig.url = '/';
    }

    const token = getAccessToken();
    if (token && !typedConfig.headers['Authorization']) {
      typedConfig.headers['Authorization'] = `Bearer ${token}`;
    }

    const locale = currentLocale ?? getStoredLocale();
    if (!typedConfig.headers['Accept-Language']) {
      typedConfig.headers['Accept-Language'] = locale;
    }

    if (!typedConfig.headers['Content-Type']) {
      typedConfig.headers['Content-Type'] = 'application/json';
    }

    return typedConfig;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    // Nest's global ResponseInterceptor wraps ordinary controller values as { data: value }.
    // Unwrap only that single-key envelope; keep paginated { data, meta } payloads intact.
    const body = response.data;
    if (body && typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length === 1 && 'data' in body) {
      response.data = body.data;
    }
    return response;
  },
  async (error: AxiosError<ErrorEnvelope>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const access = isRefreshing
          ? await new Promise<string>((resolve) => pushPending(resolve))
          : await (async () => {
              isRefreshing = true;
              try {
                const token = await refreshAccessToken();
                resolvePending(token);
                return token;
              } catch (err) {
                rejectPending(err);
                throw err;
              } finally {
                isRefreshing = false;
              }
            })();

        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${access}`;
        }
        return api.request(originalRequest);
      } catch (refreshError) {
        toast.error('Session expired', {
          description: 'Please log in again to continue.',
        });
        return Promise.reject(refreshError);
      }
    }

    if (typeof window !== 'undefined') {
      const status = error.response?.status;
      if (!status || status >= 500) {
        toast.error('Network error', {
          description: extractMessage(error, 'Unable to reach LOOKIVA servers. Please try again.'),
        });
      } else if (status === 403) {
        toast.error('Access denied', {
          description: extractMessage(error, "You don't have permission to perform this action."),
        });
      } else if (status === 400 || status === 422) {
        toast.error('Please review your input', {
          description: extractMessage(error, 'Some fields need your attention.'),
        });
      } else if (status === 404) {
        toast.error('Not found', {
          description: extractMessage(error, "The resource you're looking for doesn't exist."),
        });
      } else if (status === 429) {
        toast.warning('Too many requests', {
          description: extractMessage(error, 'Please slow down and try again shortly.'),
        });
      }
    }

    return Promise.reject(error);
  }
);

export default api;


