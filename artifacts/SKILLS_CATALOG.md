# Stock Trading Skills Catalog

Total Skills Installed: **119**

This catalog lists all installed agent skills available in the `.agents/skills/` directory of `/Users/bradjensen/stock`.

## Stock Research & Analysis (2 skills)

| Skill Name | Description |
| :--- | :--- |
| [`fixed-income`](../.agents/skills/fixed-income/SKILL.md) | [STUB] Bond pricing, yield curves, duration and convexity analysis, and DeFi lending rate modeling |
| [`us-stock-analysis`](../.agents/skills/us-stock-analysis/SKILL.md) | Perform comprehensive US equity and stock trading analysis covering fundamental financials, technical indicators, momentum screening, valuation multiples, risk metrics, and generating institutional-grade investment reports. Use whenever the user requests analysis of a stock, ticker, portfolio, or equity trade setup. |


## Technical Analysis & Charting (5 skills)

| Skill Name | Description |
| :--- | :--- |
| [`custom-indicators`](../.agents/skills/custom-indicators/SKILL.md) | Crypto-native indicators including NVT ratio, exchange flow, funding rate signals, holder momentum, and smart money flow |
| [`ohlcv-processing`](../.agents/skills/ohlcv-processing/SKILL.md) | Market data preparation including OHLCV resampling, gap handling, anomaly detection, normalization, and multi-source merging |
| [`pandas-ta`](../.agents/skills/pandas-ta/SKILL.md) | Technical analysis with 130+ indicators using pandas-ta for crypto market data |
| [`ta-lib`](../.agents/skills/ta-lib/SKILL.md) | C-optimized technical analysis with 150+ functions and 61 candlestick pattern recognition functions via TA-Lib |
| [`trading-visualization`](../.agents/skills/trading-visualization/SKILL.md) | Professional trading charts including candlesticks, equity curves, drawdowns, correlation heatmaps, and return distributions |


## Backtesting Engines & Frameworks (5 skills)

| Skill Name | Description |
| :--- | :--- |
| [`backtrader`](../.agents/skills/backtrader/SKILL.md) | Event-driven backtesting with bar-by-bar execution, complex order types, multiple analyzers, and custom indicators |
| [`ml4t-run-backtest`](../.agents/skills/ml4t-run-backtest/SKILL.md) | Event-driven backtesting with realistic order execution, position tracking, and performance measurement. Use when simulating a trading strategy on historical data. |
| [`ml4t-strategy-workflow`](../.agents/skills/ml4t-strategy-workflow/SKILL.md) | End-to-end strategy development lifecycle from hypothesis to live trading. Use when starting a new strategy project or onboarding to the ML4T workflow. |
| [`strategy-framework`](../.agents/skills/strategy-framework/SKILL.md) | Standardized template for defining trading strategies with entry rules, exit rules, position sizing, risk parameters, and performance criteria |
| [`vectorbt`](../.agents/skills/vectorbt/SKILL.md) | High-performance vectorized backtesting with parameter optimization, portfolio simulation, and rich performance metrics |


## Quantitative & Statistical Methods (10 skills)

