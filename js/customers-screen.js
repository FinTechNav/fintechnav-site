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
    this.winery = null;
    this.sortField = 'last_name';
    this.sortDirection = 'asc';
    this.showMap = localStorage.getItem('showMap') === 'true';
    this.map = null;
    this.markers = [];
    this.drawingManager = null;
    this.currentPolygon = null;
    this.isDrawingMode = false;
    this.polygonFilter = null;
    this.eventListenersAttached = false;
    this.currentInfoWindow = null;
    this.loadingState = {
      customers: false,
      countrySettings: false,
    };
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

    this.loadingState.customers = true;
    this.loadingState.countrySettings = true;
    this.render();

    await this.loadWineryInfo();
    await this.loadCountrySettings();
    this.loadingState.countrySettings = false;
    this.render();

    await this.loadCustomers();
    this.loadingState.customers = false;
    this.render();

    this.attachEventListeners();

    // Handle window resize (e.g., when DevTools opens/closes)
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        // Force layout recalculation for flexbox containers
        const customersContainer = document.querySelector('.customers-container');
        if (customersContainer) {
          customersContainer.style.display = 'none';
          customersContainer.offsetHeight; // Force reflow
          customersContainer.style.display = '';
        }
      }, 250);
    });
  }

  async loadWineryInfo() {
    console.log('Loading winery information...');
    console.log('App object exists:', typeof App !== 'undefined');
    console.log(
      'App.currentWinery:',
      typeof App !== 'undefined' ? App.currentWinery : 'App not defined'
    );

    // Get winery_id from global App.currentWinery if available
    const wineryId = typeof App !== 'undefined' && App.currentWinery ? App.currentWinery.id : null;

    console.log('Extracted winery_id:', wineryId);

    if (!wineryId) {
      console.log('No winery selected yet, skipping winery info load');
      return;
    }

    try {
      const url = `/.netlify/functions/get-winery-info?winery_id=${wineryId}`;
      console.log('Fetching winery info from:', url);
      const response = await fetch(url);
      const data = await response.json();
      console.log('Winery API response:', data);
      if (data.success) {
        this.winery = data.winery;
        console.log('Winery info loaded:', this.winery);
      } else {
        console.log('No winery info found:', data.error);
      }
    } catch (error) {
      console.error('Failed to load winery info:', error);
    }
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
    console.log(`[${new Date().toISOString()}] === RENDER ===`);
    console.log(`[${new Date().toISOString()}] showMap:`, this.showMap);
    console.log(`[${new Date().toISOString()}] currentPolygon exists:`, !!this.currentPolygon);
    console.log(`[${new Date().toISOString()}] map instance exists:`, !!this.map);
    console.log(
      `[${new Date().toISOString()}] selectedCustomers.size:`,
      this.selectedCustomers.size
    );

    const container = document.getElementById('customersScreen');
    if (!container) return;

    // Show skeleton loading state
    if (this.loadingState.customers) {
      container.innerHTML = this.renderLoadingState();
      return;
    }

    // Check if map panel actually exists in DOM
    const mapPanelExists = !!document.querySelector('.map-panel');
    console.log(`[${new Date().toISOString()}] map panel exists in DOM:`, mapPanelExists);

    // If map is visible and already initialized AND map panel exists, just update the customer list
    if (this.showMap && this.map && mapPanelExists) {
      console.log(
        `[${new Date().toISOString()}] Map visible and initialized - updating customer list only`
      );

      // Update view toggle buttons
      document.querySelectorAll('.view-btn').forEach((btn) => {
        btn.classList.remove('active');
      });
      const activeViewBtn =
        this.currentView === 'grid'
          ? document.querySelector('.view-btn[onclick*="grid"]')
          : document.querySelector('.view-btn[onclick*="list"]');
      if (activeViewBtn) {
        activeViewBtn.classList.add('active');
      }

      const customersContainer = document.querySelector('.customers-container');
      if (customersContainer) {
        customersContainer.className = `customers-container ${this.currentView}`;
        customersContainer.innerHTML =
          this.currentView === 'grid' ? this.renderGridView() : this.renderListView();
      }

      // Update stats
      const statsContainer = document.querySelector('.customers-stats');
      if (statsContainer) {
        statsContainer.innerHTML = `
          <span>Showing ${this.filteredCustomers.length} of ${this.customers.length} customers</span>
          ${this.selectedCustomers.size > 0 ? `<span class="selected-count">${this.selectedCustomers.size} selected</span>` : ''}
        `;
      }

      // Update map controls (for polygon-dependent buttons)
      const mapControls = document.querySelector('.map-controls');
      if (mapControls) {
        mapControls.innerHTML = `
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
        `;
      }

      // Update bulk actions bar - remove old one first
      const existingBulkActions = document.querySelector('.bulk-actions-bar');
      console.log(
        `[${new Date().toISOString()}] Existing bulk actions bar found:`,
        !!existingBulkActions
      );
      console.log(
        `[${new Date().toISOString()}] Should show bulk actions:`,
        this.selectedCustomers.size > 0
      );

      if (existingBulkActions) {
        console.log(`[${new Date().toISOString()}] Removing existing bulk actions bar`);
        existingBulkActions.remove();
      }

      if (this.selectedCustomers.size > 0) {
        const statsContainer = document.querySelector('.customers-stats');
        if (statsContainer) {
          console.log(`[${new Date().toISOString()}] Adding new bulk actions bar after stats`);
          statsContainer.insertAdjacentHTML('afterend', this.renderBulkActions());
        }
      }

      // Update markers on map
      this.updateMarkers();
      return;
    }

    console.log(`[${new Date().toISOString()}] Full render - recreating entire HTML`);
    const activeFilterCount = this.getActiveFilterCount();

    const html = `
      <div class="customers-screen">
        <div class="customers-header">
          <h1>Customers</h1>
          <p>Manage your customer relationships and sales data</p>
        </div>

        <div class="customers-toolbar">
          <div class="search-box">
            <img src="https://pub-a8c2855e013441a598cf4513d23f6a8f.r2.dev/LightMode/LightMode-icons-15.svg" class="search-icon menu-icon-search" alt="Search">
            <input 
              type="text" 
              id="customer-search" 
              placeholder="Search customers..." 
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

          <button class="btn-filter ${activeFilterCount > 0 ? 'active' : ''}" id="filter-btn" onclick="customersScreen.openFilterModal()">
            <img src="https://pub-a8c2855e013441a598cf4513d23f6a8f.r2.dev/LightMode/LightMode-icons-33.svg" class="toolbar-icon menu-icon-filter" alt="Filter">
            Filter
            ${activeFilterCount > 0 ? `<span class="filter-badge">${activeFilterCount}</span>` : ''}
          </button>

          <button class="btn-map ${this.showMap ? 'active' : ''}" onclick="customersScreen.toggleMap()" title="Map View">
            <img src="https://pub-a8c2855e013441a598cf4513d23f6a8f.r2.dev/LightMode/LightMode-icons-30.svg" class="toolbar-icon menu-icon-map" alt="Map">
            Map
            ${this.polygonFilter ? '<span class="filter-badge">1</span>' : ''}
          </button>

          <div class="view-toggle">
            <button 
              class="view-btn ${this.currentView === 'grid' ? 'active' : ''}" 
              onclick="customersScreen.setView('grid')"
              title="Grid View"
            >
              <img src="https://pub-a8c2855e013441a598cf4513d23f6a8f.r2.dev/LightMode/LightMode-icons-32.svg" class="toolbar-icon menu-icon-tile" alt="Tile View">
            </button>
            <button 
              class="view-btn ${this.currentView === 'list' ? 'active' : ''}" 
              onclick="customersScreen.setView('list')"
              title="List View"
            >
              <img src="https://pub-a8c2855e013441a598cf4513d23f6a8f.r2.dev/LightMode/LightMode-icons-35.svg" class="toolbar-icon menu-icon-list" alt="List View">
            </button>
          </div>

          <button class="btn-primary" onclick="customersScreen.createCustomer()">
            <img src="https://pub-a8c2855e013441a598cf4513d23f6a8f.r2.dev/LightMode/LightMode-icons-27.svg" class="toolbar-icon menu-icon-add-customer" alt="Add Customer">
            Add Customer
          </button>
          <button class="btn-secondary" onclick="customersScreen.exportCustomers()">
            <img src="https://pub-a8c2855e013441a598cf4513d23f6a8f.r2.dev/LightMode/LightMode-icons-31.svg" class="toolbar-icon menu-icon-export" alt="Export">
            Export
          </button>
        </div>

        ${this.selectedCustomers.size > 0 ? this.renderBulkActions() : ''}

        <div class="customers-stats">
          <div class="stats-left">
            <span>Showing ${this.filteredCustomers.length} of ${this.customers.length} customers</span>
            ${
              this.currentView === 'grid' &&
              !this.filteredCustomers.every((c) => this.selectedCustomers.has(c.id))
                ? `
              <button class="btn-select-all" onclick="customersScreen.toggleSelectAll(true)">
                ☑ Select All
              </button>
            `
                : ''
            }
          </div>
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
      ${this.renderClearFilterModal()}
    `;

    container.innerHTML = html;
    console.log(
      `[${new Date().toISOString()}] HTML rendered (full render), showMap:`,
      this.showMap
    );

    // Reset flag since we've recreated the HTML - need to reattach listeners
    this.eventListenersAttached = false;
    this.attachEventListeners();

    if (this.showMap) {
      console.log(
        `[${new Date().toISOString()}] Map should be visible, calling initializeMap in 100ms`
      );
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
    // If closing map and polygon filter is active, show modal
    if (this.showMap && this.polygonFilter) {
      this.showClearFilterModal();
      return; // Don't toggle yet - wait for user response
    }

    this.showMap = !this.showMap;
    localStorage.setItem('showMap', this.showMap);
    this.render();
  }

  showClearFilterModal() {
    const modal = document.getElementById('clear-filter-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  closeClearFilterModal() {
    const modal = document.getElementById('clear-filter-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  clearFilterAndCloseMap() {
    this.removePolygon();
    this.showMap = false;
    localStorage.setItem('showMap', this.showMap);
    this.closeClearFilterModal();
    this.render();
  }

  keepFilterAndCloseMap() {
    this.showMap = false;
    localStorage.setItem('showMap', this.showMap);
    this.closeClearFilterModal();
    this.render();
  }

  async initializeMap() {
    console.log(`[${new Date().toISOString()}] === INITIALIZE MAP ===`);
    console.log(`[${new Date().toISOString()}] Google Maps available:`, !!window.google);
    console.log(
      `[${new Date().toISOString()}] Map element exists:`,
      !!document.getElementById('customer-map')
    );
    console.log(`[${new Date().toISOString()}] Existing map instance:`, !!this.map);
    console.log(`[${new Date().toISOString()}] Current polygon exists:`, !!this.currentPolygon);

    if (!window.google) {
      console.error('Google Maps API not loaded');
      return;
    }

    const mapElement = document.getElementById('customer-map');
    if (!mapElement) {
      console.error('Map element not found in DOM');
      return;
    }

    // If map instance exists but was detached from DOM, recreate it
    if (this.map && !mapElement.hasChildNodes()) {
      console.log(
        `[${new Date().toISOString()}] Map instance exists but detached from DOM - resetting map only`
      );
      // Clear the polygon's map reference but keep the polygon object
      if (this.currentPolygon) {
        this.currentPolygon.setMap(null);
      }
      this.map = null;
      // Don't clear currentPolygon - we'll re-attach it after map is recreated
    }

    // If map already exists, just update markers and ensure polygon visibility
    if (this.map) {
      console.log(
        `[${new Date().toISOString()}] Map exists - updating markers only, preserving zoom/position`
      );
      await this.updateMarkers();

      // Re-attach polygon to map if it exists and isn't visible
      if (this.currentPolygon && !this.currentPolygon.getMap()) {
        console.log(`[${new Date().toISOString()}] Re-attaching polygon to map`);
        this.currentPolygon.setMap(this.map);
      }

      console.log(`[${new Date().toISOString()}] Map update complete - zoom/position preserved`);
      return;
    }

    console.log(`[${new Date().toISOString()}] Creating new map instance`);

    // Calculate center based on geocoded customers
    const geocodedCustomers = this.getGeocodedCustomers();
    console.log(
      `[${new Date().toISOString()}] Geocoded customers count:`,
      geocodedCustomers.length
    );
    console.log(`[${new Date().toISOString()}] Winery data:`, this.winery);

    // Always use winery location as center if available
    let center;
    let zoom;

    if (this.winery && this.winery.latitude && this.winery.longitude) {
      center = {
        lat: parseFloat(this.winery.latitude),
        lng: parseFloat(this.winery.longitude),
      };
      zoom = 9; // Regional view showing surrounding wine country
      console.log(`[${new Date().toISOString()}] Using winery center:`, center, 'zoom:', zoom);
    } else {
      // Fallback to Atlanta if no winery data
      center = { lat: 33.749, lng: -84.388 };
      zoom = 4;
      console.log(
        `[${new Date().toISOString()}] No winery data, using default center:`,
        center,
        'zoom:',
        zoom
      );
    }

    console.log(`[${new Date().toISOString()}] Creating map with center:`, center, 'zoom:', zoom);
    this.map = new google.maps.Map(mapElement, {
      zoom: zoom,
      center: center,
      mapId: 'HEAVY_POUR_CUSTOMER_MAP',
    });

    console.log(`[${new Date().toISOString()}] Map created with initial center and zoom`);

    this.initializeDrawingTools();
    console.log(`[${new Date().toISOString()}] Drawing tools initialized`);

    // Re-attach polygon if it exists
    if (this.currentPolygon) {
      console.log(`[${new Date().toISOString()}] Re-attaching existing polygon to new map`);
      this.currentPolygon.setMap(this.map);
    }

    await this.updateMarkers();
    console.log(`[${new Date().toISOString()}] Markers updated`);
  }

  getGeocodedCustomers() {
    return this.filteredCustomers.filter((c) => c.latitude && c.longitude);
  }

  initializeDrawingTools() {
    // Manual polygon drawing (DrawingManager is deprecated)
    this.polygonPath = [];
    this.tempMarkers = [];
    this.tempPolyline = null;
    this.drawingClickListener = null;
    this.isFreehandDrawing = false;
    this.freehandPath = [];
  }

  toggleDrawingMode() {
    console.log('toggleDrawingMode called, current isDrawingMode:', this.isDrawingMode);
    console.log('map object:', this.map);

    this.isDrawingMode = !this.isDrawingMode;
    console.log('new isDrawingMode:', this.isDrawingMode);

    if (this.isDrawingMode) {
      console.log('Enabling drawing mode with crosshair cursor');
      this.map.setOptions({
        draggableCursor: 'crosshair',
        draggable: false,
        gestureHandling: 'none',
      });
      this.startDrawing();
    } else {
      console.log('Disabling drawing mode');
      this.map.setOptions({
        draggableCursor: null,
        draggable: true,
        gestureHandling: 'auto',
      });
      this.stopDrawing();
    }

    const drawBtn = document.querySelector('.btn-map-control');
    if (drawBtn) {
      if (this.isDrawingMode) {
        drawBtn.classList.add('active');
      } else {
        drawBtn.classList.remove('active');
      }
    }
  }

  startDrawing() {
    console.log('startDrawing called - freehand mode enabled');
    this.polygonPath = [];
    this.freehandPath = [];
    this.clearTempDrawing();

    const mapDiv = this.map.getDiv();

    this.mouseDownListener = google.maps.event.addDomListener(mapDiv, 'mousedown', (e) => {
      this.handleMouseDown(e);
    });

    this.touchStartListener = google.maps.event.addDomListener(mapDiv, 'touchstart', (e) => {
      this.handleTouchStart(e);
    });

    console.log('Freehand drawing listeners added');
  }

  stopDrawing() {
    console.log('stopDrawing called');

    if (this.mouseDownListener) {
      google.maps.event.removeListener(this.mouseDownListener);
      this.mouseDownListener = null;
    }
    if (this.mouseMoveListener) {
      google.maps.event.removeListener(this.mouseMoveListener);
      this.mouseMoveListener = null;
    }
    if (this.mouseUpListener) {
      google.maps.event.removeListener(this.mouseUpListener);
      this.mouseUpListener = null;
    }
    if (this.touchStartListener) {
      google.maps.event.removeListener(this.touchStartListener);
      this.touchStartListener = null;
    }
    if (this.touchMoveListener) {
      google.maps.event.removeListener(this.touchMoveListener);
      this.touchMoveListener = null;
    }
    if (this.touchEndListener) {
      google.maps.event.removeListener(this.touchEndListener);
      this.touchEndListener = null;
    }

    this.clearTempDrawing();
    this.isFreehandDrawing = false;
    this.freehandPath = [];
  }

  handleMouseDown(e) {
    e.preventDefault();
    console.log('=== MOUSE DOWN ===');

    const mapDiv = this.map.getDiv();
    const rect = mapDiv.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    console.log('clientX:', e.clientX, 'clientY:', e.clientY);
    console.log('rect.left:', rect.left, 'rect.top:', rect.top);
    console.log('calculated offsetX:', offsetX, 'offsetY:', offsetY);

    this.isFreehandDrawing = true;
    this.freehandPath = [];

    const latLng = this.getLatLngFromPixelCoords(offsetX, offsetY);
    console.log('Starting latLng:', latLng ? latLng.toString() : 'null');

    if (latLng) {
      this.freehandPath.push(latLng);
      console.log('Path initialized with', this.freehandPath.length, 'points');

      if (this.tempPolyline) {
        this.tempPolyline.setMap(null);
      }

      this.tempPolyline = new google.maps.Polyline({
        path: this.freehandPath,
        strokeColor: '#f39c12',
        strokeWeight: 2,
        map: this.map,
      });
      console.log('Temp polyline created');
    } else {
      console.error('Failed to get latLng from mouse down event');
    }

    this.mouseMoveListener = google.maps.event.addDomListener(
      this.map.getDiv(),
      'mousemove',
      (e) => {
        this.handleMouseMove(e);
      }
    );

    this.mouseUpListener = google.maps.event.addDomListener(this.map.getDiv(), 'mouseup', (e) => {
      this.handleMouseUp(e);
    });

    console.log('Mouse move and up listeners attached');
  }

  handleMouseMove(e) {
    if (!this.isFreehandDrawing) return;
    e.preventDefault();

    const mapDiv = this.map.getDiv();
    const rect = mapDiv.getBoundingClientRect();

    // Calculate offset from clientX/clientY instead of using unreliable offsetX/offsetY
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    // Check if mouse is actually within the map div
    if (offsetX < 0 || offsetY < 0 || offsetX > rect.width || offsetY > rect.height) {
      console.warn('Mouse outside map bounds, skipping point:', offsetX, offsetY);
      return;
    }

    const latLng = this.getLatLngFromPixelCoords(offsetX, offsetY);

    if (latLng && this.tempPolyline) {
      this.freehandPath.push(latLng);

      if (this.freehandPath.length % 50 === 0) {
        console.log('Path growing:', this.freehandPath.length, 'points');
      }

      this.tempPolyline.setPath(this.freehandPath);
    } else if (!latLng) {
      console.warn('Failed to get latLng during mouse move at coords:', offsetX, offsetY);
    }
  }

  handleMouseUp(e) {
    e.preventDefault();
    console.log('=== MOUSE UP ===');
    console.log('Final path length:', this.freehandPath.length, 'points');

    this.isFreehandDrawing = false;

    if (this.mouseMoveListener) {
      google.maps.event.removeListener(this.mouseMoveListener);
      this.mouseMoveListener = null;
    }
    if (this.mouseUpListener) {
      google.maps.event.removeListener(this.mouseUpListener);
      this.mouseUpListener = null;
    }

    if (this.freehandPath.length >= 3) {
      console.log('Path before simplification:', this.freehandPath.length, 'points');
      this.polygonPath = this.simplifyPath(this.freehandPath);
      console.log('Path after simplification:', this.polygonPath.length, 'points');
      console.log(
        'Simplified path:',
        this.polygonPath.map((p) => p.toString())
      );
      this.completePolygon();
    } else {
      console.warn('Path too short, discarding:', this.freehandPath.length, 'points');
      this.clearTempDrawing();
    }
  }

  handleTouchStart(e) {
    e.preventDefault();
    this.isFreehandDrawing = true;
    this.freehandPath = [];

    const latLng = this.getLatLngFromTouchEvent(e);
    if (latLng) {
      this.freehandPath.push(latLng);

      if (this.tempPolyline) {
        this.tempPolyline.setMap(null);
      }

      this.tempPolyline = new google.maps.Polyline({
        path: this.freehandPath,
        strokeColor: '#f39c12',
        strokeWeight: 2,
        map: this.map,
      });
    }

    this.touchMoveListener = google.maps.event.addDomListener(
      this.map.getDiv(),
      'touchmove',
      (e) => {
        this.handleTouchMove(e);
      }
    );

    this.touchEndListener = google.maps.event.addDomListener(this.map.getDiv(), 'touchend', (e) => {
      this.handleTouchEnd(e);
    });
  }

  handleTouchMove(e) {
    if (!this.isFreehandDrawing) return;
    e.preventDefault();

    if (!e.touches || e.touches.length === 0) return;

    const touch = e.touches[0];
    const rect = this.map.getDiv().getBoundingClientRect();
    const offsetX = touch.clientX - rect.left;
    const offsetY = touch.clientY - rect.top;

    // Check if touch is within map bounds
    if (offsetX < 0 || offsetY < 0 || offsetX > rect.width || offsetY > rect.height) {
      console.warn('Touch outside map bounds, skipping point:', offsetX, offsetY);
      return;
    }

    const latLng = this.getLatLngFromTouchEvent(e);
    if (latLng && this.tempPolyline) {
      this.freehandPath.push(latLng);
      this.tempPolyline.setPath(this.freehandPath);
    }
  }

  handleTouchEnd(e) {
    e.preventDefault();
    this.isFreehandDrawing = false;

    if (this.touchMoveListener) {
      google.maps.event.removeListener(this.touchMoveListener);
      this.touchMoveListener = null;
    }
    if (this.touchEndListener) {
      google.maps.event.removeListener(this.touchEndListener);
      this.touchEndListener = null;
    }

    if (this.freehandPath.length >= 3) {
      this.polygonPath = this.simplifyPath(this.freehandPath);
      this.completePolygon();
    } else {
      this.clearTempDrawing();
    }
  }

  getLatLngFromPixelCoords(offsetX, offsetY) {
    const bounds = this.map.getBounds();
    const projection = this.map.getProjection();

    if (!bounds || !projection) {
      console.error('Missing bounds or projection:', {
        bounds: !!bounds,
        projection: !!projection,
      });
      return null;
    }

    const ne = projection.fromLatLngToPoint(bounds.getNorthEast());
    const sw = projection.fromLatLngToPoint(bounds.getSouthWest());
    const scale = Math.pow(2, this.map.getZoom());

    console.log('Coordinate conversion:', {
      offsetX: offsetX,
      offsetY: offsetY,
      zoom: this.map.getZoom(),
      scale: scale,
      ne: { x: ne.x, y: ne.y },
      sw: { x: sw.x, y: sw.y },
    });

    const point = new google.maps.Point(offsetX / scale + sw.x, offsetY / scale + ne.y);

    const latLng = projection.fromPointToLatLng(point);
    console.log('Converted to latLng:', latLng ? latLng.toString() : 'null');

    return latLng;
  }

  getLatLngFromTouchEvent(e) {
    if (!e.touches || e.touches.length === 0) return null;

    const touch = e.touches[0];
    const rect = this.map.getDiv().getBoundingClientRect();

    const bounds = this.map.getBounds();
    const projection = this.map.getProjection();
    if (!bounds || !projection) return null;

    const ne = projection.fromLatLngToPoint(bounds.getNorthEast());
    const sw = projection.fromLatLngToPoint(bounds.getSouthWest());
    const scale = Math.pow(2, this.map.getZoom());

    const offsetX = touch.clientX - rect.left;
    const offsetY = touch.clientY - rect.top;

    const point = new google.maps.Point(offsetX / scale + sw.x, offsetY / scale + ne.y);

    return projection.fromPointToLatLng(point);
  }

  simplifyPath(path) {
    console.log('=== SIMPLIFY PATH ===');
    console.log('Input path length:', path.length);

    if (path.length <= 10) {
      console.log('Path too short to simplify, returning original');
      return path;
    }

    const simplified = [];
    const step = Math.max(1, Math.floor(path.length / 50));
    console.log('Simplification step size:', step);

    for (let i = 0; i < path.length; i += step) {
      simplified.push(path[i]);
      console.log(`Added point ${simplified.length}:`, path[i].toString());
    }

    if (simplified[simplified.length - 1] !== path[path.length - 1]) {
      simplified.push(path[path.length - 1]);
      console.log('Added final point:', path[path.length - 1].toString());
    }

    console.log('Simplified path length:', simplified.length);
    console.log(
      'First 5 simplified points:',
      simplified.slice(0, 5).map((p) => p.toString())
    );
    console.log(
      'Last 5 simplified points:',
      simplified.slice(-5).map((p) => p.toString())
    );

    return simplified;
  }

  completePolygon() {
    console.log('completePolygon called with', this.polygonPath.length, 'points');

    if (this.currentPolygon) {
      console.log('Removing previous polygon');
      this.currentPolygon.setMap(null);
    }

    console.log('Creating new polygon');
    this.currentPolygon = new google.maps.Polygon({
      paths: this.polygonPath,
      fillColor: '#f39c12',
      fillOpacity: 0.2,
      strokeWeight: 2,
      strokeColor: '#f39c12',
      editable: true,
      draggable: false,
      map: this.map,
    });

    console.log('Polygon created, adding edit listeners');

    google.maps.event.addListener(this.currentPolygon.getPath(), 'set_at', () => {
      console.log('Polygon point moved');
      this.applyPolygonFilter();
      this.updateMarkers();
    });
    google.maps.event.addListener(this.currentPolygon.getPath(), 'insert_at', () => {
      console.log('Polygon point added');
      this.applyPolygonFilter();
      this.updateMarkers();
    });

    this.clearTempDrawing();

    this.isDrawingMode = false;
    this.map.setOptions({
      draggableCursor: null,
      draggable: true,
      gestureHandling: 'auto',
    });
    this.stopDrawing();

    this.applyPolygonFilter();

    // Render to update toolbar badges
    this.render();
  }

  clearTempDrawing() {
    // Clear temp markers (AdvancedMarkerElement)
    this.tempMarkers.forEach((marker) => (marker.map = null));
    this.tempMarkers = [];

    // Clear temp polyline
    if (this.tempPolyline) {
      this.tempPolyline.setMap(null);
      this.tempPolyline = null;
    }
  }

  removePolygon() {
    if (this.currentPolygon) {
      this.currentPolygon.setMap(null);
      this.currentPolygon = null;
    }

    this.polygonFilter = null;
    this.isDrawingMode = false;
    this.stopDrawing();

    // Re-apply filters without polygon
    this.applyFilters();

    // Render to update toolbar badges and customer list
    this.render();
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

  async updateMarkers() {
    // Clear existing markers
    this.markers.forEach((marker) => (marker.map = null));
    this.markers = [];

    const geocodedCustomers = this.getGeocodedCustomers();

    // Load marker library
    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary('marker');

    // Add markers for filtered customers
    geocodedCustomers.forEach((customer) => {
      const pinElement = new PinElement({
        background: '#f39c12',
        borderColor: '#ffffff',
        glyphColor: '#ffffff',
        scale: 1.2,
      });

      const marker = new AdvancedMarkerElement({
        position: {
          lat: parseFloat(customer.latitude),
          lng: parseFloat(customer.longitude),
        },
        map: this.map,
        title: this.getFullName(customer),
        content: pinElement.element,
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
        // Close previously open info window
        if (this.currentInfoWindow) {
          this.currentInfoWindow.close();
        }

        infoWindow.open({
          anchor: marker,
          map: this.map,
        });

        // Store reference to currently open window
        this.currentInfoWindow = infoWindow;
      });

      this.markers.push(marker);
    });
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

  renderClearFilterModal() {
    return `
      <div id="clear-filter-modal" class="modal" style="display: none;">
        <div class="modal-content" style="max-width: 500px;">
          <div class="modal-header">
            <h2>Clear Map Filter?</h2>
            <button class="modal-close" onclick="customersScreen.closeClearFilterModal()">×</button>
          </div>
          
          <div class="modal-body">
            <p style="margin-bottom: 16px;">You have an active map filter. Would you like to clear it?</p>
            <p style="color: #666; font-size: 14px;">If you choose to keep it, you can clear it later by reopening the map and clicking "Remove Outline".</p>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" onclick="customersScreen.keepFilterAndCloseMap()">Keep Filter</button>
            <button class="btn-primary" onclick="customersScreen.clearFilterAndCloseMap()">Clear Filter</button>
          </div>
        </div>
      </div>
    `;
  }

  renderBulkActions() {
    console.log('renderBulkActions called, selectedCustomers.size:', this.selectedCustomers.size);
    return `
      <div class="bulk-actions-bar">
        <button class="btn-bulk" onclick="customersScreen.bulkEmail()">
          📧 Email Selected
        </button>
        <button class="btn-bulk" onclick="customersScreen.bulkExport()">
          <img src="https://pub-a8c2855e013441a598cf4513d23f6a8f.r2.dev/LightMode/LightMode-icons-31.svg" class="bulk-icon menu-icon-export" alt="Export">
          Export Selected
        </button>
        <button class="btn-bulk" onclick="customersScreen.bulkAddToClub()">
          <img src="https://pub-a8c2855e013441a598cf4513d23f6a8f.r2.dev/LightMode/LightMode-icons-29.svg" class="bulk-icon menu-icon-club" alt="Club">
          Add to Club
        </button>
        <button class="btn-bulk" onclick="customersScreen.deselectAll()">
          ✕ Deselect All
        </button>
        <button class="btn-bulk btn-danger" onclick="customersScreen.bulkDelete()">
          <img src="https://pub-a8c2855e013441a598cf4513d23f6a8f.r2.dev/LightMode/LightMode-icons-14.svg" class="bulk-icon menu-icon-delete" alt="Delete">
          Delete Selected
        </button>
      </div>
    `;
  }

  renderGridView() {
    if (this.filteredCustomers.length === 0) {
      return '<div class="no-customers">No customers found</div>';
    }

    const allSelected = this.filteredCustomers.every((c) => this.selectedCustomers.has(c.id));

    return `
      ${this.filteredCustomers
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
        <div class="customer-stats-badges-container">
          <div class="customer-stats">
            ${customer.order_count > 0 ? `<div class="stat-item"><strong>${customer.order_count}</strong> Orders</div>` : '<div class="stat-item">0 Orders</div>'}
            <div class="stat-item">LTV: ${this.formatCurrency(customer.lifetime_value_cents, customer.currency_code)}</div>
            ${customer.last_order_date ? `<div class="stat-item">Last Order: ${this.formatDate(customer.last_order_date)}</div>` : ''}
          </div>
          <div class="customer-badges">
            ${customer.customer_status === 'vip' ? '<span class="badge badge-vip">VIP</span>' : ''}
            ${customer.club_member_status === 'active' ? '<span class="badge badge-club">Club</span>' : ''}
            ${customer.allocation_list_status === 'active' ? '<span class="badge badge-allocation">Allocation</span>' : ''}
          </div>
        </div>
        <div class="customer-actions">
          <button class="btn-icon" onclick="event.stopPropagation(); customersScreen.createOrder('${customer.id}')" title="Create Order">
            <img src="https://pub-a8c2855e013441a598cf4513d23f6a8f.r2.dev/LightMode/LightMode-icons-22.svg" class="action-icon menu-icon-pos" alt="POS">
          </button>
          <button class="btn-icon" onclick="event.stopPropagation(); customersScreen.emailCustomer('${customer.id}')" title="Email">
            📧
          </button>
          <button class="btn-icon" onclick="event.stopPropagation(); customersScreen.textCustomer('${customer.id}')" title="Text">
            💬
          </button>
          <button class="btn-icon" onclick="event.stopPropagation(); customersScreen.addNote('${customer.id}')" title="Note">
            📝
          </button>
        </div>
      </div>
    `
        )
        .join('')}
    `;
  }

  renderListView() {
    if (this.filteredCustomers.length === 0) {
      return '<div class="no-customers">No customers found</div>';
    }

    const getSortIcon = (field) => {
      if (this.sortField !== field) {
        return '<img src="https://pub-a8c2855e013441a598cf4513d23f6a8f.r2.dev/LightMode/LightMode-icons-39.svg" class="sort-icon menu-icon-sort-none" alt="Not sorted">';
      }
      return this.sortDirection === 'asc'
        ? '<img src="https://pub-a8c2855e013441a598cf4513d23f6a8f.r2.dev/LightMode/LightMode-icons-38.svg" class="sort-icon menu-icon-sort-asc" alt="Ascending">'
        : '<img src="https://pub-a8c2855e013441a598cf4513d23f6a8f.r2.dev/LightMode/LightMode-icons-37.svg" class="sort-icon menu-icon-sort-desc" alt="Descending">';
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
                ${customer.allocation_list_status === 'active' ? '<span class="badge badge-allocation">Allocation</span>' : ''}
              </td>
              <td onclick="event.stopPropagation()" class="actions-cell">
                <div class="actions-cell-container">
                  <button class="btn-action" onclick="customersScreen.createOrder('${customer.id}')" title="Create Order">
                    <img src="https://pub-a8c2855e013441a598cf4513d23f6a8f.r2.dev/LightMode/LightMode-icons-22.svg" class="action-icon menu-icon-pos" alt="POS">
                  </button>
                  <button class="btn-action" onclick="customersScreen.emailCustomer('${customer.id}')" title="Email">
                    📧
                  </button>
                  <button class="btn-action" onclick="customersScreen.textCustomer('${customer.id}')" title="Text">
                    💬
                  </button>
                  <button class="btn-action" onclick="customersScreen.addNote('${customer.id}')" title="Note">
                    📝
                  </button>
                </div>
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
    // Prevent attaching duplicate event listeners
    if (this.eventListenersAttached) {
      return;
    }
    this.eventListenersAttached = true;

    const searchInput = document.getElementById('customer-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value;
        const cursorPosition = e.target.selectionStart;
        this.applyFilters();
        this.render();
        // Restore focus and cursor position after render
        setTimeout(() => {
          const newSearchInput = document.getElementById('customer-search');
          if (newSearchInput) {
            newSearchInput.focus();
            newSearchInput.setSelectionRange(cursorPosition, cursorPosition);
          }
        }, 0);
      });
    }

    const groupingSelect = document.getElementById('customer-grouping');
    if (groupingSelect) {
      groupingSelect.addEventListener('change', (e) => {
        this.currentGrouping = e.target.value;
        localStorage.setItem('customerGrouping', this.currentGrouping);
        this.applyFilters();
        this.render();
      });
    }
  }

  setView(view) {
    this.currentView = view;
    localStorage.setItem('customerView', view);
    this.render();
  }

  toggleSelection(customerId) {
    if (this.selectedCustomers.has(customerId)) {
      this.selectedCustomers.delete(customerId);
    } else {
      this.selectedCustomers.add(customerId);
    }
    this.render();
  }

  toggleSelectAll(checked) {
    if (checked) {
      this.filteredCustomers.forEach((c) => this.selectedCustomers.add(c.id));
    } else {
      this.selectedCustomers.clear();
    }
    this.render();
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
    this.closeFilterModal();
  }
  viewCustomer(customerId) {
    customerDetailsScreen.show(customerId);
  }
  // Placeholder methods

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

  emailCustomer(id) {
    console.log('Email customer:', id);
    alert('Email customer not yet implemented');
  }

  textCustomer(id) {
    console.log('Text customer:', id);
    alert('Text customer not yet implemented');
  }

  addNote(id) {
    console.log('Add note for customer:', id);
    alert('Add note not yet implemented');
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

  deselectAll() {
    this.selectedCustomers.clear();
    this.render();
  }

  bulkDelete() {
    if (confirm(`Are you sure you want to delete ${this.selectedCustomers.size} customers?`)) {
      console.log('Bulk delete:', this.selectedCustomers);
      alert('Delete not yet implemented');
    }
  }

  renderLoadingState() {
    return `
      <div style="padding: 20px; background: #2c3e50; min-height: 100vh;">
        <!-- Toolbar skeleton -->
        <div style="background: #34495e; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            ${Array(5)
              .fill(0)
              .map(
                () => `
              <div style="
                height: 36px;
                width: 80px;
                background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: 4px;
              "></div>
            `
              )
              .join('')}
          </div>
          <div style="
            height: 40px;
            background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 4px;
          "></div>
        </div>

        <!-- Customer cards skeleton -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
          ${Array(12)
            .fill(0)
            .map(
              () => `
            <div style="background: #34495e; padding: 20px; border-radius: 8px;">
              <div style="
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                margin: 0 auto 15px;
              "></div>
              <div style="
                height: 20px;
                width: 70%;
                margin: 0 auto 10px;
                background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: 4px;
              "></div>
              <div style="
                height: 14px;
                width: 50%;
                margin: 0 auto;
                background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: 4px;
              "></div>
            </div>
          `
            )
            .join('')}
        </div>

        <style>
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        </style>
      </div>
    `;
  }
}

// Initialize
const customersScreen = new CustomersScreen();
