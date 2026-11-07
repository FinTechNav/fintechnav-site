# RedDay AI stock app

The supported app is https://fintechnav.com/stock, in this repository. The public biography and stock shell share the fintechnav Netlify project; private data is obtained only through authenticated APIs.

## Sign in

Free Netlify Identity is invite-only, requires verified email, and the server only authorizes the verified address matching the private `STOCK_OWNER_EMAIL_SHA256` configuration. This account is separate from the Netlify dashboard account. Invitation/recovery links landing on the homepage are forwarded to `/stock/`. The owner chooses their password; no default PIN or password exists.

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

## Private runtime configuration

Keep the owner allowlist, display labels, legacy identifier mapping and initial preferences in secret Netlify environment variables; `.env.example` documents the schema using synthetic values. Production must have `STOCK_OWNER_EMAIL_SHA256` before deployment or authentication fails closed. Private initial preferences are loaded only through the authenticated, no-store shared-view endpoint. Public browser defaults contain no holdings or personal watchlist. The build never reads or embeds these settings. On the free plan, secret settings use the supported Builds/Functions/Runtime scopes; production values are not supplied to untrusted previews.

The server translates previous stored profile identifiers on read while retaining share quantities, baseline fills, immutable execution labels and compare-and-swap revisions. The next explicit save writes neutral `primary`/`partner` keys. Existing browser-selected profiles migrate using the private mapping after sign-in.

The owner allowlist stores only SHA-256 of the trimmed, lowercase email and uses a constant-time comparison. The digest remains secret and is never sent to the browser. Storing the public business address itself as a secret would collide with that same address in the intentionally public contact pages during Netlify secret scanning. This design preserves both the contact pages and the scanner without exclusions.
