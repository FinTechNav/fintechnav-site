// One authenticated brokerage account; three presentation views.
let activeView = ['primary', 'partner', 'all'].includes(localStorage.getItem('stock_active_view'))
  ? localStorage.getItem('stock_active_view')
  : 'primary';
let profileLabels = { primary: 'Primary', partner: 'Partner', all: 'All' };
let privateViewDefaults = null;
const viewLabel = (id) => profileLabels[id] || 'Personal view';
let sharedViews = null;
let sharedRevision = null;
let viewsReady = false;
let legacyPrimaryHoldings = null;
let brokerSnapshot = { positions: [], balances: {}, orders: [], allocationOrders: [] };
let viewWriteQueue = Promise.resolve();
let viewWriteError = false;
let pendingViewWrites = 0;
let allocationEditorDirty = false;
const viewEscape = (value) => PortfolioViews.escape(value);
const viewMoney = (value) =>
  typeof value === 'number' && Number.isFinite(value)
    ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';
function personalPreferences() {
  return structuredClone({
    rules: state.rules,
    watchlist: state.watchlist,
    deployBudget: state.deployBudget,
    sessionTiming: state.sessionTiming,
  });
}
function setViewStatus(message, error = false) {
  const el = document.getElementById('view-save-status');
  if (el) {
    el.textContent = message;
    el.classList.toggle('text-[#ff6467]', error);
  }
}
async function viewRequest(body) {
  const response = await stockFetch(
    '/api/portfolio-views',
    body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : {}
  );
  const data = await safeReadJson(response, 'Shared views');
  if (!response.ok || !data.ok) throw new Error(data.error || 'Shared views could not be loaded.');
  return data;
}
async function initializeSharedViews() {
  viewsReady = false;
  if (legacyPrimaryHoldings === null) legacyPrimaryHoldings = structuredClone(state.holdings);
  try {
    await viewWriteQueue;
    let data = await viewRequest();
    profileLabels = { ...profileLabels, ...data.labels };
    privateViewDefaults = data.defaults;
    const oldActive = localStorage.getItem('stock_active_view');
    const mappedActive = Object.entries(data.legacyIds || {}).find(
      ([, old]) => old === oldActive
    )?.[0];
    if (mappedActive) {
      activeView = mappedActive;
      localStorage.setItem('stock_active_view', activeView);
    }
    const legacyPreferences = state.savedViewPreferences?.[data.legacyIds?.primary];
    if (!data.document)
      data = await viewRequest({
        action: 'initialize',
        preferences:
          state.savedViewPreferences?.primary ||
          legacyPreferences ||
          (localStorage.getItem(STORAGE_KEY)
            ? personalPreferences()
            : data.defaults?.profiles.primary || personalPreferences()),
      });
    sharedViews = data.document;
    sharedRevision = data.revision;
    viewsReady = true;
    viewWriteError = false;
    allocationEditorDirty = false;
    setViewStatus('Shared views saved');
    applyActiveView();
    renderAll();
    if (activeView === 'all') switchTab('account');
  } catch (error) {
    viewWriteError = true;
    setViewStatus(error.message, true);
    renderViewChrome();
  }
}
function captureViewPreferences() {
  if (!viewsReady || !PortfolioViews.PERSONAL.includes(activeView)) return;
  const profile = activeView;
  const preferences = personalPreferences();
  if (JSON.stringify(sharedViews.profiles[profile]) === JSON.stringify(preferences)) return;
  sharedViews.profiles[profile] = preferences;
  state.savedViewPreferences = structuredClone(sharedViews.profiles);
  pendingViewWrites++;
  setViewStatus('Saving shared view…');
  viewWriteQueue = viewWriteQueue
    .then(async () => {
      if (viewWriteError) throw new Error('Reload shared views before saving more changes.');
      const data = await viewRequest({
        action: 'preferences',
        profile,
        preferences,
        revision: sharedRevision,
      });
      sharedRevision = data.revision;
      // Keep newer queued local edits; only the server revision advances here.
      setViewStatus('Shared views saved');
    })
    .catch((error) => {
      viewWriteError = true;
      setViewStatus(error.message, true);
    })
    .finally(() => {
      pendingViewWrites--;
    });
}
function currentOwnership() {
  return PortfolioViews.ownership(
    sharedViews,
    brokerSnapshot.positions,
    brokerSnapshot.allocationOrders
  );
}
function applyActiveView() {
  if (!sharedViews) return;
  const preferences = sharedViews.profiles[activeView === 'all' ? 'primary' : activeView];
  Object.assign(state, structuredClone(preferences));
  state.holdings =
    activeView === 'all'
      ? {}
      : activeView === 'primary' && !brokerSnapshot.syncedAt && sharedViews.assignment.initialOwner
        ? structuredClone(legacyPrimaryHoldings || {})
        : currentOwnership().holdings[activeView];
  state.cash = Number(brokerSnapshot.balances.cashAvailableForTrading || 0);
  state.journal = PortfolioViews.receipts(brokerSnapshot.orders, activeView);
  document.getElementById('input-deploy-cash').value = state.deployBudget;
  document.getElementById('select-order-session').value = state.sessionTiming;
}
function selectPortfolioView(view) {
  if (!['primary', 'partner', 'all'].includes(view)) return;
  captureViewPreferences();
  activeView = view;
  localStorage.setItem('stock_active_view', view);
  activeScanFilter = 'all';
  searchQuery = '';
  expandedTableSymbol = '';
  document.getElementById('sidebar-quick-search').value = '';
  const search = document.getElementById('global-search');
  if (search) search.value = '';
  applyActiveView();
  renderAll();
  switchTab(view === 'all' ? 'account' : 'radar');
  if (view !== 'all') refreshLiveQuotes();
}
function renderViewChrome() {
  const all = activeView === 'all';
  document.getElementById('stock-dashboard').dataset.activeView = activeView;
  const selector = document.getElementById('portfolio-view-select');
  for (const option of selector.options) option.textContent = viewLabel(option.value);
  document.querySelectorAll('[data-profile-label]').forEach((el) => {
    el.textContent = viewLabel(el.dataset.profileLabel);
  });
  selector.value = activeView;
  selector.disabled = !viewsReady;
  document.getElementById('view-heading').textContent = all
    ? 'All · Shared Schwab portfolio'
    : `${viewLabel(activeView)} · Personal plan`;
  const issues = sharedViews ? currentOwnership().issues : [];
  document.getElementById('view-description').textContent = all
    ? 'Account balances, all holdings and recent executions from Schwab. No personal strategy or buy/sell recommendations.'
    : `Your private watchlist and approach. Shares reflect this view’s allocation; cost and P/L use Schwab’s blended average cost. Cash and trade protections apply to the whole account.`;
  document.getElementById('view-sync-status').textContent = brokerSnapshot.syncedAt
    ? `Last Schwab sync: ${new Date(brokerSnapshot.syncedAt).toLocaleString()}${issues.length ? ' · Allocations need review: ' + issues.join(', ') : ''}`
    : `Awaiting Schwab sync. Existing shares will be assigned to ${viewLabel('primary')} once the connection is available.`;
  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.hidden = all && ['companies', 'studio'].includes(button.dataset.tab);
    const label = button.querySelector('[data-view-nav-label]');
    if (label && button.dataset.tab === 'radar')
      label.textContent = all ? 'Account overview' : 'Account home';
    if (label && button.dataset.tab === 'companies')
      label.textContent = `Watchlist (${state.watchlist.length})`;
    if (label && button.dataset.tab === 'portfolio')
      label.textContent = all
        ? 'All holdings'
        : `What I own (${Object.keys(state.holdings).length})`;
  });
  document.querySelector('[data-filter="all"]').textContent = `All (${state.watchlist.length})`;
  document.querySelector('[data-filter="owned"]').textContent =
    `Owned (${Object.keys(state.holdings).length})`;
  document.querySelector('[data-filter="landlord"]').textContent =
    activeView === 'partner' ? 'Defense placeholders' : 'Landlords';
  document.getElementById('quick-owned-label').textContent =
    `Stocks you own (${Object.keys(state.holdings).length})`;
  document.getElementById('quick-owned-shares').textContent =
    `${PortfolioViews.round(Object.values(state.holdings).reduce((sum, p) => sum + p.shares, 0))} shares`;
  document.getElementById('sidebar-receipt-count').textContent = state.journal.length;
  document.getElementById('strategy-summary').textContent =
    `Checkers, Not Chess: Buy on Red Days · Sell 1 Share at +${state.rules.harvestGainPct}% Profit`;
  document.querySelector('[data-harvest-progress-label]').textContent =
    `Progress to +${state.rules.harvestGainPct}% Sell Goal`;
  document.querySelector('[data-harvest-goal]').textContent = `+${state.rules.harvestGainPct}%`;
  document.querySelectorAll('.sidebar-filter-link').forEach((button) => {
    button.hidden = all;
  });
  document.querySelector('#tab-companies h1').textContent =
    `All ${state.watchlist.length} companies on your watchlist`;
  document.querySelector('#tab-portfolio h1').textContent =
    `What ${viewLabel(activeView)} owns right now`;
  document.querySelector('#tab-journal h1').textContent = all
    ? 'Schwab receipts & trade history'
    : `${viewLabel(activeView)} · Receipts & trade history`;
  document.querySelector('#tab-journal p').textContent =
    'Confirmed executions from the last 60 days. Personal views include only orders labeled for that view; outside-app orders remain in All.';
  document.getElementById('kpi-value-label').textContent = all ? 'Account:' : 'Allocated holdings:';
  document.getElementById('rail-value-label').textContent = 'Allocated Holdings Value';
  document.getElementById('btn-execute-schwab').disabled =
    all || !viewsReady || Boolean(sharedViews?.assignment.initialOwner) || viewWriteError;
  const bucketLabels =
    activeView === 'partner'
      ? ['Defense placeholders', 'Slice candidates', 'Other watchlist stocks']
      : ['Data center landlords', 'Tech giants ($5 Slices)', 'Under-$5 bargains'];
  ['landlord', 'slice', 'sweeper'].forEach((key, i) => {
    const button = document.querySelector(`[data-quick-filter="${key}"]`);
    button.querySelector('span.flex > span').textContent = bucketLabels[i];
    const count =
      key === 'slice'
        ? state.watchlist.filter((w) => w.sp500Slice).length
        : state.watchlist.filter((w) =>
            w.bucket.includes(key === 'landlord' ? 'Bucket 1' : 'Bucket 3')
          ).length;
    button.lastElementChild.textContent = count;
  });
}
function renderAccountOverview() {
  const snapshot = brokerSnapshot;
  updateTableSortHeaders('account');
  document.getElementById('account-balances').innerHTML = [
    ['Account value', 'liquidationValue'],
    ['Cash available for trading', 'cashAvailableForTrading'],
    ['Cash balance', 'cashBalance'],
    ['Available funds', 'availableFunds'],
    ['Buying power', 'buyingPower'],
  ]
    .map(
      ([label, key]) =>
        `<div class="kumo-card p-4"><p class="text-xs text-[#a1a1a1]">${label}</p><strong class="block mt-2">${viewMoney(snapshot.balances[key])}</strong></div>`
    )
    .join('');
  document.getElementById('account-positions').innerHTML = snapshot.positions.length
    ? sortedTableRows('account', snapshot.positions)
        .map(
          (p) =>
            `<tr><td>${viewEscape(p.symbol)}<span class="block text-xs text-[#a1a1a1]">${viewEscape(p.description)}</span></td><td>${viewEscape(p.assetType)}</td><td>${p.longQuantity}</td><td>${p.shortQuantity}</td><td>${viewMoney(p.averagePrice)}</td><td>${viewMoney(p.marketValue)}</td></tr>`
        )
        .join('')
    : '<tr><td colspan="6">Sync Schwab to load the entire account, including holdings outside either watchlist.</td></tr>';
  document.getElementById('account-orders').innerHTML = snapshot.orders.length
    ? snapshot.orders
        .map(
          (o) =>
            `<tr><td>${viewEscape(o.orderId)}</td><td>${viewEscape(o.symbol)}</td><td>${viewEscape(o.instruction)}</td><td>${viewEscape(o.status)}</td><td>${o.filledQuantity} / ${o.quantity}</td><td>${viewMoney(o.limitPrice)}</td></tr>`
        )
        .join('')
    : '<tr><td colspan="6">No recent orders loaded.</td></tr>';
  if (activeView === 'all') {
    document.getElementById('kpi-account-val').textContent = viewMoney(
      snapshot.balances.liquidationValue
    );
    document.getElementById('kpi-unrealized-pnl').textContent = '—';
  }
}
function renderAllocationEditor() {
  if (allocationEditorDirty) return;
  const ownership = currentOwnership();
  const positions = brokerSnapshot.positions.filter((p) => p.assignable);
  document.getElementById('allocation-rows').innerHTML =
    positions
      .map(
        (p) =>
          `<tr><td>${viewEscape(p.symbol)}<span class="block text-xs text-[#a1a1a1]">${viewEscape(p.description)}</span></td><td>${p.longQuantity}</td>${PortfolioViews.PERSONAL.map((profile) => `<td><input class="kumo-input w-28 p-2" aria-label="${viewEscape(p.symbol)} ${viewLabel(profile)} shares" data-allocation-symbol="${viewEscape(p.symbol)}" data-allocation-profile="${profile}" type="number" min="0" max="${p.longQuantity}" step="0.00000001" value="${ownership.issues.includes(p.symbol) ? 0 : Number(ownership.allocations[p.symbol]?.[profile] || 0)}" required></td>`).join('')}<td>${ownership.unassigned[p.symbol] || 0}${ownership.issues.includes(p.symbol) ? ' · Review required' : ''}</td></tr>`
      )
      .join('') ||
    '<tr><td colspan="5">Sync Schwab before splitting shares. All existing eligible shares will initially belong to the primary view.</td></tr>';
  document.getElementById('btn-save-allocations').disabled = !positions.length || !viewsReady;
}
async function syncSharedPortfolio() {
  await viewWriteQueue;
  const connection = await refreshSchwabStatus();
  if (!connection.connected) {
    document.getElementById('modal-auth').classList.remove('hidden');
    showToast('Connect Charles Schwab to sync positions.');
    return;
  }
  const response = await stockFetch('/api/schwab-trade');
  const data = await safeReadJson(response, 'Schwab portfolio');
  if (!response.ok || !data.ok) throw new Error(data.error || 'Could not sync Schwab.');
  brokerSnapshot = data.snapshot;
  state.dayTradeLocks = data.dayTradeLocks;
  if (!pendingViewWrites && data.views?.document) {
    sharedViews = data.views.document;
    sharedRevision = data.views.revision;
  }
  brokerSnapshot.positions
    .filter((p) => p.assignable)
    .forEach((p) => {
      state.quotes[p.symbol] = {
        ...state.quotes[p.symbol],
        activePrice: p.marketValue / p.longQuantity,
      };
    });
  applyActiveView();
  saveState();
  renderAll();
  showToast('Synced the shared Schwab portfolio');
}
function initSharedViewEvents() {
  document
    .getElementById('portfolio-view-select')
    .addEventListener('change', (e) => selectPortfolioView(e.target.value));
  document.getElementById('btn-reload-views').addEventListener('click', initializeSharedViews);
  document
    .getElementById('btn-sync-account')
    .addEventListener('click', () => syncSharedPortfolio().catch((e) => showToast(e.message)));
  document.getElementById('form-share-allocations').addEventListener('input', (event) => {
    allocationEditorDirty = true;
    const row = event.target.closest('tr');
    if (!row) return;
    const inputs = [...row.querySelectorAll('input')];
    const remainder = PortfolioViews.round(
      Number(row.cells[1].textContent) - inputs.reduce((sum, input) => sum + Number(input.value), 0)
    );
    row.cells[4].textContent = remainder;
    inputs.forEach((input) =>
      input.setCustomValidity(
        remainder < -1e-8 ? 'Combined shares cannot exceed the Schwab total.' : ''
      )
    );
  });
  document.getElementById('form-share-allocations').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = document.getElementById('btn-save-allocations');
    button.disabled = true;
    try {
      await viewWriteQueue;
      if (viewWriteError) throw new Error('Reload shared views before changing allocations.');
      const allocations = {};
      document.querySelectorAll('[data-allocation-symbol]').forEach((input) => {
        (allocations[input.dataset.allocationSymbol] ||= { primary: 0, partner: 0 })[
          input.dataset.allocationProfile
        ] = Number(input.value);
      });
      const data = await viewRequest({ action: 'assign', allocations, revision: sharedRevision });
      sharedViews = data.document;
      sharedRevision = data.revision;
      allocationEditorDirty = false;
      await syncSharedPortfolio();
      showToast('Saved share split');
    } catch (error) {
      setViewStatus(error.message, true);
      showToast(error.message);
    } finally {
      button.disabled = false;
    }
  });
}
