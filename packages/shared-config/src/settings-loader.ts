import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface LookivaSettings {
  backend_ipserver: string;
  backend_port: string;
  db_host: string;
  db_port: string;
  db_user: string;
  db_password: string;
  db_name: string;
  db_schema: string;
  companyName: string;
  redis_host: string;
  redis_port: string;
  minio_host: string;
  minio_port: string;
  minio_use_ssl: string;
  minio_access_key: string;
  minio_secret_key: string;
  jwt_access_secret: string;
  jwt_refresh_secret: string;
  cors_origins: string;
  node_env: string;
  [key: string]: string;
}

export const SETTINGS_FILE_PATH =
  process.env.LOOKIVA_SETTINGS_FILE ||
  path.join('C:', 'lookiva', 'settings.txt');

export function parseSettingsFile(filePath: string = SETTINGS_FILE_PATH): Partial<LookivaSettings> {
  const result: Partial<LookivaSettings> = {};
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`[lookiva-settings] Settings file not found at: ${filePath}`);
      return result;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (key) result[key] = value;
    }
    console.log(`[lookiva-settings] Loaded settings from: ${filePath}`);
  } catch (err) {
    console.error(`[lookiva-settings] Failed to read settings file: ${(err as Error).message}`);
  }
  return result;
}

export function settingsToEnvVars(settings: Partial<LookivaSettings>): Record<string, string> {
  const env: Record<string, string> = {};

  if (settings.node_env) env.NODE_ENV = settings.node_env;

  if (settings.backend_port) {
    env.PORT = settings.backend_port;
    env.API_PORT = settings.backend_port;
  }

  if (
    settings.db_host &&
    settings.db_port &&
    settings.db_user &&
    settings.db_password &&
    settings.db_name
  ) {
    const schema = settings.db_schema || 'public';
    const encodedPass = encodeURIComponent(settings.db_password);
    env.DATABASE_URL = `postgresql://${settings.db_user}:${encodedPass}@${settings.db_host}:${settings.db_port}/${settings.db_name}?schema=${schema}`;
  }

  if (settings.redis_host && settings.redis_port) {
    env.REDIS_URL = `redis://${settings.redis_host}:${settings.redis_port}`;
  }

  if (settings.minio_host) {
    env.MINIO_ENDPOINT = settings.minio_host;
  }
  if (settings.minio_port) env.MINIO_PORT = settings.minio_port;
  if (settings.minio_use_ssl) env.MINIO_USE_SSL = settings.minio_use_ssl;
  if (settings.minio_access_key) env.MINIO_ACCESS_KEY = settings.minio_access_key;
  if (settings.minio_secret_key) env.MINIO_SECRET_KEY = settings.minio_secret_key;

  if (settings.backend_ipserver && settings.backend_port) {
    const base = `http://${settings.backend_ipserver}:${settings.backend_port}`;
    env.NEXT_PUBLIC_API_URL = `${base}/api/v1`;
    env.NEXT_PUBLIC_API_BASE_URL = `${base}/api/v1`;
    env.MOBILE_API_URL = `${base}/api/v1`;
    env.PUBLIC_CUSTOMER_WEB_URL = `http://${settings.backend_ipserver}:3001`;
  }

  if (settings.jwt_access_secret) env.JWT_ACCESS_SECRET = settings.jwt_access_secret;
  if (settings.jwt_refresh_secret) env.JWT_REFRESH_SECRET = settings.jwt_refresh_secret;

  if (settings.cors_origins) env.CORS_ORIGINS = settings.cors_origins;

  if (settings.backend_ipserver && settings.minio_port) {
    const mediaBase = `http://${settings.backend_ipserver}:${settings.minio_port}`;
    env.MEDIA_PUBLIC_BASE_URL = mediaBase;
    env.NEXT_PUBLIC_MEDIA_BASE_URL = mediaBase;
  }

  if (settings.companyName) {
    env.LOOKIVA_COMPANY_NAME = settings.companyName;
  }

  return env;
}

export function applySettingsToProcessEnv(filePath: string = SETTINGS_FILE_PATH): Record<string, string> {
  const settings = parseSettingsFile(filePath);
  const envMap = settingsToEnvVars(settings);
  let applied = 0;
  for (const [key, value] of Object.entries(envMap)) {
    if (value && process.env[key] === undefined) {
      process.env[key] = value;
      applied++;
    }
  }
  console.log(`[lookiva-settings] Applied ${applied} environment variables from settings file`);
  return envMap;
}

export function getBackendApiBaseUrl(settings?: Partial<LookivaSettings>): string | null {
  const s = settings ?? parseSettingsFile();
  if (s.backend_ipserver && s.backend_port) {
    return `http://${s.backend_ipserver}:${s.backend_port}/api/v1`;
  }
  return null;
}
