# RedDay AI stock app

The supported app is https://fintechnav.com/stock, in this repository. The public biography and stock shell share the fintechnav Netlify project; private data is obtained only through authenticated APIs.

## Sign in

Free Netlify Identity is invite-only, requires verified email, and the server only authorizes brad@fintechnav.com. This account is separate from the Netlify dashboard account. Invitation/recovery links landing on the homepage are forwarded to `/stock/`. The owner chooses their password; no default PIN or password exists.

All stock requests use same-origin HttpOnly sessions. Brokerage OAuth tokens stay in private server storage; the browser receives status and expiry only. Connect Schwab once after the security migration. The registered callback remains `https://redday-ai-schwab.netlify.app`; its relay must preserve both `code` and `state`. Do not change the registered callback casually.

## Build and verification

- `npm ci --ignore-scripts` installs the locked dependencies. Node 22.13 or newer is required.
- `npm run build` creates only intended web assets in `dist`. Never publish the repository root.
- `npm run test:security` runs mocked authorization, OAuth and order-safety tests without calling a real broker. Run the build first.
- `npm run dev:stock` serves the built assets locally. Identity needs a deployed Netlify runtime; local preview does not bypass authentication.
- `npm run validate` checks the existing biography scripts, separately from the security tests.

Runtime credentials belong in Netlify function-scoped environment variables: `SCHWAB_CLIENT_ID`, `SCHWAB_CLIENT_SECRET`, `SCHWAB_CALLBACK_URL`; optional preference sync uses `GITHUB_GIST_TOKEN` and `GITHUB_GIST_ID`. Never place secrets in public code, exports, logs or browser storage.

## Order safety

The server enforces $100 per order and per confirmation, at most 10 whole-share BUY/SELL limit orders, server-selected account, mandatory recent-history checks, and one-time confirmation of the exact reviewed basket. It blocks sub-$1 purchases until settled funds can be verified on the server. Failed/ambiguous submissions must be checked directly in Schwab before trying another order. UI switches cannot turn these protections off. Recent-history checks are conservative; they do not guarantee safety against concurrent orders placed elsewhere.

Continue recording changes and rationale in `SESSION_LOG.md` and `artifacts/SESSION_LOG.md`.
