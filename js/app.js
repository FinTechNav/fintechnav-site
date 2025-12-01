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

  async init() {
    console.log('🚀 App.init() - Starting application initialization');
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

    // Add comprehensive diagnostics
    this.logViewportDiagnostics();

    // Monitor for dynamic changes
    setTimeout(() => {
      console.log('🔄 AFTER 2 SECONDS:');
      this.logViewportDiagnostics();
    }, 2000);

    setTimeout(() => {
      console.log('🔄 AFTER 5 SECONDS:');
      this.logViewportDiagnostics();
    }, 5000);

    console.log('✅ App.init() - Application initialization complete');
  },

  logViewportDiagnostics() {
    console.log('=== VIEWPORT & CSS DIAGNOSTICS ===');
    console.log('📱 Window dimensions:', {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight,
      devicePixelRatio: window.devicePixelRatio,
    });

    console.log('📐 Screen dimensions:', {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
    });

    console.log('🎯 Document dimensions:', {
      clientWidth: document.documentElement.clientWidth,
      clientHeight: document.documentElement.clientHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
    });

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
    console.log('🔍 Media query matches:', mediaQueries);

    // Check product card styles
    const productCard = document.querySelector('.product-card');
    if (productCard) {
      const styles = window.getComputedStyle(productCard);
      console.log('🎨 Product card computed styles:', {
        minHeight: styles.minHeight,
        height: styles.height,
        padding: styles.padding,
        gap: styles.gap,
        background: styles.background,
        boxShadow: styles.boxShadow,
      });
      console.log('📏 Product card actual dimensions:', {
        offsetWidth: productCard.offsetWidth,
        offsetHeight: productCard.offsetHeight,
        clientWidth: productCard.clientWidth,
        clientHeight: productCard.clientHeight,
      });
    } else {
      console.log('❌ No product card found in DOM');
    }

    // Check grid styles
    const productsGrid = document.querySelector('.products-grid');
    if (productsGrid) {
      const styles = window.getComputedStyle(productsGrid);
      console.log('📦 Products grid computed styles:', {
        gridTemplateColumns: styles.gridTemplateColumns,
        gap: styles.gap,
        padding: styles.padding,
      });
    }

    // Check right panel and payment buttons
    const rightPanel = document.querySelector('.right-panel');
    if (rightPanel) {
      const styles = window.getComputedStyle(rightPanel);
      console.log('📱 Right panel computed styles:', {
        width: styles.width,
        maxHeight: styles.maxHeight,
        minHeight: styles.minHeight,
        padding: styles.padding,
      });
    }

    const cardButton = document.querySelector('.pay-button-card');
    const cashButton = document.querySelector('.pay-button-cash');
    if (cardButton && cashButton) {
      const cardStyles = window.getComputedStyle(cardButton);
      const cashStyles = window.getComputedStyle(cashButton);
      console.log('💳 Payment button computed styles:', {
        card: {
          width: cardStyles.width,
          padding: cardStyles.padding,
          fontSize: cardStyles.fontSize,
          minHeight: cardStyles.minHeight,
          display: cardStyles.display,
        },
        cash: {
          width: cashStyles.width,
          padding: cashStyles.padding,
          fontSize: cashStyles.fontSize,
          minHeight: cashStyles.minHeight,
          display: cashStyles.display,
        },
      });

      console.log('💳 Payment button actual dimensions:', {
        card: {
          offsetWidth: cardButton.offsetWidth,
          offsetHeight: cardButton.offsetHeight,
          clientWidth: cardButton.clientWidth,
          clientHeight: cardButton.clientHeight,
        },
        cash: {
          offsetWidth: cashButton.offsetWidth,
          offsetHeight: cashButton.offsetHeight,
          clientWidth: cashButton.clientWidth,
          clientHeight: cashButton.clientHeight,
        },
      });

      // Check parent container
      const buttonParent = cardButton.parentElement;
      if (buttonParent) {
        const parentStyles = window.getComputedStyle(buttonParent);
        console.log('📦 Payment buttons parent container:', {
          className: buttonParent.className,
          display: parentStyles.display,
          gap: parentStyles.gap,
          width: parentStyles.width,
          gridTemplateColumns: parentStyles.gridTemplateColumns,
        });
      }
    } else {
      console.log('❌ Payment buttons not found in DOM');
    }

    console.log('=== END DIAGNOSTICS ===\n');
  },

  verifyThemeCSS() {
    console.log('🔍 verifyThemeCSS() - Checking if theme CSS is loaded');
    const themeLink = document.querySelector('link[href*="pos-themes.css"]');
    if (themeLink) {
      console.log('✅ Theme CSS link found:', themeLink.href);

      // Fetch the CSS file to verify content
      fetch(themeLink.href)
        .then((response) => response.text())
        .then((cssContent) => {
          console.log('📄 CSS file fetched, length:', cssContent.length, 'characters');
          if (cssContent.includes(':root[data-theme="dark"]')) {
            console.log('✅ CSS contains theme definitions');
          } else {
            console.error('❌ CSS does NOT contain theme definitions!');
            console.log('📄 First 500 characters:', cssContent.substring(0, 500));
          }
        })
        .catch((err) => {
          console.error('❌ Failed to fetch CSS file:', err);
        });
    } else {
      console.error('❌ Theme CSS link not found in document');
    }
  },

  checkCSSVariables() {
    if (this.cssVariablesChecked) {
      console.log('⏭️ CSS variables already checked, skipping');
      return;
    }

    console.log('🔍 checkCSSVariables() - Checking if CSS variables are applied');
    const computedStyle = getComputedStyle(document.documentElement);
    const bgPrimary = computedStyle.getPropertyValue('--bg-primary').trim();
    const textPrimary = computedStyle.getPropertyValue('--text-primary').trim();
    const accentPrimary = computedStyle.getPropertyValue('--accent-primary').trim();

    console.log('📊 CSS Variables:');
    console.log('  --bg-primary:', bgPrimary || 'NOT SET');
    console.log('  --text-primary:', textPrimary || 'NOT SET');
    console.log('  --accent-primary:', accentPrimary || 'NOT SET');

    if (!bgPrimary || !textPrimary || !accentPrimary) {
      console.error('❌ CSS variables are not properly set! Theme CSS may not be loaded.');
    } else {
      console.log('✅ CSS variables are properly set');
    }

    this.cssVariablesChecked = true;
  },

  initializeTheme() {
    console.log('🎨 initializeTheme() - Starting theme initialization');
    // Load theme from localStorage or default to 'dark'
    const savedTheme = localStorage.getItem('appTheme') || 'dark';
    console.log('📦 Saved theme from localStorage:', savedTheme);
    this.setTheme(savedTheme);
    console.log('✅ initializeTheme() - Theme initialization complete');
  },

  setTheme(theme) {
    console.log('🎨 setTheme() - Setting theme to:', theme);
    const htmlElement = document.documentElement;
    console.log('📍 HTML element:', htmlElement);
    console.log('📍 Current data-theme attribute:', htmlElement.getAttribute('data-theme'));

    htmlElement.setAttribute('data-theme', theme);
    localStorage.setItem('appTheme', theme);

    console.log('✅ setTheme() - Theme set successfully');
    console.log('📍 New data-theme attribute:', htmlElement.getAttribute('data-theme'));
    console.log('📦 Saved to localStorage:', localStorage.getItem('appTheme'));
  },

  getCurrentTheme() {
    const theme = localStorage.getItem('appTheme') || 'dark';
    console.log('📖 getCurrentTheme() - Returning theme:', theme);
    return theme;
  },

  toggleTheme() {
    console.log('🔄 toggleTheme() - Starting theme toggle');
    const currentTheme = this.getCurrentTheme();
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    console.log('🔄 Toggling from', currentTheme, 'to', newTheme);
    this.setTheme(newTheme);
    console.log('✅ toggleTheme() - Theme toggle complete');
  },

  initMobileHandlers() {
    let resizeTimer;
    window.addEventListener('resize', () => {
      console.log('🔄 Window resized:', {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
      });

      // Debounce and log after resize completes
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        console.log('🔄 Resize complete - logging diagnostics:');
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

    // Try each user in the winery with this PIN
    for (const user of this.users) {
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

        if (data.success) {
          // PIN matched for this user
          this.currentUser = {
            ...user,
            layout_preference: data.employee.layout_preference,
          };
          this.loginSuccess();
          return;
        }
      } catch (error) {
        console.error('Error validating PIN for user:', user.id, error);
      }
    }

    // No match found
    this.pinEntry = '';
    this.updatePinDots();
    if (errorEl) {
      errorEl.textContent = 'Invalid PIN. Please try again.';
    }
  },

  selectUser(userId) {
    this.currentUser = this.users.find((u) => u.id === userId);
    this.loginSuccess();
  },

  loginSuccess() {
    document.getElementById('loginMethodScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';

    this.updateWineryDisplay();
    this.applyLayoutPreference();

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
          console.log(`🔍 Monitoring ${productCards.length} product cards for style changes`);

          productCards.forEach((card, index) => {
            if (index === 0) {
              // Only monitor first card to reduce noise
              const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                  if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    console.log('⚠️ Product card style changed!', {
                      oldValue: mutation.oldValue,
                      newValue: card.getAttribute('style'),
                      computedHeight: window.getComputedStyle(card).height,
                      computedMinHeight: window.getComputedStyle(card).minHeight,
                    });
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
      document.getElementById('cartWineryName').textContent = this.currentWinery.name;
      document.getElementById('settingsWineryName').textContent = this.currentWinery.name;
      document.getElementById('settingsUserName').textContent = userName;
    }
  },

  logout() {
    // Clear user but keep winery
    this.currentUser = null;
    this.pinEntry = '';

    // Hide app, show login method screen (stay on current winery)
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginMethodScreen').style.display = 'flex';

    // Remove mobile menu button
    const mobileBtn = document.getElementById('mobileMenuBtn');
    if (mobileBtn) mobileBtn.remove();

    // Close sidebar and remove overlay
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('expanded');
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) overlay.remove();
    document.body.classList.remove('sidebar-open');

    // Reset to PIN login (default)
    this.showLoginMethod('pin');

    // Reset POS
    POSScreen.reset();
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

    event.currentTarget.classList.add('active');

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
