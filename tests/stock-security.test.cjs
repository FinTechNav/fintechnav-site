const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const user = { id: 'owner-id', email: 'brad@fintechnav.com', confirmed_at: '2026-11-06T12:00:00Z' };
const modules = Promise.all([
  import('../server/stock/security.mjs'),
  import('../server/stock/brokerage.mjs'),
  import('../server/stock/orders.mjs'),
  import('../server/stock/schwab-trade.mjs'),
  import('../server/stock/schwab-auth.mjs'),
  import('../server/stock/gist-sync.mjs'),
]);
const request = (body, origin = 'https://fintechnav.com') =>
  new Request(
    'https://fintechnav.com/api/schwab-trade',
    body === undefined
      ? {}
      : {
          method: 'POST',
          headers: { Origin: origin, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
  );
const context = () => {
  const cookies = new Map([['nf_jwt', 'valid-owner-session']]);
  return {
    cookies: {
      get: (name) => cookies.get(name),
      set: ({ name, value }) => cookies.set(name, value),
      delete: (name) => cookies.delete(name),
    },
  };
};
async function fixture(options = {}) {
  const [security, brokerage, , trade, auth, gist] = await modules;
  const objects = new Map();
  const store = {
    async get(key) {
      return structuredClone(objects.get(key) || null);
    },
    async setJSON(key, value, condition = {}) {
      if (condition.onlyIfNew && objects.has(key)) return { modified: false };
      objects.set(key, structuredClone(value));
      return { modified: true };
    },
    async delete(key) {
      objects.delete(key);
    },
  };
  const credentials = {
    accessToken: 'broker-access-test-only',
    refreshToken: 'broker-refresh-test-only',
    accessTokenExpiresAt: Date.now() + 1800000,
    refreshTokenExpiresAt: Date.now() + 86400000,
    generation: 'generation-1',
  };
  objects.set(brokerage.credentialKey(user), credentials);
  const calls = [];
  const fetcher = async (url, init = {}) => {
    calls.push({ url: String(url), ...init });
    if (String(url).endsWith('/.netlify/identity/user'))
      return Response.json(options.identity || user, { status: options.identityStatus || 200 });
    if (String(url).endsWith('/accounts/accountNumbers'))
      return Response.json([{ hashValue: 'server-selected-account' }]);
    if (String(url).includes('/orders?'))
      return options.historyError
        ? new Response('', { status: 503 })
        : Response.json(options.history || []);
    if (String(url).endsWith('/orders') && init.method === 'POST')
      return new Response(null, { status: 201, headers: { Location: '/orders/mock-order-id' } });
    if (String(url).endsWith('/oauth/token'))
      return Response.json({
        access_token: 'new-access-test-only',
        refresh_token: 'new-refresh-test-only',
        expires_in: 1800,
      });
    throw new Error(`Unexpected mocked request: ${url}`);
  };
  const dependencies = {
    owner: (req, ctx) => security.verifyOwner(req, ctx, fetcher),
    store: () => store,
    fetcher,
  };
  return {
    handler: trade.createHandler(dependencies),
    auth: auth.createHandler(dependencies),
    gist: gist.createHandler(dependencies),
    objects,
    calls,
    store,
    credentials,
    security,
    brokerage,
  };
}
const validOrder = {
  symbol: 'IREN',
  qty: 1,
  limitPrice: 10,
  instruction: 'BUY',
  session: 'NORMAL',
};
const brokerPosts = (fixture) =>
  fixture.calls.filter((call) => call.url.endsWith('/orders') && call.method === 'POST');

test('missing, forged and wrong-owner sessions cannot reach the brokerage', async () => {
  const f = await fixture();
  const missing = { cookies: { get: () => undefined } };
  assert.equal((await f.handler(request(), missing)).status, 401);
  const bad = await fixture({ identityStatus: 401 });
  assert.equal((await bad.handler(request(), context())).status, 401);
  const wrong = await fixture({ identity: { ...user, email: 'someone@example.com' } });
  assert.equal((await wrong.handler(request(), context())).status, 403);
  const unconfirmed = await fixture({ identity: { ...user, confirmed_at: null } });
  assert.equal((await unconfirmed.handler(request(), context())).status, 403);
  for (const item of [f, bad, wrong, unconfirmed])
    assert.equal(item.calls.filter((call) => call.url.includes('/trader/')).length, 0);
});
test('provider verification fails closed instead of trusting JWT claims', async () => {
  const [security] = await modules;
  await assert.rejects(
    security.verifyOwner(request(), context(), async () => {
      throw new Error('offline');
    }),
    { status: 503 }
  );
});
test('cross-origin and missing-origin mutations are rejected before external requests', async () => {
  const f = await fixture();
  assert.equal(
    (
      await f.handler(
        request({ action: 'prepare', orders: [validOrder] }, 'https://attacker.example'),
        context()
      )
    ).status,
    403
  );
  const req = request({ action: 'prepare', orders: [validOrder] });
  req.headers.delete('origin');
  assert.equal((await f.handler(req, context())).status, 403);
  assert.equal(f.calls.length, 0);
});
test('caller-supplied guardrail overrides cannot exceed caps or enable invalid orders', async () => {
  for (const orders of [
    [{ ...validOrder, limitPrice: 101 }],
    [{ ...validOrder, qty: 0.5 }],
    [{ ...validOrder, limitPrice: null }],
    [{ ...validOrder, instruction: 'SELL_SHORT' }],
    [{ ...validOrder, limitPrice: 0.5 }],
    [
      { ...validOrder, limitPrice: 60 },
      { ...validOrder, symbol: 'APLD', limitPrice: 60 },
    ],
    [{ ...validOrder, limitPrice: 0.000001 }],
  ]) {
    const f = await fixture();
    const response = await f.handler(
      request({
        action: 'prepare',
        orders,
        maxOrderDollars: 1e9,
        unsettledCash: false,
        blockDayTrades: false,
      }),
      context()
    );
    assert.equal(response.status, 400);
    assert.equal(f.calls.filter((call) => call.url.includes('/trader/')).length, 0);
  }
});
test('same-day guard cannot be disabled, including canceled orders with partial fills', async () => {
  const f = await fixture({
    history: [
      {
        status: 'CANCELED',
        filledQuantity: 1,
        enteredTime: new Date().toISOString(),
        orderLegCollection: [{ instruction: 'SELL', instrument: { symbol: 'IREN' } }],
      },
    ],
  });
  assert.equal(
    (
      await f.handler(
        request({ action: 'prepare', orders: [validOrder], blockDayTrades: false }),
        context()
      )
    ).status,
    409
  );
  assert.equal(brokerPosts(f).length, 0);
});
test('market day follows New York across UTC midnight; old GTC executions count', async () => {
  const [, , orders] = await modules;
  const history = [
    {
      status: 'FILLED',
      enteredTime: '2026-10-01T12:00:00Z',
      orderLegCollection: [{ instruction: 'SELL', instrument: { symbol: 'IREN' } }],
      orderActivityCollection: [{ executionLegs: [{ time: '2026-11-07T00:10:00Z' }] }],
    },
  ];
  assert.throws(
    () => orders.checkDayTrade([validOrder], history, new Date('2026-11-06T23:00:00Z').getTime()),
    { status: 409 }
  );
});
test('missing brokerage history stops trading before submission', async () => {
  const f = await fixture({ historyError: true });
  assert.equal(
    (await f.handler(request({ action: 'prepare', orders: [validOrder] }), context())).status,
    502
  );
  assert.equal(brokerPosts(f).length, 0);
});
test('prepare never trades; parallel confirmation replays produce at most one order', async () => {
  const f = await fixture();
  const plan = await (
    await f.handler(
      request({ action: 'prepare', orders: [validOrder], accountHash: 'attacker-account' }),
      context()
    )
  ).json();
  assert.ok(plan.confirmationId);
  assert.equal(brokerPosts(f).length, 0);
  const responses = await Promise.all(
    [1, 2].map(() =>
      f.handler(
        request({
          action: 'submit',
          confirmationId: plan.confirmationId,
          orders: [{ ...validOrder, qty: 9999 }],
        }),
        context()
      )
    )
  );
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409]);
  assert.equal(brokerPosts(f).length, 1);
  assert.ok(brokerPosts(f)[0].url.includes('server-selected-account'));
  assert.equal(JSON.parse(brokerPosts(f)[0].body).orderLegCollection[0].quantity, 1);
});
test('reconnecting invalidates outstanding order confirmations', async () => {
  const f = await fixture();
  const plan = await (
    await f.handler(request({ action: 'prepare', orders: [validOrder] }), context())
  ).json();
  f.objects.set(f.brokerage.credentialKey(user), {
    ...f.credentials,
    generation: 'new-generation',
  });
  assert.equal(
    (await f.handler(request({ action: 'submit', confirmationId: plan.confirmationId }), context()))
      .status,
    409
  );
  assert.equal(brokerPosts(f).length, 0);
});
test('OAuth rejects missing, expired, replayed and cross-session state; tokens stay private', async () => {
  const f = await fixture();
  process.env.SCHWAB_CLIENT_ID = 'mock-client';
  process.env.SCHWAB_CLIENT_SECRET = 'mock-secret';
  try {
    const ctx = context();
    assert.equal((await f.auth(request({ action: 'exchange', code: 'fake' }), ctx)).status, 403);
    const begin = await (await f.auth(request({ action: 'begin' }), ctx)).json();
    const state = new URL(begin.authUrl).searchParams.get('state');
    assert.equal(
      (await f.auth(request({ action: 'exchange', code: 'fake', state }), context())).status,
      403
    );
    const result = await f.auth(request({ action: 'exchange', code: 'fake', state }), ctx);
    assert.equal(result.status, 200);
    const text = await result.text();
    assert.ok(!text.includes('new-access-test-only') && !text.includes('new-refresh-test-only'));
    assert.equal(
      (await f.auth(request({ action: 'exchange', code: 'fake', state }), ctx)).status,
      403
    );
    const stored = await f.store.get(f.brokerage.credentialKey(user));
    assert.equal(stored.accessToken, 'new-access-test-only');
  } finally {
    delete process.env.SCHWAB_CLIENT_ID;
    delete process.env.SCHWAB_CLIENT_SECRET;
  }
});
test('Gist authentication happens before configuration or data access', async () => {
  const f = await fixture();
  assert.equal((await f.gist(request(), { cookies: { get: () => undefined } })).status, 401);
  assert.equal(f.calls.length, 0);
});
test('preference sync excludes credentials, accounts and personal execution history', async () => {
  const [security] = await modules;
  const clean = security.cleanState({
    accessToken: 'private',
    schwabAuth: { refreshToken: 'private' },
    journal: [{ secret: 'private' }],
    holdings: { IREN: { shares: 1 } },
    rules: { harvestGainPct: 35, secret: 'private' },
    watchlist: [{ symbol: 'IREN', role: 'Company', secret: 'private' }],
  });
  assert.ok(!JSON.stringify(clean).includes('private'));
  assert.deepEqual(clean.rules, { harvestGainPct: 35 });
});
test('deployed output excludes workspace/backend files and leaked default credentials', () => {
  for (const name of [
    'AGENTS.md',
    'SESSION_LOG.md',
    'package.json',
    'package-lock.json',
    '.env',
    '.codex',
    'artifacts',
    'netlify',
    'server',
    'tests',
    'stock/README.md',
    'stock/dev-server.mjs',
  ])
    assert.ok(!fs.existsSync(`dist/${name}`), name);
  for (const name of [
    'index.html',
    'stock/index.html',
    'stock/app.js',
    'stock/auth-client.js',
    'sections/about.html',
    'js/content-loader.js',
    'content/about/content.md',
  ])
    assert.ok(fs.existsSync(`dist/${name}`), name);
  const browserSource = fs.readFileSync('dist/stock/app.js', 'utf8');
  assert.ok(!browserSource.includes('RedDay2026!'));
  assert.ok(!browserSource.includes('refreshToken:'));
});
