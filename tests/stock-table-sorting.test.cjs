const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('stock/app.js', 'utf8');
function sortingContext(extra = {}) {
  const context = vm.createContext({ Intl, COMPANY_PROFILES: {}, state: { quotes: {} }, ...extra });
  vm.runInContext(source.slice(source.indexOf('const tableSorts ='), source.indexOf('function saveState()')), context);
  return context;
}
function sorted(context, table, key, direction, rows) {
  context.rows = rows;
  vm.runInContext(`tableSorts.${table} = ${JSON.stringify({ key, direction })}; result = sortedTableRows('${table}', rows);`, context);
  return Array.from(context.result);
}

test('holdings sort numerically including fractional shares, losses and progress beyond the goal without mutating positions', () => {
  const rows = [
    ['B', { shares: 10, avgCost: 10 }],
    ['A', { shares: 2, avgCost: 100 }],
    ['C', { shares: 0.5, avgCost: 2 }],
    ['D', { shares: 1, avgCost: 10 }],
  ];
  const before = JSON.stringify(rows);
  const context = sortingContext({ state: { quotes: { A: { activePrice: 90 }, B: { activePrice: 30 }, C: { activePrice: 3 }, D: { activePrice: 30 } } } });
  const symbols = (key, dir) => sorted(context, 'portfolio', key, dir, rows).map(([sym]) => sym);
  assert.deepEqual(symbols('shares', 'ascending'), ['C', 'D', 'A', 'B']);
  assert.deepEqual(symbols('price', 'ascending'), ['C', 'B', 'D', 'A']);
  assert.deepEqual(symbols('value', 'descending'), ['B', 'A', 'D', 'C']);
  assert.deepEqual(symbols('pnl', 'ascending'), ['A', 'C', 'D', 'B']);
  assert.deepEqual(symbols('progress', 'descending'), ['B', 'D', 'C', 'A']);
  assert.equal(JSON.stringify(rows), before);
});

test('company size and revenue compare millions, billions and trillions, preserving scanner priority and stable ties', () => {
  const rows = [
    { symbol: 'Z', price: 100, profile: { marketCap: '$4.5 Trillion (Large)', annualRevenue: '~$680 Million / yr (Growing 115%)' } },
    { symbol: 'A', price: 9, profile: { marketCap: '$420 Million (Small)', annualRevenue: '$9 Billion / yr' } },
    { symbol: 'B', price: 9, profile: { marketCap: '$4.2 Billion (Mid)', annualRevenue: '$1,200 Million / yr' } },
    { symbol: 'N', price: NaN, profile: { marketCap: 'Unknown', annualRevenue: '' } },
  ];
  const context = sortingContext();
  const symbols = (key, dir) => sorted(context, 'companies', key, dir, rows).map((r) => r.symbol);
  assert.deepEqual(symbols('size', 'ascending'), ['A', 'B', 'Z', 'N']);
  assert.deepEqual(symbols('size', 'descending'), ['Z', 'B', 'A', 'N']);
  assert.deepEqual(symbols('revenue', 'descending'), ['A', 'B', 'Z', 'N']);
  assert.deepEqual(symbols('price', 'ascending'), ['A', 'B', 'Z', 'N']);
  assert.deepEqual(rows.map((r) => r.symbol), ['Z', 'A', 'B', 'N']);
});

test('receipts sort by actual dates across years, ISO time, numeric strings and natural order IDs; blanks stay last', () => {
  const rows = [
    { symbol: 'B', date: '12/31/2025', qty: '10', total: '100', orderId: 'ORDER-10', action: 'SELL' },
    { symbol: 'A', date: '1/2/2026', createdAt: '2026-01-02T18:00:00Z', qty: '2', total: '9', orderId: 'ORDER-2', action: 'BUY' },
    { symbol: 'C', date: '1/2/2026', createdAt: '2026-01-02T17:00:00Z', qty: 0.5, total: 0, orderId: 'ORDER-1', action: 'BOUGHT' },
    { symbol: 'N', date: 'Unavailable', qty: '', total: null },
  ];
  const context = sortingContext();
  const symbols = (key, dir) => sorted(context, 'journal', key, dir, rows).map((r) => r.symbol);
  assert.deepEqual(symbols('date', 'ascending'), ['B', 'C', 'A', 'N']);
  assert.deepEqual(symbols('date', 'descending'), ['A', 'C', 'B', 'N']);
  assert.deepEqual(symbols('shares', 'ascending'), ['C', 'A', 'B', 'N']);
  assert.deepEqual(symbols('total', 'descending'), ['B', 'A', 'C', 'N']);
  assert.deepEqual(symbols('orderId', 'ascending'), ['C', 'A', 'B', 'N']);
  assert.deepEqual(symbols('type', 'ascending'), ['A', 'C', 'B', 'N']);
});

test('header clicks toggle direction independently, update accessibility state and preserve sort on data refresh', () => {
  function button(table, key, label) {
    return { dataset: { sortTable: table, sortKey: key }, textContent: `${label}↕`, attrs: {}, th: {}, indicator: {},
      addEventListener(_, fn) { this.click = fn; },
      closest() { return { setAttribute: (k, v) => { this.th[k] = v; } }; },
      querySelector() { return this.indicator; }, setAttribute(k, v) { this.attrs[k] = v; } };
  }
  const buttons = [button('portfolio', 'shares', 'Shares'), button('portfolio', 'paid', 'Paid'), button('journal', 'total', 'Total')];
  const statuses = { 'portfolio-sort-status': {}, 'journal-sort-status': {} };
  const document = { querySelectorAll: (sel) => sel === '[data-sort-table]' ? buttons : buttons.filter((b) => sel.includes(`"${b.dataset.sortTable}"`)), getElementById: (id) => statuses[id] };
  const context = sortingContext({ document,
    renderKPIsAndPortfolio() { vm.runInContext("updateTableSortHeaders('portfolio')", context); },
    renderJournal() { vm.runInContext("updateTableSortHeaders('journal')", context); }, bindCompanyDetailButtons() {} });
  vm.runInContext('initTableSorting()', context);
  buttons[0].click();
  assert.equal(buttons[0].th['aria-sort'], 'ascending');
  assert.equal(buttons[0].indicator.textContent, '↑');
  buttons[0].click();
  assert.equal(buttons[0].th['aria-sort'], 'descending');
  assert.match(buttons[0].attrs['aria-label'], /sort ascending/);
  buttons[2].click();
  assert.equal(buttons[0].th['aria-sort'], 'descending');
  assert.equal(buttons[2].th['aria-sort'], 'ascending');
  const refreshed = sorted(context, 'portfolio', 'shares', 'descending', [['A', { shares: 1 }], ['B', { shares: 20 }]]);
  assert.deepEqual(refreshed.map(([sym]) => sym), ['B', 'A']);
  buttons[1].click();
  assert.equal(buttons[0].th['aria-sort'], 'none');
  assert.equal(buttons[1].th['aria-sort'], 'ascending');
  assert.match(statuses['portfolio-sort-status'].textContent, /Paid, sorted ascending/);
});
