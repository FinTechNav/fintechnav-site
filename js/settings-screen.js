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
    terminalStatuses: false,
  },

  async init() {
    this.loadingState.terminals = true;
    this.loadingState.paymentTypes = true;
    this.loadingState.terminalStatuses = true;
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
    this.loadingState.terminalStatuses = false;
    this.render();
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

  async loadTerminals() {
    if (!App.currentWinery) return;

    try {
      const response = await fetch(
        `/.netlify/functions/get-winery-terminals?winery_id=${App.currentWinery.id}`
      );
      const data = await response.json();

      if (data.success) {
        this.terminals = data.terminals || [];
      }
    } catch (error) {
      console.error('Failed to load terminals:', error);
      this.terminals = [];
    }
  },

  async checkAllTerminalStatuses() {
    if (this.terminals.length === 0) return;

    for (const terminal of this.terminals) {
      await this.checkTerminalStatus(terminal.id);
    }
  },

  async checkTerminalStatus(terminalId) {
    try {
      const response = await fetch(
        `/.netlify/functions/check-terminal-status?terminal_id=${terminalId}`
      );
      const data = await response.json();

      if (data.success) {
        this.terminalStatuses[terminalId] = {
          status: data.status,
          message: data.message,
        };
        this.lastChecked[terminalId] = new Date();
        this.render();
      }
    } catch (error) {
      console.error(`Failed to check status for terminal ${terminalId}:`, error);
      this.terminalStatuses[terminalId] = {
        status: 'error',
        message: 'Failed to check status',
      };
      this.render();
    }
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
    if (this.currentTab === 'general') {
      return this.renderGeneralTab();
    } else if (this.currentTab === 'users') {
      return this.renderUsersTab();
    } else if (this.currentTab === 'payment-types') {
      return this.renderPaymentTypesTab();
    } else if (this.currentTab === 'pos-preferences') {
      return this.renderPOSPreferencesTab();
    } else if (this.currentTab === 'terminal-timeout') {
      return this.renderTerminalTimeoutTab();
    }
    return '';
  },

  renderGeneralTab() {
    if (this.loadingState.terminals) {
      return this.renderLoadingState();
    }

    return `
      <div>
        <h2 style="color: #ecf0f1; margin-bottom: 10px;">Payment Terminals</h2>
        <p style="color: #95a5a6; margin-bottom: 30px;">Configure and manage payment terminal devices</p>

        ${this.terminals.length === 0 ? '<p style="color: #95a5a6;">No terminals configured</p>' : this.terminals.map((t) => this.renderTerminalCard(t)).join('')}
      </div>
    `;
  },

  renderUsersTab() {
    return `
      <div>
        <h2 style="color: #ecf0f1; margin-bottom: 10px;">User Management</h2>
        <p style="color: #95a5a6; margin-bottom: 30px;">Manage employees and their permissions</p>
        <p style="color: #95a5a6;">User management coming soon</p>
      </div>
    `;
  },

  renderPaymentTypesTab() {
    if (this.loadingState.paymentTypes) {
      return this.renderLoadingState();
    }

    return `
      <div>
        <h2 style="color: #ecf0f1; margin-bottom: 10px;">Payment Types</h2>
        <p style="color: #95a5a6; margin-bottom: 30px;">Enable or disable payment methods in POS</p>

        <div style="display: flex; flex-direction: column; gap: 15px; max-width: 500px;">
          <label style="
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 15px;
            background: #34495e;
            border-radius: 8px;
            cursor: pointer;
            border: 2px solid ${this.paymentTypes.cash ? '#27ae60' : 'rgba(255, 255, 255, 0.1)'};
          ">
            <input
              type="checkbox"
              ${this.paymentTypes.cash ? 'checked' : ''}
              onchange="SettingsScreen.togglePaymentType('cash')"
              style="width: 20px; height: 20px; cursor: pointer;"
            />
            <div style="flex: 1;">
              <div style="color: #ecf0f1; font-weight: 600; margin-bottom: 4px;">💵 Cash</div>
              <div style="color: #95a5a6; font-size: 13px;">Accept cash payments</div>
            </div>
          </label>

          <label style="
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 15px;
            background: #34495e;
            border-radius: 8px;
            cursor: pointer;
            border: 2px solid ${this.paymentTypes.check ? '#27ae60' : 'rgba(255, 255, 255, 0.1)'};
          ">
            <input
              type="checkbox"
              ${this.paymentTypes.check ? 'checked' : ''}
              onchange="SettingsScreen.togglePaymentType('check')"
              style="width: 20px; height: 20px; cursor: pointer;"
            />
            <div style="flex: 1;">
              <div style="color: #ecf0f1; font-weight: 600; margin-bottom: 4px;">📝 Check</div>
              <div style="color: #95a5a6; font-size: 13px;">Accept check payments</div>
            </div>
          </label>
        </div>
      </div>
    `;
  },

  renderPOSPreferencesTab() {
    const prefs = this.loadPOSPreferences();

    return `
      <div>
        <h2 style="color: #ecf0f1; margin-bottom: 10px;">POS Preferences</h2>
        <p style="color: #95a5a6; margin-bottom: 30px;">Customize POS behavior and settings</p>

        <div style="max-width: 600px;">
          <div style="
            background: #34495e;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
          ">
            <label style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px; cursor: pointer;">
              <input
                type="checkbox"
                id="autoClosePayment"
                ${prefs.autoClose ? 'checked' : ''}
                onchange="SettingsScreen.updatePOSPreferences()"
                style="width: 20px; height: 20px; cursor: pointer;"
              />
              <div>
                <div style="color: #ecf0f1; font-weight: 600; margin-bottom: 4px;">Auto-close payment screen</div>
                <div style="color: #95a5a6; font-size: 13px;">Automatically return to POS after successful payment</div>
              </div>
            </label>

            <div id="autoCloseDelaySection" style="margin-left: 32px; ${prefs.autoClose ? '' : 'display: none;'}">
              <label style="color: #95a5a6; font-size: 14px; display: block; margin-bottom: 8px;">
                Delay before closing (seconds)
              </label>
              <input
                type="number"
                id="autoCloseDelay"
                value="${prefs.autoCloseDelay}"
                min="1"
                max="30"
                onchange="SettingsScreen.updatePOSPreferences()"
                style="
                  width: 100px;
                  padding: 8px;
                  background: #2c3e50;
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  color: #ecf0f1;
                  border-radius: 4px;
                "
              />
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderTerminalTimeoutTab() {
    if (this.loadingState.terminals) {
      return this.renderLoadingState();
    }

    return `
      <div>
        <h2 style="color: #ecf0f1; margin-bottom: 10px;">Terminal Timeout Settings</h2>
        <p style="color: #95a5a6; margin-bottom: 30px;">Configure timeout handling for payment terminals</p>

        ${this.terminals.length === 0 ? '<p style="color: #95a5a6;">No terminals configured</p>' : this.terminals.map((t) => this.renderTimeoutSettings(t)).join('')}
      </div>
    `;
  },

  renderLoadingState() {
    return `
      <div style="padding: 20px;">
        <div style="
          height: 24px;
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
              background: #34495e;
              padding: 20px;
              border-radius: 8px;
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

  renderTerminalCard(terminal) {
    const status = this.terminalStatuses[terminal.id];
    const lastCheck = this.lastChecked[terminal.id];

    let statusIcon = '⚪';
    let statusColor = '#95a5a6';
    let statusText = 'Unknown';

    if (status) {
      if (status.status === 'online') {
        statusIcon = '🟢';
        statusColor = '#2ecc71';
        statusText = 'Online';
      } else if (status.status === 'offline') {
        statusIcon = '🔴';
        statusColor = '#e74c3c';
        statusText = 'Offline';
      }
    }

    return `
      <div style="
        background: #34495e;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 15px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      ">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
          <div>
            <h3 style="color: #ecf0f1; margin: 0 0 5px 0;">${terminal.name}</h3>
            <p style="color: #95a5a6; font-size: 13px; margin: 0;">
              IP: ${terminal.ip_address} | Port: ${terminal.port}
            </p>
          </div>
          <div style="text-align: right;">
            <div style="
              display: inline-flex;
              align-items: center;
              gap: 8px;
              padding: 6px 12px;
              background: rgba(0, 0, 0, 0.3);
              border-radius: 20px;
            ">
              <span style="font-size: 16px;">${statusIcon}</span>
              <span style="color: ${statusColor}; font-weight: 600; font-size: 13px;">${statusText}</span>
            </div>
            ${lastCheck ? `<div style="color: #7f8c8d; font-size: 11px; margin-top: 5px;">Last checked: ${lastCheck.toLocaleTimeString()}</div>` : ''}
          </div>
        </div>
        
        <div style="display: flex; gap: 10px;">
          <button
            onclick="SettingsScreen.checkTerminalStatus('${terminal.id}')"
            style="
              padding: 8px 16px;
              background: #3498db;
              border: none;
              color: white;
              border-radius: 4px;
              cursor: pointer;
              font-size: 13px;
            "
          >
            Check Status
          </button>
          <button
            onclick="SettingsScreen.editTerminal('${terminal.id}')"
            style="
              padding: 8px 16px;
              background: #34495e;
              border: 1px solid rgba(255, 255, 255, 0.2);
              color: #ecf0f1;
              border-radius: 4px;
              cursor: pointer;
              font-size: 13px;
            "
          >
            Edit
          </button>
        </div>
      </div>
    `;
  },

  renderTimeoutSettings(terminal) {
    return `
      <div style="
        background: #34495e;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 15px;
      ">
        <h3 style="color: #ecf0f1; margin: 0 0 15px 0;">${terminal.name}</h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <label style="color: #95a5a6; font-size: 13px; display: block; margin-bottom: 5px;">
              Transaction Timeout (seconds)
            </label>
            <input
              type="number"
              value="${terminal.transaction_timeout || 120}"
              min="30"
              max="300"
              style="
                width: 100%;
                padding: 8px;
                background: #2c3e50;
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: #ecf0f1;
                border-radius: 4px;
              "
            />
          </div>
          
          <div>
            <label style="color: #95a5a6; font-size: 13px; display: block; margin-bottom: 5px;">
              Connection Timeout (seconds)
            </label>
            <input
              type="number"
              value="${terminal.connection_timeout || 30}"
              min="10"
              max="60"
              style="
                width: 100%;
                padding: 8px;
                background: #2c3e50;
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: #ecf0f1;
                border-radius: 4px;
              "
            />
          </div>
        </div>

        <button
          onclick="SettingsScreen.saveTimeoutSettings('${terminal.id}')"
          style="
            margin-top: 15px;
            padding: 8px 16px;
            background: linear-gradient(135deg, #27ae60, #229954);
            border: none;
            color: white;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
          "
        >
          Save Settings
        </button>
      </div>
    `;
  },

  togglePaymentType(type) {
    this.paymentTypes[type] = !this.paymentTypes[type];
    this.savePaymentTypes();
    this.render();
  },

  updatePOSPreferences() {
    const autoClose = document.getElementById('autoClosePayment').checked;
    const autoCloseDelay = parseInt(document.getElementById('autoCloseDelay').value, 10);

    this.savePOSPreferences(autoClose, autoCloseDelay);

    const delaySection = document.getElementById('autoCloseDelaySection');
    if (delaySection) {
      delaySection.style.display = autoClose ? '' : 'none';
    }
  },

  editTerminal(terminalId) {
    alert(`Edit terminal ${terminalId} - to be implemented`);
  },

  saveTimeoutSettings(terminalId) {
    alert(`Save timeout settings for ${terminalId} - to be implemented`);
  },
};
