// Customer Management Screen with multiple views and grouping

class CustomersScreen {
  constructor() {
    this.customers = [];
    this.filteredCustomers = [];
    this.selectedCustomers = new Set();
    this.currentView = localStorage.getItem('customerView') || 'grid';
    this.currentGrouping = localStorage.getItem('customerGrouping') || 'all';
    this.searchTerm = '';
    this.countrySettings = null;
    this.sortField = 'last_name';
    this.sortDirection = 'asc';
    this.filters = {
      customerStatus: [],
      clubMemberStatus: [],
      allocationStatus: [],
      minLTV: null,
      maxLTV: null,
      minOrders: null,
      maxOrders: null,
      lastOrderDays: null,
    };
  }

  async init() {
    console.log('Initializing Customers Screen...');
    await this.loadCountrySettings();
    await this.loadCustomers();
    this.render();
    this.attachEventListeners();
  }

  async loadCountrySettings() {
    console.log('Loading country settings...');
    try {
      const response = await fetch('/.netlify/functions/get-country-settings');
      console.log('Country settings response:', response.status);
      const data = await response.json();
      console.log('Country settings data:', data);
      if (data.success) {
        this.countrySettings = data.settings;
        console.log('Loaded country settings:', this.countrySettings);
      }
    } catch (error) {
      console.error('Failed to load country settings:', error);
    }
  }

  async loadCustomers() {
    console.log('Loading customers...');
    try {
      const response = await fetch('/.netlify/functions/get-customers?limit=1000');
      console.log('Customers response status:', response.status);
      const data = await response.json();
      console.log('Customers data:', data);
      if (data.success) {
        this.customers = data.customers;
        console.log(`Loaded ${this.customers.length} customers`);
        this.applyFilters();
      } else {
        console.error('API returned success: false', data);
        alert('Failed to load customers: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
      alert('Failed to load customers. Please try again.');
    }
  }

  applyFilters() {
    console.log('Applying filters...');
    let filtered = [...this.customers];

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          (c.first_name && c.first_name.toLowerCase().includes(term)) ||
          (c.last_name && c.last_name.toLowerCase().includes(term)) ||
          (c.email && c.email.toLowerCase().includes(term)) ||
          (c.phone && c.phone.includes(term)) ||
          (c.customer_code && c.customer_code.toLowerCase().includes(term))
      );
    }

    // Apply grouping filter
    switch (this.currentGrouping) {
      case 'vip':
        filtered = filtered.filter((c) => c.customer_status === 'vip');
        break;
      case 'club_members':
        filtered = filtered.filter((c) => c.club_member_status === 'active');
        break;
      case 'allocation':
        filtered = filtered.filter((c) => c.allocation_list_status === 'active');
        break;
      case 'at_risk':
        filtered = filtered.filter((c) => c.customer_status === 'at_risk');
        break;
      case 'inactive':
        filtered = filtered.filter((c) => c.customer_status === 'inactive');
        break;
      case 'high_ltv':
        filtered = filtered.filter((c) => c.lifetime_value_cents > 100000);
        break;
      case 'recent':
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filtered = filtered.filter((c) => new Date(c.created_at) > thirtyDaysAgo);
        break;
      case 'all':
      default:
        break;
    }

    // Apply advanced filters
    if (this.filters.customerStatus.length > 0) {
      filtered = filtered.filter((c) => this.filters.customerStatus.includes(c.customer_status));
    }
    if (this.filters.clubMemberStatus.length > 0) {
      filtered = filtered.filter((c) =>
        this.filters.clubMemberStatus.includes(c.club_member_status)
      );
    }
    if (this.filters.allocationStatus.length > 0) {
      filtered = filtered.filter((c) =>
        this.filters.allocationStatus.includes(c.allocation_list_status)
      );
    }
    if (this.filters.minLTV !== null) {
      filtered = filtered.filter((c) => c.lifetime_value_cents >= this.filters.minLTV * 100);
    }
    if (this.filters.maxLTV !== null) {
      filtered = filtered.filter((c) => c.lifetime_value_cents <= this.filters.maxLTV * 100);
    }
    if (this.filters.minOrders !== null) {
      filtered = filtered.filter((c) => c.order_count >= this.filters.minOrders);
    }
    if (this.filters.maxOrders !== null) {
      filtered = filtered.filter((c) => c.order_count <= this.filters.maxOrders);
    }
    if (this.filters.lastOrderDays !== null) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - this.filters.lastOrderDays);
      filtered = filtered.filter(
        (c) => c.last_order_date && new Date(c.last_order_date) >= daysAgo
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal = a[this.sortField];
      let bVal = b[this.sortField];

      // Handle null values
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      // Handle different data types
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.filteredCustomers = filtered;
    console.log(`Filtered to ${this.filteredCustomers.length} customers`);
  }

