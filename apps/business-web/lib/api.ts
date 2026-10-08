'use client';

const configuredApiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
if (!configuredApiBase && process.env.NODE_ENV === 'production') {
  throw new Error('NEXT_PUBLIC_API_URL is required for production builds');
}
export const API_BASE = (configuredApiBase || 'http://localhost:4000/api/v1').replace(/\/$/, '');

function unwrapEnvelope<T = unknown>(body: any): T {
  if (body && typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length === 1 && 'data' in body) return body.data as T;
  return body as T;
}

export type AuthUser = {
  id: string;
  fullName?: string;
  email?: string | null;
  permissions: string[];
  roleScopes: Array<{ roleKey: string; scopeType: string; scopeId?: string | null; companyId?: string | null; branchId?: string | null }>;
};

const ACCESS = 'lookiva-business-access';
const REFRESH = 'lookiva-business-refresh';
const USER = 'lookiva-business-user';

export function clearBusinessSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
  localStorage.removeItem(USER);
}

export function getBusinessSession(): { accessToken: string; refreshToken: string; user: AuthUser; companyId: string; branchId?: string } | null {
  if (typeof window === 'undefined') return null;
  const accessToken = localStorage.getItem(ACCESS);
  const refreshToken = localStorage.getItem(REFRESH);
  const raw = localStorage.getItem(USER);
  if (!accessToken || !refreshToken || !raw) return null;
  try {
    const user = JSON.parse(raw) as AuthUser;
    const businessScope = user.roleScopes.find((scope) => ['business_owner', 'business_manager', 'branch_manager', 'professional', 'staff'].includes(scope.roleKey) && scope.companyId);
    const platformScope = user.roleScopes.find((scope) => ['super_admin', 'platform_admin', 'country_manager'].includes(scope.roleKey));
    const companyId = businessScope?.companyId || (platformScope ? localStorage.getItem('lookiva-business-company') : null);
    if (!companyId) return null;
    return { accessToken, refreshToken, user, companyId, branchId: businessScope?.branchId || undefined };
  } catch {
    clearBusinessSession();
    return null;
  }
}

async function refreshAccessToken() {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem(REFRESH) : null;
  if (!refreshToken) throw new Error('Session expired');
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken, deviceName: 'LOOKIVA Business Web' }),
  });
  if (!response.ok) throw new Error('Session expired');
  const data = unwrapEnvelope<any>(await response.json());
  localStorage.setItem(ACCESS, data.accessToken);
  localStorage.setItem(REFRESH, data.refreshToken);
  return data.accessToken as string;
}

export async function businessFetch<T = unknown>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(ACCESS) : null;
  const response = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    cache: 'no-store',
  });
  if (response.status === 401 && retry) {
    try {
      await refreshAccessToken();
      return businessFetch<T>(path, init, false);
    } catch {
      clearBusinessSession();
    }
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message || `Request failed (${response.status})`);
  }
  return unwrapEnvelope<T>(await response.json());
}

export async function businessUpload<T = any>(
  file: File,
  isPublic = true,
  retry = true,
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(ACCESS) : null;
  const body = new FormData();
  body.append('file', file);
  const response = await fetch(
    `${API_BASE}/media/upload?isPublic=${isPublic ? 'true' : 'false'}`,
    {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
    },
  );
  if (response.status === 401 && retry) {
    try {
      await refreshAccessToken();
      return businessUpload<T>(file, isPublic, false);
    } catch {
      clearBusinessSession();
    }
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.message || `Upload failed (${response.status})`);
  }
  return unwrapEnvelope<T>(await response.json());
}

export async function loginBusiness(identifier: string, password: string, rememberMe: boolean) {
  const login = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password, rememberMe, deviceName: 'LOOKIVA Business Web' }),
  });
  if (!login.ok) {
    const body = await login.json().catch(() => ({}));
    throw new Error(body?.message || 'Unable to sign in');
  }
  const tokens = unwrapEnvelope<any>(await login.json());
  const meResponse = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
  if (!meResponse.ok) throw new Error('Unable to verify account permissions');
  const meBody = unwrapEnvelope<any>(await meResponse.json());
  const user = (meBody.user || meBody) as AuthUser;
  const accepted = user.roleScopes?.some((scope) => ['business_owner', 'business_manager', 'branch_manager', 'professional', 'staff', 'super_admin', 'platform_admin', 'country_manager'].includes(scope.roleKey));
  if (!accepted) throw new Error('This account does not have business dashboard access');
  localStorage.setItem(ACCESS, tokens.accessToken);
  localStorage.setItem(REFRESH, tokens.refreshToken);
  localStorage.setItem(USER, JSON.stringify(user));
  return user;
}


export async function requestPasswordReset(email: string) {
  const response = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message || 'Unable to request password reset');
  }
  return unwrapEnvelope<any>(await response.json().catch(() => ({})));
}
