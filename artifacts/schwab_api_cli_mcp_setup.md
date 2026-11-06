# Charles Schwab API, CLI, and MCP Trading Setup

## Key Findings & Schwab Constraints

1. **Official API Required for All Tools:** Every MCP server, CLI, and Python SDK connects through the official **Charles Schwab Individual Developer Portal** (`https://developer.schwab.com`).
2. **Approval Wait Time (1–3 Business Days):** New developer apps sit in a pending review state for **1 to 3 business days** until Schwab sets the status to `Ready For Use`. Editing the Callback URL later resets this 1–3 day review lock.
3. **7-Day Refresh Token Expiry:** Access tokens last **30 minutes** (auto-refreshed by the MCP/SDK), and refresh tokens hard-expire every **7 days**. Once a week, you must complete a browser OAuth login (`schwab-mcp auth ...`) to issue a new 7-day refresh token.
4. **Whole Shares Only (Impacts `$10.41` Allocation):**
   - Schwab's retail fractional share feature (*Stock Slices*) is restricted to **S&P 500** stocks.
   - Schwab's Trader API accepts **whole-share quantities only** for equity orders.
   - Because `CIFR`, `HIVE`, and `CLSK` are not in the S&P 500, **Option A (fractional shares of `CIFR`) is not possible on Schwab**. **Option B (1 whole share of `CIFR` at ~$7.29 + 1 whole share of `HIVE` at ~$1.94 = ~$9.23)** is the recommended Schwab trade.

---

## Step 1: Create Your Charles Schwab Developer Credentials (Full Recipe)

- **Issuer Console:** `https://developer.schwab.com` (log in with your regular `client.schwab.com` brokerage credentials and register as an **Individual Developer**).
- **Dashboard Page:** `Dashboard` → `Apps` → `Create App`.
- **Required API Products (Select Both):**
  1. `Accounts and Trading Production` (read balances/positions, place/cancel/replace equity and option orders).
  2. `Market Data Production` (real-time quotes, price history, option chains).
- **Callback URL:** `https://127.0.0.1:8182` (must match the `--callback-url` flag in `schwab-mcp` or `schwab-py`; do not change after approval or the app re-enters a 1–3 day review hold).
- **Issued Credentials & Format:**
  - `SCHWAB_CLIENT_ID` (*App Key*): alphanumeric client key string issued on the App details page.
  - `SCHWAB_CLIENT_SECRET` (*App Secret*): alphanumeric secret string issued alongside the App Key.
- **Where Stored Locally:**
  - OAuth token cache written by `schwab-mcp`: `~/.local/share/schwab-mcp/token.yaml` (or `/Users/bradjensen/stock/.schwab_token.json` if using a custom `schwab-py` script, `chmod 600`).
  - Never commit `App Key`, `App Secret`, or token files to git.
- **When Needed:** Required once your Schwab Developer app status moves from `Approved - Pending` to `Ready For Use` (1–3 business days after registration).

---

## Option 1: MCP Server (`jkoelker/schwab-mcp`) — Recommended for AI Agent Trading

`jkoelker/schwab-mcp` is an open-source Python MCP server (built on `schwab-py`) that exposes Schwab balances, positions, live quotes, and order placement (`place_order`, `cancel_order`) directly to MCP-capable agents (Claude Code, Codex, Antigravity, Claude Desktop).

### 1. Install `schwab-mcp`
```bash
uv tool install git+https://github.com/jkoelker/schwab-mcp.git
```

### 2. Run Initial OAuth Login (Repeat Every 7 Days)
Once your app on `developer.schwab.com` shows `Ready For Use`:
```bash
schwab-mcp auth \
  --client-id "YOUR_SCHWAB_APP_KEY" \
  --client-secret "YOUR_SCHWAB_APP_SECRET" \
  --callback-url "https://127.0.0.1:8182"
```
This opens a local browser login to `client.schwab.com`, captures the redirect at `https://127.0.0.1:8182`, and saves the OAuth tokens to `~/.local/share/schwab-mcp/token.yaml`.

### 3. Register the MCP Server in Your Agent Config
Add `schwab` to your MCP client configuration (passing `--client-id` and `--client-secret` via environment variables or flags, and enabling write/trade execution only when desired):
```json
{
  "mcpServers": {
    "schwab": {
      "command": "schwab-mcp",
      "args": ["serve"],
      "env": {
        "SCHWAB_CLIENT_ID": "YOUR_SCHWAB_APP_KEY",
        "SCHWAB_CLIENT_SECRET": "YOUR_SCHWAB_APP_SECRET",
        "SCHWAB_CALLBACK_URL": "https://127.0.0.1:8182"
      }
    }
  }
}
```
*(Note: `jkoelker/schwab-mcp` also supports an optional external approval gate so the agent cannot execute a trade without your confirmation.)*

---

## Option 2: Lightweight Python CLI (`schwab-py`) — Scriptable from Terminal

If you prefer a direct CLI script inside `/Users/bradjensen/stock/` that any agent can call via `run_command` / `Bash` without loading an MCP server into context:

### 1. Install `schwab-py`
```bash
pip install schwab-py
```

### 2. Example Usage (`schwab-py` Order Builder)
`schwab-py` (`https://github.com/alexgolec/schwab-py`) provides `auth.easy_client(...)` for local OAuth caching and `schwab.orders.equities` helpers:
- `equity_sell_market(symbol, quantity)` / `equity_sell_limit(symbol, quantity, price)`
- `equity_buy_limit(symbol, quantity, price)` / `equity_buy_market(symbol, quantity)`

*(An alternative Python SDK is `schwabdev` via `pip install schwabdev`, which includes background token auto-refreshing.)*

---

## Option 3: Browser Automation (Immediate, No 1–3 Day API Wait)

Because `developer.schwab.com` takes **1 to 3 business days** to approve a new API app—and you only need to sell existing micro-positions and place two whole-share limit orders (`1x CIFR`, `1x HIVE`)—driving your already-logged-in `https://client.schwab.com/app/accounts/balances/#/` tab or entering the two limit orders directly in Schwab is faster for today's trade, while `developer.schwab.com` approval runs in parallel for ongoing programmatic access.
