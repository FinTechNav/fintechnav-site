import { gunzipSync } from 'node:zlib';
import { env, cleanState, HttpError } from './security.mjs';
import views from '../../stock/portfolio-views.js';

function objectSetting(name) {
  const raw = env(name);
  if (!raw) return {};
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    throw new HttpError(503, 'Private view configuration is unavailable.');
  }
}
export function legacyProfileIds() {
  const value = objectSetting('STOCK_PROFILE_LEGACY_IDS');
  return Object.fromEntries(views.PERSONAL.map((id) => [id, String(value[id] || id)]));
}
export function canonicalProfile(id) {
  if (views.PERSONAL.includes(id)) return id;
  return Object.entries(legacyProfileIds()).find(([, old]) => old === id)?.[0] || null;
}
export function profileLabels() {
  const value = objectSetting('STOCK_PROFILE_LABELS');
  return Object.fromEntries(
    views.PERSONAL.map((id, i) => {
      const label = value[id] || ['Primary', 'Partner'][i];
      if (
        typeof label !== 'string' ||
        !label.trim() ||
        label.length > 60 ||
        /[<>\x00-\x1f]/.test(label)
      )
        throw new HttpError(503, 'Private view configuration is unavailable.');
      return [id, label.trim()];
    })
  );
}
export function privateDefaults() {
  const packed = env('STOCK_VIEW_SEED_GZIP');
  if (!packed) return null;
  try {
    const seed = JSON.parse(gunzipSync(Buffer.from(packed, 'base64'), { maxOutputLength: 32768 }));
    const preferences = views.PERSONAL.map((id) => {
      const result = cleanState(seed.profiles?.[id]);
      if (!Array.isArray(result.watchlist) || Object.keys(result.rules || {}).length !== 6)
        throw new Error();
      return result;
    });
    return views.defaults(...preferences);
  } catch {
    throw new HttpError(503, 'Private view defaults are unavailable.');
  }
}
// Read legacy keys without changing their quantities or writing during a GET.
// The next explicit compare-and-swap save persists the neutral schema.
export function normalizeViewDocument(value) {
  if (!value) return null;
  const document = structuredClone(value);
  const aliases = legacyProfileIds();
  const map = (entry) =>
    Object.fromEntries(views.PERSONAL.map((id) => [id, entry[id] ?? entry[aliases[id]]]));
  document.profiles = map(document.profiles || {});
  document.assignment ||= { allocations: {}, baselineFills: {} };
  document.assignment.allocations = Object.fromEntries(
    Object.entries(document.assignment.allocations || {}).map(([symbol, entry]) => [
      symbol,
      map(entry),
    ])
  );
  if (document.assignment.initialOwner) {
    const owner = canonicalProfile(document.assignment.initialOwner);
    if (owner !== 'primary')
      throw new HttpError(503, 'Share attribution needs configuration review.');
    document.assignment.initialOwner = owner;
  }
  if (views.PERSONAL.some((id) => !document.profiles[id]))
    throw new HttpError(503, 'Private view migration is unavailable.');
  return document;
}
