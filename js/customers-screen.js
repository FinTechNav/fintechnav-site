// Customer Management Screen with Map Integration

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
    this.showMap = false;
    this.map = null;
    this.markers = [];
    this.drawingManager = null;
    this.currentPolygon = null;
    this.isDrawingMode = false;
    this.polygonFilter = null;
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
      const data = await response.json();
      if (data.success) {
        this.countrySettings = data.settings;
      }
    } catch (error) {
      console.error('Failed to load country settings:', error);
    }
  }

  async loadCustomers() {
    console.log('Loading customers...');
    try {
      const response = await fetch('/.netlify/functions/get-customers?limit=1000');
      const data = await response.json();
      if (data.success) {
        this.customers = data.customers;
        console.log(`Loaded ${this.customers.length} customers`);
        this.applyFilters();
      } else {
        alert('Failed to load customers: ' + (data.error || 'Unknown error'));
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
        filtered = filtered.filter((c) => (c.lifetime_value_cents || 0) >= 100000);
        break;
      case 'recent':
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filtered = filtered.filter(
          (c) => c.last_order_date && new Date(c.last_order_date) >= thirtyDaysAgo
        );
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
      filtered = filtered.filter((c) => (c.lifetime_value_cents || 0) >= this.filters.minLTV * 100);
    }
    if (this.filters.maxLTV !== null) {
      filtered = filtered.filter((c) => (c.lifetime_value_cents || 0) <= this.filters.maxLTV * 100);
    }
    if (this.filters.minOrders !== null) {
      filtered = filtered.filter((c) => (c.order_count || 0) >= this.filters.minOrders);
    }
    if (this.filters.maxOrders !== null) {
      filtered = filtered.filter((c) => (c.order_count || 0) <= this.filters.maxOrders);
    }
    if (this.filters.lastOrderDays !== null) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - this.filters.lastOrderDays);
      filtered = filtered.filter(
        (c) => c.last_order_date && new Date(c.last_order_date) >= daysAgo
      );
    }

    // Apply polygon filter if exists
    if (this.polygonFilter) {
      filtered = filtered.filter(this.polygonFilter);
    }

    this.filteredCustomers = this.sortCustomers(filtered);
  }

  sortBy(field) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.filteredCustomers = this.sortCustomers(this.filteredCustomers);
    this.render();
    this.attachEventListeners();
    if (this.showMap) {
      this.initializeMap();
    }
  }

  sortCustomers(customers) {
    return [...customers].sort((a, b) => {
      let aVal = a[this.sortField];
      let bVal = b[this.sortField];

      // Handle null/undefined values
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      // Convert to lowercase for string comparison
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      if (aVal > bVal) comparison = 1;

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  render() {
    const container = document.getElementById('customersScreen');
    if (!container) return;

    const activeFilterCount = this.getActiveFilterCount();

    const html = `
      <div class="customers-screen">
        <div class="customers-header">
          <h1>Customers</h1>
          <p>Manage your customer relationships and sales data</p>
          <div class="header-actions">
            <button class="btn-primary" onclick="customersScreen.createCustomer()">+ Add Customer</button>
            <button class="btn-secondary" onclick="customersScreen.exportCustomers()">Export</button>
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

          <button class="btn-map ${this.showMap ? 'active' : ''}" onclick="customersScreen.toggleMap()" title="Map View">
            <span class="map-icon">📍</span>
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

        ${
          this.showMap
            ? `
        <div class="split-view-container">
          <div class="customers-panel">
            <div class="customers-container ${this.currentView}">
              ${this.currentView === 'grid' ? this.renderGridView() : this.renderListView()}
            </div>
          </div>
          <div class="map-panel">
            ${this.renderMapView()}
          </div>
        </div>
        `
            : `
        <div class="customers-container ${this.currentView}">
          ${this.currentView === 'grid' ? this.renderGridView() : this.renderListView()}
        </div>
        `
        }
      </div>

      ${this.renderFilterModal()}
    `;

    container.innerHTML = html;

    if (this.showMap) {
      setTimeout(() => this.initializeMap(), 100);
    }
  }

  renderMapView() {
    return `
      <div class="map-container">
        <div class="map-controls">
          <button class="btn-map-control ${this.isDrawingMode ? 'active' : ''}" onclick="customersScreen.toggleDrawingMode()" title="Draw boundary">
            <span class="draw-icon">✏️</span> Draw Area
          </button>
          ${
            this.currentPolygon || this.polygonFilter
              ? `
            <button class="btn-map-control btn-remove" onclick="customersScreen.removePolygon()" title="Remove boundary">
              <span>🗑️</span> Remove Outline
            </button>
            ${
              this.polygonFilter
                ? `
              <div class="map-filter-count">
                ${this.filteredCustomers.length} customers in area
              </div>
            `
                : ''
            }
          `
              : ''
          }
        </div>
        <div id="customer-map"></div>
      </div>
    `;
  }

  toggleMap() {
    this.showMap = !this.showMap;
    this.render();
    this.attachEventListeners();
  }

  initializeMap() {
    if (!window.google) {
      console.error('Google Maps API not loaded');
      return;
    }

    const mapElement = document.getElementById('customer-map');
    if (!mapElement) return;

    // Calculate center based on geocoded customers
    const geocodedCustomers = this.getGeocodedCustomers();

    if (geocodedCustomers.length === 0) {
      // Default to Atlanta
      const center = { lat: 33.749, lng: -84.388 };
      this.map = new google.maps.Map(mapElement, {
        zoom: 4,
        center: center,
        styles: this.getMapStyles(),
      });
      this.initializeDrawingTools();
      return;
    }

    // Calculate bounds
    const bounds = new google.maps.LatLngBounds();
    geocodedCustomers.forEach((customer) => {
      bounds.extend(
        new google.maps.LatLng(parseFloat(customer.latitude), parseFloat(customer.longitude))
      );
    });

    this.map = new google.maps.Map(mapElement, {
      zoom: 4,
      center: bounds.getCenter(),
      styles: this.getMapStyles(),
    });

    this.map.fitBounds(bounds);

    // Initialize drawing tools
    this.initializeDrawingTools();

    // Add markers for each customer
    this.updateMarkers();
  }

  getGeocodedCustomers() {
    return this.filteredCustomers.filter((c) => c.latitude && c.longitude);
  }

  initializeDrawingTools() {
    // Initialize Drawing Manager
    this.drawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: false,
      polygonOptions: {
        fillColor: '#f39c12',
        fillOpacity: 0.2,
        strokeWeight: 2,
        strokeColor: '#f39c12',
        clickable: true,
        editable: true,
        zIndex: 1,
      },
    });

    this.drawingManager.setMap(this.map);

    // Listen for polygon complete
    google.maps.event.addListener(this.drawingManager, 'polygoncomplete', (polygon) => {
      // Remove previous polygon if exists
      if (this.currentPolygon) {
        this.currentPolygon.setMap(null);
      }

      this.currentPolygon = polygon;
      this.isDrawingMode = false;
      this.drawingManager.setDrawingMode(null);

      // Apply polygon filter
      this.applyPolygonFilter();

      // Re-render to update UI
      this.render();
      this.attachEventListeners();

      // Add listener for polygon edits
      google.maps.event.addListener(polygon.getPath(), 'set_at', () => {
        this.applyPolygonFilter();
        this.updateMarkers();
      });

      google.maps.event.addListener(polygon.getPath(), 'insert_at', () => {
        this.applyPolygonFilter();
        this.updateMarkers();
      });
    });
  }

  toggleDrawingMode() {
    this.isDrawingMode = !this.isDrawingMode;

    if (this.isDrawingMode) {
      this.drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
    } else {
      this.drawingManager.setDrawingMode(null);
    }

    this.render();
    this.attachEventListeners();
  }

  removePolygon() {
    if (this.currentPolygon) {
      this.currentPolygon.setMap(null);
      this.currentPolygon = null;
    }

    this.polygonFilter = null;
    this.isDrawingMode = false;
    this.drawingManager.setDrawingMode(null);

    // Re-apply filters without polygon
    this.applyFilters();
    this.render();
    this.attachEventListeners();
  }

  applyPolygonFilter() {
    if (!this.currentPolygon) {
      this.polygonFilter = null;
      return;
    }

    const polygonPath = this.currentPolygon.getPath();

    // Store the polygon filter
    this.polygonFilter = (customer) => {
      if (!customer.latitude || !customer.longitude) return false;

      const point = new google.maps.LatLng(
        parseFloat(customer.latitude),
        parseFloat(customer.longitude)
      );

      return google.maps.geometry.poly.containsLocation(point, this.currentPolygon);
    };

    // Re-apply all filters including polygon
    this.applyFilters();
    this.updateMarkers();
  }

  updateMarkers() {
    // Clear existing markers
    this.markers.forEach((marker) => marker.setMap(null));
    this.markers = [];

    const geocodedCustomers = this.getGeocodedCustomers();

    // Add markers for filtered customers
    geocodedCustomers.forEach((customer) => {
      const marker = new google.maps.Marker({
        position: {
          lat: parseFloat(customer.latitude),
          lng: parseFloat(customer.longitude),
        },
        map: this.map,
        title: this.getFullName(customer),
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#f39c12',
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="color: #1a1a2e; padding: 10px; max-width: 200px;">
            <h3 style="margin: 0 0 8px 0; color: #f39c12; font-size: 16px;">${this.getFullName(customer)}</h3>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Email:</strong> ${customer.email}</p>
            ${customer.phone ? `<p style="margin: 4px 0; font-size: 13px;"><strong>Phone:</strong> ${customer.phone}</p>` : ''}
            <p style="margin: 4px 0; font-size: 13px;"><strong>Location:</strong> ${customer.city}, ${customer.state_code || customer.province}</p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Orders:</strong> ${customer.order_count || 0}</p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>LTV:</strong> ${this.formatCurrency(customer.lifetime_value_cents, customer.currency_code)}</p>
            <button onclick="customersScreen.viewCustomer('${customer.id}')" style="margin-top: 8px; padding: 6px 12px; background: #f39c12; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">View Details</button>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(this.map, marker);
      });

      this.markers.push(marker);
    });
  }

  getMapStyles() {
    return [
      {
        elementType: 'geometry',
        stylers: [{ color: '#1a1a2e' }],
      },
      {
        elementType: 'labels.text.fill',
        stylers: [{ color: '#8ec3b9' }],
      },
      {
        elementType: 'labels.text.stroke',
        stylers: [{ color: '#1a1a2e' }],
      },
      {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#16213e' }],
      },
    ];
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

  renderBulkActions() {
    return `
      <div class="bulk-actions">
        <button class="btn-bulk" onclick="customersScreen.bulkEmail()">📧 Email Selected</button>
        <button class="btn-bulk" onclick="customersScreen.bulkExport()">💾 Export Selected</button>
        <button class="btn-bulk" onclick="customersScreen.bulkAddToClub()">🍷 Add to Club</button>
        <button class="btn-bulk btn-danger" onclick="customersScreen.bulkDelete()">🗑️ Delete Selected</button>
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
        <div class="card-select">
          <input 
            type="checkbox" 
            ${this.selectedCustomers.has(customer.id) ? 'checked' : ''}
            onclick="event.stopPropagation(); customersScreen.toggleSelection('${customer.id}')"
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

    const getSortIcon = (field) => {
      if (this.sortField !== field) return '<span class="sort-arrows">⇅</span>';
      return this.sortDirection === 'asc'
        ? '<span class="sort-arrow-active">↑</span>'
        : '<span class="sort-arrow-active">↓</span>';
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
              Customer ${getSortIcon('last_name')}
            </th>
            <th class="sortable" onclick="customersScreen.sortBy('email')">
              Email ${getSortIcon('email')}
            </th>
            <th class="sortable" onclick="customersScreen.sortBy('phone')">
              Phone ${getSortIcon('phone')}
            </th>
            <th class="sortable" onclick="customersScreen.sortBy('city')">
              City ${getSortIcon('city')}
            </th>
            <th class="sortable" onclick="customersScreen.sortBy('state_code')">
              State ${getSortIcon('state_code')}
            </th>
            <th class="sortable" onclick="customersScreen.sortBy('order_count')">
              Orders ${getSortIcon('order_count')}
            </th>
            <th class="sortable" onclick="customersScreen.sortBy('lifetime_value_cents')">
              LTV ${getSortIcon('lifetime_value_cents')}
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
              <td>${customer.city || '-'}</td>
              <td>${customer.state_code || customer.province || '-'}</td>
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

  getFullName(customer) {
    const parts = [];
    if (customer.first_name) parts.push(customer.first_name);
    if (customer.last_name) parts.push(customer.last_name);
    return parts.length > 0 ? parts.join(' ') : customer.email;
  }

  formatCurrency(cents, currency = 'USD') {
    if (!cents && cents !== 0) return '$0.00';
    const amount = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  }

  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  openFilterModal() {
    const modal = document.getElementById('filter-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  closeFilterModal() {
    const modal = document.getElementById('filter-modal');
    if (modal) {
      modal.style.display = 'none';
    }
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
    this.render();
    this.attachEventListeners();
    this.closeFilterModal();
  }

  applyFiltersFromModal() {
    // Customer Status
    const statusCheckboxes = document.querySelectorAll(
      '#filter-modal .filter-section:nth-child(1) input[type="checkbox"]'
    );
    this.filters.customerStatus = Array.from(statusCheckboxes)
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);

    // Club Status
    const clubCheckboxes = document.querySelectorAll(
      '#filter-modal .filter-section:nth-child(2) input[type="checkbox"]'
    );
    this.filters.clubMemberStatus = Array.from(clubCheckboxes)
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);

    // Allocation Status
    const allocationCheckboxes = document.querySelectorAll(
      '#filter-modal .filter-section:nth-child(3) input[type="checkbox"]'
    );
    this.filters.allocationStatus = Array.from(allocationCheckboxes)
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);

    // LTV Range
    const minLTV = document.getElementById('filter-min-ltv').value;
    const maxLTV = document.getElementById('filter-max-ltv').value;
    this.filters.minLTV = minLTV ? parseFloat(minLTV) : null;
    this.filters.maxLTV = maxLTV ? parseFloat(maxLTV) : null;

    // Order Count Range
    const minOrders = document.getElementById('filter-min-orders').value;
    const maxOrders = document.getElementById('filter-max-orders').value;
    this.filters.minOrders = minOrders ? parseInt(minOrders) : null;
    this.filters.maxOrders = maxOrders ? parseInt(maxOrders) : null;

    // Last Order
    const lastOrder = document.getElementById('filter-last-order').value;
    this.filters.lastOrderDays = lastOrder ? parseInt(lastOrder) : null;

    this.applyFilters();
    this.render();
    this.attachEventListeners();
    this.closeFilterModal();
  }

  // Placeholder methods
  viewCustomer(id) {
    console.log('View customer:', id);
    alert('Customer details view not yet implemented');
  }

  createCustomer() {
    console.log('Create customer');
    alert('Create customer not yet implemented');
  }

  editCustomer(id) {
    console.log('Edit customer:', id);
    alert('Edit customer not yet implemented');
  }

  createOrder(id) {
    console.log('Create order for customer:', id);
    alert('Create order not yet implemented');
  }

  exportCustomers() {
    console.log('Export customers');
    alert('Export not yet implemented');
  }

  bulkEmail() {
    console.log('Bulk email:', this.selectedCustomers);
    alert(`Email ${this.selectedCustomers.size} customers - not yet implemented`);
  }

  bulkExport() {
    console.log('Bulk export:', this.selectedCustomers);
    alert(`Export ${this.selectedCustomers.size} customers - not yet implemented`);
  }

  bulkAddToClub() {
    console.log('Bulk add to club:', this.selectedCustomers);
    alert(`Add ${this.selectedCustomers.size} customers to club - not yet implemented`);
  }

  bulkDelete() {
    if (confirm(`Are you sure you want to delete ${this.selectedCustomers.size} customers?`)) {
      console.log('Bulk delete:', this.selectedCustomers);
      alert('Delete not yet implemented');
    }
  }
}

// Initialize
const customersScreen = new CustomersScreen();