  render() {
    console.log('Rendering customers screen...');
    const container = document.getElementById('customersScreen');
    if (!container) {
      console.error('Container element #customersScreen not found!');
      return;
    }

    const activeFilterCount = this.getActiveFilterCount();

    const html = `
      <div class="customers-screen">
        <div class="customers-header">
          <h1>Customers</h1>
          <div class="header-actions">
            <button class="btn-secondary" onclick="customersScreen.importCustomers()">
              Import Customers
            </button>
            <button class="btn-primary" onclick="customersScreen.addCustomer()">
              Add Customer
            </button>
          </div>
        </div>

        <div class="customers-toolbar">
          <div class="search-box">
            <input 
              type="text" 
              id="customer-search" 
              placeholder="Search by name, email, phone, or customer code..." 
              value="${this.searchTerm}"
            />
          </div>

          <div class="grouping-selector">
            <label>Group by:</label>
            <select id="customer-grouping">
              <option value="all" ${this.currentGrouping === 'all' ? 'selected' : ''}>All Customers</option>
              <option value="vip" ${this.currentGrouping === 'vip' ? 'selected' : ''}>VIP Customers</option>
              <option value="club_members" ${this.currentGrouping === 'club_members' ? 'selected' : ''}>Wine Club Members</option>
              <option value="allocation" ${this.currentGrouping === 'allocation' ? 'selected' : ''}>Allocation List</option>
              <option value="high_ltv" ${this.currentGrouping === 'high_ltv' ? 'selected' : ''}>High LTV ($1,000+)</option>
              <option value="recent" ${this.currentGrouping === 'recent' ? 'selected' : ''}>Recent (30 days)</option>
              <option value="at_risk" ${this.currentGrouping === 'at_risk' ? 'selected' : ''}>At Risk</option>
              <option value="inactive" ${this.currentGrouping === 'inactive' ? 'selected' : ''}>Inactive</option>
            </select>
          </div>

          <button class="btn-filter" id="filter-btn" onclick="customersScreen.openFilterModal()">
            <span class="filter-icon">⚙</span> Filter
            ${activeFilterCount > 0 ? `<span class="filter-badge">${activeFilterCount}</span>` : ''}
          </button>

          <div class="view-toggle">
            <button 
              class="view-btn ${this.currentView === 'grid' ? 'active' : ''}" 
              onclick="customersScreen.setView('grid')"
              title="Grid View"
            >
              ⊞
            </button>
            <button 
              class="view-btn ${this.currentView === 'list' ? 'active' : ''}" 
              onclick="customersScreen.setView('list')"
              title="List View"
            >
              ☰
            </button>
          </div>
        </div>

        ${this.selectedCustomers.size > 0 ? this.renderBulkActions() : ''}

        <div class="customers-stats">
          <span>Showing ${this.filteredCustomers.length} of ${this.customers.length} customers</span>
          ${this.selectedCustomers.size > 0 ? `<span class="selected-count">${this.selectedCustomers.size} selected</span>` : ''}
        </div>

        <div class="customers-container ${this.currentView}">
          ${this.currentView === 'grid' ? this.renderGridView() : this.renderListView()}
        </div>
      </div>

      ${this.renderFilterModal()}
    `;

    container.innerHTML = html;
    console.log('Render complete');
  }

