# Stock Trading Workspace Guidelines

## Purpose
This workspace is configured for quantitative research, algorithmic trading, technical & fundamental analysis, backtesting, and portfolio risk management for stocks and equities.

## Repository Scope and Delivery

- This public repo hosts FinTechNav Netlify sites/apps. Heavy Pour Wine application work belongs in separate repos; preserve legitimate biography references.
- Publish only the explicit build allowlist to `dist/`. Keep logs, research, backend sources and credentials outside the deployed files. Preserve the separate registered Schwab callback relay build.
- Use a branch and PR for changes. Run build, validate and security checks before requesting a merge; main protections also bind the owner. Do not add paid infrastructure for this repo without authorization.
- Keep both session logs current, with no credential values, authorization codes, cookies or brokerage account data. Persistent artifacts belong in the directory below.
- Keep personal research, raw screenshots, support correspondence, inputs, temporary previews and generated files under ignored `artifacts/local/`. Commit only reviewed engineering records; never stage the archive or Git bundles.

## Installed Agent Skills
Over 115+ specialized trading and quantitative skills are installed in `.agents/skills/`, categorized across:
- **Technical Analysis & Indicators**: `us-stock-analysis`, `pandas-ta`, `ta-lib`, `custom-indicators`, `trading-visualization`
- **Backtesting Engines & Frameworks**: `vectorbt`, `backtrader`, `ml4t-run-backtest`, `strategy-framework`
- **Quantitative & Statistical Modeling**: `cointegration-analysis`, `correlation-analysis`, `mean-reversion`, `regime-detection`, `volatility-modeling`, `ml4t-regime-awareness`, `ml4t-non-stationarity`
- **Machine Learning & Feature Engineering**: `feature-engineering`, `signal-classification`, `ml4t-compute-features`, `ml4t-feature-selection`, `ml4t-triple-barrier`, `ml4t-meta-labels`
- **Portfolio & Risk Management**: `risk-management`, `position-sizing`, `kelly-criterion`, `portfolio-analytics`, `ml4t-risk-metrics`, `ml4t-stress-test`, `ml4t-kill-switch`
- **Market Microstructure & Execution**: `market-microstructure-traditional`, `slippage-modeling`, `ml4t-cost-model`, `rl-execution`
- **Validation & Overfitting Prevention**: `walk-forward-validation`, `ml4t-walk-forward-cv`, `ml4t-purging-embargo`, `ml4t-deflated-sharpe`, `ml4t-data-leakage`, `ml4t-lookahead-bias`
- **Tax & Compliance**: `tax-loss-harvesting`, `wash-sale-detection`, `cost-basis-engine`, `trade-accounting`, `trade-journal`

## Artifact Policy
- **Primary Storage Directory**: All persistent artifacts, tearsheets, strategy plans, backtest reports, data tables, and analysis outputs MUST be saved in `/Users/bradjensen/fintechnav-site/artifacts/`.
- Whenever an Antigravity artifact is generated in the session brain, ensure a corresponding copy or source markdown is saved directly into `/Users/bradjensen/fintechnav-site/artifacts/`.