| Skill Name | Description |
| :--- | :--- |
| [`cointegration-analysis`](../.agents/skills/cointegration-analysis/SKILL.md) | Cointegration testing for pairs trading using Engle-Granger, Johansen, and rolling stability analysis |
| [`correlation-analysis`](../.agents/skills/correlation-analysis/SKILL.md) | Cross-asset correlation analysis including rolling correlation, hierarchical clustering, tail dependence, and regime-dependent correlation |
| [`mean-reversion`](../.agents/skills/mean-reversion/SKILL.md) | Mean-reversion strategy tools including Hurst exponent, half-life estimation, z-score signals, ADF testing, and Ornstein-Uhlenbeck modeling |
| [`ml4t-causal-identification`](../.agents/skills/ml4t-causal-identification/SKILL.md) | Validate causal claims using DAG adjustment sets, bad-control detection, and refutation tests. Use when distinguishing genuine factor effects from confounded associations. |
| [`ml4t-information-coefficient`](../.agents/skills/ml4t-information-coefficient/SKILL.md) | Measure predictive signal quality with IC, Rank IC, and IC_IR. Use when evaluating whether a feature has predictive power for returns. |
| [`ml4t-non-stationarity`](../.agents/skills/ml4t-non-stationarity/SKILL.md) | Handle changing statistical properties in financial time series. Use when features or model performance degrade over time. |
| [`ml4t-regime-awareness`](../.agents/skills/ml4t-regime-awareness/SKILL.md) | Market regimes as conditioning features for risk scaling, not timing signals. Use when incorporating regime detection into strategy logic. |
| [`ml4t-regime-features`](../.agents/skills/ml4t-regime-features/SKILL.md) | Features capturing market regime - volatility state, trend strength, and liquidity conditions. Use when building regime-aware models or conditioning on changing market environments. |
| [`regime-detection`](../.agents/skills/regime-detection/SKILL.md) | Market regime identification using volatility clustering, trend detection, and statistical methods for adaptive trading |
| [`volatility-modeling`](../.agents/skills/volatility-modeling/SKILL.md) | Volatility estimation, forecasting, and regime classification using GARCH, EWMA, realized volatility, and volatility cones |


## Portfolio Construction & Risk Controls (10 skills)

| Skill Name | Description |
| :--- | :--- |
| [`exit-strategies`](../.agents/skills/exit-strategies/SKILL.md) | Systematic exit rules, stop-loss methods, take-profit strategies, and trailing stop implementations for crypto trading |
| [`kelly-criterion`](../.agents/skills/kelly-criterion/SKILL.md) | Kelly criterion optimal sizing with fractional variants, edge estimation, and practical application for crypto trading |
| [`ml4t-exposure-analysis`](../.agents/skills/ml4t-exposure-analysis/SKILL.md) | Decompose portfolio into factor, sector, and concentration exposures. Use when checking for unintended bets or risk concentrations. |
| [`ml4t-kill-switch`](../.agents/skills/ml4t-kill-switch/SKILL.md) | Automated risk limits that halt trading when thresholds are breached. Use when deploying live strategies that need drawdown or loss-limit protection. |
| [`ml4t-position-sizing`](../.agents/skills/ml4t-position-sizing/SKILL.md) | Convert signals to position sizes using volatility targeting and risk budgets. Use when scaling trade size relative to conviction and portfolio risk. |
| [`ml4t-risk-metrics`](../.agents/skills/ml4t-risk-metrics/SKILL.md) | Compute portfolio risk measures including drawdown, VaR, CVaR, and tail metrics. Use when assessing portfolio risk beyond simple return statistics. |
| [`ml4t-stress-test`](../.agents/skills/ml4t-stress-test/SKILL.md) | Test portfolios against historical crises and hypothetical shocks. Use when quantifying tail risk before deployment or during risk reviews. |
| [`portfolio-analytics`](../.agents/skills/portfolio-analytics/SKILL.md) | Portfolio-level performance measurement including return metrics, risk metrics, risk-adjusted ratios, rolling analysis, and HTML reports |
| [`position-sizing`](../.agents/skills/position-sizing/SKILL.md) | Trade sizing methods including fixed fractional, volatility-adjusted, Kelly criterion, and liquidity-constrained sizing |
| [`risk-management`](../.agents/skills/risk-management/SKILL.md) | Portfolio-level risk controls, drawdown management, exposure limits, and circuit breakers for crypto trading |


## Machine Learning & Feature Engineering (12 skills)

