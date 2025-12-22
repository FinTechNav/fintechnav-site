// Settings Screen functionality
const SettingsScreen = {
  terminals: [],
  terminalStatuses: {},
  lastChecked: {},
  currentTab: 'general',
  paymentTypes: {
    cash: true,
    check: false,
  },
  loadingState: {
    terminals: false,
    paymentTypes: false,
  },

  async init() {
    this.loadingState.terminals = true;
    this.loadingState.paymentTypes = true;
    this.loadPOSPreferences();
    this.render();

    await this.loadTerminals();
    this.loadingState.terminals = false;
    this.render();

    await this.loadPaymentTypes();
    this.loadingState.paymentTypes = false;
    this.render();

    // Auto-check terminal status on screen load
    await this.checkAllTerminalStatuses();
  },

  loadPOSPreferences() {
    const autoClose = localStorage.getItem('posAutoClosePayment') === 'true';
    const autoCloseDelay = parseInt(localStorage.getItem('posAutoCloseDelay') || '5', 10);
    return { autoClose, autoCloseDelay };
  },

  savePOSPreferences(autoClose, autoCloseDelay) {
    localStorage.setItem('posAutoClosePayment', autoClose ? 'true' : 'false');
    localStorage.setItem('posAutoCloseDelay', autoCloseDelay.toString());
  },

  async loadPaymentTypes() {
    // Load from localStorage or database
    const saved = localStorage.getItem(`paymentTypes_${App.currentWinery?.id}`);
    if (saved) {
      this.paymentTypes = JSON.parse(saved);
    }
  },

  savePaymentTypes() {
    localStorage.setItem(
      `paymentTypes_${App.currentWinery?.id}`,
      JSON.stringify(this.paymentTypes)
    );
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.render();
  },

  render() {
    const container = document.getElementById('terminalSettings');
    if (!container) return;

    container.innerHTML = `
      <div class="settings-layout">
        <div class="settings-sidebar">
          ${this.renderSidebarMenu()}
        </div>
        
        <div class="settings-content">
          ${this.renderTabContent()}
        </div>
      </div>
    `;
  },

  renderSidebarMenu() {
    const menuItems = [
      { id: 'general', icon: '🏢', label: 'General' },
      { id: 'users', icon: '👥', label: 'Users' },
      { id: 'payment-types', icon: '💳', label: 'Payment Types' },
      { id: 'pos-preferences', icon: '⚙️', label: 'POS Preferences' },
      { id: 'terminal-timeout', icon: '⏱️', label: 'Terminal Timeouts' },
    ];

    return menuItems
      .map(
        (item) => `
      <div onclick="SettingsScreen.switchTab('${item.id}')" class="settings-nav-item ${this.currentTab === item.id ? 'active' : ''}">
        <span class="settings-nav-icon">${item.icon}</span>
        <span class="settings-nav-label">${item.label}</span>
      </div>
    `
      )
      .join('');
  },

  renderTabContent() {
    switch (this.currentTab) {
      case 'general':
        return this.renderGeneralTab();
      case 'users':
        return this.renderUsersTab();
      case 'payment-types':
        return this.renderPaymentTypesTab();
      case 'pos-preferences':
        return this.renderPOSPreferencesTab();
      case 'terminal-timeout':
        return this.renderTerminalTimeoutTab();
      default:
        return '<p>Select a category</p>';
    }
  },

  renderGeneralTab() {
    if (!App.currentWinery) return '<p class="text-muted">No winery selected</p>';

    if (this.loadingState.terminals) {
      return this.renderLoadingState();
    }

    return `
      <div class="settings-page-header">
        <h2 class="settings-page-title">General Settings</h2>
        <p class="settings-page-subtitle">Winery information and configuration</p>
      </div>
      
      <div class="section-container">
        <h3 class="section-header">Winery Information</h3>
        
        <div class="section-grid">
          <div>
            <label class="form-label">Winery Name</label>
            <div class="form-value">${App.currentWinery.name || 'N/A'}</div>
          </div>
          
          <div>
            <label class="form-label">Location</label>
            <div class="form-value">${App.currentWinery.location || 'N/A'}</div>
          </div>
          
          <div>
            <label class="form-label">Current User</label>
            <div class="form-value">${App.currentUser?.name || App.currentUser?.email || 'N/A'}</div>
          </div>
          
          <div>
            <label class="form-label">User Role</label>
            <div class="form-value text-capitalize">${App.currentUser?.role || 'N/A'}</div>
          </div>
        </div>
      </div>
    `;
  },

  renderUsersTab() {
    const currentUser = App.currentUser;
    if (!currentUser) {
      return `
        <div class="settings-page-header">
          <h2 class="settings-page-title">User Settings</h2>
          <p class="settings-page-subtitle">Personal preferences</p>
        </div>
        <div class="section-container">
          <div class="empty-state">No user logged in</div>
        </div>
      `;
    }

    const autoLogoutEnabled = currentUser.auto_logout_enabled !== false;
    const autoLogoutMinutes = currentUser.auto_logout_minutes || 5;
    const minuteOptions = [1, 2, 3, 4, 5, 10, 15, 30, 60, 90];

    return `
      <div class="settings-page-header">
        <h2 class="settings-page-title">User Settings</h2>
        <p class="settings-page-subtitle">Personal preferences for ${currentUser.first_name} ${currentUser.last_name}</p>
      </div>
      
      <div class="section-container">
        <h3 class="section-header">Auto Logout</h3>
        
        <div class="section-grid">
          <label class="payment-method-option">
            <input 
              type="checkbox" 
              id="autoLogoutEnabled" 
              ${autoLogoutEnabled ? 'checked' : ''} 
              onchange="SettingsScreen.toggleAutoLogout(this.checked)"
            />
            <div class="settings-option-content">
              <div class="text-primary font-semibold">Enable Auto Logout</div>
              <div class="text-muted text-small settings-option-description">
                Automatically log out after a period of inactivity
              </div>
            </div>
          </label>
        </div>

        ${
          autoLogoutEnabled
            ? `
          <div class="settings-dropdown-container">
            <label class="form-label">Auto logout after:</label>
            <select 
              id="autoLogoutMinutes" 
              class="form-control" 
              onchange="SettingsScreen.updateAutoLogoutMinutes(parseInt(this.value))"
            >
              ${minuteOptions
                .map(
                  (min) => `
                <option value="${min}" ${min === autoLogoutMinutes ? 'selected' : ''}>
                  ${min} minute${min !== 1 ? 's' : ''}
                </option>
              `
                )
                .join('')}
            </select>
          </div>
        `
            : ''
        }
      </div>
    `;
  },

  renderPaymentTypesTab() {
    const cardPresent = this.terminals.find((t) => t.terminal_type === 'card_present');
    const cardNotPresent = this.terminals.find((t) => t.terminal_type === 'card_not_present');
    const hasCreditCard = cardPresent || cardNotPresent;

    return `
      <div class="settings-page-header">
        <h2 class="settings-page-title">Payment Types</h2>
        <p class="settings-page-subtitle">Configure accepted payment methods</p>
      </div>
      
      <div class="section-container">
        <h3 class="section-header">Accepted Payment Methods</h3>
        
        <div class="section-grid">
          <label class="payment-method-option ${hasCreditCard ? 'disabled' : ''}">
            <input type="checkbox" ${hasCreditCard ? 'checked disabled' : 'disabled'} />
            <div class="settings-option-content">
              <div class="text-primary font-semibold">💳 Credit/Debit Card</div>
              <div class="text-muted text-small settings-option-description">
                ${hasCreditCard ? 'Configured and enabled' : 'Configure terminals below to enable'}
              </div>
            </div>
          </label>
          
          <label class="payment-method-option">
            <input type="checkbox" ${this.paymentTypes.cash ? 'checked' : ''} onchange="SettingsScreen.togglePaymentType('cash')" />
            <div class="settings-option-content">
              <div class="text-primary font-semibold">💵 Cash</div>
              <div class="text-muted text-small settings-option-description">Accept cash payments at POS</div>
            </div>
          </label>
          
          <label class="payment-method-option">
            <input type="checkbox" ${this.paymentTypes.check ? 'checked' : ''} onchange="SettingsScreen.togglePaymentType('check')" />
            <div class="settings-option-content">
              <div class="text-primary font-semibold">🏦 Check</div>
              <div class="text-muted text-small settings-option-description">Accept check payments at POS</div>
            </div>
          </label>
        </div>
      </div>
      
      ${hasCreditCard ? this.renderCreditCardConfig(cardPresent, cardNotPresent) : ''}
    `;
  },

  togglePaymentType(type) {
    this.paymentTypes[type] = !this.paymentTypes[type];
    this.savePaymentTypes();
    this.render();
  },

  renderCreditCardConfig(cardPresent, cardNotPresent) {
    let html = `
      <div class="section-container">
        <h3 class="section-header">Credit Card Configuration</h3>
    `;

    // Card Not Present Section
    if (cardNotPresent) {
      const cnpConfig = cardNotPresent.processor_terminal_config || {};
      html += `
        <div class="terminal-config-card">
          <h4 class="terminal-config-title">
            <span>🌐</span> Card Not Present (Online/E-Commerce)
          </h4>
          <div class="terminal-config-details">
            <div>
              <span class="form-label">Merchant ID:</span>
              <div class="terminal-config-value">${cnpConfig.merchant_id || 'Not configured'}</div>
            </div>
            <div>
              <span class="form-label">Auth Token:</span>
              <div class="terminal-config-value text-small" style="word-break: break-all;">${cnpConfig.ftd_security_key ? '••••••••' + cnpConfig.ftd_security_key.slice(-8) : 'Not configured'}</div>
            </div>
            <div>
              <span class="form-label">Environment:</span>
              <div class="terminal-config-value text-uppercase">${cardNotPresent.api_environment || 'sandbox'}</div>
            </div>
            <div>
              <span class="form-label">Location:</span>
              <div class="terminal-config-value">${cardNotPresent.location || 'N/A'}</div>
            </div>
          </div>
        </div>
      `;
    }

    // Card Present Section
    if (cardPresent) {
      const cpConfig = cardPresent.processor_terminal_config || {};
      const status = this.terminalStatuses[cardPresent.id];
      const lastChecked = this.lastChecked[cardPresent.id];

      let statusClass = 'status-warning';
      let statusText = 'Checking...';

      if (status) {
        if (status.TerminalStatus === 'Online') {
          statusClass = 'status-online';
          statusText = 'Online';
        } else if (status.TerminalStatus === 'Offline') {
          statusClass = 'status-offline';
          statusText = 'Offline';
        } else {
          statusText = status.TerminalStatus || 'Unknown';
        }
      }

      html += `
        <div class="terminal-config-card">
          <h4 class="terminal-config-title">
            <span>🪙</span> Card Present (Physical Terminal)
          </h4>
          
          <div class="terminal-status-display ${statusClass}">
            <div class="terminal-status-indicator">
              <span class="status-dot"></span>
              <span class="status-text">${statusText}</span>
            </div>
            <div class="terminal-status-time text-muted text-small">
              ${lastChecked ? 'Last checked: ' + new Date(lastChecked).toLocaleString() : 'Not checked yet'}
            </div>
          </div>

          <div class="terminal-config-details">
            <div>
              <span class="form-label">TPN (Terminal Processing Number):</span>
              <div class="terminal-config-value">${cpConfig.tpn || 'Not configured'}</div>
            </div>
            <div>
              <span class="form-label">Register ID:</span>
              <div class="terminal-config-value">${cpConfig.register_id || 'Not configured'}</div>
            </div>
            <div>
              <span class="form-label">Auth Key:</span>
              <div class="terminal-config-value">${cpConfig.auth_key ? '••••••••' + cpConfig.auth_key.slice(-8) : 'Not configured'}</div>
            </div>
            <div>
              <span class="form-label">Terminal Name:</span>
              <div class="terminal-config-value">${cardPresent.name || 'N/A'}</div>
            </div>
            <div>
              <span class="form-label">Location:</span>
              <div class="terminal-config-value">${cardPresent.location || 'N/A'}</div>
            </div>
          </div>
          
          <button class="btn" onclick="SettingsScreen.checkTerminalStatus('${cardPresent.id}')">
            Refresh Terminal Status
          </button>
          
          <div id="terminalStatusResult-${cardPresent.id}" style="margin-top: 15px;"></div>
        </div>
      `;
    }

    html += '</div>';
    return html;
  },

  renderPOSPreferencesTab() {
    const prefs = this.loadPOSPreferences();
    const currentLayout = App.currentUser?.layout_preference || 'commerce';
    const currentTheme = App.getCurrentTheme();

    return `
      <div class="settings-page-header">
        <h2 class="settings-page-title">POS Preferences</h2>
        <p class="settings-page-subtitle">Configure point of sale behavior and settings</p>
      </div>
      
      <div class="section-container">
        <h3 class="section-header">Appearance</h3>
        
        <div class="theme-toggle-container">
          <div class="theme-toggle-label">
            <div style="font-size: 16px; margin-bottom: 4px;">Theme</div>
            <div class="text-muted text-small">Choose your preferred color scheme</div>
          </div>
          
          <div class="theme-icons">
            <span style="opacity: ${currentTheme === 'light' ? '1' : '0.4'}">☀️</span>
            <div class="theme-toggle-switch ${currentTheme === 'dark' ? 'active' : ''}" onclick="SettingsScreen.toggleTheme()">
              <div class="theme-toggle-slider"></div>
            </div>
            <span style="opacity: ${currentTheme === 'dark' ? '1' : '0.4'}">🌙</span>
          </div>
        </div>
      </div>
      
      <div class="section-container">
        <h3 class="section-header">Layout Preference</h3>
        
        <div class="layout-preview-container">
          <div class="layout-preview-option ${currentLayout === 'commerce' ? 'selected' : ''}" onclick="SettingsScreen.selectLayout('commerce')">
            <div class="layout-preview-label">Commerce Layout</div>
            <div class="layout-preview-sketch layout-preview-commerce">
              <div class="preview-products">
                <div class="preview-product-box"></div>
                <div class="preview-product-box"></div>
                <div class="preview-product-box"></div>
                <div class="preview-product-box"></div>
                <div class="preview-product-box"></div>
                <div class="preview-product-box"></div>
              </div>
              <div class="preview-cart"></div>
            </div>
            <div class="text-center text-small text-muted" style="margin-top: 8px;">Products left, cart right</div>
          </div>
          
          <div class="layout-preview-option ${currentLayout === 'carord' ? 'selected' : ''}" onclick="SettingsScreen.selectLayout('carord')">
            <div class="layout-preview-label">Carord Layout</div>
            <div class="layout-preview-sketch layout-preview-carord">
              <div class="preview-cart"></div>
              <div class="preview-products">
                <div class="preview-product-box"></div>
                <div class="preview-product-box"></div>
                <div class="preview-product-box"></div>
                <div class="preview-product-box"></div>
                <div class="preview-product-box"></div>
                <div class="preview-product-box"></div>
              </div>
            </div>
            <div class="text-center text-small text-muted" style="margin-top: 8px;">Cart left, products right</div>
          </div>
        </div>
      </div>
      
      <div class="section-container">
        <h3 class="section-header">Payment Received Screen</h3>
        
        <div style="margin-bottom: 25px;">
          <label class="payment-method-option">
            <input type="checkbox" id="autoCloseCheckbox" ${prefs.autoClose ? 'checked' : ''} onchange="SettingsScreen.updateAutoClose()" style="width: 20px; height: 20px; cursor: pointer;" />
            <span class="text-primary">Automatically close payment received screen</span>
          </label>
        </div>
        
        <div id="autoCloseDelaySection" style="margin-bottom: 25px; ${prefs.autoClose ? '' : 'opacity: 0.4; pointer-events: none;'}">
          <label class="form-label">Close after (seconds):</label>
          <div class="auto-close-delay-grid">
            ${[3, 5, 10, 15, 20, 30, 60, 90]
              .map(
                (seconds) => `
              <button onclick="SettingsScreen.setAutoCloseDelay(${seconds})" class="auto-close-delay-btn ${prefs.autoCloseDelay === seconds ? 'active' : ''}">
                ${seconds}s
              </button>
            `
              )
              .join('')}
          </div>
        </div>
        
        <div class="info-notice">
          <div class="info-notice-content">
            <strong>ℹ️ Note:</strong> These settings control how the payment received screen behaves after completing a transaction. When auto-close is enabled, the screen will automatically close and reset the POS for the next transaction.
          </div>
        </div>
      </div>
    `;
  },

  updateAutoClose() {
    const checkbox = document.getElementById('autoCloseCheckbox');
    const prefs = this.loadPOSPreferences();
    this.savePOSPreferences(checkbox.checked, prefs.autoCloseDelay);
    this.render();
  },

  setAutoCloseDelay(seconds) {
    const prefs = this.loadPOSPreferences();
    this.savePOSPreferences(prefs.autoClose, seconds);
    this.render();
  },

  async selectLayout(layout) {
    const success = await App.updateLayoutPreference(layout);
    if (success) {
      this.render();
    } else {
      alert('Failed to update layout preference');
    }
  },

  toggleTheme() {
    App.toggleTheme();
    this.render();
  },

  async loadTerminals() {
    if (!App.currentWinery) return;

    try {
      const response = await fetch(
        `/.netlify/functions/get-winery-terminals?winery_id=${App.currentWinery.id}`
      );
      const data = await response.json();

      if (data.success) {
        this.terminals = data.terminals;
      }
    } catch (error) {
      this.terminals = [];
    }
  },

  async checkTerminalStatus(terminalId, silent = false) {
    const terminal = this.terminals.find((t) => t.id === terminalId);
    const resultDiv = document.getElementById(`terminalStatusResult-${terminalId}`);

    if (!terminal) {
      if (resultDiv) {
        resultDiv.innerHTML = `
          <div class="alert-error">
            <h4>Error</h4>
            <pre class="alert-pre">Terminal not found</pre>
          </div>
        `;
      }
      return;
    }

    const config = terminal.processor_terminal_config || {};

    if (!silent && resultDiv) {
      resultDiv.innerHTML = `
        <div class="alert-info">
          <h4>Checking terminal status...</h4>
        </div>
      `;
    }

    const requestBody = {
      register_id: config.register_id,
      auth_key: config.auth_key,
      tpn: config.tpn,
    };

    try {
      const response = await fetch('/.netlify/functions/check-spin-terminal-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      // Store status and timestamp
      if (result.success && result.data) {
        this.terminalStatuses[terminalId] = result.data;
        this.lastChecked[terminalId] = new Date().toISOString();
      }

      // Re-render to update status indicator
      this.render();

      if (!silent && resultDiv) {
        if (result.success) {
          const status = result.data.TerminalStatus;
          let alertClass = 'alert-warning';

          if (status === 'Online') {
            alertClass = 'alert-success';
          } else if (status === 'Offline') {
            alertClass = 'alert-error';
          }

          resultDiv.innerHTML = `
            <div class="${alertClass}">
              <h4>Terminal Status: ${status}</h4>
              <pre class="alert-pre">${JSON.stringify(result.data, null, 2)}</pre>
            </div>
          `;
        } else {
          resultDiv.innerHTML = `
            <div class="alert-warning">
              <h4>Warning</h4>
              <pre class="alert-pre">${result.error}\n\nDetails: ${result.details || 'None'}</pre>
            </div>
          `;
        }
      }
    } catch (error) {
      if (!silent && resultDiv) {
        resultDiv.innerHTML = `
          <div class="alert-error">
            <h4>Error</h4>
            <pre class="alert-pre">${error.message}</pre>
          </div>
        `;
      }
    }
  },

  async checkAllTerminalStatuses() {
    // Silently check all terminal statuses on screen load
    const cardPresentTerminals = this.terminals.filter((t) => t.terminal_type === 'card_present');
    for (const terminal of cardPresentTerminals) {
      await this.checkTerminalStatus(terminal.id, true);
    }
  },

  renderTerminalTimeoutTab() {
    const dbPersistTimeout = parseInt(localStorage.getItem('terminalDbPersistTimeout') || '20');
    const statusCheckTimeout = parseInt(
      localStorage.getItem('terminalStatusCheckTimeout') || '120'
    );
    const pollInterval = parseInt(localStorage.getItem('terminalPollInterval') || '5');
    const maxWait = parseInt(localStorage.getItem('terminalMaxWait') || '180');
    const showDetails = localStorage.getItem('terminalShowDetails') !== 'false';
    const enablePolling = localStorage.getItem('terminalEnablePolling') !== 'false';

    return `
      <div class="settings-page-header">
        <h2 class="settings-page-title">Terminal Transaction Settings</h2>
      </div>
      
      <div class="info-notice" style="margin-bottom: 20px;">
        <p style="margin: 0;">
          These settings control how the POS handles long-running terminal transactions to avoid timeout errors.
          Adjust these based on your terminal response times and network conditions.
        </p>
      </div>

      <div class="section-container">
        <label class="form-label font-bold">Enable Transaction Polling</label>
        <p class="text-muted text-small" style="margin-bottom: 10px;">
          Enable polling to track terminal transactions longer than 20 seconds (default: Yes)
        </p>
        <div class="toggle-button-group">
          <button onclick="SettingsScreen.setTerminalEnablePolling(true)"
                  class="toggle-button ${enablePolling ? 'active' : ''}">
            Enabled
          </button>
          <button onclick="SettingsScreen.setTerminalEnablePolling(false)"
                  class="toggle-button ${!enablePolling ? 'active' : ''}">
            Disabled
          </button>
        </div>
        ${
          !enablePolling
            ? `
        <div class="alert-warning" style="margin-top: 15px;">
          <p style="margin: 0; line-height: 1.5;">
            <strong>⚠️ Warning:</strong> With polling disabled, transactions longer than 20 seconds will return an error immediately. 
            The transaction may still complete on the terminal, but the POS won't track it automatically.
          </p>
        </div>
        `
            : ''
        }
      </div>

      <div class="section-container">
        <label class="form-label font-bold">Database Persist Timeout</label>
        <p class="text-muted text-small" style="margin-bottom: 10px;">
          Save transaction state after this many seconds to avoid function timeout (default: 20s)
        </p>
        <div class="timeout-button-grid" style="grid-template-columns: repeat(3, 1fr); max-width: 400px;">
          ${[15, 20, 25]
            .map(
              (seconds) => `
            <button onclick="SettingsScreen.setTerminalTimeout('terminalDbPersistTimeout', ${seconds})"
                    class="timeout-button ${dbPersistTimeout === seconds ? 'active' : ''}">
              ${seconds}s
            </button>
          `
            )
            .join('')}
        </div>
      </div>

      <div class="section-container">
        <label class="form-label font-bold">SPIN Status Check Timeout</label>
        <p class="text-muted text-small" style="margin-bottom: 10px;">
          Check Dejavoo Status API after this many seconds if no response (default: 120s)
        </p>
        <div class="timeout-button-grid" style="grid-template-columns: repeat(4, 1fr); max-width: 500px;">
          ${[90, 120, 150, 180]
            .map(
              (seconds) => `
            <button onclick="SettingsScreen.setTerminalTimeout('terminalStatusCheckTimeout', ${seconds})"
                    class="timeout-button ${statusCheckTimeout === seconds ? 'active' : ''}">
              ${seconds}s
            </button>
          `
            )
            .join('')}
        </div>
      </div>

      <div class="section-container">
        <label class="form-label font-bold">Frontend Poll Interval</label>
        <p class="text-muted text-small" style="margin-bottom: 10px;">
          How often to check transaction status (default: 5s)
        </p>
        <div class="timeout-button-grid" style="grid-template-columns: repeat(3, 1fr); max-width: 400px;">
          ${[3, 5, 10]
            .map(
              (seconds) => `
            <button onclick="SettingsScreen.setTerminalTimeout('terminalPollInterval', ${seconds})"
                    class="timeout-button ${pollInterval === seconds ? 'active' : ''}">
              ${seconds}s
            </button>
          `
            )
            .join('')}
        </div>
      </div>

      <div class="section-container">
        <label class="form-label font-bold">Maximum Total Wait</label>
        <p class="text-muted text-small" style="margin-bottom: 10px;">
          Give up and show manual check button after this many seconds (default: 180s)
        </p>
        <div class="timeout-button-grid" style="grid-template-columns: repeat(5, 1fr); max-width: 600px;">
          ${[60, 90, 120, 180, 240]
            .map(
              (seconds) => `
            <button onclick="SettingsScreen.setTerminalTimeout('terminalMaxWait', ${seconds})"
                    class="timeout-button ${maxWait === seconds ? 'active' : ''}">
              ${seconds}s
            </button>
          `
            )
            .join('')}
        </div>
      </div>

      <div class="section-container">
        <label class="form-label font-bold">Show Terminal Processing Details</label>
        <p class="text-muted text-small" style="margin-bottom: 10px;">
          Show elapsed time and status updates to cashier (default: Yes)
        </p>
        <div class="toggle-button-group">
          <button onclick="SettingsScreen.setTerminalShowDetails(true)"
                  class="toggle-button ${showDetails ? 'active' : ''}">
            Yes
          </button>
          <button onclick="SettingsScreen.setTerminalShowDetails(false)"
                  class="toggle-button ${!showDetails ? 'active' : ''}">
            No
          </button>
        </div>
      </div>

      <div class="section-container">
        <button onclick="SettingsScreen.resetTerminalTimeoutDefaults()" class="btn btn-secondary">
          Reset to Defaults
        </button>
      </div>

      <div class="info-notice">
        <strong>ℹ️ How It Works:</strong>
        <ul style="margin-top: 10px; line-height: 1.8;">
          <li><strong>Fast transactions (&lt;20s):</strong> Work exactly as before with no changes</li>
          <li><strong>Medium transactions (20-120s):</strong> Saved to database, frontend polls for status</li>
          <li><strong>Slow transactions (&gt;120s):</strong> Automatic SPIN Status API check, then continue polling</li>
          <li><strong>Very slow transactions:</strong> Manual check button appears after max wait time</li>
        </ul>
      </div>
    `;
  },

  setTerminalTimeout(setting, value) {
    localStorage.setItem(setting, value.toString());
    this.render();
  },

  setTerminalShowDetails(value) {
    localStorage.setItem('terminalShowDetails', value.toString());
    this.render();
  },

  setTerminalEnablePolling(value) {
    localStorage.setItem('terminalEnablePolling', value.toString());
    this.render();
  },

  resetTerminalTimeoutDefaults() {
    if (confirm('Reset all terminal timeout settings to defaults?')) {
      localStorage.setItem('terminalDbPersistTimeout', '20');
      localStorage.setItem('terminalStatusCheckTimeout', '120');
      localStorage.setItem('terminalPollInterval', '5');
      localStorage.setItem('terminalMaxWait', '180');
      localStorage.setItem('terminalShowDetails', 'true');
      localStorage.setItem('terminalEnablePolling', 'true');
      this.render();
    }
  },

  renderLoadingState() {
    return `
      <div style="padding: 20px;">
        <div class="skeleton-box" style="height: 28px; width: 200px; margin-bottom: 10px;"></div>
        <div class="skeleton-box" style="height: 16px; width: 300px; margin-bottom: 30px;"></div>

        <div style="display: flex; flex-direction: column; gap: 15px;">
          ${Array(3)
            .fill(0)
            .map(
              () => `
            <div class="section-container">
              <div class="skeleton-box" style="height: 20px; width: 150px; margin-bottom: 10px;"></div>
              <div class="skeleton-box" style="height: 14px; width: 200px;"></div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  },

  async toggleAutoLogout(enabled) {
    if (!App.currentUser) return;

    try {
      const response = await fetch('/.netlify/functions/update-employee-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: App.currentUser.id,
          auto_logout_enabled: enabled,
        }),
      });

      const data = await response.json();
      if (data.success) {
        App.currentUser.auto_logout_enabled = enabled;
        if (enabled) {
          App.startAutoLogoutTimer();
        } else {
          App.stopAutoLogoutTimer();
        }
        this.render();
      }
    } catch (error) {
      console.error('Error updating auto-logout setting:', error);
      alert('Failed to update auto-logout setting');
    }
  },

  async updateAutoLogoutMinutes(minutes) {
    if (!App.currentUser) return;

    try {
      const response = await fetch('/.netlify/functions/update-employee-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: App.currentUser.id,
          auto_logout_minutes: minutes,
        }),
      });

      const data = await response.json();
      if (data.success) {
        App.currentUser.auto_logout_minutes = minutes;
        App.startAutoLogoutTimer();
      }
    } catch (error) {
      console.error('Error updating auto-logout minutes:', error);
      alert('Failed to update auto-logout minutes');
    }
  },
};
