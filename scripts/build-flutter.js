'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const target = process.argv[2] || 'all';
const valid = new Set(['customer', 'business', 'all']);
if (!valid.has(target)) {
  console.error('Usage: node scripts/build-flutter.js [customer|business|all]');
  process.exit(2);
}

const isProduction = process.env.NODE_ENV === 'production';
const apiUrl =
  process.env.LOOKIVA_API_URL ||
  process.env.MOBILE_API_URL ||
  (isProduction ? '' : 'http://10.0.2.2:4000/api/v1');

if (!apiUrl) {
  console.error('LOOKIVA_API_URL or MOBILE_API_URL is required for production Flutter builds.');
  process.exit(2);
}
if (isProduction && !apiUrl.startsWith('https://')) {
  console.error('Production Flutter builds require an HTTPS API URL.');
  process.exit(2);
}

const mode = (process.env.LOOKIVA_BUILD_MODE || (isProduction ? 'release' : 'debug')).toLowerCase();
if (!['debug', 'release', 'profile'].includes(mode)) {
  console.error('LOOKIVA_BUILD_MODE must be debug, profile, or release.');
  process.exit(2);
}

const apps = target === 'all'
  ? [['customer', 'customer-mobile'], ['business', 'business-mobile']]
  : [[target, target === 'customer' ? 'customer-mobile' : 'business-mobile']];

function run(cwd, command, args) {
  console.log('\n>', command, ...args);
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status || 1);
}

for (const [label, dir] of apps) {
  const cwd = path.join(__dirname, '..', 'apps', dir);
  console.log(`\n=== LOOKIVA ${label} Flutter build (${mode}) ===`);
  console.log(`API: ${apiUrl}`);
  run(cwd, 'flutter', ['pub', 'get']);
  run(cwd, 'flutter', ['analyze', '--no-fatal-infos']);
  run(cwd, 'flutter', ['test']);
  run(cwd, 'flutter', ['build', 'apk', `--${mode}`, `--dart-define=LOOKIVA_API_URL=${apiUrl}`]);
}

console.log('\nFlutter build(s) completed successfully.');