| Skill Name | Description |
| :--- | :--- |
| [`feature-engineering`](../.agents/skills/feature-engineering/SKILL.md) | Feature construction from market data for ML trading models including price, volume, on-chain, and microstructure features |
| [`ml4t-compute-features`](../.agents/skills/ml4t-compute-features/SKILL.md) | Systematic feature computation across multiple assets with group-aware operations. Use when computing technical or fundamental features for a panel of securities. |
| [`ml4t-feature-families`](../.agents/skills/ml4t-feature-families/SKILL.md) | Five families of financial features - momentum, mean-reversion, volatility, carry, and value. Use when designing a feature set to ensure coverage across complementary market dynamics. |
| [`ml4t-feature-selection`](../.agents/skills/ml4t-feature-selection/SKILL.md) | Select informative features using IC ranking, mutual information, or RFE - always within CV folds. Use when reducing feature dimensionality before training. |
| [`ml4t-feature-store`](../.agents/skills/ml4t-feature-store/SKILL.md) | Organize computed features in versioned storage with schema enforcement and point-in-time retrieval. Use when persisting features for reproducible ML experiments or sharing across pipelines. |
| [`ml4t-feature-validation`](../.agents/skills/ml4t-feature-validation/SKILL.md) | Validate features before training - IC significance, stability, redundancy, and contamination checks. Use when auditing feature quality before model fitting. |
| [`ml4t-latent-factors`](../.agents/skills/ml4t-latent-factors/SKILL.md) | Extract latent factors from return panels using PCA, IPCA, or autoencoders with proper noise diagnostics. Use when reducing dimensionality or discovering risk structure. |
| [`ml4t-meta-labels`](../.agents/skills/ml4t-meta-labels/SKILL.md) | Secondary model predicts whether a primary signal will be profitable. Use when sizing positions or filtering low-conviction trades from a base alpha model. |
| [`ml4t-shap-analysis`](../.agents/skills/ml4t-shap-analysis/SKILL.md) | Explain model predictions with SHAP values instead of biased built-in feature importance. Use when interpreting which features drive model decisions. |
| [`ml4t-triple-barrier`](../.agents/skills/ml4t-triple-barrier/SKILL.md) | Label trades using profit-target, stop-loss, and time barriers with volatility-adaptive thresholds. Use when creating supervised labels for financial time series. |
| [`sentiment-analysis`](../.agents/skills/sentiment-analysis/SKILL.md) | Market sentiment extraction from social media, news, and on-chain data including mention velocity, fear and greed indices, and influencer tracking |
| [`signal-classification`](../.agents/skills/signal-classification/SKILL.md) | ML trading signal classifiers using XGBoost and LightGBM with walk-forward validation, SHAP feature importance, and threshold optimization |


## Model Validation & Anti-Overfitting (15 skills)

