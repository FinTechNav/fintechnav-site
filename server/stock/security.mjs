import { createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';

export const IDENTITY_URL = 'https://fintechnav.com/.netlify/identity';
export const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'Netlify-CDN-Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  Vary: 'Cookie',
};
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const json = (body, status = 200) =>
  Response.json(body, { status, headers: PRIVATE_HEADERS });
export const env = (name) => globalThis.Netlify?.env?.get(name) ?? process.env[name];
export function ownerEmail() {
  const value = String(env('STOCK_OWNER_EMAIL') || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    throw new HttpError(503, 'Private stock account configuration is unavailable.');
  return value;
}
export const hash = (value) => createHash('sha256').update(value).digest('hex');

export function checkOrigin(request) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    if (request.headers.get('origin') !== new URL(request.url).origin) {
      throw new HttpError(403, 'Request origin is not allowed.');
    }
    if (!request.headers.get('content-type')?.startsWith('application/json')) {
      throw new HttpError(415, 'Use application/json.');
    }
  }
}
export async function readBody(request) {
  const text = await request.text();
  if (Buffer.byteLength(text) > 32768) throw new HttpError(413, 'Request is too large.');
  try {
    const value = JSON.parse(text);
    if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error();
    return value;
  } catch {
    throw new HttpError(400, 'Invalid JSON request.');
  }
}
export function hardenCookies(context) {
  for (const name of ['nf_jwt', 'nf_refresh']) {
    const value = context.cookies?.get(name);
    if (value)
      context.cookies.set({
        name,
        value,
        httpOnly: true,
        secure: true,
        path: '/',
        sameSite: 'Lax',
      });
  }
}
// Validate with Identity's authenticated /user endpoint on EVERY request. Do
// not decode an unverified JWT or accept a browser-supplied email/user header.
export async function verifyOwner(request, context, fetcher = fetch) {
  checkOrigin(request);
  const jwt = context.cookies?.get('nf_jwt');
  if (!jwt) throw new HttpError(401, 'Sign in to your stock account.');
  let response;
  try {
    response = await fetcher(`${IDENTITY_URL}/user`, {
      headers: { Authorization: `Bearer ${jwt}` },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new HttpError(503, 'Sign-in verification is temporarily unavailable.');
  }
  if (!response.ok)
    throw new HttpError(response.status >= 500 ? 503 : 401, 'Please sign in again.');
  const user = await response.json();
  if (!user.id || user.email?.toLowerCase() !== ownerEmail() || !user.confirmed_at) {
    throw new HttpError(403, 'This stock account is private.');
  }
  hardenCookies(context);
  return { id: user.id, email: user.email };
}
export function privateStore(request, context, storeFactory = getStore) {
  // Preview credentials and approvals must never touch production objects.
  // CONTEXT/DEPLOY_ID are build variables, not guaranteed function variables.
  const scope =
    context?.deploy?.context === 'production'
      ? 'production'
      : context?.deploy?.id
        ? `preview-${context.deploy.id}`
        : null;
  if (!scope) throw new HttpError(503, 'Private storage deployment context is unavailable.');
  return storeFactory({ name: `stock-private-${scope}`, consistency: 'strong' });
}
export function protect(handler, { owner = verifyOwner, store = privateStore } = {}) {
  return async (request, context) => {
    try {
      const user = await owner(request, context);
      return await handler(request, context, user, store(request, context));
    } catch (error) {
      if (!(error instanceof HttpError)) console.error('Stock request failed', error.name);
      return json(
        {
          ok: false,
          error: error instanceof HttpError ? error.message : 'Request failed. Please try again.',
        },
        error.status || 500
      );
    }
  };
}
export function cleanState(value) {
  // Credentials, account identifiers, positions and execution history are never
  // copied into a Gist. Only non-secret UI preferences may be synchronized.
  if (!value || typeof value !== 'object') return {};
  const result = {};
  if (value.rules && typeof value.rules === 'object') {
    const allowed = [
      'landlordRedTriggerPct',
      'sliceRedTriggerPct',
      'oversoldRsiThreshold',
      'zScoreTrigger',
      'harvestGainPct',
      'maxSingleStockWeightPct',
    ];
    result.rules = Object.fromEntries(
      allowed
        .filter((key) => Number.isFinite(value.rules[key]))
        .map((key) => [key, value.rules[key]])
    );
  }
  if (Array.isArray(value.watchlist))
    result.watchlist = value.watchlist
      .slice(0, 30)
      .filter((item) => /^[A-Z][A-Z0-9.]{0,9}$/.test(item?.symbol || ''))
      .map((item) => ({
        symbol: item.symbol,
        bucket: String(item.bucket || '').slice(0, 80),
        role: String(item.role || '').slice(0, 300),
        sp500Slice: item.sp500Slice === true,
      }));
  if (Number.isFinite(value.deployBudget))
    result.deployBudget = Math.max(0, Math.min(100, value.deployBudget));
  if (['NORMAL', 'EXTENDED', 'SEAMLESS'].includes(value.sessionTiming))
    result.sessionTiming = value.sessionTiming;
  return result;
}
