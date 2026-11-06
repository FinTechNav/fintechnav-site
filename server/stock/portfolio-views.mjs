import views from '../../stock/portfolio-views.js';
import { protect, json, readBody, hash, HttpError, cleanState } from './security.mjs';
import { getCredentials, selectedAccount, brokerGet } from './brokerage.mjs';

const keyFor = (user) => `view-configuration/${hash(user.id)}`;
export const tagPrefix = (user, account) => `view-order-labels/${hash(user.id + ':' + account)}/`;
export async function initializeExistingShares(store, user, current, snapshot) {
  if (!current.document?.assignment?.initialOwner) return current;
  const document = structuredClone(current.document);
  document.assignment = {
    allocations: Object.fromEntries(
      snapshot.positions
        .filter((p) => p.assignable)
        .map((p) => [p.symbol, { brad: p.longQuantity, dio: 0 }])
    ),
    baselineFills: Object.fromEntries(
      snapshot.allocationOrders.map((o) => [o.orderId, o.filledQuantity])
    ),
    savedAt: new Date().toISOString(),
  };
  const saved = await store.setJSON(keyFor(user), document, { onlyIfMatch: current.revision });
  if (!saved.modified)
    throw new HttpError(409, 'Shared views changed during initial sync. Sync again.');
  return { document, revision: saved.etag };
}
export async function readViews(store, user) {
  const entry = await store.getWithMetadata(keyFor(user), { type: 'json' });
  return { document: entry?.data || null, revision: entry?.etag || null };
}
export function normalizeAccount(accounts, history, labels = {}) {
  if (!Array.isArray(accounts) || accounts.length !== 1 || !accounts[0]?.securitiesAccount)
    throw new HttpError(502, 'Could not verify a single brokerage portfolio.');
  const account = accounts[0].securitiesAccount;
  const finite = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
  const positions = (account.positions || []).map((p) => ({
    symbol: String(p.instrument?.symbol || p.instrument?.cusip || 'Unknown'),
    description: String(p.instrument?.description || p.instrument?.symbol || 'Brokerage holding'),
    assetType: String(p.instrument?.assetType || 'OTHER'),
    longQuantity: finite(p.longQuantity),
    shortQuantity: finite(p.shortQuantity),
    averagePrice: finite(p.averagePrice),
    marketValue: finite(p.marketValue),
    assignable:
      p.instrument?.assetType === 'EQUITY' &&
      finite(p.longQuantity) > 0 &&
      finite(p.shortQuantity) === 0,
  }));
  const balances = Object.fromEntries(
    [
      'liquidationValue',
      'cashAvailableForTrading',
      'cashBalance',
      'availableFunds',
      'buyingPower',
      'nonMarginableTradeFunds',
    ]
      .filter((k) => Number.isFinite(account.currentBalances?.[k]))
      .map((k) => [k, account.currentBalances[k]])
  );
  const orders = history.map((order) => {
    const legs = order.orderLegCollection || [];
    // Complex/multi-leg orders remain visible as orders; never misattribute a leg.
    const single = legs.length === 1;
    const leg = single ? legs[0] : {};
    const orderId = String(order.orderId || '');
    const executions = single
      ? (order.orderActivityCollection || [])
          .filter((a) => a.activityType === 'EXECUTION' || a.executionType === 'FILL')
          .flatMap((a, activityIndex) =>
            (a.executionLegs || []).map((e, legIndex) => ({
              ...e,
              factId: `${orderId}-${a.activityId ?? activityIndex}-${legIndex}`,
            }))
          )
          .filter(
            (e) =>
              Number.isFinite(e.quantity) &&
              e.quantity > 0 &&
              Number.isFinite(e.price) &&
              Number.isFinite(Date.parse(e.time))
          )
          .map((e) => ({
            factId: e.factId,
            quantity: e.quantity,
            price: e.price,
            time: e.time,
            total: leg.instrument?.assetType === 'EQUITY' ? e.quantity * e.price : null,
          }))
      : [];
    return {
      orderId,
      symbol: String(leg.instrument?.symbol || (single ? 'Unknown' : 'Multi-leg order')),
      assetType: String(leg.instrument?.assetType || 'OTHER'),
      instruction: String(leg.instruction || ''),
      status: String(order.status || ''),
      quantity: finite(order.quantity),
      filledQuantity: finite(order.filledQuantity),
      enteredTime: order.enteredTime || null,
      limitPrice: Number.isFinite(order.price) ? order.price : null,
      profile:
        single && views.PERSONAL.includes(labels[orderId]?.profile)
          ? labels[orderId].profile
          : null,
      executions,
    };
  });
  return { positions, balances, orders, syncedAt: new Date().toISOString() };
}
export async function labeledSnapshot(store, user, account, accounts, history) {
  const prefix = tagPrefix(user, account);
  const ids = new Set(history.map((o) => String(o.orderId)));
  const listing = await store.list({ prefix });
  const labels = {};
  await Promise.all(
    listing.blobs
      .filter((blob) => ids.has(blob.key.slice(prefix.length)))
      .map(async (blob) => {
        labels[blob.key.slice(prefix.length)] = await store.get(blob.key, { type: 'json' });
      })
  );
  const snapshot = normalizeAccount(accounts, history, labels);
  // Immutable confirmed-execution facts preserve attribution beyond the broker's
  // recent-history window. No balances or incremented counters are stored.
  const factsPrefix = `view-execution-facts/${hash(user.id + ':' + account)}/`;
  for (const order of snapshot.orders.filter((o) => o.profile)) {
    for (const fill of order.executions) {
      await store.setJSON(
        factsPrefix + hash(fill.factId),
        {
          orderId: fill.factId,
          brokerOrderId: order.orderId,
          symbol: order.symbol,
          instruction: order.instruction,
          profile: order.profile,
          filledQuantity: fill.quantity,
        },
        { onlyIfNew: true }
      );
    }
  }
  const facts = await store.list({ prefix: factsPrefix });
  snapshot.allocationOrders = (
    await Promise.all(facts.blobs.map((blob) => store.get(blob.key, { type: 'json' })))
  ).filter(Boolean);
  return snapshot;
}
export const historyPath = (account) =>
  `/accounts/${encodeURIComponent(account)}/orders?${new URLSearchParams({ fromEnteredTime: new Date(Date.now() - 60 * 86400000).toISOString(), toEnteredTime: new Date().toISOString(), maxResults: '3000' })}`;
