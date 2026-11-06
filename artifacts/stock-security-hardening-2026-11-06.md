# Stock application security hardening — 2026-11-06

The stock application remains at https://fintechnav.com/stock. No paid Netlify upgrade is authorized.

Implemented free app-level Identity authentication, invite-only registration, required email confirmation and a server-enforced owner-email allowlist. Every API checks the Identity provider; it does not trust a decoded JWT, browser PIN, local-storage flag, or client-supplied identity. Session cookies are hardened to HttpOnly/Secure/SameSite Lax.

Brokerage credentials stay in private Netlify object storage, separated by deployment context. OAuth uses an expiring, single-use, browser-bound state. Clients receive connection status, not tokens. Old browser tokens are discarded, requiring one fresh Schwab connection. Gist synchronization permits only non-secret UI preferences.

Live order requests use server-selected accounts, finite whole-share quantities, BUY/SELL limit orders, $100 per-order and combined-batch caps, conservative sub-$1 purchase rejection, a recent-history check that fails closed, New York trading dates and an expiring one-use confirmation of the exact server-stored basket. No automated retries after submission. The existing same-day guard is retained and cannot be disabled by the client. This is an application guard, not a guarantee against concurrent trading outside this app or a full regulatory compliance engine.

The production build publishes `dist`, with an explicit asset allowlist. Backend code, research, session logs and workspace configuration are excluded. Old offline caches are retired. Historical immutable Netlify deployments and public Git history require separate retention/access review; a new deployment cannot erase those copies.

Verification: build successful; 13 mocked security tests passed; changed-source syntax checks passed. Existing `npm run validate` fails on nine pre-existing quote errors in untouched biography files. Dependency audit found an existing high-severity Nodemailer advisory; its major-version upgrade is outside this first stock-access change. No live trades or payment/mail transactions tested.

## Verified deployment and owner setup — 2026-11-06T13:20:47-05:00

- Primary deploy: `6aee1906f8e413bec01747f5`, ready. Public homepage and stock login: HTTP 200. Five stock API routes: anonymous HTTP 401 with private/no-store responses. Legacy function URLs and tested internal source/log URLs: HTTP 404.
- Relay deploy: `6aee1960062ce448400dad83`, ready. Query parameters are preserved. Old stock assets and legacy direct function URL return 404; protected API paths reject anonymous requests with 401.
- Identity configuration independently checked: signup disabled/invite only; email confirmation required.
- Owner approved the invitation to the privately configured owner address. Netlify accepted it and shows that user in Registered users. Password setup and authenticated verification remain owner actions; no password has been handled by Codex.
- Code: committed/pushed `3442e10` on `codex/stock-security`. PR creation/merge awaits confirmation from the GitHub interactive form; `main` must include these changes before subsequent production deployments.
- Screenshots: `/private/tmp/fintechnav-stock-secure-login-live.jpg` and `/private/tmp/fintechnav-stock-invitation-sent.jpg`.

## Owner follow-up — 2026-11-06T13:26:02-05:00

Owner reports completing password setup and signing in on another device/browser. The Chrome session available to Codex remains signed out, as expected for a separate browser. Netlify Identity's owner detail confirms the account exists but does not show confirmation or last-login timestamps; authenticated brokerage/API behavior on the other device has not been independently observed. Owner must reconnect Schwab once because legacy browser credentials were discarded. No live orders were submitted.

GitHub MCP still lists no pull request for the security branch. The interactive PR form requires user submission before integration can continue. The deployed fixes are not yet merged into `main`; a subsequent deployment from old main could overwrite them.

## Integration completed — 2026-11-06T13:57:56-05:00

The owner created and merged [PR #1](https://github.com/FinTechNav/fintechnav-site/pull/1). Merge commit `31128c82584e66f324d2aa2cd8d83506b4c8c524` is on main. The PR security check and main security workflow both passed. Local main matched origin/main when checked.

Automatic production deploy `6aee223ee0e3c0a5067c72b9` is ready, with production context, main branch and the exact merge commit; published November 6 at 1:54:25 PM Eastern. The earlier deploy-preview ID is not the production deployment. This supersedes the pending-integration status above.

Post-merge live checks passed: homepage, stock sign-in and auth bundle return 200; all five stock APIs reject anonymous access with 401/private-no-store and no wildcard CORS; tested legacy function, internal source, log and package metadata URLs return 404. Owner sign-in is reported complete, but fresh Schwab connection and authenticated read-only account sync remain unverified by Codex. No trades were placed.
