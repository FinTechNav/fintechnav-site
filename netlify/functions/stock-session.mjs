import { login, logout, refreshSession, verifyRequestOrigin } from '@netlify/identity';
import {
  ownerEmail,
  json,
  checkOrigin,
  readBody,
  verifyOwner,
  hardenCookies,
  HttpError,
} from '../../server/stock/security.mjs';

export const createHandler =
  (identity = { login, logout, refreshSession, verifyRequestOrigin }, owner = verifyOwner) =>
  async (request, context) => {
    // Netlify reads cookies from the incoming request; SDK writes affect the
    // outgoing response. Capture the newly issued cookies for this request's
    // owner check and make them HttpOnly at the moment they are written.
    const cookies = context.cookies;
    const originalSet = cookies.set;
    const originalDelete = cookies.delete;
    const issued = new Map();
    cookies.set = (cookie) => {
      if (['nf_jwt', 'nf_refresh'].includes(cookie.name)) {
        issued.set(cookie.name, cookie.value);
        return originalSet.call(cookies, {
          ...cookie,
          httpOnly: true,
          secure: true,
          path: '/',
          sameSite: 'Lax',
        });
      }
      return originalSet.call(cookies, cookie);
    };
    cookies.delete = (cookie) => {
      issued.set(typeof cookie === 'string' ? cookie : cookie.name, null);
      return originalDelete.call(cookies, cookie);
    };
    const current = {
      ...context,
      cookies: {
        get: (name) => (issued.has(name) ? issued.get(name) : cookies.get(name)),
        set: (cookie) => cookies.set(cookie),
        delete: (cookie) => cookies.delete(cookie),
      },
    };
    try {
      checkOrigin(request);
      if (request.method === 'POST') {
        identity.verifyRequestOrigin(request);
        const body = await readBody(request);
        if (body.action === 'logout') {
          await identity.logout();
          return json({ ok: true });
        }
        if (body.action === 'refresh') {
          await identity.refreshSession();
        } else if (
          body.action !== 'login' ||
          body.email?.toLowerCase() !== ownerEmail() ||
          typeof body.password !== 'string'
        ) {
          throw new HttpError(401, 'Email or password is incorrect.');
        } else {
          await identity.login(ownerEmail(), body.password);
        }
      } else if (request.method === 'GET') {
        // Refresh only via a same-origin POST; GET has no authentication mutations.
      } else {
        throw new HttpError(405, 'Method not allowed.');
      }
      const user = await owner(request, current);
      hardenCookies(current);
      return json({ ok: true, user: { email: user.email } });
    } catch (error) {
      return json(
        { ok: false, error: error instanceof HttpError ? error.message : 'Please sign in again.' },
        error.status || 401
      );
    } finally {
      cookies.set = originalSet;
      cookies.delete = originalDelete;
    }
  };
export default createHandler();
export const config = {
  path: '/api/stock-session',
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
