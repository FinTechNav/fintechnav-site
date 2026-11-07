import { randomBytes } from 'node:crypto';
import { env, HttpError, hash } from './security.mjs';

export const BROKER = 'https://api.schwabapi.com/trader/v1';
export const cleanCredential = (val) =>
  typeof val === 'string' ? val.trim().replace(/^["'](.*)["']$/, '$1').trim() : '';
export const credentialKey = (user) => `credentials/${hash(user.id)}`;
export const credentialStatus = (record) => ({
  connected: Boolean(record?.refreshToken && record.refreshTokenExpiresAt > Date.now()),
  accessTokenExpiresAt: record?.accessTokenExpiresAt || 0,
  refreshTokenExpiresAt: record?.refreshTokenExpiresAt || 0,
});
export async function issueToken(params, previous, fetcher = fetch) {
  const clientId = cleanCredential(env('SCHWAB_CLIENT_ID'));
  const secret = cleanCredential(env('SCHWAB_CLIENT_SECRET'));
  if (!clientId || !secret) throw new HttpError(503, 'The brokerage connection is not configured.');
  const response = await fetcher('https://api.schwabapi.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams(params).toString(),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    // Only classify known machine codes. Never log provider bodies, which can
    // contain authorization codes, credentials or account information.
    const reason = ['invalid_client', 'invalid_grant', 'invalid_request'].includes(data.error)
      ? data.error
      : 'upstream_rejection';
    console.warn('Schwab token request rejected', { status: response.status, reason });
    if (reason === 'invalid_client')
      throw new HttpError(
        503,
        'Schwab rejected the app credentials. The app connection settings need repair; signing in again will not fix this. Please verify in the Schwab Developer Portal that the app status is "Ready for use" (not "Approved - Pending"), Netlify SCHWAB_CLIENT_ID and SCHWAB_CLIENT_SECRET match the portal App Key & Secret, and the registered Callback URL is https://redday-ai-schwab.netlify.app without a trailing slash.'
      );
    if (reason === 'invalid_grant')
      throw new HttpError(
        409,
        previous
          ? 'Your Schwab authorization has expired or been revoked. Reconnect Charles Schwab.'
          : 'Schwab rejected the authorization code. Start a new Schwab connection and complete it promptly.'
      );
    // A broker rejection is not an expired stock-app session. Returning 401
    // would make the browser replay this single-use authorization exchange.
    throw new HttpError(
      502,
      'Schwab could not complete the connection. Please try a new connection; if it repeats, the app settings need review.'
    );
  }
  const data = await response.json();
  if (!data.access_token || !(data.refresh_token || previous?.refreshToken))
    throw new HttpError(502, 'The brokerage returned an incomplete connection.');
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || previous.refreshToken,
    accessTokenExpiresAt: Date.now() + Number(data.expires_in || 1800) * 1000,
    refreshTokenExpiresAt: previous?.refreshTokenExpiresAt || Date.now() + 7 * 86400000,
    generation: previous?.generation || randomBytes(24).toString('hex'),
    accountHash: previous?.accountHash || null,
  };
}
export async function getCredentials(store, user, fetcher = fetch) {
  let record = await store.get(credentialKey(user), { type: 'json' });
  if (!credentialStatus(record).connected)
    throw new HttpError(409, 'Connect your Charles Schwab account.');
  if (record.accessTokenExpiresAt < Date.now() + 60000) {
    record = await issueToken(
      { grant_type: 'refresh_token', refresh_token: record.refreshToken },
      record,
      fetcher
    );
    await store.setJSON(credentialKey(user), record);
  }
  return record;
}
export async function brokerGet(path, record, fetcher = fetch) {
  const response = await fetcher(`${BROKER}${path}`, {
    headers: { Authorization: `Bearer ${record.accessToken}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new HttpError(
      response.status === 401 ? 409 : 502,
      response.status === 401
        ? 'Schwab rejected the saved connection. Reconnect Charles Schwab.'
        : 'Could not verify brokerage data. No new orders were submitted by this check.'
    );
  return response.json();
}
export async function selectedAccount(store, user, record, fetcher = fetch) {
  const accounts = await brokerGet('/accounts/accountNumbers', record, fetcher);
  // Never accept an arbitrary target account from a request body.
  if (!Array.isArray(accounts) || accounts.length !== 1 || !accounts[0]?.hashValue) {
    throw new HttpError(409, 'A single trading account must be configured before using this app.');
  }
  record.accountHash = accounts[0].hashValue;
  await store.setJSON(credentialKey(user), record);
  return record.accountHash;
}
