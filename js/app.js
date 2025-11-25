// Main App Controller
const App = {
  currentScreen: 'pos',
  currentWinery: null,
  currentUser: null,
  wineries: [],
  users: [],

  async init() {
    await this.loadWineries();
    this.registerServiceWorker();
    this.initMobileHandlers();
  },

  initMobileHandlers() {
    // Close sidebar when navigating on mobile
    window.addEventListener('resize', () => {
      const mobileBtn = document.getElementById('mobileMenuBtn');

      if (window.innerWidth > 430) {
        // Desktop mode - remove mobile button and overlay
        if (mobileBtn) mobileBtn.remove();
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) overlay.remove();
        document.body.classList.remove('sidebar-open');
      } else if (window.innerWidth <= 430 && this.currentUser && !mobileBtn) {
        // Mobile mode and logged in - create button if it doesn't exist
        this.createMobileMenuButton();
      }
    });
  },

  async loadWineries() {
    try {
      const response = await fetch('/.netlify/functions/get-wineries');
      const data = await response.json();

      if (data.success && data.wineries.length > 0) {
        this.wineries = data.wineries;
        this.renderWinerySelection();
      }
    } catch (error) {
      console.error('Failed to load wineries:', error);
      document.getElementById('winerySelection').innerHTML =
        '<p style="text-align: center; color: #e74c3c;">Failed to load wineries</p>';
    }
  },

  renderWinerySelection() {
    const container = document.getElementById('winerySelection');
    container.innerHTML = this.wineries
      .map(
        (w) => `
            <div class="selection-card" onclick="App.selectWinery('${w.id}')">
                <div class="selection-icon">🍷</div>
                <div class="selection-name">${w.name}</div>
            </div>
        `
      )
      .join('');
  },

  async selectWinery(wineryId) {
    this.currentWinery = this.wineries.find((w) => w.id === wineryId);

    document.querySelectorAll('#winerySelection .selection-card').forEach((card) => {
      card.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');

    await this.loadUsers(wineryId);
    document.getElementById('userSection').style.display = 'block';
  },

  async loadUsers(wineryId) {
    try {
      const response = await fetch(`/.netlify/functions/get-winery-users?winery_id=${wineryId}`);
      const data = await response.json();

      if (data.success && data.users.length > 0) {
        this.users = data.users;
        this.renderUserSelection();
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      document.getElementById('userSelection').innerHTML =
        '<p style="text-align: center; color: #e74c3c;">Failed to load users</p>';
    }
  },

  renderUserSelection() {
    const container = document.getElementById('userSelection');
    container.innerHTML = this.users
      .map(
        (u) => `
            <div class="selection-card" onclick="App.selectUser('${u.id}')">
                <div class="selection-icon">👤</div>
                <div class="selection-name">${u.first_name} ${u.last_name}</div>
                <div class="selection-role">${u.role}</div>
            </div>
        `
      )
      .join('');
  },

  selectUser(userId) {
    this.currentUser = this.users.find((u) => u.id === userId);

    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';

    this.updateWineryDisplay();

    // Apply user's layout preference
    this.applyLayoutPreference();

    // Initialize mobile or desktop POS based on screen width
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      // Mobile: use step-by-step flow
      console.log('Initializing mobile POS layout');

      // Wait for MobilePOS to be available
      const initMobile = () => {
        if (typeof MobilePOS !== 'undefined') {
          console.log('MobilePOS found, initializing...');
          MobilePOS.init();
        } else {
          console.error('MobilePOS not loaded, retrying...');
          setTimeout(initMobile, 100);
        }
      };

      initMobile();
    } else {
      // Desktop/Tablet: use traditional POS
      console.log('Initializing desktop POS layout');
      this.createMobileMenuButton();
      POSScreen.init();
    }
  },

  applyLayoutPreference() {
    const layout = this.currentUser?.layout_preference || 'commerce';
    const posScreen = document.getElementById('posScreen');

    if (posScreen) {
      posScreen.classList.remove('layout-commerce', 'layout-carord');
      posScreen.classList.add(`layout-${layout}`);
    }
  },

  async updateLayoutPreference(newLayout) {
    try {
      const response = await fetch('/.netlify/functions/update-layout-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: this.currentUser.id,
          layout_preference: newLayout,
        }),
      });

      const data = await response.json();

      if (data.success) {
        this.currentUser.layout_preference = newLayout;
        this.applyLayoutPreference();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update layout preference:', error);
      return false;
    }
  },

  createMobileMenuButton() {
    // Only create on mobile
    if (window.innerWidth > 430) return;

    // Remove existing button if any
    const existing = document.getElementById('mobileMenuBtn');
    if (existing) existing.remove();

    // Create floating menu button
    const btn = document.createElement('button');
    btn.id = 'mobileMenuBtn';
    btn.className = 'mobile-menu-btn';
    btn.innerHTML = `
      <div class="hamburger">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
    btn.onclick = () => this.toggleSidebar();

    document.body.appendChild(btn);
  },

  updateWineryDisplay() {
    if (this.currentWinery && this.currentUser) {
      const userName = `${this.currentUser.first_name} ${this.currentUser.last_name}`;
      document.getElementById('currentWineryName').textContent = this.currentWinery.name;
      document.getElementById('currentUserName').textContent = userName;
      document.getElementById('cartWineryName').textContent = this.currentWinery.name;
      document.getElementById('customersWineryName').textContent = this.currentWinery.name;
      document.getElementById('settingsWineryName').textContent = this.currentWinery.name;
      document.getElementById('settingsUserName').textContent = userName;
    }
  },

  logout() {
    this.currentWinery = null;
    this.currentUser = null;
    this.users = [];

    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('userSection').style.display = 'none';

    // Remove mobile menu button
    const mobileBtn = document.getElementById('mobileMenuBtn');
    if (mobileBtn) mobileBtn.remove();

    // Close sidebar and remove overlay
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('expanded');
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) overlay.remove();
    document.body.classList.remove('sidebar-open');

    POSScreen.reset();
  },

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const isMobile = window.innerWidth <= 430;

    sidebar.classList.toggle('expanded');

    if (isMobile) {
      // Create or toggle overlay
      let overlay = document.querySelector('.sidebar-overlay');

      if (sidebar.classList.contains('expanded')) {
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.className = 'sidebar-overlay';
          overlay.addEventListener('click', () => this.toggleSidebar());
          document.body.appendChild(overlay);
        }
        overlay.classList.add('active');
        document.body.classList.add('sidebar-open');
      } else {
        if (overlay) {
          overlay.classList.remove('active');
        }
        document.body.classList.remove('sidebar-open');
      }
    }
  },

  async navigateTo(screen) {
    document.getElementById('posScreen').style.display = 'none';
    document.getElementById('settingsScreen').style.display = 'none';
    document.getElementById('customersScreen').style.display = 'none';
    document.getElementById('ordersScreen').style.display = 'none';
    document.getElementById('productsScreen').style.display = 'none';
    document.getElementById('clubScreen').style.display = 'none';
    document.getElementById('reportsScreen').style.display = 'none';

    document.querySelectorAll('.menu-item').forEach((item) => {
      item.classList.remove('active');
    });

    this.currentScreen = screen;
    const screenElement = document.getElementById(screen + 'Screen');
    if (screenElement) {
      screenElement.style.display = screen === 'pos' ? 'flex' : 'block';
    }

    event.currentTarget.classList.add('active');

    // Close sidebar on mobile after navigation
    if (window.innerWidth <= 430) {
      const sidebar = document.getElementById('sidebar');
      if (sidebar.classList.contains('expanded')) {
        this.toggleSidebar();
      }
    }

    if (screen === 'customers') {
      await CustomersScreen.load();
    } else if (screen === 'products') {
      await ProductsScreen.init();
    } else if (screen === 'orders') {
      await OrdersScreen.load();
    } else if (screen === 'settings') {
      await SettingsScreen.init();
    }
  },

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js');
    }
  },
};

// Global functions for HTML onclick handlers
function toggleSidebar() {
  App.toggleSidebar();
}

function navigateTo(screen) {
  App.navigateTo(screen);
}

function logout() {
  App.logout();
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
