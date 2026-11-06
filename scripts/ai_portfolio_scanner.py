#!/usr/bin/env python3
"""
Red-Day AI & Data Center Dip Hunter + Charles Schwab Knapsack Allocator
(/Users/bradjensen/stock/scripts/ai_portfolio_scanner.py)

Built for a <$1,000 Charles Schwab account to systematically:
1. Detect "Red Days" across AI data center landlords, S&P 500 AI leaders, and pick-and-shovels.
2. Score every red stock by 1-Day Drop %, 20-Day Z-Score, 14-Day RSI, and 20-Day High Pullback.
3. Check existing holdings for "+35% Green-Day Harvest" signals (rebuilding cash on green days to buy red days).
4. Output an exact-change Charles Schwab order basket (whole shares + $5 S&P 500 Stock Slices,
   respecting Schwab's AC4203 sub-$1.00 cleared-cash rule).

Usage:
    python3 scripts/ai_portfolio_scanner.py --cash 50.00
    python3 scripts/ai_portfolio_scanner.py --cash 25.00 --settled
"""

import argparse
import json
import math
import urllib.request
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional


@dataclass
class TickerProfile:
    symbol: str
    bucket: str
    role: str
    red_trigger_pct: float  # 1-day drop % that qualifies as a "True Red Day"
    sp500_slice_eligible: bool = False


# Current Portfolio Holdings & Cost Basis (as of 2026-11-05 After-Hours Fills)
PORTFOLIO_HOLDINGS: Dict[str, Dict[str, float]] = {
    "IREN": {"shares": 1, "avg_cost": 17.6585},
    "APLD": {"shares": 1, "avg_cost": 14.0300},
    "WULF": {"shares": 1, "avg_cost": 10.0000},
    "CIFR": {"shares": 1, "avg_cost": 6.3900},
    "CLSK": {"shares": 1, "avg_cost": 5.6590},
    "HIVE": {"shares": 2, "avg_cost": 1.7380},
    "BTBT": {"shares": 2, "avg_cost": 0.8434},
}

WATCHLIST: List[TickerProfile] = [
    # Bucket 1: Tier-1 Hyperscaler AI Landlords (Whole Shares | Red trigger: -5.0% day or deeper)
    TickerProfile("IREN", "Bucket 1: Landlord", "Microsoft 200MW + 480MW AI Cloud", -5.0, False),
    TickerProfile("APLD", "Bucket 1: Landlord", "$36B-$86B Hyperscaler Leases (1,410MW)", -5.0, False),
    TickerProfile("WULF", "Bucket 1: Landlord", "$19B-$33B Anthropic + Fluidstack (839MW)", -5.0, False),
    TickerProfile("CORZ", "Bucket 1: Landlord", "CoreWeave (590MW) + AMD (530MW) Colocation", -4.5, False),
    TickerProfile("CIFR", "Bucket 1: Landlord", "$16.6B Contracted HPC Leases (700MW)", -5.0, False),
    TickerProfile("CLSK", "Bucket 1: Landlord", "$6.6B-$11.6B 20-Yr Georgia HPC Lease (175MW)", -5.0, False),
    # Bucket 2: S&P 500 AI Leaders ($5.00 Schwab Stock Slices Eligible | Red trigger: -3.0% day)
    TickerProfile("NVDA", "Bucket 2: S&P 500 Slice", "Blackwell/Rubin AI Accelerator Leader", -3.0, True),
    TickerProfile("AVGO", "Bucket 2: S&P 500 Slice", "Custom AI ASICs (XPUs) & AI Networking", -3.0, True),
    TickerProfile("VRT",  "Bucket 2: S&P 500 Slice", "Liquid Cooling & Data Center Power Mgmt", -3.5, True),
    TickerProfile("ANET", "Bucket 2: S&P 500 Slice", "800G/1.6T Cloud & AI Ethernet Switching", -3.0, True),
    TickerProfile("VST",  "Bucket 2: S&P 500 Slice", "Nuclear & Natural Gas Baseload AI Power", -3.5, True),
    # Bucket 3: High-Asymmetry Pick-and-Shovels & Cash Sweepers (Whole Shares | Red trigger: -5.0% day)
    TickerProfile("POET", "Bucket 3: Sweeper/Pick", "800G/1.6T Optical Interposers for AI GPUs", -5.0, False),
    TickerProfile("EOSE", "Bucket 3: Sweeper/Pick", "$765M (3.2 GWh) Zinc Grid/DC Battery Storage", -5.0, False),
    TickerProfile("HIVE", "Bucket 3: Sweeper/Pick", "NVIDIA GB300 NVL72 GPU Cloud ($350M TCV)", -5.0, False),
    TickerProfile("BTBT", "Bucket 3: Sweeper/Pick", "Enovum Tier-3 Montreal DC + Cerebras Cloud", -5.0, False),
]


