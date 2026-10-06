'use client';

import { resolveBrowserApiBase } from './runtime-url';

const configuredApiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
if (!configuredApiBase && process.env.NODE_ENV === 'production') {
  throw new Error('NEXT_PUBLIC_API_URL is required for production builds');
}
export const API_BASE = resolveBrowserApiBase(configuredApiBase || 'http://localhost:4000/api/v1');

function unwrapEnvelope<T = unknown>(body: any): T {
  if (body && typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length === 1 && 'data' in body) return body.data as T;
  return body as T;
}

type AdminUser = {
  id: string;
  fullName?: string;
  email?: string | null;
  permissions: string[];
  roleScopes: Array<{ roleKey: string; scopeType: string; scopeId?: string | null; companyId?: string | null; branchId?: string | null }>;
};

const ACCESS = 'lookiva-admin-access';
const REFRESH = 'lookiva-admin-refresh';
const USER = 'lookiva-admin-user';

export function clearAdminSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS); localStorage.removeItem(REFRESH); localStorage.removeItem(USER);
}

export function getAdminSession(): { accessToken: string; refreshToken: string; user: AdminUser } | null {
  if (typeof window === 'undefined') return null;
  const accessToken = localStorage.getItem(ACCESS); const refreshToken = localStorage.getItem(REFRESH); const raw = localStorage.getItem(USER);
  if (!accessToken || !refreshToken || !raw) return null;
  try { return { accessToken, refreshToken, user: JSON.parse(raw) as AdminUser }; } catch { clearAdminSession(); return null; }
}

async function refreshAccessToken() {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem(REFRESH) : null;
  if (!refreshToken) throw new Error('Session expired');
  const res = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken, deviceName: 'LOOKIVA Admin Web' }) });
  if (!res.ok) throw new Error('Session expired');
  const data = unwrapEnvelope<any>(await res.json());
  localStorage.setItem(ACCESS, data.accessToken); localStorage.setItem(REFRESH, data.refreshToken);
  return data.accessToken as string;
}

export async function adminFetch<T = unknown>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(ACCESS) : null;
  const res = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, cache: 'no-store' });
  if (res.status === 401 && retry) {
    try { await refreshAccessToken(); return adminFetch<T>(path, init, false); } catch { clearAdminSession(); }
  }
  if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body?.message || `Request failed (${res.status})`); }
  return unwrapEnvelope<T>(await res.json());
}

export async function loginAdmin(identifier: string, password: string, rememberMe: boolean) {
  const login = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, password, rememberMe, deviceName: 'LOOKIVA Admin Web' }) });
  if (!login.ok) { const body = await login.json().catch(() => ({})); throw new Error(body?.message || 'Unable to sign in'); }
  const tokens = unwrapEnvelope<any>(await login.json());
  const meRes = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
  if (!meRes.ok) throw new Error('Unable to verify administrator permissions');
  const body = unwrapEnvelope<any>(await meRes.json()); const user = (body.user || body) as AdminUser;
  const allowed = user.roleScopes?.some(scope => ['super_admin','platform_admin','platform_moderator','platform_support','country_manager'].includes(scope.roleKey));
  if (!allowed) throw new Error('This account does not have platform administration access');
  localStorage.setItem(ACCESS, tokens.accessToken); localStorage.setItem(REFRESH, tokens.refreshToken); localStorage.setItem(USER, JSON.stringify(user));
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
