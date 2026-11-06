const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const user = {
  id: 'owner-test',
  email: 'brad@fintechnav.com',
  confirmed_at: '2026-11-06T12:00:00Z',
};

test('login and refresh verify newly issued HttpOnly cookies, not the stale incoming session', async () => {
  const [{ createHandler }, { verifyOwner }] = await Promise.all([
    import('../netlify/functions/stock-session.mjs'),
    import('../server/stock/security.mjs'),
  ]);
  for (const action of ['login', 'refresh']) {
    const incoming = new Map([
      ['nf_jwt', 'expired-session'],
      ['nf_refresh', 'old-refresh'],
    ]);
    const outgoing = new Map();
    const context = {
      cookies: {
        get: (name) => incoming.get(name),
        set: (cookie) => outgoing.set(cookie.name, cookie),
        delete: (name) => outgoing.set(name, null),
      },
    };
    const originalSet = context.cookies.set;
    const issue = async () => {
      context.cookies.set({ name: 'nf_jwt', value: 'renewed-session', httpOnly: false });
      context.cookies.set({ name: 'nf_refresh', value: 'rotated-refresh', httpOnly: false });
    };
    const identity = { login: issue, refreshSession: issue, verifyRequestOrigin() {} };
    const handler = createHandler(identity, (req, ctx) =>
      verifyOwner(req, ctx, async (url, init) => {
        assert.equal(init.headers.Authorization, 'Bearer renewed-session');
        return Response.json(user);
      })
    );
    const response = await handler(
      new Request('https://fintechnav.com/api/stock-session', {
        method: 'POST',
        headers: { Origin: 'https://fintechnav.com', 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, email: user.email, password: 'test-password-only' }),
      }),
      context
    );
    assert.equal(response.status, 200);
    assert.equal(context.cookies.set, originalSet);
    assert.equal(incoming.get('nf_jwt'), 'expired-session');
    assert.equal(outgoing.get('nf_jwt').value, 'renewed-session');
    assert.equal(outgoing.get('nf_refresh').value, 'rotated-refresh');
    for (const cookie of outgoing.values()) {
      assert.equal(cookie.httpOnly, true);
      assert.equal(cookie.secure, true);
      assert.equal(cookie.sameSite, 'Lax');
    }
    assert.ok(!JSON.stringify(await response.json()).includes('renewed-session'));
  }
});

test('invalid refresh cannot restore stale cookies or bypass owner verification', async () => {
  const [{ createHandler }, { verifyOwner }] = await Promise.all([
    import('../netlify/functions/stock-session.mjs'),
    import('../server/stock/security.mjs'),
  ]);
  const writes = [];
  const context = {
    cookies: {
      get: () => 'expired-session',
      set: (cookie) => writes.push(cookie),
      delete() {},
    },
  };
  const handler = createHandler(
    {
      verifyRequestOrigin() {},
      refreshSession: async () => {
        context.cookies.delete('nf_jwt');
        context.cookies.delete('nf_refresh');
        return null;
      },
    },
    (req, ctx) =>
      verifyOwner(req, ctx, async () => {
        throw new Error('must not contact Identity without a token');
      })
  );
  const response = await handler(
    new Request('https://fintechnav.com/api/stock-session', {
      method: 'POST',
      headers: { Origin: 'https://fintechnav.com', 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'refresh' }),
    }),
    context
  );
  assert.equal(response.status, 401);
  assert.equal(writes.length, 0);
});

test('browser keeps brokerage rejection intact and retries only a stock-session 401', async () => {
  const source = fs.readFileSync('stock/app.js', 'utf8');
  const functionSource = source.slice(
    source.indexOf('async function stockFetch('),
    source.indexOf('async function startStockApp(')
  );
  let refreshes = 0;
  let requests = 0;
  let locked = 0;
  const replies = [
    Response.json({ error: 'Schwab rejected the app credentials.' }, { status: 503 }),
    Response.json({ error: 'Please sign in again.' }, { status: 401 }),
    Response.json({ ok: true }),
  ];
  const fetch = vm.runInNewContext(`(${functionSource.trim()})`, {
    fetch: async () => {
      requests++;
      return replies.shift();
    },
    window: {
      StockAuth: {
        refresh: async () => {
          refreshes++;
        },
      },
    },
    lockDashboard: () => {
      locked++;
    },
  });
  const callback = await fetch('/api/schwab-auth', { method: 'POST' });
  assert.equal(callback.status, 503);
  assert.equal(requests, 1);
  assert.equal(refreshes, 0);
  assert.match((await callback.json()).error, /app credentials/);
  assert.equal((await fetch('/api/schwab-auth')).status, 200);
  assert.equal(requests, 3);
  assert.equal(refreshes, 1);
  assert.equal(locked, 0);
});
