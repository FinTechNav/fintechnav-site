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
  const accountList = Array.isArray(accounts) ? accounts : [accounts];
  if (!accountList.length) {
    throw new HttpError(502, 'Could not verify a single brokerage portfolio.');
  }
  const accountObj = accountList.find((a) => a?.securitiesAccount) || accountList[0];
  const account = accountObj?.securitiesAccount || accountObj;
  if (!account) {
    throw new HttpError(502, 'Could not verify a single brokerage portfolio.');
  }
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
  // Prefer positive numerical values over $0.00 across all balance containers
  for (const src of balanceSources) {
    for (const [k, v] of Object.entries(src)) {
      const num = Number(v);
      if (Number.isFinite(num)) {
        if (balances[k] === undefined || (balances[k] <= 0 && num > 0)) {
          balances[k] = num;
        }
      }
    }
  }

  // Also inspect top-level properties on account and securitiesAccount
  for (const obj of [account, accountList[0]]) {
    for (const [k, v] of Object.entries(obj || {})) {
      if (typeof v === 'number' && Number.isFinite(v)) {
        if (balances[k] === undefined || (balances[k] <= 0 && v > 0)) {
          balances[k] = v;
        }
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
      sym === 'SWGXX' ||
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

  const cashFieldNames = [
    'cashAvailableForTrading',
    'availableFunds',
    'cashBalance',
    'totalCash',
    'settledCash',
    'settledFunds',
    'cashBuyingPower',
    'availableFundsNonMarginableTrade',
    'nonMarginableTradeFunds',
    'moneyMarketFund',
    'buyingPower',
    'dayTradingBuyingPower',
    'unsettledCash',
    'cashReceipts',
  ];

  let positiveCash = null;
  let positiveCashSource = null;

  for (const field of cashFieldNames) {
    if (typeof balances[field] === 'number' && balances[field] > 0) {
      positiveCash = balances[field];
      positiveCashSource = field;
      break;
    }
  }

  if (!positiveCash) {
    for (const src of balanceSources) {
      for (const field of cashFieldNames) {
        const val = Number(src?.[field]);
        if (Number.isFinite(val) && val > 0) {
          positiveCash = val;
          positiveCashSource = `container.${field}`;
          break;
        }
      }
      if (positiveCash) break;
    }
  }

  if (!positiveCash && cashPositionsTotal > 0) {
    positiveCash = cashPositionsTotal;
    positiveCashSource = 'positions.sweep';
  }

  // Derive cash from account liquidationValue minus total securities market value.
  // If Schwab cash is sitting in the FDIC bank sweep and ledger shows $0.00 cashBalance,
  // liquidationValue - longMarketValue accurately yields the net cash balance.
  if (!positiveCash) {
    const liquidation = finite(
      balances.liquidationValue ??
      balances.equity ??
      account.currentBalances?.liquidationValue ??
      account.initialBalances?.liquidationValue
    );
    const stockMarketValue = finite(
      balances.longMarketValue ??
      balances.marketValue ??
      positions.reduce((sum, p) => sum + (finite(p.marketValue) || (finite(p.longQuantity) * finite(p.averagePrice))), 0)
    );
    const implied = Math.round((liquidation - stockMarketValue) * 100) / 100;
    if (implied > 0) {
      positiveCash = implied;
      positiveCashSource = 'liquidationValue - stockMarketValue';
      balances.impliedCash = implied;
    }
  }

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
  balances.positiveCashSource = positiveCashSource;
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
  if (!tx || typeof tx !== 'object') return null;

  const items = Array.isArray(tx.transferItems) ? tx.transferItems : [];
  const securityItem =
    items.find(
      (ti) =>
        ti.instrument?.assetType === 'EQUITY' ||
        (ti.instrument?.assetType && ti.instrument?.assetType !== 'CURRENCY')
    ) ||
    items.find((ti) => ti.instrument?.symbol && ti.instrument?.symbol !== 'USD') ||
    items[0] ||
    {};

  const cashItem = items.find(
    (ti) => ti.instrument?.assetType === 'CURRENCY' || ti.instrument?.symbol === 'USD'
  );

  let symbol = String(securityItem.instrument?.symbol || securityItem.instrument?.cusip || '').trim();
  let assetType = String(securityItem.instrument?.assetType || 'EQUITY');

  const desc = String(tx.description || '').toUpperCase();
  const net = Number(tx.netAmount ?? tx.amount ?? 0);

  // If symbol is missing, unknown or currency, attempt regex extraction from description
  if (!symbol || symbol === 'UNKNOWN' || symbol === 'USD') {
    const descMatch =
      desc.match(/(?:BOUGHT|SOLD|BUY|SELL|BOT|SLD)\s+([0-9.]+)?\s*([A-Z]{1,5})\b/i) ||
      desc.match(/\b([A-Z]{1,5})\b/);
    if (descMatch) {
      const candidate = descMatch[2] || descMatch[1];
      if (candidate && !['USD', 'CASH', 'THE', 'AND', 'FOR', 'AT'].includes(candidate.toUpperCase())) {
        symbol = candidate.toUpperCase();
      }
    }
  }

  if (!symbol || symbol === 'UNKNOWN') {
    symbol = String(tx.symbol || tx.cusip || 'Unknown').trim();
  }

  // Determine quantity
  let qty = Math.abs(Number(securityItem.amount ?? tx.quantity ?? tx.amount ?? 0));
  if (qty <= 0) {
    const qtyMatch = desc.match(/(?:BOUGHT|SOLD|BUY|SELL|BOT|SLD)\s+([0-9.]+)/i);
    if (qtyMatch) {
      qty = Math.abs(Number(qtyMatch[1]));
    }
  }
  if (!Number.isFinite(qty) || qty <= 0) {
    qty = 1;
  }

  // Determine instruction (BUY vs SELL)
  let instruction = 'BUY';
  if (
    desc.includes('SELL') ||
    desc.includes('SOLD') ||
    desc.includes('SLD') ||
    (securityItem.positionEffect === 'CLOSING' && securityItem.amount < 0)
  ) {
    instruction = 'SELL';
  } else if (
    desc.includes('BUY') ||
    desc.includes('BOUGHT') ||
    desc.includes('BOT') ||
    net < 0
  ) {
    instruction = 'BUY';
  } else if (securityItem.amount < 0 && net > 0) {
    instruction = 'SELL';
  } else if (securityItem.amount > 0 && net < 0) {
    instruction = 'BUY';
  }

  // Determine execution price
  let price = Number(securityItem.price ?? tx.price ?? 0);
  if (!Number.isFinite(price) || price <= 0) {
    if (securityItem.cost && qty > 0) {
      price = Math.abs(Number(securityItem.cost)) / qty;
    } else if (cashItem && Math.abs(Number(cashItem.amount)) > 0 && qty > 0) {
      price = Math.abs(Number(cashItem.amount)) / qty;
    } else if (net !== 0 && qty > 0) {
      price = Math.abs(net) / qty;
    }
  }
  if (!Number.isFinite(price)) price = 0;
  price = Math.round(price * 100) / 100;

  const time = tx.time || tx.tradeDate || tx.settlementDate || new Date().toISOString();
  const orderId = String(
    tx.orderId || tx.activityId || tx.transactionId || tx.positionId || Math.floor(Math.random() * 1000000000)
  );

  return {
    orderId,
    symbol: symbol.toUpperCase(),
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
          symbol: symbol.toUpperCase(),
          assetType,
          description: securityItem.instrument?.description || tx.description || symbol,
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

export function transactionsToOrders(transactions) {
  if (!Array.isArray(transactions)) return [];
  const tradeTxs = transactions.filter((t) => {
    if (!t || typeof t !== 'object') return false;
    const type = String(t.type || '').toUpperCase();
    const desc = String(t.description || '').toUpperCase();
    if (
      type === 'ELECTRONIC_FUND' ||
      type === 'ACH' ||
      type === 'WIRE' ||
      type === 'DIVIDEND_OR_INTEREST' ||
      type === 'INTEREST'
    ) {
      return false;
    }
    if (type === 'TRADE') return true;
    if (/BUY|BOUGHT|BOT|SELL|SOLD|SLD|PURCHASE/i.test(desc)) return true;
    if (t.transferItems?.some((ti) => ti.instrument?.assetType === 'EQUITY')) return true;
    return false;
  });

  return tradeTxs.map(transactionToOrder).filter(Boolean);
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
  const from365 = new Date(to.getTime() - 365 * 86400000);
  const from180 = new Date(to.getTime() - 180 * 86400000);
  const from90 = new Date(to.getTime() - 90 * 86400000);
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

  const txQuery365All = new URLSearchParams({
    startDate: from365.toISOString(),
    endDate: to.toISOString(),
  });
  const txQuery180All = new URLSearchParams({
    startDate: from180.toISOString(),
    endDate: to.toISOString(),
  });
  const txQuery90All = new URLSearchParams({
    startDate: from90.toISOString(),
    endDate: to.toISOString(),
  });
  const txQuery58All = new URLSearchParams({
    startDate: from58.toISOString(),
    endDate: to.toISOString(),
  });
  const txQuery365Trade = new URLSearchParams({
    startDate: from365.toISOString(),
    endDate: to.toISOString(),
    types: 'TRADE',
  });
  const txQuery180Trade = new URLSearchParams({
    startDate: from180.toISOString(),
    endDate: to.toISOString(),
    types: 'TRADE',
  });
  const txQuery58Trade = new URLSearchParams({
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
    { name: 'account-orders-filled-58d', path: `${prefix}/orders?${query58}&status=FILLED`, type: 'orders' },
    { name: 'global-bounded-58d', path: `/orders?${query58}`, type: 'orders' },
    { name: 'global-bounded-30d', path: `/orders?${query30}`, type: 'orders' },
    { name: 'account-tx-365d-all', path: `${prefix}/transactions?${txQuery365All}`, type: 'transactions' },
    { name: 'account-tx-180d-all', path: `${prefix}/transactions?${txQuery180All}`, type: 'transactions' },
    { name: 'account-tx-90d-all', path: `${prefix}/transactions?${txQuery90All}`, type: 'transactions' },
    { name: 'account-tx-58d-all', path: `${prefix}/transactions?${txQuery58All}`, type: 'transactions' },
    { name: 'account-tx-365d-trade', path: `${prefix}/transactions?${txQuery365Trade}`, type: 'transactions' },
    { name: 'account-tx-180d-trade', path: `${prefix}/transactions?${txQuery180Trade}`, type: 'transactions' },
    { name: 'account-tx-58d-trade', path: `${prefix}/transactions?${txQuery58Trade}`, type: 'transactions' },
    { name: 'account-unparameterized', path: `${prefix}/orders`, type: 'orders' },
    { name: 'global-unparameterized', path: `/orders`, type: 'orders' },
  ];

  for (const s of strategies) {
    try {
      const res = await brokerGet(s.path, record, fetcher);
      let list = [];
      if (Array.isArray(res)) {
        if (s.type === 'transactions') {
          list = transactionsToOrders(res);
        } else {
          list = res;
        }
      }
      const count = list.length;
      const rawCount = Array.isArray(res) ? res.length : 0;
      diagnostics.push({ strategy: s.name, ok: true, count, raw: rawCount });
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
  const [accountData, historyResult] = await Promise.all([
    (async () => {
      try {
        const direct = await brokerGet(
          `/accounts/${encodeURIComponent(account)}?fields=positions`,
          record,
          fetcher
        );
        if (direct && (direct.securitiesAccount || direct.positions || direct.currentBalances)) {
          return Array.isArray(direct) ? direct : [direct];
        }
      } catch {
        // Fall back to multi-account endpoint
      }
      return brokerGet('/accounts?fields=positions', record, fetcher);
    })(),
    fetchOrderHistoryWithDiagnostics(account, record, fetcher, false),
  ]);
  const accounts = Array.isArray(accountData) ? accountData : [accountData];
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
