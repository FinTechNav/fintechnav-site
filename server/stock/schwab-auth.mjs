import { randomBytes } from 'node:crypto';
import { protect, json, env, readBody, hash, HttpError } from './security.mjs';
import { credentialKey, credentialStatus, issueToken } from './brokerage.mjs';

export const createHandler = (dependencies = {}) =>
  protect(async (request, context, user, store) => {
    const callback = (env('SCHWAB_CALLBACK_URL') || 'https://redday-ai-schwab.netlify.app')
      .trim()
      .replace(/\/+$/, '');
    if (
      !['https://redday-ai-schwab.netlify.app', 'https://fintechnav.com/stock'].includes(callback)
    )
      throw new HttpError(503, 'The registered brokerage callback needs configuration.');
    if (request.method === 'GET') {
      return json({
        ok: true,
        credentialsConfigured: Boolean(env('SCHWAB_CLIENT_ID') && env('SCHWAB_CLIENT_SECRET')),
        callbackUrl: callback,
        ...credentialStatus(await store.get(credentialKey(user), { type: 'json' })),
      });
    }
    if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    const body = await readBody(request);
    if (body.action === 'disconnect') {
      await store.delete(credentialKey(user));
      return json({ ok: true, connected: false });
    }
    if (body.action === 'begin') {
      if (!env('SCHWAB_CLIENT_ID') || !env('SCHWAB_CLIENT_SECRET'))
        throw new HttpError(503, 'The brokerage connection is not configured.');
      const state = randomBytes(32).toString('hex');
      await store.setJSON(`oauth/${hash(state)}`, {
        userId: user.id,
        expiresAt: Date.now() + 600000,
        callback,
      });
      context.cookies.set({
        name: '__Host-stock-oauth',
        value: state,
        httpOnly: true,
        secure: true,
        path: '/',
        sameSite: 'Lax',
        maxAge: 600,
      });
      const url = new URL('https://api.schwabapi.com/v1/oauth/authorize');
      url.search = new URLSearchParams({
        response_type: 'code',
        client_id: env('SCHWAB_CLIENT_ID').trim(),
        redirect_uri: callback,
        state,
      });
      return json({ ok: true, authUrl: url.href });
    }
    if (
      body.action !== 'exchange' ||
      typeof body.code !== 'string' ||
      !/^[a-f0-9]{64}$/.test(body.state || '') ||
      context.cookies.get('__Host-stock-oauth') !== body.state
    ) {
      throw new HttpError(403, 'Start a new Charles Schwab sign-in from this app.');
    }
    const key = `oauth/${hash(body.state)}`;
    const pending = await store.get(key, { type: 'json' });
    if (!pending || pending.userId !== user.id || pending.expiresAt < Date.now())
      throw new HttpError(403, 'This sign-in has expired. Please start again.');
    const claim = await store.setJSON(`${key}/used`, { at: Date.now() }, { onlyIfNew: true });
    if (!claim.modified) throw new HttpError(409, 'This sign-in has already been used.');
    context.cookies.delete('__Host-stock-oauth');
    const record = await issueToken(
      {
        grant_type: 'authorization_code',
        code: body.code,
        redirect_uri: pending.callback || callback,
      },
      null,
      dependencies.fetcher
    );
    await store.setJSON(credentialKey(user), record);
    const saved = await store.get(credentialKey(user), { type: 'json' });
    if (!saved || saved.generation !== record.generation || !credentialStatus(saved).connected)
      throw new HttpError(
        503,
        'Schwab authorized the connection, but it could not be saved. Please report this error before trying again.'
      );
    return json({ ok: true, ...credentialStatus(saved) });
  }, dependencies);
export default createHandler();
