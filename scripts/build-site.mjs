import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
// Publish an allowlist, never the repository: logs, research, credentials,
// backend code, dependencies and workspace configuration are not web assets.
const directories = ['js', 'styles', 'sections', 'icons', 'logos', 'content'];
// New sites must be explicitly added here. Legacy HPW demos remain source-only.
const pages = ['index.html', 'privacy-policy.html'];
const rootAssets = /\.(?:png|jpe?g|webp|svg|ico|woff2?|ttf)$/i;
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
if (process.env.SITE_ID === '8812c48b-7a67-41dc-b636-5ee0f74d911c') {
  await writeFile(
    path.join(output, 'index.html'),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Opening your stock app</title></head><body><p>Opening your stock app…</p><script>
for (const storage of [localStorage, sessionStorage]) {
  storage.removeItem('redday_ai_pwa_state_v2');
  storage.removeItem('redday_ai_auth_session_v1');
}
window.location.replace('https://fintechnav.com/stock' + window.location.search + window.location.hash);
</script><noscript><a href="https://fintechnav.com/stock">Open your stock app</a></noscript></body></html>`
  );
  console.log('Built the registered OAuth callback relay; no portfolio assets included.');
  process.exit(0);
}

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (
    entry.isFile() &&
    (rootAssets.test(entry.name) ||
      [...pages, 'robots.txt', 'sitemap.xml', 'manifest.json'].includes(entry.name))
  ) {
    await cp(path.join(root, entry.name), path.join(output, entry.name));
  }
}
for (const directory of directories) {
  await cp(path.join(root, directory), path.join(output, directory), {
    recursive: true,
    filter: (source) =>
      !path
        .relative(root, source)
        .split(path.sep)
        .some((part) => part.startsWith('.')),
  });
}
await mkdir(path.join(output, 'stock'), { recursive: true });
for (const name of [
  'index.html',
  'app.js',
  'manifest.json',
  'sw.js',
  'icon.svg',
  'clear-legacy-auth.js',
  'identity-redirect.js',
]) {
  await cp(path.join(root, 'stock', name), path.join(output, 'stock', name));
}
await build({
  entryPoints: [path.join(root, 'stock/auth-client.js')],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2020',
  outfile: path.join(output, 'stock/auth-client.js'),
});
console.log('Built public assets in dist; server code and workspace files excluded.');
