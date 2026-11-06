import { randomBytes } from 'node:crypto';
import { protect, json, readBody, hash, HttpError } from './security.mjs';
import { BROKER, getCredentials, selectedAccount, brokerGet } from './brokerage.mjs';
import {
  validateOrders,
  checkDayTrade,
  inspectHistory,
  MAX_ORDER_DOLLARS,
  MAX_BATCH_DOLLARS,
} from './orders.mjs';

export const createHandler = (dependencies = {}) =>
  protect(async (request, context, user, store) => {
    if (!['GET', 'POST'].includes(request.method)) throw new HttpError(405, 'Method not allowed.');
    const fetcher = dependencies.fetcher || fetch;
    const body = request.method === 'POST' ? await readBody(request) : null;
    // Validate all requested orders before contacting the broker.
    const orders = body?.action === 'prepare' ? validateOrders(body.orders) : null;
    if (body && !['prepare', 'submit'].includes(body.action))
      throw new HttpError(400, 'Review and confirm the orders before submitting.');
    const record = await getCredentials(store, user, fetcher);
    const account = await selectedAccount(store, user, record, fetcher);
    const prefix = `/accounts/${encodeURIComponent(account)}`;
    const historyPath = () => {
      // Include older GTC orders that may have executed today, not just orders
      // entered today. Saturated result sets fail closed in inspectHistory.
      const query = new URLSearchParams({
        fromEnteredTime: new Date(Date.now() - 60 * 86400000).toISOString(),
        toEnteredTime: new Date().toISOString(),
        maxResults: '3000',
      });
      return `${prefix}/orders?${query}`;
    };
    if (request.method === 'GET') {
      const [accounts, todayOrders] = await Promise.all([
        brokerGet('/accounts?fields=positions', record, fetcher),
        brokerGet(historyPath(), record, fetcher),
      ]);
      const locks = inspectHistory(todayOrders);
      return json({
        ok: true,
        accountNumbers: [{ hashValue: account }],
        accounts,
        dayTradeLocks: { boughtToday: [...locks.buys], soldToday: [...locks.sells] },
        policy: {
          maxOrderDollars: MAX_ORDER_DOLLARS,
          maxBatchDollars: MAX_BATCH_DOLLARS,
          blockDayTrades: true,
        },
      });
    }
    if (body.action === 'prepare') {
      checkDayTrade(orders, await brokerGet(historyPath(), record, fetcher));
      const confirmationId = randomBytes(32).toString('hex');
      await store.setJSON(`approvals/${hash(confirmationId)}`, {
        userId: user.id,
        generation: record.generation,
        account,
        orders,
        expiresAt: Date.now() + 300000,
      });
      return json({
        ok: true,
        confirmationId,
        orders,
        maxOrderDollars: MAX_ORDER_DOLLARS,
        total: orders.reduce((sum, order) => sum + order.quantity * order.limitPrice, 0),
      });
    }
    if (!/^[a-f0-9]{64}$/.test(body.confirmationId || ''))
      throw new HttpError(400, 'Review the orders before confirming.');
    const key = `approvals/${hash(body.confirmationId)}`;
    const approval = await store.get(key, { type: 'json' });
    if (
      !approval ||
      approval.userId !== user.id ||
      approval.generation !== record.generation ||
      approval.account !== account ||
      approval.expiresAt < Date.now()
    ) {
      throw new HttpError(409, 'This confirmation has expired. Review the orders again.');
    }
    checkDayTrade(approval.orders, await brokerGet(historyPath(), record, fetcher));
    // Immutable one-time claim, not a read-then-write lock or in-memory dedupe.
    // A network timeout never causes an automatic resubmission of an order.
    const claim = await store.setJSON(`${key}/submitted`, { at: Date.now() }, { onlyIfNew: true });
    if (!claim.modified)
      throw new HttpError(
        409,
        'These orders have already been submitted. Check Schwab before trying again.'
      );
    const results = [];
    for (const order of approval.orders) {
      try {
        // Recheck immediately before each order; any unavailable check stops the batch.
        checkDayTrade([order], await brokerGet(historyPath(), record, fetcher));
        const response = await fetcher(`${BROKER}${prefix}/orders`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${record.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderType: 'LIMIT',
            session: order.session,
            duration: order.session === 'PM' ? 'EXTENDED' : 'DAY',
            price: order.limitPrice.toFixed(order.limitPrice < 1 ? 4 : 2),
            orderStrategyType: 'SINGLE',
            orderLegCollection: [
              {
                instruction: order.instruction,
                quantity: order.quantity,
                instrument: { symbol: order.symbol, assetType: 'EQUITY' },
              },
            ],
          }),
          signal: AbortSignal.timeout(15000),
        });
        results.push({
          ...order,
          ok: response.ok,
          orderId: response.headers.get('location')?.split('/').pop() || null,
          ...(response.ok
            ? {}
            : { error: 'Schwab did not accept this order. Check your brokerage account.' }),
        });
        if (!response.ok) break;
      } catch {
        results.push({
          ...order,
          ok: false,
          error:
            'Order status could not be confirmed. Check Schwab directly before placing another order.',
        });
        break;
      }
    }
    return json({
      ok: results.length === approval.orders.length && results.every((result) => result.ok),
      results,
    });
  }, dependencies);
export default createHandler();
