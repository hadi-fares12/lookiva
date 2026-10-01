import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const projectRoot = resolve(__dirname, '..');
process.chdir(projectRoot);

let loaderPath;
try {
  const ts = require.resolve('ts-node/esm');
  loaderPath = ts;
} catch {
  loaderPath = null;
}

const sharedConfigPkg = require.resolve('@lookiva/shared-config', {
  paths: [projectRoot],
});
const sharedConfigDir = dirname(dirname(sharedConfigPkg));
const loaderSrc = join(sharedConfigDir, 'src', 'settings-loader.ts');

const { applySettingsToProcessEnv } = await import(loaderPath).catch(async () => {
  const fallback = join(projectRoot, 'packages', 'shared-config', 'src', 'settings-loader.ts');
  return await import(fallback);
});

applySettingsToProcessEnv();

console.log('[lookiva-preload] Settings applied. Remaining args:', process.argv.slice(2).join(' '));

if (process.argv.length > 2) {
  const { spawnSync } = await import('child_process');
  const cmd = process.argv[2];
  const args = process.argv.slice(3);
  const result = spawnSync(cmd, args, {
    cwd: projectRoot,
    env: { ...process.env },
    stdio: 'inherit',
    shell: true,
  });
  process.exit(result.status ?? 0);
}
