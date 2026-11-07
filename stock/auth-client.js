import {
  handleAuthCallback,
  acceptInvite,
  updateUser,
  requestPasswordRecovery,
} from '@netlify/identity';

let pending = null;
async function request(body) {
  const response = await fetch(
    '/api/stock-session',
    body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : { cache: 'no-store' }
  );
  const data = await response.json();
  if (!response.ok)
    throw Object.assign(new Error(data.error || 'Please sign in again.'), {
      status: response.status,
    });
  return data;
}
window.StockAuth = {
  async initialize() {
    const result = await handleAuthCallback();
    if (result?.type === 'invite' || result?.type === 'recovery') pending = result;
    if (pending?.type === 'invite') return { setup: true };
    if (pending?.type === 'recovery') return { setup: true };
    try {
      return await request();
    } catch (error) {
      if (error.status === 401) {
        try {
          return await request({ action: 'refresh' });
        } catch {
          /* Show sign-in below. */
        }
      }
      return { ok: false };
    }
  },
  async login(email, password) {
    if (pending?.type === 'invite') {
      await acceptInvite(pending.token, password);
      pending = null;
      // The callback library initially creates its own cookies. The server
      // immediately validates the user and replaces them with HttpOnly cookies.
      const session = await request();
      localStorage.removeItem('gotrue.user');
      sessionStorage.removeItem('gotrue.user');
      window.location.reload();
      return session;
    }
    if (pending?.type === 'recovery') {
      await updateUser({ password });
      pending = null;
      const session = await request();
      localStorage.removeItem('gotrue.user');
      sessionStorage.removeItem('gotrue.user');
      window.location.reload();
      return session;
    }
    return request({ action: 'login', email, password });
  },
  refresh: () => request({ action: 'refresh' }),
  logout: () => request({ action: 'logout' }),
  recover: (email) => requestPasswordRecovery(email.trim()),
};
