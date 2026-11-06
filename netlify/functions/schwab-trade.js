// Charles Schwab Trader API Proxy: Live Balances, Positions & Guardrailed Limit Order Placement
// Enforces:
// 1. Anti-PDT / No-Same-Day-Round-Trip Guardrail (blocks buying & selling the same ticker on the same calendar day)
// 2. Limit-only orders, max dollar cap, and AC4203 sub-$1.00 cleared-cash checks.

const SCHWAB_TRADER_BASE = 'https://api.schwabapi.com/trader/v1';

function getTodayUtcRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
  return {
    fromEnteredTime: start.toISOString(),
    toEnteredTime: end.toISOString()
  };
}

exports.handler = async function handler(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-App-Passcode'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const requiredPasscode = process.env.APP_PASSCODE || '';
  const providedPasscode = event.headers['x-app-passcode'] || '';
  if (requiredPasscode && providedPasscode !== requiredPasscode) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ ok: false, error: 'Invalid App Passcode.' })
    };
  }

  const accessToken = event.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
  if (!accessToken) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Missing Schwab Access Token. Click "Schwab API" in the top bar and sign in with Charles Schwab.'
      })
    };
  }

  try {
    if (event.httpMethod === 'GET') {
      console.log('[schwab-trade][GET] Fetching accountNumbers, positions, and today orders from Schwab Trader API');
      const [acctHashRes, accountsRes] = await Promise.all([
        fetch(`${SCHWAB_TRADER_BASE}/accounts/accountNumbers`, {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
        }),
        fetch(`${SCHWAB_TRADER_BASE}/accounts?fields=positions`, {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
        })
      ]);

      if (!acctHashRes.ok || !accountsRes.ok) {
        const errText = await accountsRes.text();
        console.error(`[schwab-trade][GET][ERROR] HTTP ${accountsRes.status}: ${errText}`);
        return {
          statusCode: accountsRes.status,
          headers,
          body: JSON.stringify({ ok: false, httpStatus: accountsRes.status, error: `Schwab API HTTP ${accountsRes.status}: ${errText.slice(0, 240)}` })
        };
      }

      const accountNumbers = await acctHashRes.json();
      const accounts = await accountsRes.json();

      // Also fetch today's orders so client can display same-day round-trip (PDT) locks accurately
      let todayOrders = [];
      const firstHash = accountNumbers?.[0]?.hashValue;
      if (firstHash) {
        try {
          const { fromEnteredTime, toEnteredTime } = getTodayUtcRange();
          const ordRes = await fetch(
            `${SCHWAB_TRADER_BASE}/accounts/${encodeURIComponent(firstHash)}/orders?fromEnteredTime=${encodeURIComponent(fromEnteredTime)}&toEnteredTime=${encodeURIComponent(toEnteredTime)}`,
            { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } }
          );
          if (ordRes.ok) {
            todayOrders = await ordRes.json();
          }
        } catch {
          // non-fatal if orders endpoint unavailable
        }
      }

      console.log(`[schwab-trade][GET][SUCCESS] Loaded ${accountNumbers.length || 0} account(s), ${todayOrders.length || 0} today order(s)`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, accountNumbers, accounts, todayOrders })
      };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { accountHash, orders = [], maxOrderDollars = 100, unsettledCash = true, blockDayTrades = true } = body;

      if (!accountHash) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ ok: false, error: 'Missing accountHash for Schwab order placement. Sync positions first.' })
        };
      }

      // Fetch live today's orders from Charles Schwab to enforce server-side Anti-PDT protection
      const sameDayBuys = new Set();
      const sameDaySells = new Set();
      if (blockDayTrades) {
        try {
          const { fromEnteredTime, toEnteredTime } = getTodayUtcRange();
          const ordRes = await fetch(
            `${SCHWAB_TRADER_BASE}/accounts/${encodeURIComponent(accountHash)}/orders?fromEnteredTime=${encodeURIComponent(fromEnteredTime)}&toEnteredTime=${encodeURIComponent(toEnteredTime)}`,
            { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } }
          );
          if (ordRes.ok) {
            const liveOrders = await ordRes.json();
            if (Array.isArray(liveOrders)) {
              for (const o of liveOrders) {
                const status = String(o.status || '').toUpperCase();
                if (['CANCELED', 'REJECTED', 'EXPIRED'].includes(status)) continue;
                const legs = o.orderLegCollection || [];
                for (const leg of legs) {
                  const sym = String(leg.instrument?.symbol || '').toUpperCase();
                  const inst = String(leg.instruction || '').toUpperCase();
                  if (sym && inst.includes('BUY')) sameDayBuys.add(sym);
                  if (sym && inst.includes('SELL')) sameDaySells.add(sym);
                }
              }
            }
          }
        } catch (e) {
          console.warn('[schwab-trade][PDT-CHECK] Could not inspect today orders:', e.message);
        }
      }

      const results = [];
      for (const ord of orders) {
        const symbol = String(ord.symbol || '').toUpperCase().trim();
        const quantity = Math.floor(Number(ord.qty || ord.quantity || 0));
        const limitPrice = Number(ord.limitPrice || ord.price || 0);
        const instruction = String(ord.instruction || 'BUY').toUpperCase();
        const session = ord.session === 'EXTENDED' ? 'PM' : (ord.session === 'SEAMLESS' ? 'SEAMLESS' : 'NORMAL');
        const duration = session === 'PM' ? 'EXTENDED' : 'DAY';
        const estTotal = quantity * limitPrice;

        if (!symbol || quantity < 1 || limitPrice <= 0) {
          results.push({ symbol, ok: false, error: 'Invalid symbol, whole-share quantity, or limit price.' });
          continue;
        }

        // Anti-Day-Trade (PDT) Guardrail: Never allow opposite-side execution on the same calendar day
        if (blockDayTrades) {
          if (instruction === 'SELL' && sameDayBuys.has(symbol)) {
            results.push({
              symbol,
              ok: false,
              pdtBlocked: true,
              error: `Anti-Day-Trade Guardrail (PDT Protection): You already bought ${symbol} today. Selling ${symbol} today would count as a Day Trade on your Margin account. Hold overnight and sell tomorrow!`
            });
            continue;
          }
          if (instruction === 'BUY' && sameDaySells.has(symbol)) {
            results.push({
              symbol,
              ok: false,
              pdtBlocked: true,
              error: `Anti-Day-Trade Guardrail (PDT Protection): You already sold ${symbol} today. Re-buying ${symbol} today would count as a Day Trade + Wash Sale. Wait until tomorrow!`
            });
            continue;
          }
        }

        if (estTotal > maxOrderDollars) {
          results.push({
            symbol,
            ok: false,
            error: `Guardrail veto: Order total $${estTotal.toFixed(2)} exceeds per-order cap ($${maxOrderDollars}).`
          });
          continue;
        }
        if (instruction === 'BUY' && unsettledCash && limitPrice < 1.0) {
          results.push({
            symbol,
            ok: false,
            error: `Schwab AC4203 Guardrail: ${symbol} is under $1.00 ($${limitPrice.toFixed(4)}) and requires settled cash.`
          });
          continue;
        }

        const schwabOrderPayload = {
          orderType: 'LIMIT',
          session,
          duration,
          price: limitPrice.toFixed(limitPrice < 1 ? 4 : 2),
          orderStrategyType: 'SINGLE',
          orderLegCollection: [
            {
              instruction,
              quantity,
              instrument: {
                symbol,
                assetType: 'EQUITY'
              }
            }
          ]
        };

        console.log(`[schwab-trade][POST] Submitting LIMIT ${instruction} ${quantity}x ${symbol} @ $${limitPrice}`);
        const orderRes = await fetch(`${SCHWAB_TRADER_BASE}/accounts/${encodeURIComponent(accountHash)}/orders`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(schwabOrderPayload)
        });

        const locationHeader = orderRes.headers.get('location') || '';
        const orderId = locationHeader.split('/').pop() || 'SUBMITTED';

        if (orderRes.ok) {
          if (instruction === 'BUY') sameDayBuys.add(symbol);
          if (instruction === 'SELL') sameDaySells.add(symbol);
          results.push({ symbol, quantity, limitPrice, instruction, session, ok: true, orderId });
        } else {
          const errBody = await orderRes.text();
          console.error(`[schwab-trade][POST][ERROR] ${symbol} HTTP ${orderRes.status}: ${errBody}`);
          results.push({ symbol, quantity, limitPrice, instruction, ok: false, error: errBody });
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, results })
      };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    console.error('[schwab-trade][EXCEPTION]', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