| Skill Name | Description |
| :--- | :--- |
| [`ml4t-backtest-overfitting`](../.agents/skills/ml4t-backtest-overfitting/SKILL.md) | Detect and prevent overfitting to historical data via multiple testing corrections and pre-registration. Use when evaluating strategy variants to ensure performance is not a data-mining artifact. |
| [`ml4t-cpcv`](../.agents/skills/ml4t-cpcv/SKILL.md) | Combinatorial Purged CV generates a distribution of backtest paths instead of a single estimate. Use when quantifying strategy robustness and overfitting probability. |
| [`ml4t-data-leakage`](../.agents/skills/ml4t-data-leakage/SKILL.md) | Prevent train-test contamination, target leakage, and temporal leakage. Use when splitting data, fitting preprocessors, or engineering features for time-series ML. |
| [`ml4t-deflated-sharpe`](../.agents/skills/ml4t-deflated-sharpe/SKILL.md) | Adjust the Sharpe ratio for multiple testing bias when selecting from many trials. Use when reporting strategy performance after parameter or model search. |
| [`ml4t-drift-detection`](../.agents/skills/ml4t-drift-detection/SKILL.md) | Detect when model inputs or predictions shift from the training distribution using PSI and statistical tests. Use when monitoring deployed models or diagnosing performance degradation. |
| [`ml4t-evaluate-factor`](../.agents/skills/ml4t-evaluate-factor/SKILL.md) | Evaluate alpha factor quality with IC analysis, quantile spreads, turnover, and decay. Use when deciding whether a signal has enough predictive power to trade. |
| [`ml4t-lookahead-bias`](../.agents/skills/ml4t-lookahead-bias/SKILL.md) | Detect future information leaking into features, labels, or evaluation. Use when any pipeline step might expose data not yet available at prediction time. |
| [`ml4t-model-validation`](../.agents/skills/ml4t-model-validation/SKILL.md) | Multi-gate model validation from cross-validation through stress testing to deployment sign-off. Use when qualifying a model for production use. |
| [`ml4t-point-in-time`](../.agents/skills/ml4t-point-in-time/SKILL.md) | Ensure data reflects what was known at each decision point, not revised or restated values. Use when joining fundamental, macro, or alternative data to price series. |
| [`ml4t-purging-embargo`](../.agents/skills/ml4t-purging-embargo/SKILL.md) | Remove training samples whose labels overlap the test period and add an embargo buffer. Use when performing time-series CV to prevent leakage between folds. |
| [`ml4t-stationarity-tests`](../.agents/skills/ml4t-stationarity-tests/SKILL.md) | Test whether time-series features are stationary using ADF and KPSS tests. Use when selecting or transforming features to verify stationarity assumptions for predictive models. |
| [`ml4t-survivorship-bias`](../.agents/skills/ml4t-survivorship-bias/SKILL.md) | Account for delisted and removed securities in historical analysis. Use when constructing universes or computing cross-sectional features to avoid survivor-only inflation. |
| [`ml4t-validate-data`](../.agents/skills/ml4t-validate-data/SKILL.md) | Systematic data quality validation before modeling. Use when checking for gaps, outliers, stale prices, or schema violations in datasets. |
| [`ml4t-walk-forward-cv`](../.agents/skills/ml4t-walk-forward-cv/SKILL.md) | Rolling or expanding window CV that preserves temporal order. Use when evaluating ML models on time-series data where standard k-fold causes temporal leakage. |
| [`walk-forward-validation`](../.agents/skills/walk-forward-validation/SKILL.md) | Walk-forward validation framework for trading strategies and ML models with time-series-aware splits, overfit detection, and regime-aware validation |


## Microstructure, Slippage & Execution (10 skills)

| Skill Name | Description |
| :--- | :--- |
| [`dex-execution`](../.agents/skills/dex-execution/SKILL.md) | Solana DEX swap execution via Jupiter aggregator including quoting, transaction building, signing, and confirmation |
| [`dex-pool-analysis`](../.agents/skills/dex-pool-analysis/SKILL.md) | AMM pool mechanics comparison across Raydium, Orca, and Meteora including fee structures, pool types, creation patterns, and volume efficiency |
| [`liquidity-analysis`](../.agents/skills/liquidity-analysis/SKILL.md) | DEX liquidity depth assessment, slippage estimation, and pool composition analysis for Solana tokens |
| [`market-microstructure`](../.agents/skills/market-microstructure/SKILL.md) | DEX orderflow analysis, trade classification, buyer/seller pressure, and microstructure signals for Solana tokens |
| [`market-microstructure-traditional`](../.agents/skills/market-microstructure-traditional/SKILL.md) | Traditional market microstructure concepts applied to crypto — order book dynamics, market making theory, price formation models, execution quality measurement, and CEX vs DEX structural differences |
| [`ml4t-cost-model`](../.agents/skills/ml4t-cost-model/SKILL.md) | Commission, slippage, and market-impact cost models for realistic strategy simulation. Use when backtesting to ensure P&L accounts for transaction costs. |
| [`ml4t-rl-execution`](../.agents/skills/ml4t-rl-execution/SKILL.md) | Reinforcement learning for trade execution and hedging. Use when optimizing execution algorithms or dynamic hedging policies. |
| [`ml4t-transaction-costs`](../.agents/skills/ml4t-transaction-costs/SKILL.md) | Estimate whether a strategy can survive spread, slippage, and market impact before full simulation. Use when screening strategy feasibility early. |
| [`rl-execution`](../.agents/skills/rl-execution/SKILL.md) | Reinforcement learning for trade execution optimization including order splitting, adaptive timing, and impact minimization |
| [`slippage-modeling`](../.agents/skills/slippage-modeling/SKILL.md) | Execution cost estimation, slippage curve modeling, and optimal trade sizing based on AMM liquidity depth |


