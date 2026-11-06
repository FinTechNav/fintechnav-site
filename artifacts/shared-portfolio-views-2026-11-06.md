# Shared portfolio views — November 6, 2026

The existing stock login now opens one shared Schwab connection with Brad, Dio and All views. These are reporting/strategy views within the same authenticated account, not separate security identities or brokerage accounts.

Brad retains the existing watchlist and red-day settings. Dio receives independent copies of those rules with five clearly marked, editable defense placeholders: LMT, RTX, NOC, GD and KTOS. No defense price history, analyst forecasts or fundamentals are invented; unavailable data is marked missing. Both profiles can change their own watchlist/rules without overwriting the other. All displays account balances, every returned position including non-stock/outside-watchlist holdings, recent orders and execution receipts, without a personal strategy rail. Holdings are sortable. Order/receipt history is explicitly the latest 60 days; this is not a replacement for Schwab tax documents, statements or tax-lot reporting.

## Share attribution

The owner explicitly chose to assign existing eligible long stock shares to Brad on the first successful brokerage sync. Dio starts with no allocated shares. That migration is performed once against verified current brokerage data; a failed connection does not mark it complete.

The split editor saves explicit counts for both profiles and validates their sum against a fresh brokerage read. A synthetic example of one Brad share plus two Dio shares displays three in All. Additional outside-app purchases remain unassigned until split; conflicting allocations after outside-app sales/splits are flagged for review, with the ambiguous ticker withheld from personal totals. All remains the brokerage source of truth. Non-stock positions remain visible in All. Personal cost and profit/loss use the brokerage's blended average price rather than claiming separate tax lots. Cash remains shared and is shown separately from each person's holdings value.

Order review pins the selected personal profile on the server approval. The one-use submit cannot change it. Accepted or working orders do not increase share counts; confirmed execution facts do. Private immutable execution annotations support partial fills, repeat sync and retention after orders leave recent history. Missing order-label storage produces a persistent warning and manual allocation path, never an automatic broker resubmission. Receipts use actual execution prices and quantities; non-equity notional totals are left unavailable rather than assuming a multiplier.

## Persistence and boundaries

Profile preferences and explicit view configuration use existing authenticated, context-isolated private storage with revision-checked replacement. There are no incremented stored balance counters, new dependencies, added databases or billing changes. Confirmed execution annotations are immutable and projections are derived on reads. Conflicting device edits fail with a reload instruction. Unsaved split drafts survive quote refreshes. Secrets and account identifiers are excluded from this new normalized snapshot/configuration interface; the previous broker response fields remain for compatibility. No view data is copied into Gists.

The existing single-owner login, same-origin mutations, global brokerage-history guards, per-order/batch limits and one-use confirmations are retained. All cannot prepare trades. Brokerage calls and initial attribution remain unverified against a real account while the prior Schwab application-credential issue awaits resolution. No live orders were submitted during development.

## Validation

Build, lint/format, JavaScript syntax, whitespace checks and 42 offline tests pass. The 12 new suites cover independent defaults, shared-ticker splitting, confirmed partial fills, reconciliation conflicts, one-time migration, persisted configuration, stale/concurrent edits, pinned profiles, immutable history retention, owner/origin boundaries, accepted-order annotation failure and account-wide opposite-side guards.

A loopback-only browser fixture used synthetic positions and the real handler contracts. Verified Brad 1 / Dio 2 / All 3, outside-watchlist and fund holdings, independent persisted goals, selected-view restoration, sortable All holdings, hidden strategy controls in All, combined-share validation, and preservation of an edited allocation across quote refresh. Browser logs showed no JavaScript errors. Fixture files and screenshots remain ignored under artifacts/local/shared-views-preview/ and are excluded from the deployed allowlist. Both Markdown session logs record the decisions and observed validation.
