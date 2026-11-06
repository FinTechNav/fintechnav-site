# Stock application security hardening — 2026-11-06

The stock application remains at https://fintechnav.com/stock. No paid Netlify upgrade is authorized.

Implemented free app-level Identity authentication, invite-only registration, required email confirmation and a server-enforced owner-email allowlist. Every API checks the Identity provider; it does not trust a decoded JWT, browser PIN, local-storage flag, or client-supplied identity. Session cookies are hardened to HttpOnly/Secure/SameSite Lax.

Brokerage credentials stay in private Netlify object storage, separated by deployment context. OAuth uses an expiring, single-use, browser-bound state. Clients receive connection status, not tokens. Old browser tokens are discarded, requiring one fresh Schwab connection. Gist synchronization permits only non-secret UI preferences.

Live order requests use server-selected accounts, finite whole-share quantities, BUY/SELL limit orders, $100 per-order and combined-batch caps, conservative sub-$1 purchase rejection, a recent-history check that fails closed, New York trading dates and an expiring one-use confirmation of the exact server-stored basket. No automated retries after submission. The existing same-day guard is retained and cannot be disabled by the client. This is an application guard, not a guarantee against concurrent trading outside this app or a full regulatory compliance engine.

The production build publishes `dist`, with an explicit asset allowlist. Backend code, research, session logs and workspace configuration are excluded. Old offline caches are retired. Historical immutable Netlify deployments and public Git history require separate retention/access review; a new deployment cannot erase those copies.

Verification: build successful; 13 mocked security tests passed; changed-source syntax checks passed. Existing `npm run validate` fails on nine pre-existing quote errors in untouched biography files. Dependency audit found an existing high-severity Nodemailer advisory; its major-version upgrade is outside this first stock-access change. No live trades or payment/mail transactions tested.

Deployment and owner onboarding status will be appended after verification.
