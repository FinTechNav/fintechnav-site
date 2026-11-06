import { HttpError } from './security.mjs';

// These limits belong to the server. Request fields cannot raise or disable them.
export const MAX_ORDER_DOLLARS = 100;
export const MAX_BATCH_DOLLARS = 100;
export const MAX_ORDERS = 10;
export const marketDate = (date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));

export function validateOrders(input) {
  if (!Array.isArray(input) || !input.length || input.length > MAX_ORDERS)
    throw new HttpError(400, 'Choose between 1 and 10 whole-share limit orders.');
  const seen = new Set();
  let total = 0;
  const orders = input.map((order) => {
    if (!order || typeof order !== 'object') throw new HttpError(400, 'Invalid order.');
    const symbol = String(order.symbol || '')
      .trim()
      .toUpperCase();
    const quantity = order.qty ?? order.quantity;
    const price = order.limitPrice ?? order.price;
    const instruction = String(order.instruction || 'BUY').toUpperCase();
    const requestedSession = order.session || 'NORMAL';
    if (
      !/^[A-Z][A-Z0-9.]{0,9}$/.test(symbol) ||
      typeof quantity !== 'number' ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      typeof price !== 'number' ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !['BUY', 'SELL'].includes(instruction) ||
      !['NORMAL', 'EXTENDED', 'SEAMLESS'].includes(requestedSession)
    ) {
      throw new HttpError(
        400,
        'Use a valid stock symbol, whole-share quantity, positive limit price and BUY or SELL.'
      );
    }
    // Normalize the actual submitted price BEFORE checking the dollar limit.
    const limitPrice = Number(price.toFixed(price < 1 ? 4 : 2));
    if (!limitPrice || quantity * limitPrice > MAX_ORDER_DOLLARS)
      throw new HttpError(400, 'Each order must be $100 or less.');
    if (instruction === 'BUY' && limitPrice < 1)
      throw new HttpError(
        400,
        'Sub-$1 purchases are blocked until settled funds can be verified by the server.'
      );
    if (seen.has(symbol)) throw new HttpError(400, 'Use one order per stock in a confirmation.');
    seen.add(symbol);
    total += quantity * limitPrice;
    return {
      symbol,
      quantity,
      limitPrice,
      instruction,
      session: requestedSession === 'EXTENDED' ? 'PM' : requestedSession,
    };
  });
  if (total > MAX_BATCH_DOLLARS + 1e-8)
    throw new HttpError(400, 'The combined orders must be $100 or less.');
  return orders;
}

export function inspectHistory(history, now = Date.now()) {
  if (!Array.isArray(history) || history.length >= 3000)
    throw new HttpError(503, 'Could not verify complete recent order history. Trading is paused.');
  const buys = new Set();
  const sells = new Set();
  const today = marketDate(now);
  for (const order of history) {
    const status = String(order.status || '').toUpperCase();
    const canceledWithoutFills =
      ['CANCELED', 'REJECTED', 'EXPIRED'].includes(status) && !Number(order.filledQuantity);
    if (canceledWithoutFills) continue;
    const executionToday = (order.orderActivityCollection || []).some((activity) =>
      (activity.executionLegs || []).some((leg) => leg.time && marketDate(leg.time) === today)
    );
    const enteredToday = order.enteredTime && marketDate(order.enteredTime) === today;
    const working = !['FILLED', 'CANCELED', 'REJECTED', 'EXPIRED', 'REPLACED'].includes(status);
    if (!executionToday && !enteredToday && !working) continue;
    for (const leg of order.orderLegCollection || []) {
      const symbol = String(leg.instrument?.symbol || '').toUpperCase();
      if (String(leg.instruction).includes('BUY')) buys.add(symbol);
      if (String(leg.instruction).includes('SELL')) sells.add(symbol);
    }
  }
  return { buys, sells };
}
export function checkDayTrade(orders, history, now) {
  const { buys, sells } = inspectHistory(history, now);
  for (const order of orders) {
    if (
      (order.instruction === 'SELL' && buys.has(order.symbol)) ||
      (order.instruction === 'BUY' && sells.has(order.symbol))
    ) {
      throw new HttpError(
        409,
        `Hold ${order.symbol} overnight. An opposite-side order or execution is recorded for today.`
      );
    }
  }
}
