// View configuration and projections, shared by browser and server. No broker writes.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PortfolioViews = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  const PERSONAL = ['primary', 'partner'];
  const DEFENSE = [
    ['LMT', 'Lockheed Martin', 'Aircraft, space and defense systems'],
    ['RTX', 'RTX', 'Aerospace engines, air defense and defense systems'],
    ['NOC', 'Northrop Grumman', 'Aircraft, space and defense systems'],
    ['GD', 'General Dynamics', 'Marine, aerospace and defense systems'],
    ['KTOS', 'Kratos Defense & Security Solutions', 'Uncrewed systems and defense technology'],
  ];
  const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
  const round = (value) => Math.round(value * 1e8) / 1e8;
  const escape = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  function defaults(primary, partner) {
    return {
      version: 1,
      profiles: {
        primary: structuredClone(primary),
        partner: structuredClone(partner || { ...primary, watchlist: [] }),
      },
      assignment: { allocations: {}, baselineFills: {} },
    };
  }
  function ownership(document, positions, orders = []) {
    const allocations = structuredClone(document?.assignment?.allocations || {});
    const baseline = document?.assignment?.baselineFills || {};
    // Derive confirmed changes from immutable order labels, never from order submission.
    for (const order of orders) {
      if (!PERSONAL.includes(order.profile) || !order.symbol) continue;
      const delta = Math.max(0, number(order.filledQuantity) - number(baseline[order.orderId]));
      if (!delta) continue;
      const entry = (allocations[order.symbol] ||= { primary: 0, partner: 0 });
      entry[order.profile] = round(
        number(entry[order.profile]) + (order.instruction === 'BUY' ? delta : -delta)
      );
    }
    const holdings = { primary: {}, partner: {} };
    const issues = [];
    const unassigned = {};
    const bySymbol = new Map(positions.filter((p) => p.assignable).map((p) => [p.symbol, p]));
    for (const [symbol, entry] of Object.entries(allocations)) {
      const total = number(entry.primary) + number(entry.partner);
      const available = number(bySymbol.get(symbol)?.longQuantity);
      if (number(entry.primary) < -1e-8 || number(entry.partner) < -1e-8 || total > available + 1e-8)
        issues.push(symbol);
    }
    for (const position of positions.filter((p) => p.assignable)) {
      const entry = allocations[position.symbol] || {};
      const invalid = issues.includes(position.symbol);
      unassigned[position.symbol] = invalid
        ? position.longQuantity
        : round(position.longQuantity - number(entry.primary) - number(entry.partner));
      for (const profile of PERSONAL) {
        const shares = invalid ? 0 : number(entry[profile]);
        if (shares > 1e-8)
          holdings[profile][position.symbol] = {
            shares,
            avgCost: position.averagePrice,
            role: position.description,
            marketValue: position.longQuantity
              ? (position.marketValue * shares) / position.longQuantity
              : 0,
          };
      }
    }
    return { holdings, allocations, unassigned, issues };
  }
  function receipts(orders, view) {
    return orders
      .filter((order) => view === 'all' || order.profile === view)
      .flatMap((order) =>
        order.executions.map((fill, i) => ({
          createdAt: fill.time,
          date: new Date(fill.time).toLocaleString(),
          action: order.instruction,
          symbol: order.symbol,
          qty: fill.quantity,
          price: fill.price,
          total: fill.total,
          orderId: order.orderId,
          note:
            view === 'all' ? `${order.status} · ${order.assetType}` : 'Confirmed Schwab execution',
          id: `${order.orderId}-${i}`,
        }))
      )
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }
  return { PERSONAL, DEFENSE, defaults, ownership, receipts, escape, round };
});
