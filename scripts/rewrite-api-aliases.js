const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const distRoot = path.join(repoRoot, 'apps', 'api', 'dist');

const aliases = new Map([
  ['shared-types', 'shared-types'],
  ['shared-validation', 'shared-validation'],
  ['api-contracts', 'api-contracts'],
  ['design-tokens', 'design-tokens'],
  ['localization', 'localization'],
  ['shared-config', 'shared-config'],
]);

if (!fs.existsSync(distRoot)) {
  console.error('[rewrite-api-aliases] API dist directory not found:', distRoot);
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

function targetFor(pkg, subpath) {
  const folder = aliases.get(pkg);
  if (!folder) return null;

  let target;
  if (!subpath) {
    target = path.join(distRoot, 'packages', folder, 'src', 'index.js');
  } else {
    const clean = subpath.replace(/^\/+/, '').replace(/\.js$/, '');
    target = path.join(distRoot, 'packages', folder, 'src', clean + '.js');
    if (!fs.existsSync(target)) {
      const indexTarget = path.join(distRoot, 'packages', folder, 'src', clean, 'index.js');
      if (fs.existsSync(indexTarget)) target = indexTarget;
    }
  }
  return target;
}

let changedFiles = 0;
let replacements = 0;
const unresolved = [];

for (const file of walk(distRoot)) {
  let source = fs.readFileSync(file, 'utf8');
  const original = source;

  source = source.replace(
    /(["'])@lookiva\/(shared-types|shared-validation|api-contracts|design-tokens|localization|shared-config)(?:\/([^"'\r\n]+))?\1/g,
    (match, quote, pkg, subpath) => {
      const target = targetFor(pkg, subpath);
      if (!target || !fs.existsSync(target)) {
        unresolved.push({ file: path.relative(repoRoot, file), specifier: match.slice(1, -1), target });
        return match;
      }

      let relative = path.relative(path.dirname(file), target).replace(/\\/g, '/');
      if (!relative.startsWith('.')) relative = './' + relative;
      replacements += 1;
      return quote + relative + quote;
    },
  );

  if (source !== original) {
    fs.writeFileSync(file, source, 'utf8');
    changedFiles += 1;
  }
}

if (unresolved.length) {
  console.error('[rewrite-api-aliases] Unresolved runtime aliases:');
  for (const item of unresolved) {
    console.error(' -', item.file, item.specifier, '=>', item.target || '(unknown)');
  }
  process.exit(1);
}

const remaining = [];
for (const file of walk(distRoot)) {
  const source = fs.readFileSync(file, 'utf8');
  const matches = source.match(/@lookiva\/(shared-types|shared-validation|api-contracts|design-tokens|localization|shared-config)(?:\/[^"'\r\n]+)?/g);
  if (matches) {
    remaining.push({ file: path.relative(repoRoot, file), matches: Array.from(new Set(matches)) });
  }
}

if (remaining.length) {
  console.error('[rewrite-api-aliases] Runtime aliases remain after rewrite:');
  for (const item of remaining) console.error(' -', item.file, item.matches.join(', '));
  process.exit(1);
}

console.log(
  '[rewrite-api-aliases] Rewrote ' +
    replacements +
    ' aliases across ' +
    changedFiles +
    ' compiled JavaScript files.',
);
