import { login, logout, refreshSession, verifyRequestOrigin } from '@netlify/identity';
import {
  OWNER_EMAIL,
  json,
  checkOrigin,
  readBody,
  verifyOwner,
  hardenCookies,
  HttpError,
} from '../../server/stock/security.mjs';

export default async (request, context) => {
  try {
    checkOrigin(request);
    if (request.method === 'POST') {
      verifyRequestOrigin(request);
      const body = await readBody(request);
      if (body.action === 'logout') {
        await logout();
        return json({ ok: true });
      }
      if (body.action === 'refresh') {
        await refreshSession();
      } else if (
        body.action !== 'login' ||
        body.email?.toLowerCase() !== OWNER_EMAIL ||
        typeof body.password !== 'string'
      ) {
        throw new HttpError(401, 'Email or password is incorrect.');
      } else {
        await login(OWNER_EMAIL, body.password);
      }
    } else if (request.method === 'GET') {
      // Refresh only via a same-origin POST; GET has no authentication mutations.
    } else {
      throw new HttpError(405, 'Method not allowed.');
    }
    hardenCookies(context);
    const user = await verifyOwner(request, context);
    return json({ ok: true, user: { email: user.email } });
  } catch (error) {
    return json(
      { ok: false, error: error instanceof HttpError ? error.message : 'Please sign in again.' },
      error.status || 401
    );
  }
};
export const config = {
  path: '/api/stock-session',
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
