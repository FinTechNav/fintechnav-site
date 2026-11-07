# Stock Trading Skills Installation & Workspace Setup

## Overview

A suite of **119 specialized skills** for stock trading, quantitative finance, algorithmic backtesting, and portfolio risk management has been installed into your workspace at `the repository root`.

In accordance with your preferences, all workspace deliverables, tearsheets, reports, and persistent artifacts are configured to be retained directly within `artifacts/`.

---

## Workspace Structure

```
./
├── .git/                      # Initialized Git repository for workspace root discovery
├── .agents/
│   ├── rules/
│   │   └── artifacts.md       # Rule routing all research & backtest outputs to /artifacts
│   └── skills/                # 119 installed stock trading & quant skills
├── AGENTS.md                  # Project instructions & skills index
└── artifacts/                 # Central deliverables & research repository
    ├── INDEX.md               # Master index of project deliverables
    ├── README.md              # Artifact storage policy
    └── SKILLS_CATALOG.md      # Detailed 119-skill catalog with descriptions
```

---

## Skill Categories & Highlights

The installed skills combine the modular workflows from the **Claude Trading Skills Suite** and Stefan Jansen's **Machine Learning for Algorithmic Trading (ML4T)** standard.

### 1. Stock Research & Fundamental Analysis
- [`us-stock-analysis`](../.agents/skills/us-stock-analysis/SKILL.md): Comprehensive equity analysis combining valuation metrics (P/E, EV/EBITDA, FCF yield), technical momentum, and automated tearsheet generation.
- [`fixed-income`](../.agents/skills/fixed-income/SKILL.md): Yield curves, duration, convexity, and bond pricing models.

### 2. Technical Analysis & Charting
- [`pandas-ta`](../.agents/skills/pandas-ta/SKILL.md): 130+ technical analysis indicators (RSI, MACD, Bollinger Bands, ATR, Supertrend).
- [`ta-lib`](../.agents/skills/ta-lib/SKILL.md): C-accelerated technical analysis for pattern recognition and momentum calculation.
- [`custom-indicators`](../.agents/skills/custom-indicators/SKILL.md): Custom indicator math and signal construction.
- [`trading-visualization`](../.agents/skills/trading-visualization/SKILL.md): Professional candlestick charts, drawdown plots, and equity curve visualizations.
- [`ohlcv-processing`](../.agents/skills/ohlcv-processing/SKILL.md): Resampling, alignment, and calendar cleaning.

### 3. Backtesting Engines & Frameworks
- [`vectorbt`](../.agents/skills/vectorbt/SKILL.md): High-speed vectorized backtesting using NumPy/pandas array operations. 100–1000x faster than event-driven loops for parameter sweeps.
- [`backtrader`](../.agents/skills/backtrader/SKILL.md): Event-driven backtesting with bar-by-bar execution, bracket orders, multi-timeframe feeds, and brokerage simulation.
- [`ml4t-run-backtest`](../.agents/skills/ml4t-run-backtest/SKILL.md): Sequential fill simulation modeling realistic execution delays (`t` signal -> `t+1` fill).
- [`strategy-framework`](../.agents/skills/strategy-framework/SKILL.md): Clean modular architecture separating signals, sizing, and order routing.

### 4. Quantitative & Statistical Methods
- [`cointegration-analysis`](../.agents/skills/cointegration-analysis/SKILL.md): Engle-Granger and Johansen cointegration tests for pairs trading and statistical arbitrage.
- [`mean-reversion`](../.agents/skills/mean-reversion/SKILL.md): Ornstein-Uhlenbeck processes, half-life estimation, and z-score bands.
- [`volatility-modeling`](../.agents/skills/volatility-modeling/SKILL.md): GARCH, EWMA, realized volatility, and volatility cones.
- [`regime-detection`](../.agents/skills/regime-detection/SKILL.md): Hidden Markov Models (HMM) and clustering to identify bull/bear/high-vol regimes.
- [`correlation-analysis`](../.agents/skills/correlation-analysis/SKILL.md): Rolling correlation matrices, PCA risk factors, and diversification metrics.

### 5. Risk Management & Portfolio Optimization
- [`risk-management`](../.agents/skills/risk-management/SKILL.md): Hard drawdown limits, daily/weekly loss halts, and circuit breakers.
- [`position-sizing`](../.agents/skills/position-sizing/SKILL.md): Fixed-fractional, volatility parity, and risk-budgeted allocations.
- [`kelly-criterion`](../.agents/skills/kelly-criterion/SKILL.md): Exact mathematical sizing for asymmetric payoff strategies.
- [`portfolio-analytics`](../.agents/skills/portfolio-analytics/SKILL.md): Sharpe, Sortino, Calmar, Max Drawdown, and CAGR attribution.
- [`ml4t-kill-switch`](../.agents/skills/ml4t-kill-switch/SKILL.md): Automated emergency execution controls.
- [`ml4t-stress-test`](../.agents/skills/ml4t-stress-test/SKILL.md): Historical crisis scenario simulation and tail risk stress testing.

### 6. Machine Learning & Feature Engineering
- [`ml4t-triple-barrier`](../.agents/skills/ml4t-triple-barrier/SKILL.md): Dynamic profit-target, stop-loss, and holding-period labeling.
- [`ml4t-meta-labels`](../.agents/skills/ml4t-meta-labels/SKILL.md): Secondary model filtering to size bets and reject false-positive signals.
- [`signal-classification`](../.agents/skills/signal-classification/SKILL.md): Walk-forward validated XGBoost/LightGBM directional classifiers.
- [`ml4t-feature-selection`](../.agents/skills/ml4t-feature-selection/SKILL.md): Recursive feature elimination, collinearity pruning, and mutual information scoring.

### 7. Quantitative Validation & Anti-Bias Disciplines
- [`ml4t-data-leakage`](../.agents/skills/ml4t-data-leakage/SKILL.md): Systematic elimination of future data leaks.
- [`ml4t-lookahead-bias`](../.agents/skills/ml4t-lookahead-bias/SKILL.md): Preventing bar $t$ fills based on bar $t$ close prices.
- [`ml4t-purging-embargo`](../.agents/skills/ml4t-purging-embargo/SKILL.md): Purged cross-validation to remove serial correlation leakage.
- [`ml4t-deflated-sharpe`](../.agents/skills/ml4t-deflated-sharpe/SKILL.md): Multiple testing adjustment for strategy selection.

### 8. Tax, Accounting & Compliance
- [`tax-loss-harvesting`](../.agents/skills/tax-loss-harvesting/SKILL.md): Loss harvesting identification and replacement asset matching.
- [`wash-sale-detection`](../.agents/skills/wash-sale-detection/SKILL.md): IRS 30-day window tracking and disallowed loss calculation.
- [`cost-basis-engine`](../.agents/skills/cost-basis-engine/SKILL.md): Specific lot identification, FIFO, LIFO, and HIFO matching.
- [`trade-journal`](../.agents/skills/trade-journal/SKILL.md): Systematic trade logging, setup categorization, and psychological reviews.

---

## Artifact Storage Configuration

All artifacts produced during our sessions are preserved in:
**`artifacts/`**

Whenever a research report, strategy proposal, or tearsheet is created, it will be placed in that directory and registered in [`INDEX.md`](./INDEX.md).