  getActiveFilterCount() {
    let count = 0;
    if (this.filters.customerStatus.length > 0) count++;
    if (this.filters.clubMemberStatus.length > 0) count++;
    if (this.filters.allocationStatus.length > 0) count++;
    if (this.filters.minLTV !== null) count++;
    if (this.filters.maxLTV !== null) count++;
    if (this.filters.minOrders !== null) count++;
    if (this.filters.maxOrders !== null) count++;
    if (this.filters.lastOrderDays !== null) count++;
    return count;
  }

  renderFilterModal() {
    return `
      <div id="filter-modal" class="modal" style="display: none;">
        <div class="modal-content filter-modal-content">
          <div class="modal-header">
            <h2>Filters</h2>
            <button class="modal-close" onclick="customersScreen.closeFilterModal()">×</button>
          </div>
          
          <div class="modal-body">
            <div class="filter-section">
              <h3>Customer Status</h3>
              <label><input type="checkbox" value="active" ${this.filters.customerStatus.includes('active') ? 'checked' : ''}> Active</label>
              <label><input type="checkbox" value="vip" ${this.filters.customerStatus.includes('vip') ? 'checked' : ''}> VIP</label>
              <label><input type="checkbox" value="at_risk" ${this.filters.customerStatus.includes('at_risk') ? 'checked' : ''}> At Risk</label>
              <label><input type="checkbox" value="inactive" ${this.filters.customerStatus.includes('inactive') ? 'checked' : ''}> Inactive</label>
            </div>

            <div class="filter-section">
              <h3>Club Membership</h3>
              <label><input type="checkbox" value="active" ${this.filters.clubMemberStatus.includes('active') ? 'checked' : ''}> Active Member</label>
              <label><input type="checkbox" value="paused" ${this.filters.clubMemberStatus.includes('paused') ? 'checked' : ''}> Paused</label>
              <label><input type="checkbox" value="cancelled" ${this.filters.clubMemberStatus.includes('cancelled') ? 'checked' : ''}> Cancelled</label>
              <label><input type="checkbox" value="none" ${this.filters.clubMemberStatus.includes('none') ? 'checked' : ''}> Not a Member</label>
            </div>

            <div class="filter-section">
              <h3>Allocation List</h3>
              <label><input type="checkbox" value="active" ${this.filters.allocationStatus.includes('active') ? 'checked' : ''}> Active</label>
              <label><input type="checkbox" value="waitlist" ${this.filters.allocationStatus.includes('waitlist') ? 'checked' : ''}> Waitlist</label>
              <label><input type="checkbox" value="none" ${this.filters.allocationStatus.includes('none') ? 'checked' : ''}> Not on List</label>
            </div>

            <div class="filter-section">
              <h3>Lifetime Value (LTV)</h3>
              <div class="filter-range">
                <input type="number" id="filter-min-ltv" placeholder="Min $" value="${this.filters.minLTV || ''}" />
                <span>to</span>
                <input type="number" id="filter-max-ltv" placeholder="Max $" value="${this.filters.maxLTV || ''}" />
              </div>
            </div>

            <div class="filter-section">
              <h3>Order Count</h3>
              <div class="filter-range">
                <input type="number" id="filter-min-orders" placeholder="Min" value="${this.filters.minOrders || ''}" />
                <span>to</span>
                <input type="number" id="filter-max-orders" placeholder="Max" value="${this.filters.maxOrders || ''}" />
              </div>
            </div>

            <div class="filter-section">
              <h3>Last Order</h3>
              <select id="filter-last-order">
                <option value="">Any time</option>
                <option value="7" ${this.filters.lastOrderDays === 7 ? 'selected' : ''}>Last 7 days</option>
                <option value="30" ${this.filters.lastOrderDays === 30 ? 'selected' : ''}>Last 30 days</option>
                <option value="90" ${this.filters.lastOrderDays === 90 ? 'selected' : ''}>Last 90 days</option>
                <option value="365" ${this.filters.lastOrderDays === 365 ? 'selected' : ''}>Last year</option>
              </select>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" onclick="customersScreen.resetFilters()">Reset Filters</button>
            <button class="btn-primary" onclick="customersScreen.applyFiltersFromModal()">Apply Changes</button>
          </div>
        </div>
      </div>
    `;
  }