export async function fetchSnapshot(store, user, fetcher) {
  const record = await getCredentials(store, user, fetcher);
  const account = await selectedAccount(store, user, record, fetcher);
  const [accounts, history] = await Promise.all([
    brokerGet('/accounts?fields=positions', record, fetcher),
    brokerGet(historyPath(account), record, fetcher),
  ]);
  if (!Array.isArray(history) || history.length >= 3000)
    throw new HttpError(503, 'Recent order history is incomplete; allocations were not changed.');
  return labeledSnapshot(store, user, account, accounts, history);
}
function preferences(input) {
  const result = cleanState(input);
  if (
    !Array.isArray(result.watchlist) ||
    !result.rules ||
    ![
      'landlordRedTriggerPct',
      'sliceRedTriggerPct',
      'oversoldRsiThreshold',
      'zScoreTrigger',
      'harvestGainPct',
      'maxSingleStockWeightPct',
    ].every((key) => Number.isFinite(result.rules[key])) ||
    Object.values(result.rules).some((n) => Math.abs(n) > 1000)
  )
    throw new HttpError(400, 'A watchlist and valid strategy rules are required.');
  return result;
}
export const createHandler = (dependencies = {}) =>
  protect(async (request, context, user, store) => {
    if (!['GET', 'POST'].includes(request.method)) throw new HttpError(405, 'Method not allowed.');
    const current = await readViews(store, user);
    if (request.method === 'GET') return json({ ok: true, ...current });
    const body = await readBody(request);
    let document;
    if (body.action === 'initialize') {
      if (current.document) return json({ ok: true, ...current });
      document = views.defaults(preferences(body.preferences));
      document.assignment.initialOwner = 'brad';
    } else {
      if (!current.document || body.revision !== current.revision)
        throw new HttpError(
          409,
          'Shared views changed on another device. Reload shared views before saving.'
        );
      document = structuredClone(current.document);
      if (body.action === 'preferences' && views.PERSONAL.includes(body.profile))
        document.profiles[body.profile] = preferences(body.preferences);
      else if (body.action === 'assign') {
        const snapshot = await fetchSnapshot(store, user, dependencies.fetcher || fetch);
        const available = new Map(
          snapshot.positions.filter((p) => p.assignable).map((p) => [p.symbol, p.longQuantity])
        );
        if (
          !body.allocations ||
          Array.isArray(body.allocations) ||
          typeof body.allocations !== 'object' ||
          Object.keys(body.allocations).length > 300
        )
          throw new HttpError(400, 'Provide share allocations for the synced stock holdings.');
        const allocations = {};
        for (const [symbol, entry] of Object.entries(body.allocations)) {
          if (
            !/^[A-Z][A-Z0-9.]{0,9}$/.test(symbol) ||
            !available.has(symbol) ||
            !entry ||
            !['brad', 'dio'].every(
              (p) => typeof entry[p] === 'number' && Number.isFinite(entry[p]) && entry[p] >= 0
            ) ||
            entry.brad + entry.dio > available.get(symbol) + 1e-8
          )
            throw new HttpError(
              400,
              'Brad and Dio shares must be nonnegative and cannot exceed the latest Schwab quantity.'
            );
          allocations[symbol] = { brad: views.round(entry.brad), dio: views.round(entry.dio) };
        }
        document.assignment = {
          allocations,
          baselineFills: Object.fromEntries(
            snapshot.allocationOrders.map((o) => [o.orderId, o.filledQuantity])
          ),
          savedAt: new Date().toISOString(),
        };
      } else throw new HttpError(400, 'Unknown shared-view change.');
    }
    // Replace an explicit, user-edited view configuration document. Never increment
    // balances here; projections derive confirmed fills from Schwab on each sync.
    const result = await store.setJSON(
      keyFor(user),
      document,
      current.revision ? { onlyIfMatch: current.revision } : { onlyIfNew: true }
    );
    if (!result.modified)
      throw new HttpError(409, 'Shared views changed on another device. Reload before saving.');
    return json({ ok: true, document, revision: result.etag });
  }, dependencies);
export default createHandler();
