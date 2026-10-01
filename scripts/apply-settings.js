const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = process.env.LOOKIVA_SETTINGS_FILE || 'C:\\lookiva\\settings.txt';

function parseSettings(filePath) {
  const result = {};
  try {
    if (!fs.existsSync(filePath)) {
      console.warn('[lookiva] Settings file not found at:', filePath);
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
    console.log('[lookiva] Loaded settings from:', filePath);
  } catch (err) {
    console.error('[lookiva] Failed to read settings:', err.message);
  }
  return result;
}

function toEnvVars(settings) {
  const env = {};

  if (settings.node_env) env.NODE_ENV = settings.node_env;
  if (settings.backend_port) {
    env.PORT = settings.backend_port;
    env.API_PORT = settings.backend_port;
  }

  if (settings.db_host && settings.db_port && settings.db_user && settings.db_password && settings.db_name) {
    const schema = settings.db_schema || 'public';
    const encodedPass = encodeURIComponent(settings.db_password);
    env.DATABASE_URL = `postgresql://${settings.db_user}:${encodedPass}@${settings.db_host}:${settings.db_port}/${settings.db_name}?schema=${schema}`;
  }

  if (settings.redis_host && settings.redis_port) {
    env.REDIS_URL = `redis://${settings.redis_host}:${settings.redis_port}`;
  }

  if (settings.minio_host) env.MINIO_ENDPOINT = settings.minio_host;
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

function writeEnvFile(targetPath, envVars, overrideExisting = false) {
  const lines = [];
  const existing = {};
  if (fs.existsSync(targetPath) && !overrideExisting) {
    const raw = fs.readFileSync(targetPath, 'utf-8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) { lines.push(line); continue; }
      const eq = trimmed.indexOf('=');
      if (eq !== -1) {
        const k = trimmed.slice(0, eq).trim();
        existing[k] = trimmed.slice(eq + 1).trim();
      } else {
        lines.push(line);
      }
    }
  }

  const merged = { ...existing, ...envVars };
  const finalLines = [];
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined && v !== null) finalLines.push(`${k}=${v}`);
  }
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, finalLines.join('\n') + '\n', 'utf-8');
  console.log(`[lookiva] Wrote ${Object.keys(envVars).length} settings to ${targetPath}`);
}

const settings = parseSettings(SETTINGS_FILE);
const envVars = toEnvVars(settings);

const mode = process.argv[2] || 'root';
const projectRoot = path.resolve(__dirname, '..');

if (mode === 'root' || mode === 'all') {
  writeEnvFile(path.join(projectRoot, '.env.local'), envVars);
}
if (mode === 'api' || mode === 'all') {
  writeEnvFile(path.join(projectRoot, 'apps', 'api', '.env.local'), envVars);
}
if (mode === 'customer' || mode === 'all') {
  writeEnvFile(path.join(projectRoot, 'apps', 'customer-web', '.env.local'), envVars);
}
if (mode === 'business' || mode === 'all') {
  writeEnvFile(path.join(projectRoot, 'apps', 'business-web', '.env.local'), envVars);
}
if (mode === 'admin' || mode === 'all') {
  writeEnvFile(path.join(projectRoot, 'apps', 'admin-web', '.env.local'), envVars);
}
if (mode === 'workers' || mode === 'all') {
  writeEnvFile(path.join(projectRoot, 'apps', 'workers', '.env.local'), envVars);
}

console.log('[lookiva] Settings sync complete. Company:', settings.companyName || 'LOOKIVA');
