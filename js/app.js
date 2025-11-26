// Main App Controller
const App = {
  currentScreen: 'pos',
  currentWinery: null,
  currentUser: null,
  currentLoginMethod: 'user',
  pinEntry: '',
  wineries: [],
  users: [],

  async init() {
    console.log('🚀 App initializing...');
    await this.loadWineries();
    this.registerServiceWorker();
    this.initMobileHandlers();
    console.log('✅ App initialized');
  },

  initMobileHandlers() {
    window.addEventListener('resize', () => {
      const mobileBtn = document.getElementById('mobileMenuBtn');

      if (window.innerWidth > 430) {
        if (mobileBtn) mobileBtn.remove();
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) overlay.remove();
        document.body.classList.remove('sidebar-open');
      } else if (window.innerWidth <= 430 && this.currentUser && !mobileBtn) {
        this.createMobileMenuButton();
      }
    });
  },

  async loadWineries() {
    console.log('📡 Loading wineries...');
    try {
      const response = await fetch('/.netlify/functions/get-wineries');
      const data = await response.json();
      console.log('📦 Wineries data:', data);

      if (data.success && data.wineries.length > 0) {
        this.wineries = data.wineries;
        console.log(`✅ Loaded ${data.wineries.length} wineries`);
        this.renderWinerySelection();
      }
    } catch (error) {
      console.error('❌ Failed to load wineries:', error);
      document.getElementById('winerySelection').innerHTML =
        '<p style="text-align: center; color: #e74c3c;">Failed to load wineries</p>';
    }
  },

  renderWinerySelection() {
    console.log('🎨 Rendering winery selection...');
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
    console.log('✅ Winery selection rendered');
  },

  async selectWinery(wineryId) {
    console.log('🍷 Selecting winery:', wineryId);
    this.currentWinery = this.wineries.find((w) => w.id === wineryId);
    console.log('📍 Current winery:', this.currentWinery);

    // Check if elements exist
    const wineryLoginScreen = document.getElementById('wineryLoginScreen');
    const loginMethodScreen = document.getElementById('loginMethodScreen');
    const loginMethodWinery = document.getElementById('loginMethodWinery');

    console.log('🔍 Checking elements:');
    console.log('  - wineryLoginScreen:', wineryLoginScreen);
    console.log('  - loginMethodScreen:', loginMethodScreen);
    console.log('  - loginMethodWinery:', loginMethodWinery);

    if (!wineryLoginScreen) {
      console.error('❌ wineryLoginScreen not found!');
      alert('Error: wineryLoginScreen element not found. Check your HTML.');
      return;
    }

    if (!loginMethodScreen) {
      console.error('❌ loginMethodScreen not found!');
      alert('Error: loginMethodScreen element not found. Check your HTML.');
      return;
    }

    if (!loginMethodWinery) {
      console.error('❌ loginMethodWinery not found!');
      alert('Error: loginMethodWinery element not found. Check your HTML.');
      return;
    }

    // Load users for this winery
    console.log('👥 Loading users for winery...');
    await this.loadUsers(wineryId);

    // Show login method screen
    console.log('🔄 Switching to login method screen...');
    wineryLoginScreen.style.display = 'none';
    loginMethodScreen.style.display = 'flex';
    loginMethodWinery.textContent = this.currentWinery.name;

    // Default to user login method
    console.log('👤 Showing user login method...');
    this.showLoginMethod('user');
    console.log('✅ Winery selected successfully');
  },

  backToWinerySelection() {
    console.log('⬅️ Going back to winery selection...');
    this.currentWinery = null;
    this.users = [];
    this.pinEntry = '';
    document.getElementById('wineryLoginScreen').style.display = 'flex';
    document.getElementById('loginMethodScreen').style.display = 'none';
    this.updatePinDots();
    console.log('✅ Back to winery selection');
  },

  showLoginMethod(method) {
    console.log('🔀 Switching to login method:', method);
    this.currentLoginMethod = method;
    this.pinEntry = '';
    this.updatePinDots();

    // Update tabs
    document.querySelectorAll('.login-tab').forEach((tab) => {
      tab.classList.remove('active');
    });
    event.currentTarget.classList.add('active');

    // Show/hide content
    if (method === 'user') {
      document.getElementById('userLoginMethod').style.display = 'block';
      document.getElementById('pinLoginMethod').style.display = 'none';
    } else {
      document.getElementById('userLoginMethod').style.display = 'none';
      document.getElementById('pinLoginMethod').style.display = 'block';
    }

    // Clear any errors
    const pinError = document.getElementById('pinError');
    if (pinError) {
      pinError.textContent = '';
    }
    console.log('✅ Login method switched');
  },

  async loadUsers(wineryId) {
    console.log('📡 Loading users for winery:', wineryId);
    try {
      const response = await fetch(`/.netlify/functions/get-winery-users?winery_id=${wineryId}`);
      const data = await response.json();
      console.log('📦 Users data:', data);

      if (data.success && data.users.length > 0) {
        this.users = data.users;
        console.log(`✅ Loaded ${data.users.length} users`);
        this.renderUserSelection();
      }
    } catch (error) {
      console.error('❌ Failed to load users:', error);
      document.getElementById('userSelection').innerHTML =
        '<p style="text-align: center; color: #e74c3c;">Failed to load users</p>';
    }
  },

  renderUserSelection() {
    console.log('🎨 Rendering user selection...');
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
    console.log('✅ User selection rendered');
  },

  enterPin(digit) {
    console.log('🔢 Entering digit:', digit);
    if (this.pinEntry.length < 4) {
      this.pinEntry += digit;
      this.updatePinDots();
      console.log('📍 Current PIN length:', this.pinEntry.length);

      // Auto-submit when 4 digits entered
      if (this.pinEntry.length === 4) {
        console.log('✅ 4 digits entered, auto-submitting...');
        setTimeout(() => this.submitPin(), 300);
      }
    }
  },

  backspacePin() {
    console.log('⌫ Backspace pressed');
    this.pinEntry = this.pinEntry.slice(0, -1);
    this.updatePinDots();
    const pinError = document.getElementById('pinError');
    if (pinError) {
      pinError.textContent = '';
    }
    console.log('📍 Current PIN length:', this.pinEntry.length);
  },

  updatePinDots() {
    const dots = document.querySelectorAll('.pin-dot');
    dots.forEach((dot, index) => {
      if (index < this.pinEntry.length) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    });
  },

  async submitPin() {
    console.log('🔐 Submitting PIN...');
    const errorEl = document.getElementById('pinError');
    if (errorEl) {
      errorEl.textContent = '';
    }

    if (this.pinEntry.length !== 4) {
      console.error('❌ Invalid PIN length:', this.pinEntry.length);
      if (errorEl) {
        errorEl.textContent = 'Please enter a 4-digit PIN';
      }
      return;
    }

    console.log(`🔍 Trying PIN against ${this.users.length} users...`);

    // Try each user in the winery with this PIN
    for (const user of this.users) {
      console.log('🧪 Testing PIN for user:', user.first_name, user.last_name);
      try {
        const response = await fetch('/.netlify/functions/validate-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: user.id,
            pin: this.pinEntry,
          }),
        });

        const data = await response.json();
        console.log('📦 PIN validation response:', data);

        if (data.success) {
          console.log('✅ PIN matched for user:', user.first_name, user.last_name);
          // PIN matched for this user
          this.currentUser = {
            ...user,
            layout_preference: data.employee.layout_preference,
          };
          this.loginSuccess();
          return;
        }
      } catch (error) {
        console.error('❌ Error validating PIN for user:', user.id, error);
      }
    }

    // No match found
    console.log('❌ No matching PIN found');
    this.pinEntry = '';
    this.updatePinDots();
    if (errorEl) {
      errorEl.textContent = 'Invalid PIN. Please try again.';
    }
  },

  selectUser(userId) {
    console.log('👤 Selecting user:', userId);
    this.currentUser = this.users.find((u) => u.id === userId);
    console.log('📍 Current user:', this.currentUser);
    this.loginSuccess();
  },

  loginSuccess() {
    console.log('🎉 Login successful!');
    document.getElementById('loginMethodScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';

    this.updateWineryDisplay();
    this.applyLayoutPreference();

    const isMobile = window.innerWidth <= 768;
    console.log('📱 Mobile mode:', isMobile);

    if (isMobile) {
      const initMobile = () => {
        if (typeof MobilePOS !== 'undefined') {
          console.log('📱 Initializing MobilePOS...');
          MobilePOS.init();
        } else {
          console.log('⏳ Waiting for MobilePOS...');
          setTimeout(initMobile, 100);
        }
      };
      initMobile();
    } else {
      console.log('💻 Initializing desktop POS...');
      this.createMobileMenuButton();
      POSScreen.init();
    }
  },

  applyLayoutPreference() {
    const layout = this.currentUser?.layout_preference || 'commerce';
    console.log('🎨 Applying layout preference:', layout);
    const posScreen = document.getElementById('posScreen');

    if (posScreen) {
      posScreen.classList.remove('layout-commerce', 'layout-carord');
      posScreen.classList.add(`layout-${layout}`);
      console.log('✅ Layout applied:', layout);
    }
  },

  async updateLayoutPreference(newLayout) {
    console.log('💾 Updating layout preference to:', newLayout);
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
      console.log('📦 Update response:', data);

      if (data.success) {
        this.currentUser.layout_preference = newLayout;
        this.applyLayoutPreference();
        console.log('✅ Layout preference updated');
        return true;
      }
      console.error('❌ Failed to update layout preference');
      return false;
    } catch (error) {
      console.error('❌ Error updating layout preference:', error);
      return false;
    }
  },

  createMobileMenuButton() {
    if (window.innerWidth > 430) return;

    const existing = document.getElementById('mobileMenuBtn');
    if (existing) existing.remove();

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
    console.log('📝 Updating winery display...');
    if (this.currentWinery && this.currentUser) {
      const userName = `${this.currentUser.first_name} ${this.currentUser.last_name}`;
      document.getElementById('currentWineryName').textContent = this.currentWinery.name;
      document.getElementById('currentUserName').textContent = userName;
      document.getElementById('cartWineryName').textContent = this.currentWinery.name;
      document.getElementById('customersWineryName').textContent = this.currentWinery.name;
      document.getElementById('settingsWineryName').textContent = this.currentWinery.name;
      document.getElementById('settingsUserName').textContent = userName;
      console.log('✅ Winery display updated');
    }
  },

  logout() {
    console.log('🚪 Logging out...');
    this.currentWinery = null;
    this.currentUser = null;
    this.users = [];
    this.pinEntry = '';

    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('wineryLoginScreen').style.display = 'flex';
    document.getElementById('loginMethodScreen').style.display = 'none';

    const mobileBtn = document.getElementById('mobileMenuBtn');
    if (mobileBtn) mobileBtn.remove();

    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('expanded');
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) overlay.remove();
    document.body.classList.remove('sidebar-open');

    POSScreen.reset();
    console.log('✅ Logged out');
  },

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const isMobile = window.innerWidth <= 430;

    sidebar.classList.toggle('expanded');

    if (isMobile) {
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
    console.log('🧭 Navigating to:', screen);
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
    console.log('✅ Navigation complete');
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
