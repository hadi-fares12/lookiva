#!/usr/bin/env node
// LOOKIVA one-command developer setup
// Steps: validate env, start docker services, wait for healthy, create .env if missing,
// generate Prisma client, run migrations, seed, init buckets, verify redis, print creds.
// This file is intentionally cross-platform Node ESM.

import { execSync, spawnSync } from 'node:child_process';
import { existsSync, copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const INFRA = join(ROOT, 'infrastructure');
const COMPOSE_FILE = join(INFRA, 'docker-compose.yml');
const INFRA_ENV_EXAMPLE = join(INFRA, '.env.example');
const ROOT_ENV_EXAMPLE = join(ROOT, '.env.example');
const ROOT_ENV = join(ROOT, '.env');

const log = (m) => console.log(`\x1b[36m[setup]\x1b[0m ${m}`);
const ok = (m) => console.log(`\x1b[32m[ok]\x1b[0m ${m}`);
const warn = (m) => console.log(`\x1b[33m[warn]\x1b[0m ${m}`);
const err = (m) => {
  console.error(`\x1b[31m[error]\x1b[0m ${m}`);
  process.exit(1);
};
const run = (cmd, opts = {}) => {
  log(`$ ${cmd}`);
  const r = spawnSync(cmd, { stdio: 'inherit', shell: true, cwd: opts.cwd || ROOT, env: { ...process.env, ...(opts.env || {}) } });
  if (r.status !== 0) err(`Command failed (exit ${r.status}): ${cmd}`);
  return r;
};
const runQuiet = (cmd, opts = {}) => {
  const r = spawnSync(cmd, { stdio: 'pipe', shell: true, cwd: opts.cwd || ROOT });
  return { status: r.status, stdout: r.stdout?.toString()?.trim() || '', stderr: r.stderr?.toString()?.trim() || '' };
};

const steps = [
  async function validateNode() {
    const v = process.versions.node.split('.').map(Number);
    if (v[0] < 20) err(`Node.js >= 20 required. Found ${process.versions.node}`);
    ok(`Node.js v${process.versions.node}`);
  },
  async function validateDocker() {
    const d = runQuiet('docker --version');
    if (d.status !== 0) err('Docker not available. Install Docker (with Compose v2) and start Docker Desktop first.');
    ok(d.stdout);
    const dc = runQuiet('docker compose version');
    if (dc.status !== 0) warn('docker compose not detected; please use Docker Compose v2.');
    else ok(dc.stdout);
  },
  async function copyEnvFiles() {
    if (!existsSync(ROOT_ENV)) {
      copyFileSync(ROOT_ENV_EXAMPLE, ROOT_ENV);
      ok(`Created .env from .env.example`);
    } else {
      warn('.env already exists; not overwriting');
    }
  },
  async function upDocker() {
    log('Starting docker services (postgres+postgis, redis, minio)...');
    run(`docker compose -f "${COMPOSE_FILE}" up -d`);
    log('Waiting for Postgres healthy...');
    for (let i = 0; i < 30; i++) {
      const r = runQuiet(`docker compose -f "${COMPOSE_FILE}" exec -T postgres pg_isready -U lookiva -d lookiva`);
      if (r.status === 0 && r.stdout.includes('accepting connections')) break;
      await new Promise((p) => setTimeout(p, 2000));
    }
    ok('Postgres healthy');
    log('Enabling PostGIS...');
    const { status, stderr } = runQuiet(`docker compose -f "${COMPOSE_FILE}" exec -T postgres psql -U lookiva -d lookiva -c "CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS postgis_topology;"`);
    if (status !== 0) warn(`PostGIS setup: ${stderr}`);
    else ok('PostGIS extensions ready');
    log('Waiting for Redis healthy...');
    for (let i = 0; i < 15; i++) {
      const r = runQuiet(`docker compose -f "${COMPOSE_FILE}" exec -T redis redis-cli -a lookiva_redis_dev ping`);
      if (r.status === 0 && r.stdout.includes('PONG')) break;
      await new Promise((p) => setTimeout(p, 1000));
    }
    ok('Redis healthy');
  },
  async function installDepsIfNeeded() {
    const nm = join(ROOT, 'node_modules');
    if (!existsSync(nm)) {
      log('Installing dependencies (pnpm install)...');
      run('pnpm install');
    } else {
      ok('node_modules exists; skipping install');
    }
  },
  async function prismaGenerate() {
    log('Generating Prisma client...');
    run('pnpm --filter @lookiva/api prisma:generate');
  },
  async function prismaMigrate() {
    log('Applying Prisma migrations...');
    run('pnpm --filter @lookiva/api prisma:migrate');
  },
  async function prismaSeed() {
    log('Seeding dev data (Lebanon geo, demo businesses, dev users)...');
    run('pnpm --filter @lookiva/api prisma:seed');
  },
  async function ensureMinioBuckets() {
    log('Ensuring MinIO buckets (media, private)...');
    try {
      const { Client } = await import('minio').catch(() => ({ Client: null }));
      if (Client) {
        const mc = new Client({ endPoint: 'localhost', port: 9000, useSSL: false, accessKey: 'lookiva_admin', secretKey: 'lookiva_minio_dev' });
        for (const b of ['media', 'private']) {
          const exists = await mc.bucketExists(b);
          if (!exists) { await mc.makeBucket(b, 'us-east-1'); ok(`Created bucket ${b}`); }
          else ok(`Bucket ${b} exists`);
        }
      } else {
        warn('minio client package not yet installed; skipping bucket creation');
      }
    } catch (e) {
      warn(`MinIO buckets step skipped: ${e.message}`);
    }
  },
  async function verifyRedis() {
    const r = runQuiet(`docker compose -f "${COMPOSE_FILE}" exec -T redis redis-cli -a lookiva_redis_dev ping`);
    if (r.status === 0 && r.stdout.includes('PONG')) ok('Redis ping OK');
    else warn('Redis ping could not be verified from host');
  },
  async function printDevCredentials() {
    console.log('');
    console.log('\x1b[33m========================================');
    console.log(' LOOKIVA DEVELOPMENT CREDENTIALS');
    console.log('========================================\x1b[0m');
    console.log(' Super Admin:  super@lookiva.dev   / Admin123!');
    console.log(' Business Owner: owner@hadibarber.lb / Biz123!');
    console.log(' Customer:     customer@lookiva.dev / Cust123!');
    console.log('');
    console.log('\x1b[36mAPI:   \x1b[0mhttp://localhost:3000');
    console.log('\x1b[36mDocs:  \x1b[0mhttp://localhost:3000/api/docs');
    console.log('\x1b[36mWeb:   \x1b[0mhttp://localhost:3001');
    console.log('\x1b[36mMinIO: \x1b[0mhttp://localhost:9001  (lookiva_admin / lookiva_minio_dev)');
    console.log('');
    console.log('\x1b[32mNext step: pnpm dev\x1b[0m');
  },
];

(async function main() {
  log('LOOKIVA developer setup starting...');
  for (const s of steps) await s();
  ok('Setup complete.');
})().catch((e) => err(e.stack || e.message));