  openFilterModal() {
    const modal = document.getElementById('filter-modal');
    if (modal) modal.style.display = 'flex';
  }

  closeFilterModal() {
    const modal = document.getElementById('filter-modal');
    if (modal) modal.style.display = 'none';
  }

  resetFilters() {
    this.filters = {
      customerStatus: [],
      clubMemberStatus: [],
      allocationStatus: [],
      minLTV: null,
      maxLTV: null,
      minOrders: null,
      maxOrders: null,
      lastOrderDays: null,
    };
    this.applyFilters();
    this.closeFilterModal();
    this.render();
    this.attachEventListeners();
  }

  applyFiltersFromModal() {
    // Customer status
    this.filters.customerStatus = Array.from(
      document.querySelectorAll('.filter-section:nth-of-type(1) input[type="checkbox"]:checked')
    ).map((cb) => cb.value);

    // Club membership
    this.filters.clubMemberStatus = Array.from(
      document.querySelectorAll('.filter-section:nth-of-type(2) input[type="checkbox"]:checked')
    ).map((cb) => cb.value);

    // Allocation status
    this.filters.allocationStatus = Array.from(
      document.querySelectorAll('.filter-section:nth-of-type(3) input[type="checkbox"]:checked')
    ).map((cb) => cb.value);

    // LTV range
    const minLTV = document.getElementById('filter-min-ltv').value;
    const maxLTV = document.getElementById('filter-max-ltv').value;
    this.filters.minLTV = minLTV ? parseFloat(minLTV) : null;
    this.filters.maxLTV = maxLTV ? parseFloat(maxLTV) : null;

    // Order count range
    const minOrders = document.getElementById('filter-min-orders').value;
    const maxOrders = document.getElementById('filter-max-orders').value;
    this.filters.minOrders = minOrders ? parseInt(minOrders) : null;
    this.filters.maxOrders = maxOrders ? parseInt(maxOrders) : null;

    // Last order
    const lastOrder = document.getElementById('filter-last-order').value;
    this.filters.lastOrderDays = lastOrder ? parseInt(lastOrder) : null;

    this.applyFilters();
    this.closeFilterModal();
    this.render();
    this.attachEventListeners();
  }

  renderBulkActions() {
    return `
      <div class="bulk-actions">
        <button class="btn-bulk" onclick="customersScreen.sendBulkSMS()">
          📱 Send SMS
        </button>
        <button class="btn-bulk" onclick="customersScreen.sendBulkEmail()">
          ✉️ Send Email
        </button>
        <button class="btn-bulk" onclick="customersScreen.exportSelected()">
          📥 Export
        </button>
        <button class="btn-bulk" onclick="customersScreen.addTags()">
          🏷️ Add Tags
        </button>
        <button class="btn-bulk btn-danger" onclick="customersScreen.bulkDelete()">
          🗑️ Delete
        </button>
      </div>
    `;
  }

  renderGridView() {
    if (this.filteredCustomers.length === 0) {
      return '<div class="no-customers">No customers found</div>';
    }

    return this.filteredCustomers
      .map(
        (customer) => `
      <div class="customer-card" onclick="customersScreen.viewCustomer('${customer.id}')">
        <div class="card-select" onclick="event.stopPropagation()">
          <input 
            type="checkbox" 
            ${this.selectedCustomers.has(customer.id) ? 'checked' : ''}
            onchange="customersScreen.toggleSelection('${customer.id}')"
          />
        </div>
        <div class="customer-info">
          <div class="customer-name">${this.getFullName(customer)}</div>
          <div class="customer-email">${customer.email}</div>
          ${customer.phone ? `<div class="customer-phone">${customer.phone}</div>` : ''}
        </div>
        <div class="customer-stats">
          ${customer.order_count > 0 ? `<div class="stat-item"><strong>${customer.order_count}</strong> Orders</div>` : '<div class="stat-item">0 Orders</div>'}
          <div class="stat-item">LTV: ${this.formatCurrency(customer.lifetime_value_cents, customer.currency_code)}</div>
          ${customer.last_order_date ? `<div class="stat-item">Last Order: ${this.formatDate(customer.last_order_date)}</div>` : ''}
        </div>
        <div class="customer-badges">
          ${customer.customer_status === 'vip' ? '<span class="badge badge-vip">VIP</span>' : ''}
          ${customer.club_member_status === 'active' ? '<span class="badge badge-club">Club Member</span>' : ''}
          ${customer.allocation_list_status === 'active' ? '<span class="badge badge-allocation">Allocation</span>' : ''}
        </div>
        <div class="customer-actions">
          <button class="btn-icon" onclick="event.stopPropagation(); customersScreen.createOrder('${customer.id}')" title="Create Order">
            🛒
          </button>
          <button class="btn-icon" onclick="event.stopPropagation(); customersScreen.editCustomer('${customer.id}')" title="Edit">
            ✏️
          </button>
        </div>
      </div>
    `
      )
      .join('');
  }

