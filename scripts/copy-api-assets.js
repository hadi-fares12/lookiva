const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const source = path.join(repoRoot, 'packages', 'localization', 'src', 'locales');
const target = path.join(repoRoot, 'apps', 'api', 'dist', 'packages', 'localization', 'src', 'locales');

if (!fs.existsSync(source)) {
  console.error('[copy-api-assets] Localization source directory not found:', source);
  process.exit(1);
}

fs.mkdirSync(target, { recursive: true });

for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
  fs.copyFileSync(path.join(source, entry.name), path.join(target, entry.name));
}

const copied = fs.readdirSync(target).filter((name) => name.endsWith('.json'));
if (!copied.length) {
  console.error('[copy-api-assets] No localization JSON files were copied.');
  process.exit(1);
}

console.log('[copy-api-assets] Copied localization assets:', copied.join(', '));
