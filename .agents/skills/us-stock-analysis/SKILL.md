---
name: us-stock-analysis
description: Perform comprehensive US equity and stock trading analysis covering fundamental financials, technical indicators, momentum screening, valuation multiples, risk metrics, and generating institutional-grade investment reports. Use whenever the user requests analysis of a stock, ticker, portfolio, or equity trade setup.
---

# US Stock Analysis & Trading Research

Comprehensive procedure for analyzing US equities and ETFs, combining quantitative factor modeling, fundamental analysis, and technical price-action setups.

## Workflow Overview

When evaluating any equity ticker or basket of stocks:

1. **Market Data Retrieval**:
   - Obtain historical daily and intraday OHLCV bars.
   - Fetch latest quotes, market capitalization, sector/industry classifications.
   - Retrieve balance sheet, income statement, and cash flow data.

2. **Technical & Momentum Screening**:
   - Trend Structure: 20-day, 50-day, and 200-day Simple and Exponential Moving Averages (Golden Cross / Death Cross).
   - Momentum & Oscillator: 14-period RSI (oversold < 30, overbought > 70, divergences), MACD (12, 26, 9) signal line crossovers and histogram slope.
   - Volatility & Range: Average True Range (ATR), Bollinger Bands (%B and Bandwidth squeeze).
   - Volume Confirmation: 20-day average volume comparison, On-Balance Volume (OBV), and volume surges on key breakouts.

3. **Fundamental Valuation & Growth Metrics**:
   - Valuation Multiples: Trailing and Forward P/E, PEG ratio, Price-to-Sales (P/S), Price-to-Book (P/B), EV/EBITDA, and Free Cash Flow Yield.
   - Profitability & Margins: Gross margin, operating margin, net profit margin, ROE (Return on Equity), and ROIC.
   - Financial Health & Balance Sheet: Total debt vs cash, Net Debt / EBITDA, Current Ratio, interest coverage.
   - Growth Rates: YoY Revenue growth, EPS growth, and 3-year CAGR.

4. **Risk & Quantitative Factor Analysis**:
   - Beta relative to SPY / QQQ.
   - Historical Volatility (30-day and 90-day annualized).
   - Maximum Drawdown over 1-year and 3-year periods.
   - Catalyst / Event Risk: Upcoming earnings dates, dividend ex-dates, Fed / FOMC announcements.

5. **Artifact Generation & Archiving**:
   - Format results as a standardized, institutional-grade Equity Research Tearsheet.
   - Save the tearsheet into `/Users/bradjensen/stock/artifacts/` (e.g. `/Users/bradjensen/stock/artifacts/<TICKER>_tearsheet_<DATE>.md`).
   - Mirror report into active Antigravity session artifacts.

## Standard Python Research Script Template

```python
import yfinance as yf
import pandas as pd
import numpy as np

def analyze_ticker(symbol: str):
    ticker = yf.Ticker(symbol)
    hist = ticker.history(period="1y")
    info = ticker.info

    # Technical indicators
    hist['SMA_20'] = hist['Close'].rolling(window=20).mean()
    hist['SMA_50'] = hist['Close'].rolling(window=50).mean()
    hist['SMA_200'] = hist['Close'].rolling(window=200).mean()

    # RSI 14
    delta = hist['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    hist['RSI_14'] = 100 - (100 / (1 + rs))

    latest_close = hist['Close'].iloc[-1]
    latest_rsi = hist['RSI_14'].iloc[-1]

    return {
        "symbol": symbol,
        "price": latest_close,
        "rsi": latest_rsi,
        "pe_ratio": info.get("trailingPE"),
        "forward_pe": info.get("forwardPE"),
        "market_cap": info.get("marketCap"),
        "52w_high": info.get("fiftyTwoWeekHigh"),
        "52w_low": info.get("fiftyTwoWeekLow")
    }
```

## Report Standards
Every report must include:
- **Executive Summary**: Clear thesis (Bullish / Neutral / Bearish), primary catalysts, key risks.
- **Key Metrics Table**: Price, 52-week range, market cap, valuation ratios, technical indicators.
- **Trade Setup / Levels**: Entry zone, primary target, stop loss, reward-to-risk ratio.