  renderListView() {
    if (this.filteredCustomers.length === 0) {
      return '<div class="no-customers">No customers found</div>';
    }

    const getSortIndicator = (field) => {
      if (this.sortField !== field) return '';
      return this.sortDirection === 'asc' ? ' ▲' : ' ▼';
    };

    return `
      <table class="customers-table">
        <thead>
          <tr>
            <th width="40">
              <input 
                type="checkbox" 
                onchange="customersScreen.toggleSelectAll(this.checked)"
              />
            </th>
            <th class="sortable" onclick="customersScreen.sortBy('last_name')">
              Customer${getSortIndicator('last_name')}
            </th>
            <th class="sortable" onclick="customersScreen.sortBy('email')">
              Email${getSortIndicator('email')}
            </th>
            <th class="sortable" onclick="customersScreen.sortBy('phone')">
              Phone${getSortIndicator('phone')}
            </th>
            <th class="sortable" onclick="customersScreen.sortBy('city')">
              Location${getSortIndicator('city')}
            </th>
            <th class="sortable" onclick="customersScreen.sortBy('order_count')">
              Orders${getSortIndicator('order_count')}
            </th>
            <th class="sortable" onclick="customersScreen.sortBy('lifetime_value_cents')">
              LTV${getSortIndicator('lifetime_value_cents')}
            </th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${this.filteredCustomers
            .map(
              (customer) => `
            <tr onclick="customersScreen.viewCustomer('${customer.id}')">
              <td onclick="event.stopPropagation()">
                <input 
                  type="checkbox" 
                  ${this.selectedCustomers.has(customer.id) ? 'checked' : ''}
                  onchange="customersScreen.toggleSelection('${customer.id}')"
                />
              </td>
              <td>
                <div class="customer-name-cell">
                  ${this.getFullName(customer)}
                </div>
              </td>
              <td>${customer.email}</td>
              <td>${customer.phone || '-'}</td>
              <td>${customer.city ? `${customer.city}, ${customer.state_code || customer.province || ''}` : '-'}</td>
              <td>${customer.order_count || 0}</td>
              <td>${this.formatCurrency(customer.lifetime_value_cents, customer.currency_code)}</td>
              <td>
                ${customer.customer_status === 'vip' ? '<span class="badge badge-vip">VIP</span>' : ''}
                ${customer.club_member_status === 'active' ? '<span class="badge badge-club">Club</span>' : ''}
              </td>
              <td onclick="event.stopPropagation()">
                <button class="btn-icon" onclick="customersScreen.createOrder('${customer.id}')" title="Create Order">🛒</button>
                <button class="btn-icon" onclick="customersScreen.editCustomer('${customer.id}')" title="Edit">✏️</button>
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  sortBy(field) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
    this.render();
    this.attachEventListeners();
  }

