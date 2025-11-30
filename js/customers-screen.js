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

    // Set loading state and render immediately
    this.loadingState = {
      customers: true,
      countrySettings: true,
    };
    this.render();

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

  render() {
    const container = document.getElementById('customersScreen');
    if (!container) return;

    container.innerHTML = this.getHTML();
    this.attachEventListeners();

    // Initialize map if needed and not in loading state
    if (this.showMap && !this.loadingState.customers && typeof google !== 'undefined') {
      setTimeout(() => this.initMap(), 100);
    }
  }

  getHTML() {
    if (this.loadingState.customers) {
      return this.renderLoadingState();
    }

    // Existing full render code...
    return `
      <div class="customers-container" style="
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #2c3e50;
      ">
        ${this.renderToolbar()}
        ${this.renderContent()}
      </div>
    `;
  }

  renderLoadingState() {
    return `
      <div style="
        background: #2c3e50;
        min-height: 100vh;
        padding: 20px;
      ">
        <!-- Toolbar skeleton -->
        <div style="
          background: #34495e;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        ">
          <div style="display: flex; gap: 10px; margin-bottom: 15px;">
            ${Array(5)
              .fill(0)
              .map(
                () => `
              <div style="
                height: 36px;
                width: 100px;
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

        <!-- Customer grid skeleton -->
        <div style="
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 15px;
        ">
          ${Array(12)
            .fill(0)
            .map(
              () => `
            <div style="
              background: #34495e;
              padding: 20px;
              border-radius: 8px;
            ">
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

  // Rest of existing methods remain unchanged...
  renderToolbar() {
    // Existing toolbar code
    return '';
  }

  renderContent() {
    // Existing content code
    return '';
  }

  applyFilters() {
    // Existing filter code
  }

  attachEventListeners() {
    // Existing event listener code
  }

  initMap() {
    // Existing map initialization code
  }

  // ... all other existing methods remain unchanged
}

const customersScreen = new CustomersScreen();
