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
      <div style="display: flex; gap: 0; height: 100%;">
        <!-- Left Sidebar -->
        <div style="width: 220px; background: rgba(0, 0, 0, 0.3); border-right: 1px solid rgba(255, 255, 255, 0.1); padding: 20px 0;">
          ${this.renderSidebarMenu()}
        </div>
        
        <!-- Right Content -->
        <div style="flex: 1; padding: 30px; overflow-y: auto;">
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
      <div onclick="SettingsScreen.switchTab('${item.id}')" style="
        padding: 15px 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        color: ${this.currentTab === item.id ? '#f39c12' : '#95a5a6'};
        background: ${this.currentTab === item.id ? 'rgba(243, 156, 18, 0.15)' : 'transparent'};
        border-left: 3px solid ${this.currentTab === item.id ? '#f39c12' : 'transparent'};
        transition: all 0.2s ease;
      " onmouseover="if('${this.currentTab}' !== '${item.id}') this.style.background='rgba(255, 255, 255, 0.05)'" onmouseout="if('${this.currentTab}' !== '${item.id}') this.style.background='transparent'">
        <span style="font-size: 20px;">${item.icon}</span>
        <span style="font-size: 15px; font-weight: 500;">${item.label}</span>
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
    if (!App.currentWinery) return '<p style="color: #95a5a6;">No winery selected</p>';

    if (this.loadingState.terminals) {
      return this.renderLoadingState();
    }

    return `
      <h2 style="color: #f39c12; margin-bottom: 10px; font-size: 28px;">General Settings</h2>
      <p style="color: #95a5a6; margin-bottom: 30px;">Winery information and configuration</p>
      
      <div style="background: rgba(255, 255, 255, 0.03); padding: 25px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
        <h3 style="color: #e8e8e8; margin-bottom: 20px; font-size: 18px;">Winery Information</h3>
        
        <div style="display: grid; gap: 20px;">
          <div>
            <label style="display: block; color: #95a5a6; font-size: 12px; margin-bottom: 8px;">Winery Name</label>
            <div style="color: #e8e8e8; font-size: 16px;">${App.currentWinery.name || 'N/A'}</div>
          </div>
          
          <div>
            <label style="display: block; color: #95a5a6; font-size: 12px; margin-bottom: 8px;">Location</label>
            <div style="color: #e8e8e8; font-size: 16px;">${App.currentWinery.location || 'N/A'}</div>
          </div>
          
          <div>
            <label style="display: block; color: #95a5a6; font-size: 12px; margin-bottom: 8px;">Current User</label>
            <div style="color: #e8e8e8; font-size: 16px;">${App.currentUser?.name || App.currentUser?.email || 'N/A'}</div>
          </div>
          
          <div>
            <label style="display: block; color: #95a5a6; font-size: 12px; margin-bottom: 8px;">User Role</label>
            <div style="color: #e8e8e8; font-size: 16px; text-transform: capitalize;">${App.currentUser?.role || 'N/A'}</div>
          </div>
        </div>
      </div>
    `;
  },

  renderUsersTab() {
    // This would be populated from a database query
    return `
      <h2 style="color: #f39c12; margin-bottom: 10px; font-size: 28px;">Users</h2>
      <p style="color: #95a5a6; margin-bottom: 30px;">Manage user accounts for this winery</p>
      
      <div style="background: rgba(255, 255, 255, 0.03); padding: 25px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="color: #e8e8e8; font-size: 18px;">User Accounts</h3>
          <button class="btn" style="padding: 10px 20px; font-size: 14px;">+ Add User</button>
        </div>
        
        <div style="color: #95a5a6; text-align: center; padding: 40px;">
          User management coming soon...
        </div>
      </div>
    `;
  },

  renderPaymentTypesTab() {
    const cardPresent = this.terminals.find((t) => t.terminal_type === 'card_present');
    const cardNotPresent = this.terminals.find((t) => t.terminal_type === 'card_not_present');
    const hasCreditCard = cardPresent || cardNotPresent;

    return `
      <h2 style="color: #f39c12; margin-bottom: 10px; font-size: 28px;">Payment Types</h2>
      <p style="color: #95a5a6; margin-bottom: 30px;">Configure accepted payment methods</p>
      
      <!-- Payment Method Selection -->
      <div style="background: rgba(255, 255, 255, 0.03); padding: 25px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1); margin-bottom: 20px;">
        <h3 style="color: #e8e8e8; margin-bottom: 20px; font-size: 18px;">Accepted Payment Methods</h3>
        
        <div style="display: grid; gap: 15px;">
          <label style="display: flex; align-items: center; gap: 12px; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 6px; cursor: pointer;">
            <input type="checkbox" ${hasCreditCard ? 'checked disabled' : 'disabled'} style="width: 20px; height: 20px; cursor: ${hasCreditCard ? 'not-allowed' : 'not-allowed'};" />
            <div style="flex: 1;">
              <div style="color: #e8e8e8; font-size: 16px; font-weight: 600;">💳 Credit/Debit Card</div>
              <div style="color: #95a5a6; font-size: 12px; margin-top: 4px;">
                ${hasCreditCard ? 'Configured and enabled' : 'Configure terminals below to enable'}
              </div>
            </div>
          </label>
          
          <label style="display: flex; align-items: center; gap: 12px; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 6px; cursor: pointer;">
            <input type="checkbox" ${this.paymentTypes.cash ? 'checked' : ''} onchange="SettingsScreen.togglePaymentType('cash')" style="width: 20px; height: 20px; cursor: pointer;" />
            <div style="flex: 1;">
              <div style="color: #e8e8e8; font-size: 16px; font-weight: 600;">💵 Cash</div>
              <div style="color: #95a5a6; font-size: 12px; margin-top: 4px;">Accept cash payments at POS</div>
            </div>
          </label>
          
          <label style="display: flex; align-items: center; gap: 12px; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 6px; cursor: pointer;">
            <input type="checkbox" ${this.paymentTypes.check ? 'checked' : ''} onchange="SettingsScreen.togglePaymentType('check')" style="width: 20px; height: 20px; cursor: pointer;" />
            <div style="flex: 1;">
              <div style="color: #e8e8e8; font-size: 16px; font-weight: 600;">🏦 Check</div>
              <div style="color: #95a5a6; font-size: 12px; margin-top: 4px;">Accept check payments at POS</div>
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
      <div style="background: rgba(255, 255, 255, 0.03); padding: 25px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1); margin-bottom: 20px;">
        <h3 style="color: #e8e8e8; margin-bottom: 20px; font-size: 18px;">Credit Card Configuration</h3>
    `;

    // Card Not Present Section
    if (cardNotPresent) {
      const cnpConfig = cardNotPresent.processor_terminal_config || {};
      html += `
        <div style="margin-bottom: 30px; padding: 20px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
          <h4 style="color: #f39c12; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
            <span>🌐</span> Card Not Present (Online/E-Commerce)
          </h4>
          <div style="display: grid; gap: 15px;">
            <div>
              <span style="color: #95a5a6; font-size: 12px;">Merchant ID:</span>
              <div style="color: #e8e8e8; font-family: monospace; margin-top: 4px; font-size: 14px;">${cnpConfig.merchant_id || 'Not configured'}</div>
            </div>
            <div>
              <span style="color: #95a5a6; font-size: 12px;">Auth Token:</span>
              <div style="color: #e8e8e8; font-family: monospace; margin-top: 4px; font-size: 11px; word-break: break-all;">${cnpConfig.ftd_security_key ? '••••••••' + cnpConfig.ftd_security_key.slice(-8) : 'Not configured'}</div>
            </div>
            <div>
              <span style="color: #95a5a6; font-size: 12px;">Environment:</span>
              <div style="color: #e8e8e8; margin-top: 4px; text-transform: uppercase; font-size: 14px;">${cardNotPresent.api_environment || 'sandbox'}</div>
            </div>
            <div>
              <span style="color: #95a5a6; font-size: 12px;">Location:</span>
              <div style="color: #e8e8e8; margin-top: 4px; font-size: 14px;">${cardNotPresent.location || 'N/A'}</div>
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

      let statusIndicator = '';
      let statusText = 'Checking...';
      let statusColor = '#f39c12';

      if (status) {
        if (status.TerminalStatus === 'Online') {
          statusIndicator =
            '<span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #2ecc71; margin-right: 8px;"></span>';
          statusText = 'Online';
          statusColor = '#2ecc71';
        } else if (status.TerminalStatus === 'Offline') {
          statusIndicator =
            '<span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #e74c3c; margin-right: 8px;"></span>';
          statusText = 'Offline';
          statusColor = '#e74c3c';
        } else {
          statusIndicator =
            '<span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #f39c12; margin-right: 8px;"></span>';
          statusText = status.TerminalStatus || 'Unknown';
        }
      }

      html += `
        <div style="padding: 20px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
          <h4 style="color: #f39c12; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
            <span>🪙</span> Card Present (Physical Terminal)
          </h4>
          
          <div style="margin-bottom: 15px; padding: 12px; background: rgba(255, 255, 255, 0.05); border-radius: 6px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center;">
              ${statusIndicator}
              <span style="color: ${statusColor}; font-weight: 600; font-size: 14px;">${statusText}</span>
            </div>
            <div style="color: #95a5a6; font-size: 11px;">
              ${lastChecked ? 'Last checked: ' + new Date(lastChecked).toLocaleString() : 'Not checked yet'}
            </div>
          </div>

          <div style="display: grid; gap: 15px; margin-bottom: 15px;">
            <div>
              <span style="color: #95a5a6; font-size: 12px;">TPN (Terminal Processing Number):</span>
              <div style="color: #e8e8e8; font-family: monospace; margin-top: 4px; font-size: 14px;">${cpConfig.tpn || 'Not configured'}</div>
            </div>
            <div>
              <span style="color: #95a5a6; font-size: 12px;">Register ID:</span>
              <div style="color: #e8e8e8; font-family: monospace; margin-top: 4px; font-size: 14px;">${cpConfig.register_id || 'Not configured'}</div>
            </div>
            <div>
              <span style="color: #95a5a6; font-size: 12px;">Auth Key:</span>
              <div style="color: #e8e8e8; font-family: monospace; margin-top: 4px; font-size: 14px;">${cpConfig.auth_key ? '••••••••' + cpConfig.auth_key.slice(-8) : 'Not configured'}</div>
            </div>
            <div>
              <span style="color: #95a5a6; font-size: 12px;">Terminal Name:</span>
              <div style="color: #e8e8e8; margin-top: 4px; font-size: 14px;">${cardPresent.name || 'N/A'}</div>
            </div>
            <div>
              <span style="color: #95a5a6; font-size: 12px;">Location:</span>
              <div style="color: #e8e8e8; margin-top: 4px; font-size: 14px;">${cardPresent.location || 'N/A'}</div>
            </div>
          </div>
          
          <button class="btn" onclick="SettingsScreen.checkTerminalStatus('${cardPresent.id}')" style="font-size: 14px;">
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

    return `
      <h2 style="color: #f39c12; margin-bottom: 10px; font-size: 28px;">POS Preferences</h2>
      <p style="color: #95a5a6; margin-bottom: 30px;">Configure point of sale behavior and settings</p>
      
      <div style="background: rgba(255, 255, 255, 0.03); padding: 25px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1); margin-bottom: 20px;">
        <h3 style="color: #e8e8e8; margin-bottom: 20px; font-size: 18px;">Layout Preference</h3>
        
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
            <div style="text-align: center; margin-top: 8px; font-size: 12px; color: #95a5a6;">Products left, cart right</div>
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
            <div style="text-align: center; margin-top: 8px; font-size: 12px; color: #95a5a6;">Cart left, products right</div>
          </div>
        </div>
      </div>
      
      <div style="background: rgba(255, 255, 255, 0.03); padding: 25px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
        <h3 style="color: #e8e8e8; margin-bottom: 20px; font-size: 18px;">Payment Received Screen</h3>
        
        <div style="margin-bottom: 25px;">
          <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 6px;">
            <input type="checkbox" id="autoCloseCheckbox" ${prefs.autoClose ? 'checked' : ''} onchange="SettingsScreen.updateAutoClose()" style="width: 20px; height: 20px; cursor: pointer;" />
            <span style="color: #e8e8e8; font-size: 16px;">Automatically close payment received screen</span>
          </label>
        </div>
        
        <div id="autoCloseDelaySection" style="margin-bottom: 25px; ${prefs.autoClose ? '' : 'opacity: 0.4; pointer-events: none;'}">
          <label style="color: #95a5a6; font-size: 14px; margin-bottom: 10px; display: block;">Close after (seconds):</label>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
            ${[3, 5, 10, 15, 20, 30, 60, 90]
              .map(
                (seconds) => `
              <button onclick="SettingsScreen.setAutoCloseDelay(${seconds})" style="
                padding: 12px;
                background: ${prefs.autoCloseDelay === seconds ? 'rgba(243, 156, 18, 0.3)' : 'rgba(255, 255, 255, 0.05)'};
                border: 2px solid ${prefs.autoCloseDelay === seconds ? '#f39c12' : 'rgba(255, 255, 255, 0.1)'};
                border-radius: 6px;
                color: ${prefs.autoCloseDelay === seconds ? '#f39c12' : '#e8e8e8'};
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
              " onmouseover="if(${prefs.autoCloseDelay !== seconds}) this.style.background='rgba(255, 255, 255, 0.1)'" onmouseout="if(${prefs.autoCloseDelay !== seconds}) this.style.background='rgba(255, 255, 255, 0.05)'">
                ${seconds}s
              </button>
            `
              )
              .join('')}
          </div>
        </div>
        
        <div style="padding: 15px; background: rgba(52, 152, 219, 0.1); border: 1px solid rgba(52, 152, 219, 0.3); border-radius: 6px;">
          <div style="color: #3498db; font-size: 14px;">
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
      console.error('Failed to load terminals:', error);
      this.terminals = [];
    }
  },

  async checkTerminalStatus(terminalId, silent = false) {
    const terminal = this.terminals.find((t) => t.id === terminalId);
    const resultDiv = document.getElementById(`terminalStatusResult-${terminalId}`);

    console.log('🔍 checkTerminalStatus called');
    console.log('  - terminalId:', terminalId);
    console.log('  - silent:', silent);
    console.log('  - terminal found:', !!terminal);

    if (!terminal) {
      console.error('❌ Terminal not found');
      if (resultDiv) {
        resultDiv.innerHTML = `
          <div style="padding: 15px; background: rgba(231, 76, 60, 0.1); border: 1px solid rgba(231, 76, 60, 0.3); border-radius: 6px;">
            <h4 style="color: #e74c3c; margin-bottom: 8px;">Error</h4>
            <pre style="color: #e8e8e8; white-space: pre-wrap; font-size: 12px;">Terminal not found</pre>
          </div>
        `;
      }
      return;
    }

    const config = terminal.processor_terminal_config || {};

    console.log('📋 Terminal details:');
    console.log('  - TPN:', config.tpn);
    console.log('  - Register ID:', config.register_id);
    console.log('  - Auth Key:', config.auth_key ? 'present' : 'missing');

    if (!silent && resultDiv) {
      resultDiv.innerHTML = `
        <div style="padding: 15px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px;">
          <h4 style="color: #f39c12; margin-bottom: 8px;">Checking terminal status...</h4>
        </div>
      `;
    }

    const requestBody = {
      register_id: config.register_id,
      auth_key: config.auth_key,
      tpn: config.tpn,
    };

    console.log('📤 Sending request to check-spin-terminal-status');

    try {
      const response = await fetch('/.netlify/functions/check-spin-terminal-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📨 Response status:', response.status);
      const result = await response.json();
      console.log('📨 Response body:', JSON.stringify(result, null, 2));

      // Store status and timestamp
      if (result.success && result.data) {
        this.terminalStatuses[terminalId] = result.data;
        this.lastChecked[terminalId] = new Date().toISOString();
        console.log('✅ Status stored:', result.data.TerminalStatus);
      }

      // Re-render to update status indicator
      this.render();

      if (!silent && resultDiv) {
        if (result.success) {
          const status = result.data.TerminalStatus;
          let statusColor = '#f39c12';
          let statusBg = 'rgba(243, 156, 18, 0.1)';
          let statusBorder = 'rgba(243, 156, 18, 0.3)';

          if (status === 'Online') {
            statusColor = '#2ecc71';
            statusBg = 'rgba(46, 204, 113, 0.1)';
            statusBorder = 'rgba(46, 204, 113, 0.3)';
          } else if (status === 'Offline') {
            statusColor = '#e74c3c';
            statusBg = 'rgba(231, 76, 60, 0.1)';
            statusBorder = 'rgba(231, 76, 60, 0.3)';
          }

          resultDiv.innerHTML = `
            <div style="padding: 15px; background: ${statusBg}; border: 1px solid ${statusBorder}; border-radius: 6px;">
              <h4 style="color: ${statusColor}; margin-bottom: 8px;">Terminal Status: ${status}</h4>
              <pre style="color: #e8e8e8; white-space: pre-wrap; font-size: 12px; max-height: 300px; overflow-y: auto;">${JSON.stringify(result.data, null, 2)}</pre>
            </div>
          `;
        } else {
          console.error('❌ Request failed:', result);
          resultDiv.innerHTML = `
            <div style="padding: 15px; background: rgba(243, 156, 18, 0.1); border: 1px solid rgba(243, 156, 18, 0.3); border-radius: 6px;">
              <h4 style="color: #f39c12; margin-bottom: 8px;">Warning</h4>
              <pre style="color: #e8e8e8; white-space: pre-wrap; font-size: 12px;">${result.error}\n\nDetails: ${result.details || 'None'}</pre>
            </div>
          `;
        }
      }
    } catch (error) {
      console.error('💥 Error checking terminal status:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

      if (!silent && resultDiv) {
        resultDiv.innerHTML = `
          <div style="padding: 15px; background: rgba(231, 76, 60, 0.1); border: 1px solid rgba(231, 76, 60, 0.3); border-radius: 6px;">
            <h4 style="color: #e74c3c; margin-bottom: 8px;">Error</h4>
            <pre style="color: #e8e8e8; white-space: pre-wrap; font-size: 12px;">${error.message}</pre>
          </div>
        `;
      }
    }
  },

  async checkAllTerminalStatuses() {
    // Silently check all terminal statuses on screen load
    const cardPresentTerminals = this.terminals.filter((t) => t.terminal_type === 'card_present');
    for (const terminal of cardPresentTerminals) {
      await this.checkTerminalStatus(terminal.id, true); // silent=true
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
      <h2 style="color: #8b7355; margin-bottom: 20px; font-size: 28px;">Terminal Transaction Settings</h2>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <p style="color: #666; line-height: 1.6; margin: 0;">
          These settings control how the POS handles long-running terminal transactions to avoid timeout errors.
          Adjust these based on your terminal response times and network conditions.
        </p>
      </div>

      <div style="margin-bottom: 30px;">
        <label style="display: block; color: #8b7355; font-weight: bold; margin-bottom: 10px;">
          Enable Transaction Polling
        </label>
        <p style="color: #666; font-size: 14px; margin-bottom: 10px;">
          Enable polling to track terminal transactions longer than 20 seconds (default: Yes)
        </p>
        <div style="display: flex; gap: 10px; max-width: 300px;">
          <button onclick="SettingsScreen.setTerminalEnablePolling(true)"
                  style="padding: 12px 24px; border: 2px solid ${enablePolling ? '#8b7355' : '#ddd'};
                         background: ${enablePolling ? '#8b7355' : 'white'};
                         color: ${enablePolling ? 'white' : '#666'};
                         border-radius: 5px; cursor: pointer; font-family: Georgia, serif;
                         font-weight: ${enablePolling ? 'bold' : 'normal'}; flex: 1;">
            Enabled
          </button>
          <button onclick="SettingsScreen.setTerminalEnablePolling(false)"
                  style="padding: 12px 24px; border: 2px solid ${!enablePolling ? '#8b7355' : '#ddd'};
                         background: ${!enablePolling ? '#8b7355' : 'white'};
                         color: ${!enablePolling ? 'white' : '#666'};
                         border-radius: 5px; cursor: pointer; font-family: Georgia, serif;
                         font-weight: ${!enablePolling ? 'bold' : 'normal'}; flex: 1;">
            Disabled
          </button>
        </div>
        ${
          !enablePolling
            ? `
        <div style="background: #ffe0e0; padding: 12px; border-radius: 6px; border-left: 4px solid #e74c3c; margin-top: 15px;">
          <p style="color: #c0392b; font-size: 13px; margin: 0; line-height: 1.5;">
            <strong>⚠️ Warning:</strong> With polling disabled, transactions longer than 20 seconds will return an error immediately. 
            The transaction may still complete on the terminal, but the POS won't track it automatically.
          </p>
        </div>
        `
            : ''
        }
      </div>

      <div style="margin-bottom: 30px;">
        <label style="display: block; color: #8b7355; font-weight: bold; margin-bottom: 10px;">
          Database Persist Timeout
        </label>
        <p style="color: #666; font-size: 14px; margin-bottom: 10px;">
          Save transaction state after this many seconds to avoid function timeout (default: 20s)
        </p>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 400px;">
          ${[15, 20, 25]
            .map(
              (seconds) => `
            <button onclick="SettingsScreen.setTerminalTimeout('terminalDbPersistTimeout', ${seconds})"
                    style="padding: 12px; border: 2px solid ${dbPersistTimeout === seconds ? '#8b7355' : '#ddd'};
                           background: ${dbPersistTimeout === seconds ? '#8b7355' : 'white'};
                           color: ${dbPersistTimeout === seconds ? 'white' : '#666'};
                           border-radius: 5px; cursor: pointer; font-family: Georgia, serif;
                           font-weight: ${dbPersistTimeout === seconds ? 'bold' : 'normal'};">
              ${seconds}s
            </button>
          `
            )
            .join('')}
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <label style="display: block; color: #8b7355; font-weight: bold; margin-bottom: 10px;">
          SPIN Status Check Timeout
        </label>
        <p style="color: #666; font-size: 14px; margin-bottom: 10px;">
          Check Dejavoo Status API after this many seconds if no response (default: 120s)
        </p>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; max-width: 500px;">
          ${[90, 120, 150, 180]
            .map(
              (seconds) => `
            <button onclick="SettingsScreen.setTerminalTimeout('terminalStatusCheckTimeout', ${seconds})"
                    style="padding: 12px; border: 2px solid ${statusCheckTimeout === seconds ? '#8b7355' : '#ddd'};
                           background: ${statusCheckTimeout === seconds ? '#8b7355' : 'white'};
                           color: ${statusCheckTimeout === seconds ? 'white' : '#666'};
                           border-radius: 5px; cursor: pointer; font-family: Georgia, serif;
                           font-weight: ${statusCheckTimeout === seconds ? 'bold' : 'normal'};">
              ${seconds}s
            </button>
          `
            )
            .join('')}
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <label style="display: block; color: #8b7355; font-weight: bold; margin-bottom: 10px;">
          Frontend Poll Interval
        </label>
        <p style="color: #666; font-size: 14px; margin-bottom: 10px;">
          How often to check transaction status (default: 5s)
        </p>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 400px;">
          ${[3, 5, 10]
            .map(
              (seconds) => `
            <button onclick="SettingsScreen.setTerminalTimeout('terminalPollInterval', ${seconds})"
                    style="padding: 12px; border: 2px solid ${pollInterval === seconds ? '#8b7355' : '#ddd'};
                           background: ${pollInterval === seconds ? '#8b7355' : 'white'};
                           color: ${pollInterval === seconds ? 'white' : '#666'};
                           border-radius: 5px; cursor: pointer; font-family: Georgia, serif;
                           font-weight: ${pollInterval === seconds ? 'bold' : 'normal'};">
              ${seconds}s
            </button>
          `
            )
            .join('')}
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <label style="display: block; color: #8b7355; font-weight: bold; margin-bottom: 10px;">
          Maximum Total Wait
        </label>
        <p style="color: #666; font-size: 14px; margin-bottom: 10px;">
          Give up and show manual check button after this many seconds (default: 180s)
        </p>
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; max-width: 600px;">
          ${[60, 90, 120, 180, 240]
            .map(
              (seconds) => `
            <button onclick="SettingsScreen.setTerminalTimeout('terminalMaxWait', ${seconds})"
                    style="padding: 12px; border: 2px solid ${maxWait === seconds ? '#8b7355' : '#ddd'};
                           background: ${maxWait === seconds ? '#8b7355' : 'white'};
                           color: ${maxWait === seconds ? 'white' : '#666'};
                           border-radius: 5px; cursor: pointer; font-family: Georgia, serif;
                           font-weight: ${maxWait === seconds ? 'bold' : 'normal'};">
              ${seconds}s
            </button>
          `
            )
            .join('')}
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <label style="display: block; color: #8b7355; font-weight: bold; margin-bottom: 10px;">
          Show Terminal Processing Details
        </label>
        <p style="color: #666; font-size: 14px; margin-bottom: 10px;">
          Show elapsed time and status updates to cashier (default: Yes)
        </p>
        <div style="display: flex; gap: 10px; max-width: 300px;">
          <button onclick="SettingsScreen.setTerminalShowDetails(true)"
                  style="padding: 12px 24px; border: 2px solid ${showDetails ? '#8b7355' : '#ddd'};
                         background: ${showDetails ? '#8b7355' : 'white'};
                         color: ${showDetails ? 'white' : '#666'};
                         border-radius: 5px; cursor: pointer; font-family: Georgia, serif;
                         font-weight: ${showDetails ? 'bold' : 'normal'}; flex: 1;">
            Yes
          </button>
          <button onclick="SettingsScreen.setTerminalShowDetails(false)"
                  style="padding: 12px 24px; border: 2px solid ${!showDetails ? '#8b7355' : '#ddd'};
                         background: ${!showDetails ? '#8b7355' : 'white'};
                         color: ${!showDetails ? 'white' : '#666'};
                         border-radius: 5px; cursor: pointer; font-family: Georgia, serif;
                         font-weight: ${!showDetails ? 'bold' : 'normal'}; flex: 1;">
            No
          </button>
        </div>
      </div>

      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
        <button onclick="SettingsScreen.resetTerminalTimeoutDefaults()"
                style="padding: 12px 24px; background: #95a5a6; color: white; border: none;
                       border-radius: 5px; cursor: pointer; font-family: Georgia, serif;">
          Reset to Defaults
        </button>
      </div>

      <div style="background: #e8f4f8; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db; margin-top: 30px;">
        <strong style="color: #2c3e50;">ℹ️ How It Works:</strong>
        <ul style="color: #666; margin-top: 10px; line-height: 1.8;">
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
    console.log(`✅ Set ${setting} to ${value}`);
    this.render();
  },

  setTerminalShowDetails(value) {
    localStorage.setItem('terminalShowDetails', value.toString());
    console.log(`✅ Set terminalShowDetails to ${value}`);
    this.render();
  },

  setTerminalEnablePolling(value) {
    localStorage.setItem('terminalEnablePolling', value.toString());
    console.log(`✅ Set terminalEnablePolling to ${value}`);
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
      console.log('✅ Reset all terminal timeout settings to defaults');
      this.render();
    }
  },

  renderLoadingState() {
    return `
      <div style="padding: 20px;">
        <div style="
          height: 28px;
          width: 200px;
          margin-bottom: 10px;
          background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        "></div>
        
        <div style="
          height: 16px;
          width: 300px;
          margin-bottom: 30px;
          background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        "></div>

        <div style="display: flex; flex-direction: column; gap: 15px;">
          ${Array(3)
            .fill(0)
            .map(
              () => `
            <div style="
              background: rgba(255, 255, 255, 0.03);
              padding: 20px;
              border-radius: 8px;
              border: 1px solid rgba(255, 255, 255, 0.1);
            ">
              <div style="
                height: 20px;
                width: 150px;
                margin-bottom: 10px;
                background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: 4px;
              "></div>
              <div style="
                height: 14px;
                width: 200px;
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
  },
};