  attachEventListeners() {
    console.log('Attaching event listeners...');

    // FIXED: Store reference to search input and only attach listener once
    const searchInput = document.getElementById('customer-search');
    if (searchInput && !searchInput.dataset.listenerAttached) {
      searchInput.dataset.listenerAttached = 'true';
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value;
        this.applyFilters();
        this.renderWithoutReattaching();
      });
    }

    const groupingSelect = document.getElementById('customer-grouping');
    if (groupingSelect && !groupingSelect.dataset.listenerAttached) {
      groupingSelect.dataset.listenerAttached = 'true';
      groupingSelect.addEventListener('change', (e) => {
        this.currentGrouping = e.target.value;
        localStorage.setItem('customerGrouping', this.currentGrouping);
        this.applyFilters();
        this.render();
        this.attachEventListeners();
      });
    }
  }

  // Render without re-attaching event listeners (for search input)
  renderWithoutReattaching() {
    const container = document.getElementById('customersScreen');
    if (!container) return;

    const activeFilterCount = this.getActiveFilterCount();

    // Update stats
    const statsEl = container.querySelector('.customers-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <span>Showing ${this.filteredCustomers.length} of ${this.customers.length} customers</span>
        ${this.selectedCustomers.size > 0 ? `<span class="selected-count">${this.selectedCustomers.size} selected</span>` : ''}
      `;
    }

    // Update filter badge
    const filterBtn = container.querySelector('#filter-btn');
    if (filterBtn) {
      filterBtn.innerHTML = `
        <span class="filter-icon">⚙</span> Filter
        ${activeFilterCount > 0 ? `<span class="filter-badge">${activeFilterCount}</span>` : ''}
      `;
    }

    // Update customer list
    const customersContainer = container.querySelector('.customers-container');
    if (customersContainer) {
      customersContainer.innerHTML =
        this.currentView === 'grid' ? this.renderGridView() : this.renderListView();
    }

    // Update bulk actions
    const bulkActionsContainer = container.querySelector('.bulk-actions');
    if (this.selectedCustomers.size > 0 && !bulkActionsContainer) {
      const toolbar = container.querySelector('.customers-toolbar');
      toolbar.insertAdjacentHTML('afterend', this.renderBulkActions());
    } else if (this.selectedCustomers.size === 0 && bulkActionsContainer) {
      bulkActionsContainer.remove();
    }
  }

  setView(view) {
    this.currentView = view;
    localStorage.setItem('customerView', view);
    this.render();
    this.attachEventListeners();
  }

  toggleSelection(customerId) {
    if (this.selectedCustomers.has(customerId)) {
      this.selectedCustomers.delete(customerId);
    } else {
      this.selectedCustomers.add(customerId);
    }
    this.render();
    this.attachEventListeners();
  }

  toggleSelectAll(checked) {
    if (checked) {
      this.filteredCustomers.forEach((c) => this.selectedCustomers.add(c.id));
    } else {
      this.selectedCustomers.clear();
    }
    this.render();
    this.attachEventListeners();
  }

  getFullName(customer) {
    if (customer.first_name || customer.last_name) {
      return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    }
    return customer.email;
  }

  formatCurrency(cents, currencyCode = 'USD') {
    const amount = cents / 100;
    const currency = currencyCode || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Action methods
  addCustomer() {
    alert('Add Customer modal - to be implemented');
  }

  importCustomers() {
    alert('Import Customers - to be implemented');
  }

  viewCustomer(customerId) {
    alert(`View customer ${customerId} - to be implemented`);
  }

  editCustomer(customerId) {
    alert(`Edit customer ${customerId} - to be implemented`);
  }

  createOrder(customerId) {
    alert(`Create order for customer ${customerId} - to be implemented`);
  }

  sendBulkSMS() {
    alert(`Send SMS to ${this.selectedCustomers.size} customers - to be implemented`);
  }

  sendBulkEmail() {
    alert(`Send Email to ${this.selectedCustomers.size} customers - to be implemented`);
  }

  exportSelected() {
    alert(`Export ${this.selectedCustomers.size} customers - to be implemented`);
  }

  addTags() {
    alert(`Add tags to ${this.selectedCustomers.size} customers - to be implemented`);
  }

  bulkDelete() {
    if (confirm(`Delete ${this.selectedCustomers.size} customers? This cannot be undone.`)) {
      alert('Bulk delete - to be implemented');
    }
  }
}

// Global instance
let customersScreen = new CustomersScreen();
