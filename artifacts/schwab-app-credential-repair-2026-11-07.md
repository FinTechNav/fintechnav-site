# Schwab App Credential Diagnosis and Repair — 2026-11-07

## Observed Failure

- **Timestamp**: 2026-11-07 14:09:48 EST
- **Log Entry**: `[2:09:48 PM] ERROR /api/schwab-auth: Schwab rejected the app credentials. The app connection settings need repair; signing in again will not fix this.`
- **Trigger**: Browser completed the Charles Schwab interactive sign-in and was redirected back with an authorization `code` and `state`. When `/api/schwab-auth` performed the token exchange with Schwab's token endpoint (`https://api.schwabapi.com/v1/oauth/token`), Schwab responded with an HTTP 400/401 error containing `{"error": "invalid_client"}`.

---

## Root Cause Analysis

In OAuth 2.0 and the Charles Schwab Developer API specification:
- `/v1/oauth/authorize` only checks the public `client_id` (App Key) to render the Schwab user sign-in page.
- `/v1/oauth/token` is the first point where Schwab verifies the **App Key (Client ID)**, **App Secret (Client Secret)**, and **Callback URL (Redirect URI)** using HTTP Basic Authentication (`Authorization: Basic <base64(client_id:client_secret)>`).

When Schwab reports that they "fixed the app" on their end, an `invalid_client` response during code exchange is caused by one of three conditions:

### 1. Developer Portal Status is "Approved - Pending" (Propagation Delay)
- When Schwab support updates, fixes, or re-approves an app on `developer.schwab.com`, its status shifts to **"Approved - Pending"**.
- Schwab's frontend sign-in site allows user authentication while an app is in "Approved - Pending", but Schwab's backend API gateway **refuses all token exchange requests** with `invalid_client` until provisioning propagates across Schwab's internal auth clusters.
- The app status must transition to **"Ready for use"** before tokens can be issued (this typically takes several hours up to 24–48 hours).

### 2. New App Key or App Secret Generated
- When Schwab support fixes or regenerates an app, a **new App Secret** (or new App Key) is frequently generated in the Schwab Developer Portal.
- Netlify functions read `SCHWAB_CLIENT_ID` and `SCHWAB_CLIENT_SECRET` from Netlify site environment variables. If Netlify still holds the prior Secret/Key, the Basic Auth header sent to Schwab will fail verification, triggering `invalid_client`.

### 3. Callback URL Mismatch (Trailing Slash)
- Schwab strictly compares the requested `redirect_uri` against the portal registration byte-for-byte.
- The application uses `https://redday-ai-schwab.netlify.app` (no trailing slash).
- If the Developer Portal was configured with a trailing slash (`https://redday-ai-schwab.netlify.app/`) or a different URL, Schwab rejects the token exchange.

---

## Code Hardening & Defenses

1. **Credential Sanitizer (`cleanCredential`)**:
   - Added in `server/stock/brokerage.mjs` and used across `brokerage.mjs` and `schwab-auth.mjs`.
   - Defensively strips leading and trailing quotes (`"` or `'`) as well as surrounding whitespace from `SCHWAB_CLIENT_ID` and `SCHWAB_CLIENT_SECRET`. Prevents failures if credentials were pasted into Netlify with surrounding quotes.
2. **Actionable Diagnostic Error Message**:
   - Enhanced the `invalid_client` error thrown in `issueToken` to guide the operator directly to check the portal status ("Ready for use" vs "Approved - Pending"), Netlify environment variables, and the callback URL formatting.
3. **Automated Verification**:
   - Added regression test `brokerage credential sanitizer strips surrounding quotes and whitespace` in `tests/stock-security.test.cjs`.
   - All 47 security, authentication, and view tests pass.

---

## Action Checklist for the Owner

Follow these steps to complete the connection:

