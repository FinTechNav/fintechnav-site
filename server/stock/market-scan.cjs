// Zero-dependency Netlify Serverless Function: Live OHLCV & Quote Proxy for Red-Day Scanner

const DEFAULT_SYMBOLS = [
  'IREN', 'APLD', 'WULF', 'CORZ', 'CIFR', 'CLSK',
  'NVDA', 'AVGO', 'VRT', 'ANET', 'VST',
  'POET', 'EOSE', 'HIVE', 'BTBT'
];

async function fetchTickerChart(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=3mo&interval=1d&includePrePost=true`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });
  if (!res.ok) {
    throw new Error(`Yahoo chart HTTP ${res.status} for ${symbol}`);
  }
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`No chart result for ${symbol}`);

  const meta = result.meta || {};
  const rawCloses = result.indicators?.quote?.[0]?.close || [];
  const closes = rawCloses.filter((c) => typeof c === 'number' && !Number.isNaN(c));

  const regularPrice = meta.regularMarketPrice ?? (closes[closes.length - 1] || 0);
  const postMarketPrice = meta.postMarketPrice ?? null;
  const preMarketPrice = meta.preMarketPrice ?? null;
  const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? (closes[closes.length - 2] || regularPrice);

  if (closes.length > 0 && regularPrice) {
    closes[closes.length - 1] = regularPrice;
  }

  return {
    symbol,
    regularPrice,
    postMarketPrice,
    preMarketPrice,
    activePrice: postMarketPrice || preMarketPrice || regularPrice,
    prevClose,
    closes: closes.slice(-35),
    currency: meta.currency || 'USD',
    exchangeName: meta.exchangeName || 'NMS',
    updatedAt: new Date().toISOString()
  };
}

exports.handler = async function handler(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=15'
  };

  try {
    const rawSymbols = event.queryStringParameters?.symbols;
    const symbols = rawSymbols
      ? rawSymbols.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 30)
      : DEFAULT_SYMBOLS;

    const settled = await Promise.allSettled(symbols.map((sym) => fetchTickerChart(sym)));
    const quotes = {};
    const errors = {};

    settled.forEach((item, idx) => {
      const sym = symbols[idx];
      if (item.status === 'fulfilled') {
        quotes[sym] = item.value;
      } else {
        errors[sym] = item.reason?.message || 'Failed to fetch';
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        timestamp: new Date().toISOString(),
        quotes,
        errors
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