## Trade Accounting, Tax & Journaling (8 skills)

| Skill Name | Description |
| :--- | :--- |
| [`cost-basis-engine`](../.agents/skills/cost-basis-engine/SKILL.md) | Multi-method cost basis computation including specific identification, FIFO, LIFO, HIFO, and proportional average cost with partial sell handling |
| [`crypto-tax-export`](../.agents/skills/crypto-tax-export/SKILL.md) | Export trade history and tax calculations in formats compatible with Koinly, CoinTracker, CoinLedger, TokenTax, and IRS Form 8949 |
| [`regulatory-reporting`](../.agents/skills/regulatory-reporting/SKILL.md) | [STUB] Regulatory report generation including IRS Form 8949, Schedule D, FinCEN FBAR, and state-specific crypto reporting requirements |
| [`tax-liability-tracking`](../.agents/skills/tax-liability-tracking/SKILL.md) | Real-time tax liability analysis for active crypto traders with proportional cost basis, gain classification, and tax-aware trading signals |
| [`tax-loss-harvesting`](../.agents/skills/tax-loss-harvesting/SKILL.md) | Tax-loss harvesting opportunity identification, scoring, and planning with wash sale compliance and annual carryforward tracking |
| [`trade-accounting`](../.agents/skills/trade-accounting/SKILL.md) | Double-entry bookkeeping for trading operations with ledger management, P&L statements, balance sheets, and cash flow reporting |
| [`trade-journal`](../.agents/skills/trade-journal/SKILL.md) | Structured trade logging, performance review, behavioral pattern detection, and strategy attribution for systematic improvement |
| [`wash-sale-detection`](../.agents/skills/wash-sale-detection/SKILL.md) | Wash sale detection under 2025 US crypto rules with 61-day window monitoring, disallowed loss tracking, and safe re-entry countdown |


## Market Data, Prediction Markets & Advanced Workflows (42 skills)

