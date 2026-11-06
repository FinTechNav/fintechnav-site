# RedDay AI — Charles Schwab Dip-Hunter PWA ($0 Free Netlify Edition)

- **Live Production URL:** **`https://redday-ai-schwab.netlify.app`**
- **Netlify Project Dashboard:** `https://app.netlify.com/projects/redday-ai-schwab/overview`
- **Netlify Site ID:** `4a362844-87cc-4dcd-90b1-d45a832453d6`

A zero-build, zero-hosting-cost Progressive Web App (PWA) for executing the **60 / 20 / 20 Red-Day AI & Data Center Dip-Buying Strategy** on Charles Schwab (`<$1,000` portfolio blueprint).

## Why This Uses $0.00 on Your Free Netlify Account
1. **Zero Cloud Build Minutes:** The frontend in `public/` uses native browser ES6 modules (`public/app.js`, `public/index.html`, `public/manifest.json`, `public/sw.js`). Every deploy consumes **0 seconds** of Netlify's 300 free monthly build minutes.
2. **Client-Side Quant Engine:** All RSI-14, 20-day Z-score, 20-day drawdown, and Exact-Change Knapsack sizing math runs directly in your browser's JavaScript engine.
3. **Lightweight Stateless Serverless Functions (`netlify/functions/`):**
   - `market-scan.mjs` (`/api/market-scan`): Fetches live 3-month daily OHLCV + post-market quotes from Yahoo Finance in one batched request.
   - `schwab-auth.mjs` (`/api/schwab-auth`): Handles Charles Schwab OAuth 2.0 (`https://127.0.0.1:8182` callback URL—so your Schwab Developer app never re-enters a 1–3 day review hold!) and exchanges authorization codes for 7-day refresh tokens + 30-minute access tokens.
   - `schwab-trade.mjs` (`/api/schwab-trade`): Interfaces with `https://api.schwabapi.com/trader/v1` to fetch live positions/balances and submit guardrailed whole-share `LIMIT` orders (`DAY` or `EXTENDED` p.m. hours), enforcing `AC4203` sub-`$1.00` cleared-cash checks.
   - `gist-sync.mjs` (`/api/gist-sync`): Optional free cross-device state sync via a private GitHub Gist.

## Local Preview (With Live Serverless Functions)
```bash
cd /Users/bradjensen/stock/pwa
node dev-server.mjs
# Open http://127.0.0.1:4173
```

## Deploying to Your Free Netlify Account (`brad-jensen`)
1. **Drag-and-Drop or Git Deploy:** Point a new Netlify project in `https://app.netlify.com/teams/brad-jensen/projects` to `/Users/bradjensen/stock/pwa` (or run `npx netlify-cli deploy --prod`).
2. **Environment Variables (Once Schwab Developer Status = `Ready For Use`):**
   - `SCHWAB_CLIENT_ID`: Your App Key from `developer.schwab.com`
   - `SCHWAB_CLIENT_SECRET`: Your App Secret from `developer.schwab.com`
   - `SCHWAB_CALLBACK_URL`: `https://127.0.0.1:8182`
   - `APP_PASSCODE` *(Optional)*: Passcode required to submit live orders
