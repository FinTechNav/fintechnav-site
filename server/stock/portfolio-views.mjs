import views from '../../stock/portfolio-views.js';
import { protect, json, readBody, hash, HttpError, cleanState } from './security.mjs';
import { getCredentials, selectedAccount, brokerGet } from './brokerage.mjs';

import {
  normalizeViewDocument,
  canonicalProfile,
  profileLabels,
  legacyProfileIds,
  privateDefaults,
} from './private-config.mjs';

const keyFor = (user) => `view-configuration/${hash(user.id)}`;
export const tagPrefix = (user, account) => `view-order-labels/${hash(user.id + ':' + account)}/`;
export async function initializeExistingShares(store, user, current, snapshot) {
  if (!current.document?.assignment?.initialOwner) return current;
  const document = structuredClone(current.document);
  document.assignment = {
    allocations: Object.fromEntries(
      snapshot.positions
        .filter((p) => p.assignable)
        .map((p) => [p.symbol, { primary: p.longQuantity, partner: 0 }])
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
  return { document: normalizeViewDocument(entry?.data), revision: entry?.etag || null };
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
  const balanceSources = [
    account.currentBalances,
    account.projectedBalances,
    account.aggregatedBalance,
    account.initialBalances,
  ].filter(Boolean);

  const balances = {};
  for (const src of balanceSources) {
    for (const [k, v] of Object.entries(src)) {
      if (Number.isFinite(Number(v)) && balances[k] === undefined) {
        balances[k] = Number(v);
      }
    }
  }

  // Identify cash sweep positions (CASH_EQUIVALENT, CURRENCY, money market)
  const cashPositions = (account.positions || []).filter((p) => {
    const type = String(p.instrument?.assetType || '').toUpperCase();
    const sym = String(p.instrument?.symbol || '').toUpperCase();
    const desc = String(p.instrument?.description || '').toUpperCase();
    return (
      type === 'CASH_EQUIVALENT' ||
      type === 'CURRENCY' ||
      sym === 'SWVXX' ||
      sym === 'SNAXX' ||
      sym === 'SPAXX' ||
      sym === '/BA' ||
      sym.startsWith('QII') ||
      desc.includes('CASH') ||
      desc.includes('BANK DEPOSIT') ||
      desc.includes('MONEY MARKET') ||
      desc.includes('SWEEP')
    );
  });

  const cashPositionsTotal = cashPositions.reduce(
    (sum, p) => sum + (finite(p.marketValue) || finite(p.longQuantity) || 0),
    0
  );

  const cashCandidates = [
    balances.cashAvailableForTrading,
    balances.availableFunds,
    balances.cashBalance,
    balances.totalCash,
    balances.settledCash,
    balances.settledFunds,
    balances.availableFundsNonMarginableTrade,
    balances.nonMarginableTradeFunds,
    balances.moneyMarketFund,
    balances.buyingPower,
    balances.dayTradingBuyingPower,
    cashPositionsTotal > 0 ? cashPositionsTotal : null,
  ];

  const positiveCash = cashCandidates.find(
    (v) => typeof v === 'number' && Number.isFinite(v) && v > 0
  );

  if (positiveCash > 0) {
    balances.cashAvailableForTrading = positiveCash;
    if (!balances.cashBalance || balances.cashBalance <= 0) {
      balances.cashBalance = positiveCash;
    }
    if (!balances.availableFunds || balances.availableFunds <= 0) {
      balances.availableFunds = positiveCash;
    }
  } else if (cashPositionsTotal > 0) {
    balances.cashAvailableForTrading = cashPositionsTotal;
    balances.cashBalance = cashPositionsTotal;
    balances.availableFunds = cashPositionsTotal;
  }
  balances.cashPositionsTotal = cashPositionsTotal;
  const orders = history.map((order) => {
    const legs =
      order.orderLegCollection ||
      order.orderLegs ||
      order.legs ||
      order.childOrderStrategies?.[0]?.orderLegCollection ||
      order.childOrderStrategies?.[0]?.orderLegs ||
      [];
    // Complex/multi-leg orders remain visible as orders; never misattribute a leg.
    const single = legs.length === 1;
    const leg = single
      ? legs[0]
      : legs[0] || {
          instrument: order.instrument || {
            symbol: order.symbol,
            assetType: order.assetType || 'EQUITY',
          },
          instruction: order.instruction || order.orderType || '',
        };
    const orderId = String(order.orderId || '');
    const activityExecs = (order.orderActivityCollection || []).flatMap((a, activityIndex) =>
      (a.executionLegs || []).map((e, legIndex) => ({
        ...e,
        factId: `${orderId}-${a.activityId ?? activityIndex}-${legIndex}`,
      }))
    );
    const rootExecs = (order.executionLegs || order.executions || []).map((e, legIndex) => ({
      ...e,
      factId: `${orderId}-root-${legIndex}`,
    }));
    const allExecs = [...activityExecs, ...rootExecs];
    const executions = single
      ? allExecs
          .map((e) => {
            const qty = finite(e.quantity);
            let pr = finite(e.price);
            if (pr <= 0) {
              pr = Number(
                order.price ??
                order.limitPrice ??
                order.averageExecutionPrice ??
                order.avgFillPrice ??
                leg.price ??
                0
              );
            }
            const time = e.time || order.closeTime || order.enteredTime || new Date().toISOString();
            return {
              factId: e.factId,
              quantity: qty,
              price: pr,
              time,
              total:
                leg.instrument?.assetType === 'EQUITY' || !leg.instrument?.assetType
                  ? qty * pr
                  : null,
            };
          })
          .filter((e) => e.quantity > 0)
      : [];
    const status = String(order.status || order.state || '').toUpperCase();
    const filledQty = finite(order.filledQuantity) > 0
      ? finite(order.filledQuantity)
      : (status === 'FILLED' ? finite(order.quantity) : 0);
    if (single && executions.length === 0 && filledQty > 0) {
      const fillPrice = Number(
        order.price ??
        order.limitPrice ??
        order.averageExecutionPrice ??
        order.avgFillPrice ??
        leg.price ??
        0
      );
      const fillTime = order.closeTime || order.enteredTime || new Date().toISOString();
      executions.push({
        factId: `${orderId}-fill-0`,
        quantity: filledQty,
        price: fillPrice,
        time: fillTime,
        total:
          leg.instrument?.assetType === 'EQUITY' || !leg.instrument?.assetType
            ? filledQty * fillPrice
            : null,
      });
    }
    return {
      orderId,
      symbol: String(
        leg.instrument?.symbol || order.symbol || (single ? 'Unknown' : 'Multi-leg order')
      ),
      assetType: String(leg.instrument?.assetType || order.assetType || 'OTHER'),
      instruction: String(leg.instruction || order.instruction || order.orderType || ''),
      status,
      quantity: finite(order.quantity),
      filledQuantity: filledQty,
      enteredTime: order.enteredTime || order.closeTime || null,
      limitPrice: Number.isFinite(order.price) ? order.price : null,
      profile:
        single && canonicalProfile(labels[orderId]?.profile)
          ? canonicalProfile(labels[orderId].profile)
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
  )
    .filter(Boolean)
    .map((fact) => ({ ...fact, profile: canonicalProfile(fact.profile) }));
  return snapshot;
}
export const historyPath = (account) => {
  const to = new Date(Date.now() - 120000);
  const from = new Date(to.getTime() - 58 * 86400000);
  return `/accounts/${encodeURIComponent(account)}/orders?${new URLSearchParams({
    fromEnteredTime: from.toISOString(),
    toEnteredTime: to.toISOString(),
    maxResults: '3000',
  })}`;
};
export function transactionToOrder(tx) {
  const item = tx.transferItems?.[0] || {};
  const symbol = String(item.instrument?.symbol || item.instrument?.cusip || 'Unknown');
  const assetType = String(item.instrument?.assetType || 'EQUITY');
  const qty = Math.abs(Number(item.amount ?? tx.amount ?? 0));
  const desc = String(tx.description || '').toUpperCase();
  const net = Number(tx.netAmount ?? tx.amount ?? 0);
  const isBuy = desc.includes('BUY') || desc.includes('BOUGHT') || net < 0;
  const instruction = isBuy ? 'BUY' : 'SELL';
  let price = Number(item.price);
  if (!Number.isFinite(price) || price <= 0) {
    price = Number(
      item.cost && qty > 0 ? item.cost / qty : qty > 0 ? Math.abs(net) / qty : 0
    );
  }
  const time = tx.time || tx.tradeDate || tx.settlementDate || new Date().toISOString();
  const orderId = String(tx.orderId || tx.activityId || tx.positionId || '');

  return {
    orderId,
    symbol,
    assetType,
    instruction,
    status: 'FILLED',
    quantity: qty,
    filledQuantity: qty,
    enteredTime: time,
    closeTime: time,
    price,
    limitPrice: price,
    orderLegCollection: [
      {
        instruction,
        quantity: qty,
        instrument: {
          symbol,
          assetType,
          description: item.instrument?.description || symbol,
        },
      },
    ],
    executionLegs: [
      {
        quantity: qty,
        price,
        time,
      },
    ],
  };
}

export async function fetchOrderHistoryWithDiagnostics(
  account,
  record,
  fetcher = fetch,
  failClosed = false
) {
  const prefix = `/accounts/${encodeURIComponent(account)}`;
  const now = Date.now();
  const to = new Date(now - 120000);
  const from58 = new Date(to.getTime() - 58 * 86400000);
  const from30 = new Date(to.getTime() - 30 * 86400000);
  const from7 = new Date(to.getTime() - 7 * 86400000);

  const query58 = new URLSearchParams({
    fromEnteredTime: from58.toISOString(),
    toEnteredTime: to.toISOString(),
    maxResults: '3000',
  });
  const query30 = new URLSearchParams({
    fromEnteredTime: from30.toISOString(),
    toEnteredTime: to.toISOString(),
  });
  const query7 = new URLSearchParams({
    fromEnteredTime: from7.toISOString(),
    toEnteredTime: to.toISOString(),
  });

  const txQueryYMD = new URLSearchParams({
    startDate: from58.toISOString().slice(0, 10),
    endDate: to.toISOString().slice(0, 10),
    types: 'TRADE',
  });
  const txQueryISO = new URLSearchParams({
    startDate: from58.toISOString(),
    endDate: to.toISOString(),
    types: 'TRADE',
  });

  const diagnostics = [];
  let orders = null;
  let lastError = null;

  const strategies = [
    { name: 'account-bounded-58d', path: `${prefix}/orders?${query58}`, type: 'orders' },
    { name: 'account-bounded-30d', path: `${prefix}/orders?${query30}`, type: 'orders' },
    { name: 'account-bounded-7d', path: `${prefix}/orders?${query7}`, type: 'orders' },
    { name: 'global-bounded-58d', path: `/orders?${query58}`, type: 'orders' },
    { name: 'global-bounded-30d', path: `/orders?${query30}`, type: 'orders' },
    { name: 'account-tx-trade-ymd', path: `${prefix}/transactions?${txQueryYMD}`, type: 'transactions' },
    { name: 'account-tx-trade-iso', path: `${prefix}/transactions?${txQueryISO}`, type: 'transactions' },
    { name: 'account-tx-trade', path: `${prefix}/transactions?types=TRADE`, type: 'transactions' },
    { name: 'account-tx-all', path: `${prefix}/transactions`, type: 'transactions' },
    { name: 'account-unparameterized', path: `${prefix}/orders`, type: 'orders' },
    { name: 'global-unparameterized', path: `/orders`, type: 'orders' },
  ];

  for (const s of strategies) {
    try {
      const res = await brokerGet(s.path, record, fetcher);
      let list = [];
      if (Array.isArray(res)) {
        if (s.type === 'transactions') {
          list = res
            .filter(
              (t) =>
                t.type === 'TRADE' ||
                t.transferItems?.length ||
                /buy|bought|sell|sold/i.test(t.description || '')
            )
            .map(transactionToOrder);
        } else {
          list = res;
        }
      }
      const count = list.length;
      diagnostics.push({ strategy: s.name, ok: true, count });
      if (count > 0) {
        return { orders: list, diagnostics };
      }
      if (orders === null && Array.isArray(res)) {
        orders = list;
      }
    } catch (err) {
      lastError = err;
      diagnostics.push({ strategy: s.name, ok: false, error: err.message, status: err.status });
      if (err.status === 409 || err.status === 401) throw err;
    }
  }

  if (orders === null && lastError) {
    if (failClosed) {
      throw lastError instanceof HttpError
        ? lastError
        : new HttpError(502, lastError?.message || 'Could not verify brokerage data.');
    }
    return { orders: [], diagnostics };
  }

  return { orders: Array.isArray(orders) ? orders : [], diagnostics };
}

export async function fetchOrderHistory(account, record, fetcher = fetch, failClosed = false) {
  const result = await fetchOrderHistoryWithDiagnostics(account, record, fetcher, failClosed);
  return result.orders;
}

export async function fetchSnapshot(store, user, fetcher) {
  const record = await getCredentials(store, user, fetcher);
  const account = await selectedAccount(store, user, record, fetcher);
  const [accounts, historyResult] = await Promise.all([
    brokerGet('/accounts?fields=positions', record, fetcher),
    fetchOrderHistoryWithDiagnostics(account, record, fetcher, false),
  ]);
  const history = historyResult.orders;
  if (!Array.isArray(history) || history.length >= 3000)
    throw new HttpError(503, 'Recent order history is incomplete; allocations were not changed.');
  const snapshot = await labeledSnapshot(store, user, account, accounts, history);
  snapshot.orderDiagnostics = historyResult.diagnostics;
  return snapshot;
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
    const configuration = {
      labels: profileLabels(),
      legacyIds: legacyProfileIds(),
      defaults: privateDefaults(),
    };
    if (request.method === 'GET') return json({ ok: true, ...current, ...configuration });
    const body = await readBody(request);
    let document;
    if (body.action === 'initialize') {
      if (current.document) return json({ ok: true, ...current, ...configuration });
      document = views.defaults(
        preferences(body.preferences),
        configuration.defaults?.profiles.partner
      );
      document.assignment.initialOwner = 'primary';
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
            !['primary', 'partner'].every(
              (p) => typeof entry[p] === 'number' && Number.isFinite(entry[p]) && entry[p] >= 0
            ) ||
            entry.primary + entry.partner > available.get(symbol) + 1e-8
          )
            throw new HttpError(
              400,
              'Primary and Partner shares must be nonnegative and cannot exceed the latest Schwab quantity.'
            );
          allocations[symbol] = {
            primary: views.round(entry.primary),
            partner: views.round(entry.partner),
          };
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
    return json({ ok: true, document, revision: result.etag, ...configuration });
  }, dependencies);
export default createHandler();