| Skill Name | Description |
| :--- | :--- |
| [`coingecko-api`](../.agents/skills/coingecko-api/SKILL.md) | Broad crypto market data from CoinGecko covering 13,000+ tokens. Global market stats, historical price data going back years, exchange volumes, trending tokens, and category filters. Best for macro analysis and long-term historical data. |
| [`copy-trading`](../.agents/skills/copy-trading/SKILL.md) | Wallet evaluation, monitoring, and copy-trade strategy design for Solana DEX trading |
| [`defillama-api`](../.agents/skills/defillama-api/SKILL.md) | Free DeFi analytics across all chains — TVL, token prices, DEX volumes, fees/revenue, stablecoins, and bridges |
| [`impermanent-loss`](../.agents/skills/impermanent-loss/SKILL.md) | Impermanent loss calculation, modeling, and breakeven analysis for AMM liquidity provision across pool types |
| [`kalshi-api`](../.agents/skills/kalshi-api/SKILL.md) | Kalshi exchange mechanics — RSA-PSS auth, order schema, YES/NO orderbook convention, WebSocket, and endpoint surface. Market-type-agnostic shared layer for all Kalshi skills. |
| [`kalshi-crypto-index-markets`](../.agents/skills/kalshi-crypto-index-markets/SKILL.md) | Kalshi daily and hourly range markets on crypto prices (BTC, ETH) and equity indices (S&P 500, Nasdaq-100) — bracket structure, Gaussian P(YES) modeling on price/vol, close-offset decision timing, longshot-sell edge with honest evidence bounds |
| [`kalshi-weather-markets`](../.agents/skills/kalshi-weather-markets/SKILL.md) | Daily temperature high/low bracket and threshold contracts on Kalshi — contract structure, forecast→P(YES) map, settlement rules, cross-venue divergences, and weather-specific pitfalls |
| [`lp-math`](../.agents/skills/lp-math/SKILL.md) | AMM liquidity provision mathematics including constant-product, concentrated liquidity, price impact, and LP share calculations |
| [`mev-analysis`](../.agents/skills/mev-analysis/SKILL.md) | MEV exposure assessment, sandwich attack detection, and protection strategies for Solana DEX trading |
| [`ml4t-agent-governance`](../.agents/skills/ml4t-agent-governance/SKILL.md) | Security and governance controls for autonomous financial agents. Use when agents can call tools, read untrusted content, or affect research or trading decisions. |
| [`ml4t-agent-state-memory`](../.agents/skills/ml4t-agent-state-memory/SKILL.md) | Durable agent state, memory, and replay for autonomous research workflows. Use when an agent must resume, audit, or compare multi-step runs. |
| [`ml4t-agent-tool-contracts`](../.agents/skills/ml4t-agent-tool-contracts/SKILL.md) | Typed tool contracts for autonomous research agents. Use when exposing files, search, databases, or execution tools to an LLM agent. |
| [`ml4t-build-bars`](../.agents/skills/ml4t-build-bars/SKILL.md) | Aggregate tick data into time, volume, and dollar bars. Use when resampling raw tick data into regular or information-driven bars. |
| [`ml4t-calendar-ops`](../.agents/skills/ml4t-calendar-ops/SKILL.md) | Trading calendar awareness for correct date alignment and rolling windows. Use when aligning data across markets or computing holiday-aware windows. |
| [`ml4t-canonical-schema`](../.agents/skills/ml4t-canonical-schema/SKILL.md) | Standardized data schema across all financial datasets. Use when defining or enforcing column names, types, and index conventions. |
| [`ml4t-case-study-development`](../.agents/skills/ml4t-case-study-development/SKILL.md) | Stage-gated research workflow from hypothesis through data prep, feature engineering, modeling, and backtest. Use when developing a trading strategy end-to-end with disciplined gate checks. |
| [`ml4t-case-study-pipeline`](../.agents/skills/ml4t-case-study-pipeline/SKILL.md) | Filesystem and artifact-contract pattern for reproducible case studies. Use when organizing a research project for reproducibility and collaboration. |
| [`ml4t-continuous-futures`](../.agents/skills/ml4t-continuous-futures/SKILL.md) | Build roll-adjusted continuous futures series without artificial price jumps. Use when backtesting futures strategies that span contract rollovers. |
| [`ml4t-data-export`](../.agents/skills/ml4t-data-export/SKILL.md) | Export financial data in efficient columnar formats with schema enforcement. Use when persisting datasets for reproducible research or cross-pipeline sharing. |
| [`ml4t-define-universe`](../.agents/skills/ml4t-define-universe/SKILL.md) | Define point-in-time tradeable universes with liquidity filters. Use when constructing the investable asset set that avoids survivorship and liquidity bias. |
| [`ml4t-factor-research`](../.agents/skills/ml4t-factor-research/SKILL.md) | Systematic factor research from hypothesis through IC analysis, decay profiling, and capacity assessment. Use when developing a new alpha factor end-to-end. |
| [`ml4t-fetch-data`](../.agents/skills/ml4t-fetch-data/SKILL.md) | Reliable data acquisition with provider abstraction and schema validation. Use when ingesting market data from APIs, databases, or files. |
| [`ml4t-horizon-design`](../.agents/skills/ml4t-horizon-design/SKILL.md) | Choose prediction horizon by analyzing IC decay, turnover cost, and feature-horizon alignment. Use when determining the optimal lookahead window for labels. |
| [`ml4t-live-trading`](../.agents/skills/ml4t-live-trading/SKILL.md) | Transition from backtest to live trading with zero code changes. Use when deploying a validated strategy to paper or live trading via broker APIs. |
| [`ml4t-monitoring-alerting`](../.agents/skills/ml4t-monitoring-alerting/SKILL.md) | Real-time monitoring and alerting for live trading systems. Use when building observability for data pipelines, model drift, or execution quality. |
| [`ml4t-multi-agent-forecasting`](../.agents/skills/ml4t-multi-agent-forecasting/SKILL.md) | Multi-agent probability forecasting with diversity, aggregation, and debate controls. Use when combining several agent forecasts or evaluating forecast ensembles. |
| [`ml4t-polars-patterns`](../.agents/skills/ml4t-polars-patterns/SKILL.md) | Polars-first data processing patterns for financial data. Use when writing efficient grouped, windowed, or lazy-evaluated data transformations. |
| [`ml4t-production-readiness`](../.agents/skills/ml4t-production-readiness/SKILL.md) | Pre-deployment checklist covering data pipelines, risk limits, monitoring, and governance. Use when preparing to go live with a new strategy or model. |
| [`ml4t-registry-system`](../.agents/skills/ml4t-registry-system/SKILL.md) | Content-addressed experiment tracking for ML trading models. Use when versioning models, features, or experiment artifacts for reproducibility. |
| [`ml4t-research-operator`](../.agents/skills/ml4t-research-operator/SKILL.md) | Thin autonomous research operator pattern for ML4T experiments. Use when an agent should inspect artifacts, read skills, run scripts, and produce an auditable recommendation. |
| [`ml4t-sensitivity-analysis`](../.agents/skills/ml4t-sensitivity-analysis/SKILL.md) | Test strategy robustness to parameter variation and detect overfitting cliffs. Use when validating that performance is stable across parameter perturbations. |
| [`ml4t-tearsheet`](../.agents/skills/ml4t-tearsheet/SKILL.md) | Generate comprehensive performance reports from backtest returns. Use when summarizing backtest results for review or comparison. |
| [`options-pricing`](../.agents/skills/options-pricing/SKILL.md) | [STUB] Options pricing models including Black-Scholes, binomial trees, Monte Carlo, implied volatility surfaces, and Greeks for crypto options |
| [`polymarket-api`](../.agents/skills/polymarket-api/SKILL.md) | Polymarket exchange mechanics — on-chain Polygon CTF, Gamma/CLOB/Data APIs, EIP-712 auth, identifier model, WebSocket, settlement, and geo/KYC constraint |
| [`prediction-market-live-ops`](../.agents/skills/prediction-market-live-ops/SKILL.md) | Use when building, backtesting, operating, or scaling automated trading on prediction markets (Kalshi or similar) — evidence-gated methodology, live-execution safety rails, and falsification protocols distilled from a real live-money campaign |
| [`prediction-market-strategy`](../.agents/skills/prediction-market-strategy/SKILL.md) | Venue- and market-type-agnostic strategy, sizing, and backtesting layer for binary prediction markets (Kalshi, Polymarket, ForecastEx). Covers the durable edge thesis, fee-aware selection, fractional-Kelly sizing, and leak-free validation methodology. |
| [`sybil-detection`](../.agents/skills/sybil-detection/SKILL.md) | Coordinated wallet cluster detection, wash trading identification, and fake activity analysis for Solana tokens |
| [`token-economics`](../.agents/skills/token-economics/SKILL.md) | Token supply dynamics, vesting analysis, inflation modeling, and valuation frameworks for crypto tokens |
| [`token-holder-analysis`](../.agents/skills/token-holder-analysis/SKILL.md) | Token holder distribution, concentration metrics, insider detection, and supply analysis for Solana tokens |
| [`wallet-profiling`](../.agents/skills/wallet-profiling/SKILL.md) | Behavioral classification, performance analysis, and trading style detection for Solana wallets |
| [`whale-tracking`](../.agents/skills/whale-tracking/SKILL.md) | Large wallet monitoring, accumulation and distribution detection, and smart money signal generation for Solana tokens |
| [`yield-analysis`](../.agents/skills/yield-analysis/SKILL.md) | DeFi yield evaluation including fee APR, real vs nominal yield, net APY after costs, and yield sustainability analysis |

