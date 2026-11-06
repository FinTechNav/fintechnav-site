# Stock Trading Workspace Artifacts Index

All deliverables, analysis reports, research notes, and backtesting outputs for this workspace are stored here in `/Users/bradjensen/fintechnav-site/artifacts/`.

## Active Research Deliverables & Catalogs
- [RedDay AI — Charles Schwab Dip-Hunter PWA (`../pwa/README.md`)](../pwa/README.md) - Zero-cost Netlify PWA (`public/` + `netlify/functions/`) redesigned in v4 with the Cloudflare Kumo dark-mode + electric blue design system, plain-English ("Checkers, Not Chess") company guides, and Schwab Production API integration.
- [RedDay AI v4 Live Account Home Screenshot (`./redday_kumo_home_live.png`)](./redday_kumo_home_live.png) - Live verification screenshot of the Cloudflare Kumo Account Home view on `https://redday-ai-schwab.netlify.app/`.
- [RedDay AI v5 Live API & System Logs Screenshot (`./redday_v5_kumo_logs_live.png`)](./redday_v5_kumo_logs_live.png) - Live verification screenshot of the v5 `API & system logs` tab on `brad@fintechnav.com` (`brad-cn70pnk`) confirming `HTTP 200` on `/api/schwab-auth`.
- [RedDay AI Live Charles Schwab OAuth & 7-Position Sync Verification (`./redday_schwab_oauth_logs_verified.png`)](./redday_schwab_oauth_logs_verified.png) - Live verification screenshot showing `● Schwab (7.0d)` active in the header and all 7 positions + `$1.40` cash synced directly from Charles Schwab (`/api/schwab-trade`).
- [RedDay AI Live at `https://fintechnav.com/stock` (`./fintechnav_stock_live.png`)](./fintechnav_stock_live.png) - Live verification screenshot of the app running at `https://fintechnav.com/stock` with `● Schwab (7.0d)` active (`$65.63`, `+$5.32 / +9.0%`).
- [RedDay AI v4 Live Inline-Expandable Table Screenshot (`./redday_kumo_table_live.png`)](./redday_kumo_table_live.png) - Live verification screenshot of the Cloudflare DNS-style `All 15 companies` inline expandable table view.
- [Cloudflare Dashboard Reference Screenshots](./cloudflare_home_ref.png) - Reference captures of Cloudflare Account Home (`cloudflare_home_ref.png`), Domains (`cloudflare_domains_ref.png`), Zone Overview (`cloudflare_inner_ref.png`), and DNS Records (`cloudflare_dns_ref.png`).
- [AI-Powered Retail Investing & Recurring Portfolio Growth Plan (<$1,000 Blueprint)](./ai_retail_investing_recurring_plan.md) - Deep research on 2026 retail AI trading workflows, Schwab micro-account optimization, and the 60/20/20 recurring growth cadence.
- [AI & Data Center Dip-Buy Analysis ($50.41 Allocation — 2026-11-05)](./ai_datacenter_dip_buy_50_2026_11_05.md) - Live pullback analysis and $50.41 whole-share portfolio execution (`IREN`, `APLD`, `WULF`, `CLSK` filled in after-hours).
- [Skills Catalog](./SKILLS_CATALOG.md) - Full directory of all 119 installed stock trading, quant, and risk skills.
- [Stock Trading Skills Installation Report](./stock_trading_skills_installation.md) - Overview of skill categories, architecture, and workflow integration.
- [Datacenter Stocks Under $10.41/Share](./datacenter_stocks_under_10_41.md) - Deep-dive equity research report on CIFR, CLSK, HIVE, EOSE, and POET.
- [Schwab API, CLI & MCP Setup](./schwab_api_cli_mcp_setup.md) - Setup guide for Schwab Developer portal, Trader API, and MCP integration.
- [Session Log](./SESSION_LOG.md) - Record of analysis sessions and strategy notes.
- [README](./README.md) - Workspace artifacts storage policy.

## Directory Structure
```
/Users/bradjensen/fintechnav-site/
├── .agents/
│   ├── rules/
│   │   └── artifacts.md       # Rule enforcing artifact storage in /stock/artifacts
│   └── skills/                # 119 installed trading and quant skills
├── AGENTS.md                  # Project instructions & skills overview
└── artifacts/                 # Central deliverables & research repository
    ├── INDEX.md               # Master index
    ├── README.md              # Artifact storage policy
    ├── SKILLS_CATALOG.md      # Comprehensive catalog of installed skills
    ├── stock_trading_skills_installation.md
    ├── datacenter_stocks_under_10_41.md
    ├── schwab_api_cli_mcp_setup.md
    └── SESSION_LOG.md
```
