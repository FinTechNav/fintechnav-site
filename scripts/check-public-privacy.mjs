import { execFileSync } from 'node:child_process';

// Scan the Git index's file list, including staged additions, without ever
// printing matching contents. Intentional professional biography is public.
const paths = execFileSync('git', ['ls-files', '--cached', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
const failures = [];
const reviewedRootImages = new Set([
  'brad-in-vienna.jpg',
  'favicon-192.png',
  'favicon-512.png',
  'favicon.ico',
  'site-preview.png',
]);
for (const path of paths) {
  if (
    /^(?:\.agents|\.codex|\.netlify|artifacts\/local)(?:\/|$)/.test(path) ||
    /(?:^|\/)\.env(?!\.example$)/.test(path) ||
    /\.(?:bundle|har|pem|p12|key)$/i.test(path)
  ) {
    failures.push(`${path}: private file type or directory`);
    continue;
  }
  if (
    /\.(?:png|jpe?g|webp|gif|pdf|csv|xlsx?|docx?)$/i.test(path) &&
    !reviewedRootImages.has(path) &&
    !path.startsWith('logos/')
  )
    failures.push(`${path}: binary/data artifact requires an explicit public-content review`);
  const data = execFileSync('git', ['show', ':' + path], { maxBuffer: 32 * 1024 * 1024 });
  if (data.includes(0)) continue;
  const text = data.toString('utf8');
  if (path === 'stock/index.html' && /id="input-schwab-(?:key|secret)"/.test(text))
    failures.push(`${path}: brokerage credentials must be server-owned`);
  if (/\/Users\/[a-zA-Z0-9._-]+\//.test(text) || /\/home\/[a-zA-Z0-9._-]+\//.test(text))
    failures.push(`${path}: personal machine path`);
  if (/(?:accountNumber|account_number)\s*["']?\s*:\s*["']?\d{6,}/i.test(text))
    failures.push(`${path}: possible brokerage account number`);
  if (/^(?:stock|server\/stock)\//.test(path) || path === 'netlify/functions/stock-session.mjs') {
    if (/[A-Z0-9._%+-]+@(?!example\.(?:test|com)\b)[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text))
      failures.push(`${path}: private app must not hardcode a real login address`);
  }
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(
  `Privacy guard passed for ${paths.length} tracked files. Credential scanning remains a separate required check.`
);
