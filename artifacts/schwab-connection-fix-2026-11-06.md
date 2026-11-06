# Schwab connection repair — November 6, 2026

## Observed failure

The owner completed Schwab sign-in and returned, but every Sync shares click opened Connect Charles Schwab. The authenticated status endpoint returned connected=false and both expiry fields zero. Netlify request metadata showed two separate begin/callback sequences: begin POST 200, callback POST 401, retry POST 403, then status GET 200. The former implementation returned the same 401 for both stock-session expiry and a rejected Schwab token exchange; the browser blindly refreshed its app session and replayed the consumed OAuth callback. Raw upstream token errors were discarded, so the exact original upstream rejection reason is not established by those logs.

## Repairs

- Use Netlify runtime context.deploy.context/id to select a stable production store and isolated preview stores. CONTEXT/DEPLOY_ID are build variables, not reliable function variables. Missing runtime metadata fails closed. No tokens are migrated from ambiguous preview/local stores.
- Distinguish broker rejection from stock-session 401. Only allowlisted upstream machine error codes are classified/logged; descriptions, codes, secrets and token bodies are never logged. Credential rejection, invalid authorization and upstream failures have different persistent messages and do not trigger callback replay.
- Preserve the callback URI from the authorization-begin record; include the explicit JSON Accept header used by the prior implementation.
- Read back a saved credential record before reporting success. Keep OAuth state single-use, browser-bound and owner-bound.
- Netlify cookie get reads the incoming request while SDK set writes the outgoing response. Capture freshly issued cookies for immediate provider-backed owner verification, and apply HttpOnly/Secure/Lax at write time. Avoid overwriting renewed cookies with stale incoming values. Invalid refresh deletion remains effective. Browser initialization can restore an expired app session before processing a brokerage callback.
- Recheck server connection status when Sync is clicked, including connections completed elsewhere. Display actual saved connection status instead of a static Ready badge, retain callback failures in the modal/log and record successful server persistence.

## Verification and remaining work

Clean install/build, JS syntax checks and all 24 security tests passed on the repaired source. Tests cover read-only cookie semantics, expired-session recovery, broker rejection without callback replay, failed save detection, OAuth replay protection, stable production versus preview scope, preserved redirect URI, later reads and silent access-token refresh. Existing order-safety/auth tests remain in force. All brokerage calls were mocked; no live order or real mail was sent.

PR #16 was created with the owner’s explicit authorization, passed security/CodeQL/Netlify checks and was merged into main at ba346bf. Ready production deploy 6aee3152665214227b8438c7 is listed; live HTTP checks confirm the new assets and anonymous API protections. Exact deploy-detail metadata was rate-limited (429). A real owner Schwab callback and read-only sync remain to be verified. The exact upstream rejection code may require that next callback; do not claim the live connection is fixed before it is observed. Broad environment-value retrieval was rejected by automatic approval review and was not bypassed; no secret values were read.

References: [Netlify runtime context](https://docs.netlify.com/build/functions/api/), [function runtime environment variables](https://docs.netlify.com/build/functions/environment-variables/), installed @netlify/identity 2.0.0 source.

## Fresh owner callback

The owner reported the new invalid_client-specific error. Narrow UI inspection confirms both production credential settings exist, match the previously observed client ID and contain no obvious formatting issue; values were never printed or saved. The signed-in Schwab developer account shows an approved subscription but no apps or pending apps. Awaiting the owner locating the actual registered app/account before comparing the key/secret or changing settings. No live connection or sync success is claimed.