def fetch_yahoo_closes(symbol: str) -> List[float]:
    """Zero-dependency Yahoo Finance chart fetcher (works with stdlib urllib)."""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=3mo&interval=1d"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=8) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    result = data["chart"]["result"][0]
    closes = result["indicators"]["quote"][0]["close"]
    clean = [float(c) for c in closes if c is not None]
    # Include live/post-market price if available in meta
    regular_price = result.get("meta", {}).get("regularMarketPrice")
    if regular_price and clean:
        clean[-1] = float(regular_price)
    return clean


def compute_rsi_stdlib(closes: List[float], period: int = 14) -> float:
    if len(closes) < period + 1:
        return 50.0
    deltas = [closes[i] - closes[i - 1] for i in range(len(closes) - period, len(closes))]
    gains = [d if d > 0 else 0.0 for d in deltas]
    losses = [-d if d < 0 else 0.0 for d in deltas]
    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100.0 - (100.0 / (1.0 + rs))


def scan_watchlist(unsettled_cash: bool = True) -> List[Dict]:
    results = []
    for item in WATCHLIST:
        try:
            closes = fetch_yahoo_closes(item.symbol)
        except Exception:
            continue
        if len(closes) < 20:
            continue

        price = closes[-1]
        prev_close = closes[-2]
        day_change_pct = ((price - prev_close) / prev_close) * 100.0

        tail_20 = closes[-20:]
        high_20d = max(tail_20)
        pullback_20d_pct = ((price - high_20d) / high_20d) * 100.0

        sma_20 = sum(tail_20) / len(tail_20)
        variance = sum((x - sma_20) ** 2 for x in tail_20) / len(tail_20)
        std_20 = math.sqrt(variance) if variance > 0 else 1.0
        z_score_20d = (price - sma_20) / std_20
        rsi_14 = compute_rsi_stdlib(closes, 14)

        is_red_today = day_change_pct < 0.0
        hit_red_trigger = day_change_pct <= item.red_trigger_pct or z_score_20d <= -1.25 or rsi_14 <= 40.0

        # Red-Day Dip Score (0-100): heavily weights today's red drop + 20d z-score + RSI oversold
        today_red_pts = max(0.0, min(40.0, -day_change_pct * 3.0)) if is_red_today else 0.0
        rsi_pts = max(0.0, min(30.0, (55.0 - rsi_14) * 1.2))
        z_pts = max(0.0, min(30.0, -z_score_20d * 12.0))
        dip_score = round(today_red_pts + rsi_pts + z_pts, 1)

        # Check existing holding P&L for Harvest vs Average-Down
        holding = PORTFOLIO_HOLDINGS.get(item.symbol)
        owned_shares = holding["shares"] if holding else 0
        pnl_vs_cost_pct = ((price - holding["avg_cost"]) / holding["avg_cost"] * 100.0) if holding else None

        schwab_blocked = unsettled_cash and (price < 1.00) and (not item.sp500_slice_eligible)

        if pnl_vs_cost_pct is not None and pnl_vs_cost_pct >= 35.0 and rsi_14 >= 68.0:
            action_tag = "GREEN HARVEST (+35%)"
        elif is_red_today and hit_red_trigger:
            action_tag = "RED-DAY FLASH BUY"
        elif is_red_today and dip_score >= 35.0:
            action_tag = "RED ACCUMULATE"
        elif is_red_today:
            action_tag = "MILD RED (WATCH)"
        else:
            action_tag = "GREEN (SKIP BUY)"

        results.append({
            "symbol": item.symbol,
            "bucket": item.bucket,
            "price": round(price, 4 if price < 2.0 else 2),
            "day_pct": round(day_change_pct, 2),
            "pullback_20d_pct": round(pullback_20d_pct, 2),
            "rsi_14": round(rsi_14, 1),
            "z_score_20d": round(z_score_20d, 2),
            "dip_score": dip_score,
            "is_red_today": is_red_today,
            "hit_red_trigger": hit_red_trigger,
            "owned_shares": owned_shares,
            "pnl_vs_cost_pct": round(pnl_vs_cost_pct, 1) if pnl_vs_cost_pct is not None else None,
            "sp500_slice": item.sp500_slice_eligible,
            "sub_1_dollar_hold": schwab_blocked,
            "signal": action_tag,
            "role": item.role,
        })

    return sorted(results, key=lambda x: (x["is_red_today"], x["dip_score"]), reverse=True)


