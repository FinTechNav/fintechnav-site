// Main App Controller

const App = {
  currentScreen: 'pos',
  currentWinery: null,
  currentUser: null,
  currentLoginMethod: 'pin',
  pinEntry: '',
  wineries: [],
  users: [],
  cssVariablesChecked: false,
  autoLogoutTimer: null,
  sessionState: null,
  deviceFailedAttempts: 0,
  deviceLockoutUntil: null,

  async init() {
    this.verifyThemeCSS();
    this.initializeTheme();
    // Check CSS variables AFTER theme is initialized
    setTimeout(() => {
      this.checkCSSVariables();
    }, 100);
    await this.loadWineries();
    this.registerServiceWorker();
    this.initMobileHandlers();
    this.initKeyboardHandler();
    this.initActivityListeners();

    // Add comprehensive diagnostics
    this.logViewportDiagnostics();

    // Monitor for dynamic changes
    setTimeout(() => {
      this.logViewportDiagnostics();
    }, 2000);

    setTimeout(() => {
      this.logViewportDiagnostics();
    }, 5000);
  },

  logViewportDiagnostics() {
    // Check media queries
    const mediaQueries = {
      '1366px-1025px': window.matchMedia('(max-width: 1366px) and (min-width: 1025px)').matches,
      'max-1024px': window.matchMedia('(max-width: 1024px)').matches,
      'max-915px-landscape': window.matchMedia('(max-width: 915px) and (orientation: landscape)')
        .matches,
      'max-430px': window.matchMedia('(max-width: 430px)').matches,
      landscape: window.matchMedia('(orientation: landscape)').matches,
      portrait: window.matchMedia('(orientation: portrait)').matches,
    };

    // Check product card styles
    const productCard = document.querySelector('.product-card');
    if (productCard) {
      const styles = window.getComputedStyle(productCard);
    } else {
    }

    // Check grid styles
    const productsGrid = document.querySelector('.products-grid');
    if (productsGrid) {
      const styles = window.getComputedStyle(productsGrid);
    }

    // Check right panel and payment buttons
    const rightPanel = document.querySelector('.right-panel');
    if (rightPanel) {
      const styles = window.getComputedStyle(rightPanel);
    }

    const cardButton = document.querySelector('.pay-button-card');
    const cashButton = document.querySelector('.pay-button-cash');
    if (cardButton && cashButton) {
      const cardStyles = window.getComputedStyle(cardButton);
      const cashStyles = window.getComputedStyle(cashButton);

      // Check parent container
      const buttonParent = cardButton.parentElement;
      if (buttonParent) {
        const parentStyles = window.getComputedStyle(buttonParent);
      }
    } else {
    }
  },

  verifyThemeCSS() {
    const themeLink = document.querySelector('link[href*="pos-themes.css"]');
    if (themeLink) {
      // Fetch the CSS file to verify content
      fetch(themeLink.href)
        .then((response) => response.text())
        .then((cssContent) => {
          if (cssContent.includes(':root[data-theme="dark"]')) {
          } else {
          }
        })
        .catch((err) => {});
    } else {
    }
  },

  checkCSSVariables() {
    if (this.cssVariablesChecked) {
      return;
    }

    const computedStyle = getComputedStyle(document.documentElement);
    const bgPrimary = computedStyle.getPropertyValue('--bg-primary').trim();
    const textPrimary = computedStyle.getPropertyValue('--text-primary').trim();
    const accentPrimary = computedStyle.getPropertyValue('--accent-primary').trim();

    if (!bgPrimary || !textPrimary || !accentPrimary) {
    } else {
    }

    this.cssVariablesChecked = true;
  },

  initializeTheme() {
    // Load theme from localStorage or default to 'dark'
    const savedTheme = localStorage.getItem('appTheme') || 'dark';
    this.setTheme(savedTheme);
  },

  setTheme(theme) {
    const htmlElement = document.documentElement;

    htmlElement.setAttribute('data-theme', theme);
    localStorage.setItem('appTheme', theme);
  },

  getCurrentTheme() {
    const theme = localStorage.getItem('appTheme') || 'dark';
    return theme;
  },

  toggleTheme() {
    const currentTheme = this.getCurrentTheme();
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  },

  initMobileHandlers() {
    let resizeTimer;
    window.addEventListener('resize', () => {
      // Debounce and log after resize completes
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.logViewportDiagnostics();
      }, 500);

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

  initKeyboardHandler() {
    document.addEventListener('keydown', (e) => {
      // Only handle keyboard when on PIN login screen
      const pinLoginVisible = document.getElementById('pinLoginMethod')?.style.display !== 'none';
      if (!pinLoginVisible || this.currentUser) return;

      // Handle number keys
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        this.enterPin(e.key);
      }
      // Handle backspace
      else if (e.key === 'Backspace') {
        e.preventDefault();
        this.backspacePin();
      }
      // Handle Enter key to submit
      else if (e.key === 'Enter' && this.pinEntry.length === 4) {
        e.preventDefault();
        this.submitPin();
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

    await this.loadUsers(wineryId);

    document.getElementById('wineryLoginScreen').style.display = 'none';
    document.getElementById('loginMethodScreen').style.display = 'flex';
    document.getElementById('loginMethodWinery').textContent = this.currentWinery.name;

    // Default to PIN login
    this.showLoginMethod('pin');
  },

  backToWinerySelection() {
    this.currentWinery = null;
    this.users = [];
    this.pinEntry = '';

    // Clear localStorage to prevent showing old winery info
    localStorage.removeItem('selectedWineryId');
    localStorage.removeItem('userName');

    // Show loading skeleton and hide actual header content
    const loadingSkeleton = document.getElementById('wineryHeaderLoading');
    const logoContainer = document.getElementById('wineryLogoContainer');
    const textOnlyContainer = document.getElementById('wineryTextOnly');

    if (loadingSkeleton) {
      loadingSkeleton.style.display = 'flex';
    }
    if (logoContainer) logoContainer.style.display = 'none';
    if (textOnlyContainer) textOnlyContainer.style.display = 'none';

    // Clear all header elements
    const logoImg = document.getElementById('wineryLogo');
    const wineryNameElem = document.getElementById('currentWineryName');
    const wineryNameNoLogoElem = document.getElementById('currentWineryNameNoLogo');
    const userNameElem = document.getElementById('currentUserName');
    const userNameNoLogoElem = document.getElementById('currentUserNameNoLogo');

    if (logoImg) logoImg.src = '';
    if (wineryNameElem) wineryNameElem.textContent = '';
    if (wineryNameNoLogoElem) wineryNameNoLogoElem.textContent = '';
    if (userNameElem) userNameElem.textContent = '';
    if (userNameNoLogoElem) userNameNoLogoElem.textContent = '';

    // Reset overlay state and remove blur
    const appContainer = document.getElementById('appContainer');
    const loginMethodScreen = document.getElementById('loginMethodScreen');

    appContainer.style.display = 'none';
    appContainer.classList.remove('blurred');

    loginMethodScreen.setAttribute('data-is-overlay', 'false');

    document.getElementById('wineryLoginScreen').style.display = 'flex';
    document.getElementById('loginMethodScreen').style.display = 'none';
    this.updatePinDots();
  },

  showLoginMethod(method) {
    this.currentLoginMethod = method;
    this.pinEntry = '';
    this.updatePinDots();

    // Update tabs
    document.querySelectorAll('.login-tab').forEach((tab) => {
      tab.classList.remove('active');
      if (
        (method === 'pin' && tab.textContent.includes('PIN')) ||
        (method === 'user' && tab.textContent.includes('USER'))
      ) {
        tab.classList.add('active');
      }
    });

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

  enterPin(digit) {
    if (this.pinEntry.length < 4) {
      this.pinEntry += digit;
      this.updatePinDots();

      // Auto-submit when 4 digits entered
      if (this.pinEntry.length === 4) {
        setTimeout(() => this.submitPin(), 300);
      }
    }
  },

  backspacePin() {
    this.pinEntry = this.pinEntry.slice(0, -1);
    this.updatePinDots();
    const pinError = document.getElementById('pinError');
    if (pinError) {
      pinError.textContent = '';
    }
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
    const errorEl = document.getElementById('pinError');
    if (errorEl) {
      errorEl.textContent = '';
    }

    if (this.pinEntry.length !== 4) {
      if (errorEl) {
        errorEl.textContent = 'Please enter a 4-digit PIN';
      }
      return;
    }

    // Check device lockout BEFORE trying any PINs
    if (this.deviceLockoutUntil && new Date() < this.deviceLockoutUntil) {
      const secondsLeft = Math.ceil((this.deviceLockoutUntil - new Date()) / 1000);
      if (errorEl) {
        errorEl.textContent = `Device locked. Try again in ${secondsLeft} second${secondsLeft !== 1 ? 's' : ''}`;
      }
      this.pinEntry = '';
      this.updatePinDots();
      return;
    }

    console.log('🔐 Submitting PIN');
    console.log('💾 Session state:', this.sessionState);
    console.log('⚠️ Device failed attempts:', this.deviceFailedAttempts);

    // Check if we're in overlay mode with a session to resume
    const loginScreen = document.getElementById('loginMethodScreen');
    const isOverlay = loginScreen.getAttribute('data-is-overlay') === 'true';

    let usersToTry = [...this.users];

    // In overlay mode, prioritize the session user first
    if (isOverlay && this.sessionState && this.sessionState.userId) {
      console.log('🎯 Overlay mode: Prioritizing session user');
      const sessionUserIndex = usersToTry.findIndex((u) => u.id === this.sessionState.userId);
      if (sessionUserIndex > 0) {
        // Move session user to front of array
        const sessionUser = usersToTry.splice(sessionUserIndex, 1)[0];
        usersToTry.unshift(sessionUser);
        console.log('✨ Session user moved to front:', sessionUser.first_name);
      }
    }

    // Try PIN against users in order (session user first if overlay)
    for (const user of usersToTry) {
      try {
        console.log(`🔍 Trying PIN for: ${user.first_name} ${user.last_name}`);

        const response = await fetch('/.netlify/functions/validate-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: user.id,
            pin: this.pinEntry,
          }),
        });

        const data = await response.json();

        if (data.success) {
          console.log('✅ PIN matched for:', user.first_name, user.last_name);

          // Reset device lockout on successful login
          this.deviceFailedAttempts = 0;
          this.deviceLockoutUntil = null;

          this.currentUser = {
            ...user,
            layout_preference: data.employee.layout_preference,
            auto_logout_enabled: data.employee.auto_logout_enabled,
            auto_logout_minutes: data.employee.auto_logout_minutes,
          };
          this.loginSuccess();
          return;
        }
      } catch (error) {
        console.error(`💥 Error checking PIN for ${user.first_name}:`, error);
      }
    }

    // No match found - increment device lockout
    console.log('❌ No PIN match found');
    this.deviceFailedAttempts++;
    console.log('📈 Device failed attempts now:', this.deviceFailedAttempts);

    // Start lockout after 5 failed attempts, increase by 5 seconds each time
    if (this.deviceFailedAttempts >= 5) {
      const lockoutSeconds = (this.deviceFailedAttempts - 4) * 5;
      this.deviceLockoutUntil = new Date(Date.now() + lockoutSeconds * 1000);

      console.log(`🔒 Device locked for ${lockoutSeconds} seconds`);

      if (errorEl) {
        errorEl.textContent = `Too many failed attempts. Device locked for ${lockoutSeconds} second${lockoutSeconds !== 1 ? 's' : ''}`;
      }

      // Start countdown
      const updateCountdown = () => {
        if (this.deviceLockoutUntil && new Date() < this.deviceLockoutUntil) {
          const secondsLeft = Math.ceil((this.deviceLockoutUntil - new Date()) / 1000);
          if (errorEl && secondsLeft > 0) {
            errorEl.textContent = `Device locked. Try again in ${secondsLeft} second${secondsLeft !== 1 ? 's' : ''}`;
          }
          setTimeout(updateCountdown, 1000);
        } else {
          if (errorEl) {
            errorEl.textContent = '';
          }
          // Clear the lockout time when countdown completes
          this.deviceLockoutUntil = null;
        }
      };
      updateCountdown();
    }
    // Don't show any error message for first 4 attempts - stay silent

    this.pinEntry = '';
    this.updatePinDots();
  },

  selectUser(userId) {
    const user = this.users.find((u) => u.id === userId);
    console.log('👤 User selected:', user);
    console.log('💾 Session state:', this.sessionState);

    this.currentUser = user;
    this.loginSuccess();
  },

  loginSuccess() {
    // Store winery and user info in localStorage for later use
    if (this.currentWinery && this.currentWinery.id) {
      localStorage.setItem('selectedWineryId', this.currentWinery.id);
    }

    if (this.currentUser) {
      const userName =
        this.currentUser.name ||
        `${this.currentUser.first_name} ${this.currentUser.last_name}`.trim();
      if (userName) {
        localStorage.setItem('userName', userName);
      }
    }

    // Check if this is an overlay login (session resumption)
    const loginScreen = document.getElementById('loginMethodScreen');
    const isOverlay = loginScreen.getAttribute('data-is-overlay') === 'true';

    if (isOverlay) {
      console.log('🔄 Overlay login detected, checking session resumption');
      console.log('👤 Current user:', this.currentUser.id);
      console.log('💾 Session user:', this.sessionState?.userId);

      // Check if same user is logging back in
      if (this.sessionState && this.sessionState.userId === this.currentUser.id) {
        console.log('✅ Same user - restoring session');
        // Same user - restore their session
        if (this.sessionState.cart) {
          POSScreen.cart = [...this.sessionState.cart];
          POSScreen.renderCart();
        }
        if (this.sessionState.currentCustomer) {
          POSScreen.currentCustomer = { ...this.sessionState.currentCustomer };
          POSScreen.updateCustomerDisplay();
        }
      } else {
        console.log('🆕 Different user - resetting POS');
        // Different user - start fresh
        POSScreen.reset();
      }

      // Hide overlay, remove blur
      loginScreen.style.display = 'none';
      loginScreen.setAttribute('data-is-overlay', 'false');
      document.getElementById('appContainer').classList.remove('blurred');

      // Clear session state
      this.sessionState = null;
    } else {
      console.log('🎬 Initial login (not overlay)');
      // Initial login (not overlay)
      document.getElementById('loginMethodScreen').style.display = 'none';
      document.getElementById('appContainer').style.display = 'flex';

      this.updateWineryDisplay();
      this.applyLayoutPreference();

      // Trigger winery header load after login completes
      if (typeof window.loadWineryHeader === 'function') {
        setTimeout(() => window.loadWineryHeader(), 500);
      }

      const isMobile = window.innerWidth <= 768;

      if (isMobile) {
        const initMobile = () => {
          if (typeof MobilePOS !== 'undefined') {
            MobilePOS.init();
          } else {
            setTimeout(initMobile, 100);
          }
        };
        initMobile();
      } else {
        this.createMobileMenuButton();
        POSScreen.init();

        // Monitor for style changes on product cards
        setTimeout(() => {
          const productCards = document.querySelectorAll('.product-card');
          if (productCards.length > 0) {
            productCards.forEach((card, index) => {
              if (index === 0) {
                // Only monitor first card to reduce noise
                const observer = new MutationObserver((mutations) => {
                  mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    }
                  });
                });

                observer.observe(card, {
                  attributes: true,
                  attributeOldValue: true,
                  attributeFilter: ['style'],
                });
              }
            });
          }
        }, 1000);
      }
    }

    // Start auto-logout timer after login
    this.startAutoLogoutTimer();
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
    if (this.currentWinery && this.currentUser) {
      const userName = `${this.currentUser.first_name} ${this.currentUser.last_name}`;
      document.getElementById('currentWineryName').textContent = this.currentWinery.name;
      document.getElementById('currentUserName').textContent = userName;
      document.getElementById('settingsWineryName').textContent = this.currentWinery.name;
      document.getElementById('settingsUserName').textContent = userName;
    }
  },

  logout() {
    // Stop auto-logout timer
    this.stopAutoLogoutTimer();

    // Save current POS session state
    this.sessionState = {
      userId: this.currentUser?.id,
      cart: POSScreen.cart ? [...POSScreen.cart] : [],
      currentCustomer: POSScreen.currentCustomer ? { ...POSScreen.currentCustomer } : null,
      layoutPreference: this.currentUser?.layout_preference || 'commerce',
    };

    // Clear current user but keep winery
    const previousUser = this.currentUser;
    this.currentUser = null;
    this.pinEntry = '';

    // Show login overlay on top of POS (keep app container visible)
    const loginScreen = document.getElementById('loginMethodScreen');
    const appContainer = document.getElementById('appContainer');

    // Keep app container visible and blur it
    appContainer.classList.add('blurred');

    // Show login as overlay
    loginScreen.setAttribute('data-is-overlay', 'true');
    loginScreen.style.display = 'flex';

    // Default to PIN login for quick tasting room workflow
    this.showLoginMethod('pin');
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
    // Don't reload if already on this screen
    if (this.currentScreen === screen) {
      return;
    }

    document.getElementById('posScreen').style.display = 'none';
    document.getElementById('settingsScreen').style.display = 'none';
    document.getElementById('customersScreen').style.display = 'none';
    document.getElementById('ordersScreen').style.display = 'none';
    document.getElementById('productsScreen').style.display = 'none';
    document.getElementById('reservationsScreen').style.display = 'none';
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

    // Only try to access event if it exists (when called from click handler)
    if (typeof event !== 'undefined' && event && event.currentTarget) {
      event.currentTarget.classList.add('active');
    }

    if (window.innerWidth <= 430) {
      const sidebar = document.getElementById('sidebar');
      if (sidebar.classList.contains('expanded')) {
        this.toggleSidebar();
      }
    }

    if (screen === 'customers') {
      await customersScreen.init();
    } else if (screen === 'products') {
      await ProductsScreen.init();
    } else if (screen === 'orders') {
      await OrdersScreen.load();
    } else if (screen === 'reservations') {
      await ReservationsScreen.init();
    } else if (screen === 'settings') {
      await SettingsScreen.init();
    }
  },

  startAutoLogoutTimer() {
    // Clear any existing timer
    this.stopAutoLogoutTimer();

    if (!this.currentUser || !this.currentUser.auto_logout_enabled) {
      return;
    }

    const minutes = this.currentUser.auto_logout_minutes || 5;
    const milliseconds = minutes * 60 * 1000;

    this.autoLogoutTimer = setTimeout(() => {
      this.logout();
    }, milliseconds);
  },

  stopAutoLogoutTimer() {
    if (this.autoLogoutTimer) {
      clearTimeout(this.autoLogoutTimer);
      this.autoLogoutTimer = null;
    }
  },

  resetAutoLogoutTimer() {
    if (this.currentUser && this.currentUser.auto_logout_enabled) {
      this.startAutoLogoutTimer();
    }
  },

  initActivityListeners() {
    // Reset timer on any user activity
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach((event) => {
      document.addEventListener(event, () => this.resetAutoLogoutTimer(), { passive: true });
    });
  },

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      const hostname = window.location.hostname;
      const isDevelopment = hostname.includes('--') || hostname.includes('localhost');

      if (!isDevelopment) {
        navigator.serviceWorker.register('sw.js');
      }
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

function toggleThemeMini() {
  const currentTheme = App.getCurrentTheme();
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  App.setTheme(newTheme);
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
