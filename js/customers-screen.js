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
  }

  async init() {
    console.log('Initializing Customers Screen...');
    await this.loadCountrySettings();
    await this.loadCustomers();
    this.render();
    this.attachEventListeners();
  }

  async loadCountrySettings() {
    try {
      const response = await fetch('/.netlify/functions/get-country-settings');
      const data = await response.json();
      if (data.success) {
        this.countrySettings = data.settings;
      }
    } catch (error) {
      console.error('Failed to load country settings:', error);
    }
  }

  async loadCustomers() {
    try {
      const response = await fetch('/.netlify/functions/get-customers?limit=1000');
      const data = await response.json();
      if (data.success) {
        this.customers = data.customers;
        this.applyFilters();
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
      alert('Failed to load customers. Please try again.');
    }
  }

  applyFilters() {
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

    this.filteredCustomers = filtered;
  }

  render() {
    const container = document.getElementById('screen-content');
    if (!container) return;

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
    `;

    container.innerHTML = html;
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
        <div class="customer-avatar">
          ${this.getInitials(customer)}
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
            <th>Customer</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Location</th>
            <th>Orders</th>
            <th>LTV</th>
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
                  <div class="avatar-small">${this.getInitials(customer)}</div>
                  <div>${this.getFullName(customer)}</div>
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

  attachEventListeners() {
    const searchInput = document.getElementById('customer-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value;
        this.applyFilters();
        this.render();
        this.attachEventListeners();
      });
    }

    const groupingSelect = document.getElementById('customer-grouping');
    if (groupingSelect) {
      groupingSelect.addEventListener('change', (e) => {
        this.currentGrouping = e.target.value;
        localStorage.setItem('customerGrouping', this.currentGrouping);
        this.applyFilters();
        this.render();
        this.attachEventListeners();
      });
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

  getInitials(customer) {
    const first = customer.first_name ? customer.first_name[0] : '';
    const last = customer.last_name ? customer.last_name[0] : '';
    return (first + last).toUpperCase() || customer.email[0].toUpperCase();
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