def build_red_day_basket(rows: List[Dict], cash: float) -> List[Dict]:
    """Allocates capital ONLY into stocks that are RED today (or deeply oversold), prioritizing unowned & under-owned names."""
    remaining = round(cash, 2)
    plan = []

    red_candidates = [r for r in rows if r["is_red_today"] and not r["sub_1_dollar_hold"]]

    # 1. If an S&P 500 AI stock is down >= 3% today and we have >= $25, allocate a $5.00 Stock Slice
    red_slices = [r for r in red_candidates if r["sp500_slice"] and r["day_pct"] <= -3.0]
    if red_slices and remaining >= 25.0:
        s = red_slices[0]
        plan.append({
            "symbol": s["symbol"],
            "order_type": "Schwab Stock Slice ($5.00 Fractional - Regular Hours)",
            "qty": "$5.00 slice",
            "limit_price": s["price"],
            "cost": 5.00,
            "reason": f"Down {s['day_pct']:+.1f}% today (RSI {s['rsi_14']}, DipScore {s['dip_score']})",
        })
        remaining = round(remaining - 5.00, 2)

    # 2. Buy whole shares of the reddest Tier-1 Landlords / Pick-and-Shovels ($3.00+)
    whole_share_reds = [
        r for r in red_candidates
        if not r["sp500_slice"] and r["price"] >= 3.00 and r["dip_score"] >= 30.0
    ]
    # Prefer unowned tickers first (like CORZ, POET) or deepest red drop
    whole_share_reds.sort(key=lambda r: (r["owned_shares"] == 0, r["dip_score"]), reverse=True)

    for stock in whole_share_reds:
        if stock["price"] <= remaining:
            plan.append({
                "symbol": stock["symbol"],
                "order_type": "Whole Share Limit Order",
                "qty": 1,
                "limit_price": stock["price"],
                "cost": round(stock["price"], 2),
                "reason": f"Down {stock['day_pct']:+.1f}% today | 20d Dip {stock['pullback_20d_pct']:+.1f}% (DipScore {stock['dip_score']})",
            })
            remaining = round(remaining - stock["price"], 2)

    # 3. Sweep remaining change ($1.00 - $4.99) into red sweepers (EOSE, HIVE, or BTBT if settled)
    sweepers = [r for r in red_candidates if not r["sp500_slice"] and r["price"] <= remaining]
    for sw in sweepers:
        qty = int(remaining // sw["price"])
        if qty >= 1:
            cost = round(qty * sw["price"], 2)
            plan.append({
                "symbol": sw["symbol"],
                "order_type": "Whole Share Cash Sweeper (Limit)",
                "qty": qty,
                "limit_price": sw["price"],
                "cost": cost,
                "reason": f"Cash sweeper down {sw['day_pct']:+.1f}% today (DipScore {sw['dip_score']})",
            })
            remaining = round(remaining - cost, 2)

    return plan


def main():
    parser = argparse.ArgumentParser(description="Red-Day AI & Data Center Dip Scanner")
    parser.add_argument("--cash", type=float, default=50.0, help="Available cash to deploy ($)")
    parser.add_argument("--settled", action="store_true", help="Cash is settled (allows <$1.00 stocks like BTBT)")
    args = parser.parse_args()

    rows = scan_watchlist(unsettled_cash=not args.settled)
    plan = build_red_day_basket(rows, cash=args.cash)

    red_count = sum(1 for r in rows if r["is_red_today"])
    flash_count = sum(1 for r in rows if r["signal"] == "RED-DAY FLASH BUY")

    print(f"\n=== RED-DAY AI & DATA CENTER DIP SCANNER ({datetime.now().strftime('%Y-%m-%d %H:%M ET')}) ===")
    print(f"Market Regime: {red_count}/{len(rows)} AI stocks RED today | {flash_count} Flash-Sale Triggers Active\n")
    print(f"{'Ticker':<6} | {'Price':>7} | {'1D %':>7} | {'20D Dip':>7} | {'RSI':>5} | {'Z-Scr':>5} | {'DipScr':>6} | {'Own':>3} | {'Action Signal'}")
    print("-" * 88)
    for r in rows:
        hold_flag = " [AC4203 <$1]" if r["sub_1_dollar_hold"] else ""
        print(
            f"{r['symbol']:<6} | ${r['price']:>6.2f} | {r['day_pct']:>+6.2f}% | "
            f"{r['pullback_20d_pct']:>+6.1f}% | {r['rsi_14']:>5.1f} | {r['z_score_20d']:>+5.2f} | "
            f"{r['dip_score']:>6.1f} | {r['owned_shares']:>3} | {r['signal']}{hold_flag}"
        )

    print(f"\n=== EXACT-CHANGE SCHWAB RED-DAY BUY BASKET (${args.cash:.2f} BUDGET) ===")
    if not plan:
        print("  No stocks meet Red-Day Dip criteria today. Keep cash dry for the next red session!")
    else:
        total_spent = sum(p["cost"] for p in plan)
        for p in plan:
            print(f"  -> BUY {p['qty']} x {p['symbol']} @ ${p['limit_price']:.2f} ({p['order_type']}) = ${p['cost']:.2f}")
            print(f"     Why: {p['reason']}")
        print(f"\nTotal Deployed: ${total_spent:.2f} / ${args.cash:.2f} ({(total_spent/args.cash)*100:.1f}%) | Unspent Cash: ${args.cash - total_spent:.2f}\n")


if __name__ == "__main__":
    main()
