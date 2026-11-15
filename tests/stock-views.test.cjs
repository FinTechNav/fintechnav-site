const { test } = require('node:test');
const assert = require('node:assert/strict');
const views = require('../stock/portfolio-views.js');
const prefs = {
  watchlist: [{ symbol: 'IREN', bucket: 'Bucket 1', role: 'Original', sp500Slice: false }],
  rules: {
    landlordRedTriggerPct: -5,
    sliceRedTriggerPct: -3,
    oversoldRsiThreshold: 40,
    zScoreTrigger: -1.25,
    harvestGainPct: 35,
    maxSingleStockWeightPct: 25,
  },
  deployBudget: 50,
  sessionTiming: 'SEAMLESS',
};
const pos = (symbol, quantity, marketValue = quantity * 10) => ({
  symbol,
  longQuantity: quantity,
  shortQuantity: 0,
  marketValue,
  averagePrice: 10,
  description: 'Synthetic stock',
  assetType: 'EQUITY',
  assignable: true,
});
function memoryStore() {
  const values = new Map(),
    etags = new Map();
  let revision = 0;
  return {
    values,
    etags,
    async get(key) {
      return structuredClone(values.get(key) || null);
    },
    async getWithMetadata(key) {
      return values.has(key)
        ? { data: structuredClone(values.get(key)), etag: etags.get(key) }
        : null;
    },
    async list({ prefix }) {
      return {
        blobs: [...values.keys()].filter((key) => key.startsWith(prefix)).map((key) => ({ key })),
      };
    },
    async setJSON(key, value, condition = {}) {
      if (
        (condition.onlyIfNew && values.has(key)) ||
        (condition.onlyIfMatch && etags.get(key) !== condition.onlyIfMatch)
      )
        return { modified: false };
      const etag = String(++revision);
      values.set(key, structuredClone(value));
      etags.set(key, etag);
      return { modified: true, etag };
    },
  };
}
const owner = { id: 'shared-owner' };
const ctx = {};
function request(body) {
  return new Request(
    'https://fintechnav.com/api/portfolio-views',
    body
      ? {
          method: 'POST',
          headers: { Origin: 'https://fintechnav.com', 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : {}
  );
}
async function fixture() {
  const api = await import('../server/stock/portfolio-views.mjs');
  const brokerage = await import('../server/stock/brokerage.mjs');
  const store = memoryStore();
  await store.setJSON(brokerage.credentialKey(owner), {
    accessToken: 'test-only',
    refreshToken: 'test-only',
    accessTokenExpiresAt: Date.now() + 1800000,
    refreshTokenExpiresAt: Date.now() + 86400000,
    generation: 'test',
  });
  let positions = [
    {
      longQuantity: 3,
      shortQuantity: 0,
      averagePrice: 10,
      marketValue: 30,
      instrument: { symbol: 'LMT', description: 'Synthetic holding', assetType: 'EQUITY' },
    },
  ];
  let history = [];
  let posted = [];
  const fetcher = async (url, init = {}) => {
    if (String(url).endsWith('/accountNumbers'))
      return Response.json([{ hashValue: 'test-account' }]);
    if (String(url).endsWith('/accounts?fields=positions'))
      return Response.json([
        {
          securitiesAccount: {
            positions,
            currentBalances: { liquidationValue: 35, cashAvailableForTrading: 5 },
          },
        },
      ]);
    if (String(url).includes('/orders?')) return Response.json(history);
    if (String(url).endsWith('/orders') && init.method === 'POST') {
      posted.push(JSON.parse(init.body));
      return new Response(null, { status: 201, headers: { Location: '/orders/1234' } });
    }
    throw new Error('Unexpected mocked URL');
  };
  const dependencies = { owner: async () => owner, store: () => store, fetcher };
  const handler = api.createHandler(dependencies);
  const initial = await (
    await handler(request({ action: 'initialize', preferences: prefs }), ctx)
  ).json();
  return {
    api,
    store,
    handler,
    initial,
    dependencies,
    posted,
    setHistory(value) {
      history = value;
    },
    setPositions(value) {
      positions = value;
    },
  };
}

test('independent private preferences have no personal watchlist in public defaults', () => {
  const partner = { ...prefs, watchlist: [{symbol:'LMT',role:'Synthetic',bucket:'Bucket 1',sp500Slice:false}] };
  const doc = views.defaults(prefs, partner);
  assert.deepEqual(views.defaults(prefs).profiles.partner.watchlist, []);
  assert.deepEqual(doc.profiles.primary, prefs);
  assert.deepEqual(
    doc.profiles.partner.watchlist.map((w) => w.symbol),
    ['LMT']
  );
  doc.profiles.partner.rules.harvestGainPct = 20;
  assert.equal(doc.profiles.primary.rules.harvestGainPct, 35);
  assert.equal(prefs.rules.harvestGainPct, 35);
});
test('one Primary share plus two Partner shares reconcile to three in All, even for a shared ticker', () => {
  const doc = views.defaults(prefs);
  doc.assignment.allocations = { LMT: { primary: 1, partner: 2 } };
  const positions = [pos('LMT', 3), pos('OTHER', 4)];
  const result = views.ownership(doc, positions);
  assert.equal(result.holdings.primary.LMT.shares, 1);
  assert.equal(result.holdings.partner.LMT.shares, 2);
  assert.equal(result.unassigned.LMT, 0);
  assert.equal(result.unassigned.OTHER, 4);
  assert.equal(positions[0].longQuantity, 3);
  assert.deepEqual(result.issues, []);
});
test('only confirmed fills change attribution; partial buys, sells and baseline facts are applied once', () => {
  const doc = views.defaults(prefs);
  doc.assignment.allocations = { LMT: { primary: 1, partner: 0 } };
  const facts = [
    { orderId: 'fill-1', profile: 'partner', symbol: 'LMT', instruction: 'BUY', filledQuantity: 0.5 },
  ];
  assert.equal(views.ownership(doc, [pos('LMT', 1.5)], facts).holdings.partner.LMT.shares, 0.5);
  assert.equal(views.ownership(doc, [pos('LMT', 1.5)], facts).holdings.partner.LMT.shares, 0.5);
  doc.assignment = {
    allocations: { LMT: { primary: 1, partner: 0.5 } },
    baselineFills: { 'fill-1': 0.5 },
  };
  facts.push({
    orderId: 'fill-2',
    profile: 'partner',
    symbol: 'LMT',
    instruction: 'BUY',
    filledQuantity: 1.5,
  });
  assert.equal(views.ownership(doc, [pos('LMT', 3)], facts).holdings.partner.LMT.shares, 2);
  facts.push({
    orderId: 'sale',
    profile: 'partner',
    symbol: 'LMT',
    instruction: 'SELL',
    filledQuantity: 1,
  });
  assert.equal(views.ownership(doc, [pos('LMT', 2)], facts).holdings.partner.LMT.shares, 1);
  assert.deepEqual(
    views.ownership(
      doc,
      [pos('LMT', 1)],
      [{ orderId: 'working', profile: 'partner', symbol: 'LMT', instruction: 'BUY', filledQuantity: 0 }]
    ).holdings.partner,
    {}
  );
});
test('outside-app reduction flags a conflicting split instead of showing overlapping ownership', () => {
  const doc = views.defaults(prefs);
  doc.assignment.allocations = { LMT: { primary: 1, partner: 2 } };
  const result = views.ownership(doc, [pos('LMT', 2)]);
  assert.deepEqual(result.issues, ['LMT']);
  assert.deepEqual(result.holdings.primary, {});
  assert.deepEqual(result.holdings.partner, {});
  assert.equal(result.unassigned.LMT, 2);
});
test('first successful brokerage sync assigns existing shares to Primary exactly once', async () => {
  const f = await fixture();
  assert.equal(f.initial.document.assignment.initialOwner, 'primary');
  const snapshot = { positions: [pos('LMT', 3)], allocationOrders: [] };
  const ready = await f.api.initializeExistingShares(f.store, owner, f.initial, snapshot);
  assert.deepEqual(ready.document.assignment.allocations.LMT, { primary: 3, partner: 0 });
  const again = await f.api.initializeExistingShares(f.store, owner, ready, {
    positions: [pos('LMT', 9)],
    allocationOrders: [],
  });
  assert.deepEqual(again.document.assignment.allocations.LMT, { primary: 3, partner: 0 });
});
test('shared config survives another session and stale-device or oversized allocations are rejected server-side', async () => {
  const f = await fixture();
  let current = await f.api.initializeExistingShares(f.store, owner, f.initial, {
    positions: [pos('LMT', 3)],
    allocationOrders: [],
  });
  const response = await f.handler(
    request({
      action: 'assign',
      revision: current.revision,
      allocations: { LMT: { primary: 1, partner: 2 } },
    }),
    ctx
  );
  assert.equal(response.status, 200);
  current = await response.json();
  const otherSession = await (await f.handler(request(), ctx)).json();
  assert.deepEqual(otherSession.document.assignment.allocations.LMT, { primary: 1, partner: 2 });
  assert.equal(
    (
      await f.handler(
        request({
          action: 'assign',
          revision: f.initial.revision,
          allocations: { LMT: { primary: 0, partner: 3 } },
        }),
        ctx
      )
    ).status,
    409
  );
  for (const allocations of [
    { LMT: { primary: 2, partner: 2 } },
    { LMT: { primary: -1, partner: 2 } },
    { UNKNOWN: { primary: 1, partner: 0 } },
  ]) {
    assert.equal(
      (await f.handler(request({ action: 'assign', revision: current.revision, allocations }), ctx))
        .status,
      400
    );
  }
  assert.deepEqual((await f.api.readViews(f.store, owner)).document.assignment.allocations.LMT, {
    primary: 1,
    partner: 2,
  });
});
test('concurrent profile edits have a single winner without silent overwrite', async () => {
  const f = await fixture();
  const bodies = ['primary', 'partner'].map((profile) =>
    request({
      action: 'preferences',
      profile,
      revision: f.initial.revision,
      preferences: { ...prefs, deployBudget: 25 },
    })
  );
  const responses = await Promise.all(bodies.map((body) => f.handler(body, ctx)));
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
});
test('server-owned order profile is pinned through confirmation, accepted orders are not fills, and All cannot trade', async () => {
  const f = await fixture();
  await f.api.initializeExistingShares(f.store, owner, f.initial, {
    positions: [pos('LMT', 3)],
    allocationOrders: [],
  });
  const { createHandler } = await import('../server/stock/schwab-trade.mjs');
  const handler = createHandler(f.dependencies);
  const order = { symbol: 'LMT', qty: 1, limitPrice: 10 };
  const prepared = await (
    await handler(request({ action: 'prepare', profile: 'partner', orders: [order] }), ctx)
  ).json();
  assert.equal(prepared.profile, 'partner');
  const submitted = await (
    await handler(
      request({ action: 'submit', profile: 'primary', confirmationId: prepared.confirmationId }),
      ctx
    )
  ).json();
  assert.equal(submitted.results[0].profile, 'partner');
  assert.equal(submitted.results[0].labelSaved, true);
  const synced = await (await handler(request(), ctx)).json();
  assert.deepEqual(
    views.ownership(
      synced.views.document,
      synced.snapshot.positions,
      synced.snapshot.allocationOrders
    ).holdings.partner,
    {}
  );
  assert.equal(
    (await handler(request({ action: 'prepare', profile: 'all', orders: [order] }), ctx)).status,
    400
  );
  assert.equal(f.posted.length, 1);
});
test('confirmed execution facts survive repeat sync and aging out of recent order history', async () => {
  const f = await fixture();
  const prefix = f.api.tagPrefix(owner, 'test-account');
  await f.store.setJSON(prefix + '1234', { profile: 'partner' });
  const history = [
    {
      orderId: 1234,
      status: 'FILLED',
      quantity: 2,
      filledQuantity: 2,
      orderLegCollection: [
        { instruction: 'BUY', instrument: { symbol: 'LMT', assetType: 'EQUITY' } },
      ],
      orderActivityCollection: [
        {
          activityType: 'EXECUTION',
          activityId: 1,
          executionLegs: [{ quantity: 2, price: 10, time: '2026-11-05T16:00:00Z' }],
        },
      ],
    },
  ];
  const account = [{ securitiesAccount: { positions: [], currentBalances: {} } }];
  const first = await f.api.labeledSnapshot(f.store, owner, 'test-account', account, history);
  const again = await f.api.labeledSnapshot(f.store, owner, 'test-account', account, history);
  const aged = await f.api.labeledSnapshot(f.store, owner, 'test-account', account, []);
  assert.equal(first.allocationOrders.length, 1);
  assert.equal(again.allocationOrders.length, 1);
  assert.equal(aged.allocationOrders.length, 1);
  const doc = views.defaults(prefs);
  assert.equal(
    views.ownership(doc, [pos('LMT', 2)], aged.allocationOrders).holdings.partner.LMT.shares,
    2
  );
  const receipts = views.receipts(first.orders, 'partner');
  assert.equal(receipts[0].total, 20);
  assert.equal(receipts[0].qty, 2);
  assert.equal(views.receipts(first.orders, 'primary').length, 0);
});
test('shared APIs retain owner auth and same-origin protection; rendering escapes brokerage descriptions', async () => {
  const { createHandler } = await import('../server/stock/portfolio-views.mjs');
  assert.equal((await createHandler()(request(), { cookies: { get: () => null } })).status, 401);
  assert.equal(
    (
      await createHandler()(
        new Request('https://fintechnav.com/api/portfolio-views', {
          method: 'POST',
          headers: { Origin: 'https://other.example', 'Content-Type': 'application/json' },
          body: '{}',
        }),
        { cookies: { get: () => null } }
      )
    ).status,
    403
  );
  assert.equal(views.escape('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
});

test('view-label storage failure never retries an accepted brokerage order', async () => {
  const f = await fixture();
  await f.api.initializeExistingShares(f.store, owner, f.initial, {
    positions: [pos('LMT', 3)],
    allocationOrders: [],
  });
  const write = f.store.setJSON.bind(f.store);
  f.store.setJSON = async (key, ...args) => {
    if (key.startsWith('view-order-labels/')) throw new Error('Fixture write failure');
    return write(key, ...args);
  };
  const { createHandler } = await import('../server/stock/schwab-trade.mjs');
  const handler = createHandler(f.dependencies);
  const plan = await (
    await handler(
      request({
        action: 'prepare',
        profile: 'partner',
        orders: [{ symbol: 'LMT', qty: 1, limitPrice: 10 }],
      }),
      ctx
    )
  ).json();
  const response = await handler(
    request({ action: 'submit', confirmationId: plan.confirmationId }),
    ctx
  );
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.ok, true);
  assert.equal(result.results[0].labelSaved, false);
  assert.match(result.results[0].warning, /accepted/);
  assert.equal(f.posted.length, 1);
  assert.equal(
    (await handler(request({ action: 'submit', confirmationId: plan.confirmationId }), ctx)).status,
    409
  );
  assert.equal(f.posted.length, 1);
});

test('opposite-side account executions block orders regardless of the selected personal view', async () => {
  const f = await fixture();
  await f.api.initializeExistingShares(f.store, owner, f.initial, {
    positions: [pos('LMT', 3)],
    allocationOrders: [],
  });
  f.setHistory([
    {
      status: 'FILLED',
      filledQuantity: 1,
      enteredTime: new Date().toISOString(),
      orderLegCollection: [
        { instruction: 'SELL', instrument: { symbol: 'LMT', assetType: 'EQUITY' } },
      ],
    },
  ]);
  const { createHandler } = await import('../server/stock/schwab-trade.mjs');
  const handler = createHandler(f.dependencies);
  assert.equal(
    (
      await handler(
        request({
          action: 'prepare',
          profile: 'partner',
          orders: [{ symbol: 'LMT', qty: 1, limitPrice: 10 }],
        }),
        ctx
      )
    ).status,
    409
  );
  assert.equal(f.posted.length, 0);
});

test('normalizeAccount falls back to cashBalance/availableFunds and parses state: FILLED with summary executions', async () => {
  const { normalizeAccount } = await import('../server/stock/portfolio-views.mjs');
  const accounts = [
    {
      securitiesAccount: {
        positions: [],
        currentBalances: {
          liquidationValue: 100,
          cashAvailableForTrading: 0,
          cashBalance: 5.43,
          availableFunds: 5.43,
        },
      },
    },
  ];
  const history = [
    {
      orderId: 9876,
      state: 'FILLED',
      filledQuantity: 1,
      quantity: 1,
      price: 3.82,
      closeTime: '2026-11-15T15:00:00Z',
      orderLegCollection: [
        { instruction: 'BUY', instrument: { symbol: 'POET', assetType: 'EQUITY' } },
      ],
    },
  ];
  const snapshot = normalizeAccount(accounts, history, { 9876: { profile: 'primary' } });
  assert.equal(snapshot.balances.cashAvailableForTrading, 5.43);
  assert.equal(snapshot.balances.cashBalance, 5.43);
  assert.equal(snapshot.orders.length, 1);
  assert.equal(snapshot.orders[0].status, 'FILLED');
  assert.equal(snapshot.orders[0].executions.length, 1);
  assert.equal(snapshot.orders[0].executions[0].quantity, 1);
  assert.equal(snapshot.orders[0].executions[0].price, 3.82);
  assert.equal(snapshot.orders[0].executions[0].total, 3.82);
});

test('fetchOrderHistory falls back to plain /orders when date-bounded query returns empty', async () => {
  const { fetchOrderHistory } = await import('../server/stock/portfolio-views.mjs');
  const expectedOrders = [
    { orderId: '5555', status: 'FILLED', symbol: 'POET', filledQuantity: 1 },
  ];
  const fetcher = async (url) => {
    if (String(url).includes('/orders?')) {
      return Response.json([]);
    }
    if (String(url).endsWith('/orders')) {
      return Response.json(expectedOrders);
    }
    throw new Error(`Unexpected url: ${url}`);
  };
  const orders = await fetchOrderHistory('test-account-hash', { accessToken: 'tok' }, fetcher);
  assert.deepEqual(orders, expectedOrders);
});

test('fetchOrderHistory falls back to plain /orders when date-bounded query throws upstream 502 error', async () => {
  const { fetchOrderHistory } = await import('../server/stock/portfolio-views.mjs');
  const expectedOrders = [
    { orderId: '7777', status: 'FILLED', symbol: 'IREN', filledQuantity: 2 },
  ];
  const fetcher = async (url) => {
    if (String(url).includes('/orders?')) {
      return new Response('{"error":"Bad Request"}', { status: 400 });
    }
    if (String(url).endsWith('/orders')) {
      return Response.json(expectedOrders);
    }
    throw new Error(`Unexpected url: ${url}`);
  };
  const orders = await fetchOrderHistory('test-account-hash', { accessToken: 'tok' }, fetcher, false);
  assert.deepEqual(orders, expectedOrders);
});

test('normalizeAccount extracts cash from cash sweep positions (CASH_EQUIVALENT) and totalCash/settledCash', async () => {
  const { normalizeAccount } = await import('../server/stock/portfolio-views.mjs');
  const accounts = [
    {
      securitiesAccount: {
        positions: [
          {
            longQuantity: 5.43,
            marketValue: 5.43,
            instrument: {
              assetType: 'CASH_EQUIVALENT',
              symbol: 'SWVXX',
              description: 'SCHWAB BANK DEPOSIT ACCOUNT',
            },
          },
        ],
        currentBalances: {
          liquidationValue: 100,
          cashAvailableForTrading: 0,
          cashBalance: 0,
        },
      },
    },
  ];
  const snapshot = normalizeAccount(accounts, [], {});
  assert.equal(snapshot.balances.cashAvailableForTrading, 5.43);
  assert.equal(snapshot.balances.cashBalance, 5.43);
  assert.equal(snapshot.balances.cashPositionsTotal, 5.43);
});

test('fetchOrderHistory falls back to /transactions when /orders returns 0 orders', async () => {
  const { fetchOrderHistory } = await import('../server/stock/portfolio-views.mjs');
  const mockTransactions = [
    {
      activityId: 'tx-999',
      type: 'TRADE',
      netAmount: -150.25,
      time: '2026-11-15T12:00:00Z',
      description: 'BOUGHT 1 AAPL @ 150.25',
      transferItems: [
        {
          amount: 1,
          price: 150.25,
          cost: 150.25,
          instrument: { symbol: 'AAPL', assetType: 'EQUITY', description: 'APPLE INC' },
        },
      ],
    },
  ];
  const fetcher = async (url) => {
    if (String(url).includes('/orders')) {
      return Response.json([]);
    }
    if (String(url).includes('/transactions')) {
      return Response.json(mockTransactions);
    }
    throw new Error(`Unexpected url: ${url}`);
  };
  const orders = await fetchOrderHistory('test-account-hash', { accessToken: 'tok' }, fetcher);
  assert.equal(orders.length, 1);
  assert.equal(orders[0].symbol, 'AAPL');
  assert.equal(orders[0].instruction, 'BUY');
  assert.equal(orders[0].quantity, 1);
  assert.equal(orders[0].price, 150.25);
  assert.equal(orders[0].status, 'FILLED');
});

test('normalizeAccount derives positive cash from liquidationValue minus stockMarketValue when cashBalance is 0', async () => {
  const { normalizeAccount } = await import('../server/stock/portfolio-views.mjs');
  const accounts = [
    {
      securitiesAccount: {
        positions: [
          {
            longQuantity: 10,
            marketValue: 994.57,
            instrument: {
              assetType: 'EQUITY',
              symbol: 'NVDA',
              description: 'NVIDIA CORP',
            },
          },
        ],
        currentBalances: {
          liquidationValue: 1000.0,
          longMarketValue: 994.57,
          cashAvailableForTrading: 0,
          cashBalance: 0,
          totalCash: 0,
        },
      },
    },
  ];
  const snapshot = normalizeAccount(accounts, [], {});
  assert.equal(snapshot.balances.cashAvailableForTrading, 5.43);
  assert.equal(snapshot.balances.cashBalance, 5.43);
  assert.equal(snapshot.balances.impliedCash, 5.43);
  assert.equal(snapshot.balances.positiveCashSource, 'liquidationValue - stockMarketValue');
});

test('transactionsToOrders extracts ticker, quantity, price, and instruction from description and transferItems', async () => {
  const { transactionsToOrders } = await import('../server/stock/portfolio-views.mjs');
  const rawTxs = [
    {
      activityId: 'tx-101',
      type: 'TRADE',
      description: 'BOUGHT 5 MSFT @ 415.50',
      netAmount: -2077.5,
      transferItems: [
        {
          amount: -2077.5,
          instrument: { assetType: 'CURRENCY', symbol: 'USD' },
        },
        {
          amount: 5,
          price: 415.5,
          instrument: { assetType: 'EQUITY', symbol: 'MSFT' },
        },
      ],
    },
    {
      activityId: 'tx-102',
      type: 'TRADE',
      description: 'SOLD 2 TSLA @ 220.00',
      netAmount: 440.0,
      transferItems: [
        {
          amount: -2,
          price: 220.0,
          positionEffect: 'CLOSING',
          instrument: { assetType: 'EQUITY', symbol: 'TSLA' },
        },
      ],
    },
    {
      activityId: 'tx-103',
      type: 'ACH',
      description: 'ELECTRONIC DEPOSIT',
      netAmount: 500.0,
    },
  ];
  const orders = transactionsToOrders(rawTxs);
  assert.equal(orders.length, 2);
  assert.equal(orders[0].symbol, 'MSFT');
  assert.equal(orders[0].instruction, 'BUY');
  assert.equal(orders[0].quantity, 5);
  assert.equal(orders[0].price, 415.5);
  assert.equal(orders[0].status, 'FILLED');

  assert.equal(orders[1].symbol, 'TSLA');
  assert.equal(orders[1].instruction, 'SELL');
  assert.equal(orders[1].quantity, 2);
  assert.equal(orders[1].price, 220.0);
  assert.equal(orders[1].status, 'FILLED');
});

test('GET /api/schwab-trade prioritizes single-account ledger endpoint and falls back to multi-account on upstream error', async () => {
  const f = await fixture();
  await f.api.initializeExistingShares(f.store, owner, f.initial, {
    positions: [pos('LMT', 3)],
    allocationOrders: [],
  });
  const { createHandler } = await import('../server/stock/schwab-trade.mjs');
  const seenUrls = [];
  const directFetcher = async (url) => {
    seenUrls.push(String(url));
    if (String(url).endsWith('/accountNumbers')) {
      return Response.json([{ hashValue: 'test-account' }]);
    }
    if (String(url).endsWith('/accounts/test-account?fields=positions')) {
      return Response.json({
        securitiesAccount: {
          type: 'MARGIN',
          positions: [],
          currentBalances: {
            liquidationValue: 105.43,
            longMarketValue: 100.0,
            cashAvailableForTrading: 5.43,
            intradayBuyingPowerAmount: 200,
          },
        },
      });
    }
    if (String(url).includes('/orders') || String(url).includes('/transactions')) {
      return Response.json([]);
    }
    throw new Error(`Unexpected url: ${url}`);
  };
  const directRes = await (await createHandler({ ...f.dependencies, fetcher: directFetcher })(request(), ctx)).json();
  assert.equal(directRes.ok, true);
  assert.equal(directRes.ledgerSource, 'single-account');
  assert.equal(directRes.snapshot.balances.cashAvailableForTrading, 5.43);
  assert.equal(directRes.snapshot.balances.intradayBuyingPowerAmount, 200);
  assert.equal(directRes.snapshot.balances.accountType, 'MARGIN');
  assert.ok(seenUrls.some((u) => u.endsWith('/accounts/test-account?fields=positions')));
  assert.ok(!seenUrls.some((u) => u.endsWith('/accounts?fields=positions')));

  const fallbackRes = await (await createHandler(f.dependencies)(request(), ctx)).json();
  assert.equal(fallbackRes.ok, true);
  assert.equal(fallbackRes.ledgerSource, 'multi-account');
});

test('fetchOrderHistoryWithDiagnostics unwraps object-wrapped payloads and preserves upstreamStatus', async () => {
  const { fetchOrderHistoryWithDiagnostics } = await import('../server/stock/portfolio-views.mjs');
  const fetcher = async (url) => {
    if (String(url).includes('/orders?')) {
      return new Response('Bad Request', { status: 400 });
    }
    if (String(url).includes('/transactions')) {
      return Response.json({
        transactions: [
          {
            activityId: 'tx-wrapped',
            type: 'TRADE',
            netAmount: -50,
            time: '2026-11-15T12:00:00Z',
            description: 'BOUGHT 10 POET @ 5.00',
            transferItems: [
              { amount: 10, price: 5, instrument: { symbol: 'POET', assetType: 'EQUITY' } },
            ],
          },
        ],
      });
    }
    return Response.json([]);
  };
  const res = await fetchOrderHistoryWithDiagnostics('test-account', { accessToken: 'tok' }, fetcher, false);
  assert.equal(res.orders.length, 1);
  assert.equal(res.orders[0].symbol, 'POET');
  assert.equal(res.diagnostics[0].status, 400);
  assert.match(res.diagnostics[1].shape, /^obj\(/);
});

test('normalizeAccount keeps margin intradayBuyingPowerAmount separate from cashAvailableForTrading', async () => {
  const { normalizeAccount } = await import('../server/stock/portfolio-views.mjs');
  const snapshot = normalizeAccount(
    [
      {
        securitiesAccount: {
          type: 'MARGIN',
          positions: [
            {
              longQuantity: 10,
              marketValue: 100,
              instrument: { symbol: 'NVDA', assetType: 'EQUITY' },
            },
          ],
          currentBalances: {
            liquidationValue: 100,
            longMarketValue: 100,
            cashBalance: 0,
            availableFunds: 0,
            buyingPower: 0,
            intradayBuyingPowerAmount: 400,
          },
        },
      },
    ],
    [],
    {}
  );
  assert.equal(snapshot.balances.cashAvailableForTrading, 0);
  assert.equal(snapshot.balances.intradayBuyingPowerAmount, 400);
  assert.equal(snapshot.balances.accountType, 'MARGIN');
});