1. **Check Schwab Developer Portal Status**:
   - Sign into [Charles Schwab Developer Portal](https://developer.schwab.com/).
   - Navigate to **Dashboard** -> **Apps** and select the application.
   - Look at the **Status** field:
     - If it shows **"Approved - Pending"**: Schwab has not finished provisioning your app on their API servers. You must wait until it shows **"Ready for use"**.
     - If it shows **"Ready for use"**: proceed to step 2.

2. **Verify Credentials in Netlify**:
   - In the Schwab Developer Portal under your App, view your current **App Key** and **Secret**.
   - In the [Netlify Dashboard](https://app.netlify.com/):
     - Go to **Site configuration** -> **Environment variables**.
     - Verify `SCHWAB_CLIENT_ID` exactly matches your active **App Key**.
     - Verify `SCHWAB_CLIENT_SECRET` exactly matches your active **Secret**.
     - Verify `SCHWAB_CALLBACK_URL` is either empty (defaults to `https://redday-ai-schwab.netlify.app`) or set to `https://redday-ai-schwab.netlify.app` without any trailing slash.
   - If any variable was changed, trigger a redeploy in Netlify so the serverless functions reload the new environment.

3. **Verify Callback URL in Schwab Developer Portal**:
   - Ensure the registered **Callback URL** in the Schwab portal is exactly:
     `https://redday-ai-schwab.netlify.app`
   - Ensure there is **no trailing slash** at the end.

4. **Reconnect from the Stock App**:
   - Once the app is **"Ready for use"** and Netlify credentials match, visit `https://fintechnav.com/stock`.
   - Click **Connect Charles Schwab** and complete authorization.

---

## Live Portal Inspection Findings (2026-11-07 14:57 EST)

Direct inspection of application `7c311cb0-55b6-4530-a08d-a7a93e41b3c8` (**RedDay AI Portfolio**) confirmed:

| Property | Portal Setting | Netlify Environment | Status |
| :--- | :--- | :--- | :--- |
| **Status** | **`Modification Pending`** | N/A | **BLOCKING**: Gateway not yet taking traffic |
| **Portal Note** | *"App modification times can vary and may not be ready to accept traffic until after market hours."* | N/A | Explains the `invalid_client` 401 |
| **Callback URL** | `https://redday-ai-schwab.netlify.app` | `https://redday-ai-schwab.netlify.app` | Verified identical (no trailing slash) |
| **App Key** | `dDGO...8vVY` (48 chars) | `dDGO...8vVY` (48 chars) | Verified exact match |
| **Enabled Products** | `Accounts and Trading Production`, `Market Data Production` | Required scopes configured | Verified enabled |
| **Last Modified** | `11/07/2026` | Merged PRs #29, #30 | Fresh changes awaiting gateway rollout |

**Final Diagnosis (2026-11-07)**: While the app was in **`Modification Pending`**, Schwab's API gateway could not accept traffic until provisioning completed.

---

## Post-Propagation Secret Verification & Resolution (2026-11-10)

Once the Schwab Developer Portal status transitioned to **`Ready For Use`**, token exchange (`POST /v1/oauth/token`) continued returning `HTTP 401 invalid_client` even though `clientIdLength` (`48`), `secretLength` (`64`), and `redirect_uri` (`https://redday-ai-schwab.netlify.app`) matched expected dimensions.

1. **Zero-Exposure Cryptographic Comparison**:
   - An in-page non-reversible `SHA-256` comparison between the Schwab Developer Portal and Netlify (`fintechnav`) environment variables confirmed:
     - `SCHWAB_CLIENT_ID` (`48` chars) and `SCHWAB_CALLBACK_URL` matched 100% byte-for-byte (allowing `/v1/oauth/authorize` to succeed).
     - `SCHWAB_CLIENT_SECRET` in Netlify (last saved `2026-11-06`, `64` alphanumeric chars) **did not match** the `Client Secret` active in the Schwab Developer Portal after Schwab's `2026-11-07` modification (`64` alphanumeric chars).
2. **Remediation & Live Verification**:
   - Updated `SCHWAB_CLIENT_SECRET` in Netlify (`fintechnav`) to match the active portal `Client Secret` and verified an exact `SHA-256` match (`64` chars, no quotes or whitespace).
   - Triggered and published Netlify production deploy `6af37a0a06adc3a6b9af4b17` (`main@d5de512`) so serverless functions reloaded the updated environment variable.
   - Completed end-to-end OAuth sign-in on `https://fintechnav.com/stock/` and confirmed live Charles Schwab connection succeeded.
