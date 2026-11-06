# Stock Trading Workspace Guidelines

## Purpose
This workspace is configured for quantitative research, algorithmic trading, technical & fundamental analysis, backtesting, and portfolio risk management for stocks and equities.

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
