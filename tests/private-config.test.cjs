const { test } = require('node:test');
const assert = require('node:assert/strict');
const { gzipSync } = require('node:zlib');
const views = require('../stock/portfolio-views.js');
const prefs = {
  rules: {
    landlordRedTriggerPct: -5,
    sliceRedTriggerPct: -3,
    oversoldRsiThreshold: 40,
    zScoreTrigger: -1,
    harvestGainPct: 25,
    maxSingleStockWeightPct: 20,
  },
  watchlist: [],
  deployBudget: 10,
  sessionTiming: 'NORMAL',
};

test('private login configuration fails closed and never accepts an arbitrary verified identity', async () => {
  const { isOwnerEmail, verifyOwner } = await import('../server/stock/security.mjs');
  delete process.env.STOCK_OWNER_EMAIL_SHA256;
  assert.throws(() => isOwnerEmail('owner@example.test'), { status: 503 });
  process.env.STOCK_OWNER_EMAIL_SHA256 = require('node:crypto')
    .createHash('sha256')
    .update('owner@example.test')
    .digest('hex');
  assert.equal(isOwnerEmail(' OWNER@EXAMPLE.TEST '), true);
  assert.equal(isOwnerEmail('other@example.test'), false);
  const request = new Request('https://fintechnav.com/api/portfolio-views');
  const ctx = { cookies: { get: () => 'synthetic-session', set() {} } };
  await assert.rejects(
    verifyOwner(request, ctx, async () =>
      Response.json({ id: 'other', email: 'other@example.test', confirmed_at: '2026-01-01' })
    ),
    { status: 403 }
  );
  assert.equal(
    (
      await verifyOwner(request, ctx, async () =>
        Response.json({ id: 'owner', email: 'owner@example.test', confirmed_at: '2026-01-01' })
      )
    ).id,
    'owner'
  );
});

test('private seed is served only behind authentication, without copying credentials or positions', async () => {
  const { privateDefaults, profileLabels } = await import('../server/stock/private-config.mjs');
  const { createHandler } = await import('../server/stock/portfolio-views.mjs');
  process.env.STOCK_PROFILE_LABELS = JSON.stringify({
    primary: 'Person One',
    partner: 'Person Two',
  });
  process.env.STOCK_VIEW_SEED_GZIP = gzipSync(
    JSON.stringify({
      profiles: {
        primary: { ...prefs, secret: 'never copied', holdings: { TEST: { shares: 999 } } },
        partner: {
          ...prefs,
          watchlist: [{ symbol: 'TEST', role: 'Synthetic', bucket: 'Example' }],
        },
      },
    })
  ).toString('base64');
  const defaults = privateDefaults();
  assert.equal(defaults.profiles.primary.secret, undefined);
  assert.equal(defaults.profiles.primary.holdings, undefined);
  assert.equal(defaults.profiles.partner.watchlist[0].symbol, 'TEST');
  assert.equal(profileLabels().partner, 'Person Two');
  let touched = false;
  const response = await createHandler({
    store: () => {
      touched = true;
      throw Error('unexpected');
    },
  })(new Request('https://fintechnav.com/api/portfolio-views'), { cookies: { get: () => null } });
  assert.equal(response.status, 401);
  assert.equal(touched, false);
  assert.ok(!JSON.stringify(await response.json()).includes('Person Two'));
  process.env.STOCK_VIEW_SEED_GZIP = 'malformed';
  assert.throws(privateDefaults, { status: 503 });
  delete process.env.STOCK_VIEW_SEED_GZIP;
  delete process.env.STOCK_PROFILE_LABELS;
});

test('legacy view documents preserve quantities, revision and immutable order attribution', async () => {
  process.env.STOCK_PROFILE_LEGACY_IDS = JSON.stringify({
    primary: 'legacy-one',
    partner: 'legacy-two',
  });
  const config = await import('../server/stock/private-config.mjs');
  const { readViews, normalizeAccount } = await import('../server/stock/portfolio-views.mjs');
  const original = {
    version: 1,
    profiles: { 'legacy-one': prefs, 'legacy-two': prefs },
    assignment: {
      allocations: { TEST: { 'legacy-one': 1, 'legacy-two': 2 } },
      baselineFills: { fill: 0.5 },
    },
  };
  const current = await readViews(
    { getWithMetadata: async () => ({ data: original, etag: 'same-revision' }) },
    { id: 'synthetic' }
  );
  assert.equal(current.revision, 'same-revision');
  assert.deepEqual(current.document.assignment.allocations.TEST, { primary: 1, partner: 2 });
  assert.deepEqual(current.document.assignment.baselineFills, { fill: 0.5 });
  assert.equal(original.assignment.allocations.TEST['legacy-two'], 2);
  const snapshot = normalizeAccount(
    [{ securitiesAccount: {} }],
    [
      {
        orderId: 123,
        orderLegCollection: [
          { instruction: 'BUY', instrument: { symbol: 'TEST', assetType: 'EQUITY' } },
        ],
      },
    ],
    { 123: { profile: 'legacy-two' } }
  );
  assert.equal(snapshot.orders[0].profile, 'partner');
  assert.equal(config.canonicalProfile('unknown'), null);
  const initialized = config.normalizeViewDocument({
    ...original,
    assignment: { ...original.assignment, initialOwner: 'legacy-one' },
  });
  assert.equal(initialized.assignment.initialOwner, 'primary');
  assert.deepEqual(
    views.ownership(current.document, [
      { symbol: 'TEST', longQuantity: 3, averagePrice: 10, marketValue: 30, assignable: true },
    ]).holdings.partner.TEST.shares,
    2
  );
  delete process.env.STOCK_PROFILE_LEGACY_IDS;
});

test('public browser defaults contain no private configuration or obsolete credential fields', () => {
  const fs = require('node:fs');
  const vm = require('node:vm');
  const source = fs.readFileSync('stock/app.js', 'utf8');
  const defaults = vm.runInNewContext(
    source.slice(source.indexOf('const DEFAULT_STATE ='), source.indexOf('let appStarted =')) +
      ';DEFAULT_STATE'
  );
  for (const key of ['watchlist', 'holdings', 'quotes', 'journal'])
    assert.equal(Object.keys(defaults[key]).length, 0);
  assert.equal(defaults.deployBudget, 0);
  assert.ok(Object.values(defaults.rules).every((value) => value === 0));
  const html = fs.readFileSync('stock/index.html', 'utf8');
  assert.doesNotMatch(html, /id="input-schwab-(?:key|secret)"/);
  assert.doesNotMatch(html, /<input[^>]+id="login-username"[^>]+value="[^"]+"/);
  for (const input of html.matchAll(/<input[^>]+id="rule-[^"]+"[^>]*>/g))
    assert.doesNotMatch(input[0], /value=/);
});
