// Settings Screen functionality
const SettingsScreen = {
  terminals: [],
  terminalStatuses: {},
  lastChecked: {},
  currentTab: 'credit-card',

  async init() {
    await this.loadTerminals();
    this.loadPOSPreferences();
    this.renderTabs();
    this.renderTabContent();
    // Auto-check terminal status on screen load
    await this.checkAllTerminalStatuses();
  },

  loadPOSPreferences() {
    // Load from localStorage
    const autoClose = localStorage.getItem('posAutoClosePayment') === 'true';
    const autoCloseDelay = parseInt(localStorage.getItem('posAutoCloseDelay') || '5', 10);

    return { autoClose, autoCloseDelay };
  },

  savePOSPreferences(autoClose, autoCloseDelay) {
    localStorage.setItem('posAutoClosePayment', autoClose ? 'true' : 'false');
    localStorage.setItem('posAutoCloseDelay', autoCloseDelay.toString());
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.renderTabs();
    this.renderTabContent();
  },

  renderTabs() {
    const container = document.getElementById('terminalSettings');
    if (!container) return;

    const tabsHtml = `
      <div style="display: flex; gap: 10px; margin-bottom: 30px; border-bottom: 2px solid rgba(255, 255, 255, 0.1);">
        <button onclick="SettingsScreen.switchTab('credit-card')" style="
          padding: 15px 30px;
          background: ${this.currentTab === 'credit-card' ? 'rgba(243, 156, 18, 0.2)' : 'transparent'};
          border: none;
          border-bottom: 3px solid ${this.currentTab === 'credit-card' ? '#f39c12' : 'transparent'};
          color: ${this.currentTab === 'credit-card' ? '#f39c12' : '#95a5a6'};
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        ">💳 Credit Card</button>
        
        <button onclick="SettingsScreen.switchTab('pos-preferences')" style="
          padding: 15px 30px;
          background: ${this.currentTab === 'pos-preferences' ? 'rgba(243, 156, 18, 0.2)' : 'transparent'};
          border: none;
          border-bottom: 3px solid ${this.currentTab === 'pos-preferences' ? '#f39c12' : 'transparent'};
          color: ${this.currentTab === 'pos-preferences' ? '#f39c12' : '#95a5a6'};
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        ">⚙️ POS Preferences</button>
      </div>
      <div id="tabContent"></div>
    `;

    container.innerHTML = tabsHtml;
  },

  renderTabContent() {
    const contentDiv = document.getElementById('tabContent');
    if (!contentDiv) return;

    if (this.currentTab === 'credit-card') {
      this.renderCreditCardTab(contentDiv);
    } else if (this.currentTab === 'pos-preferences') {
      this.renderPOSPreferencesTab(contentDiv);
    }
  },

  renderCreditCardTab(container) {
    if (this.terminals.length === 0) {
      container.innerHTML =
        '<p style="color: #95a5a6;">No payment terminals configured for this winery.</p>';
      return;
    }

    const cardPresent = this.terminals.find((t) => t.terminal_type === 'card_present');
    const cardNotPresent = this.terminals.find((t) => t.terminal_type === 'card_not_present');

    let html = '';

    // Card Not Present Section
    if (cardNotPresent) {
      html += `
        <div style="margin-bottom: 30px; padding: 20px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
          <h4 style="color: #f39c12; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
            <span>💳</span> Card Not Present (Online/E-Commerce)
          </h4>
          <div style="display: grid; gap: 10px;">
            <div>
              <span style="color: #95a5a6; font-size: 12px;">Merchant ID:</span>
              <div style="color: #e8e8e8; font-family: monospace; margin-top: 4px;">${cardNotPresent.ftd_merchant_id || 'Not configured'}</div>
            </div>
            <div>
              <span style="color: #95a5a6; font-size: 12px;">Auth Token:</span>
              <div style="color: #e8e8e8; font-family: monospace; margin-top: 4px; font-size: 11px; word-break: break-all;">${cardNotPresent.ftd_auth_token ? '••••••••' + cardNotPresent.ftd_auth_token.slice(-8) : 'Not configured'}</div>
            </div>
            <div>
              <span style="color: #95a5a6; font-size: 12px;">Environment:</span>
              <div style="color: #e8e8e8; margin-top: 4px; text-transform: uppercase;">${cardNotPresent.api_environment || 'sandbox'}</div>
            </div>
            <div>
              <span style="color: #95a5a6; font-size: 12px;">Location:</span>
              <div style="color: #e8e8e8; margin-top: 4px;">${cardNotPresent.location || 'N/A'}</div>
            </div>
          </div>
        </div>
      `;
    }

    // Card Present Section
    if (cardPresent) {
      const status = this.terminalStatuses[cardPresent.id];
      const lastChecked = this.lastChecked[cardPresent.id];

      let statusIndicator = '';
      let statusText = 'Checking...';

      if (status) {
        if (status.TerminalStatus === 'Online') {
          statusIndicator =
            '<span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #2ecc71; margin-right: 8px;"></span>';
          statusText = 'Online';
        } else if (status.TerminalStatus === 'Offline') {
          statusIndicator =
            '<span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #e74c3c; margin-right: 8px;"></span>';
          statusText = 'Offline';
        } else {
          statusIndicator =
            '<span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #f39c12; margin-right: 8px;"></span>';
          statusText = status.TerminalStatus || 'Unknown';
        }
      }

      html += `
        <div style="margin-bottom: 30px; padding: 20px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
          <h4 style="color: #f39c12; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
            <span>🪙</span> Card Present (Physical Terminal)
          </h4>
          
          <div style="margin-bottom: 15px; padding: 12px; background: rgba(255, 255, 255, 0.05); border-radius: 6px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center;">
              ${statusIndicator}
              <span style="color: #e8e8e8; font-weight: 600;">${statusText}</span>
            </div>
            <div style="color: #95a5a6; font-size: 11px;">
              ${lastChecked ? 'Last checked: ' + new Date(lastChecked).toLocaleString() : 'Not checked yet'}
            </div>
          </div>

          <div style="display: grid; gap: 10px; margin-bottom: 15px;">
            <div>
              <span style="color: #95a5a6; font-size: 12px;">TPN (Terminal Processing Number):</span>
              <div style="color: #e8e8e8; font-family: monospace; margin-top: 4px;">${cardPresent.tpn || 'Not configured'}</div>
            </div>
            <div>
              <span style="color: #95a5a6; font-size: 12px;">Register ID:</span>
              <div style="color: #e8e8e8; font-family: monospace; margin-top: 4px;">${cardPresent.register_id || 'Not configured'}</div>
            </div>
            <div>
              <span style="color: #95a5a6; font-size: 12px;">Auth Key:</span>
              <div style="color: #e8e8e8; font-family: monospace; margin-top: 4px;">${cardPresent.auth_key ? '••••••••' + cardPresent.auth_key.slice(-8) : 'Not configured'}</div>
            </div>
            <div>
              <span style="color: #95a5a6; font-size: 12px;">Terminal Name:</span>
              <div style="color: #e8e8e8; margin-top: 4px;">${cardPresent.name || 'N/A'}</div>
            </div>
            <div>
              <span style="color: #95a5a6; font-size: 12px;">Location:</span>
              <div style="color: #e8e8e8; margin-top: 4px;">${cardPresent.location || 'N/A'}</div>
            </div>
          </div>
          
          <button class="btn" onclick="SettingsScreen.checkTerminalStatus('${cardPresent.id}')">
            Refresh Terminal Status
          </button>
          
          <div id="terminalStatusResult-${cardPresent.id}" style="margin-top: 15px;"></div>
        </div>
      `;
    }

    container.innerHTML = html;
  },

  renderPOSPreferencesTab(container) {
    const prefs = this.loadPOSPreferences();

    container.innerHTML = `
      <div style="padding: 20px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
        <h4 style="color: #f39c12; margin-bottom: 20px;">Payment Received Screen</h4>
        
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
    this.renderTabContent();
  },

  setAutoCloseDelay(seconds) {
    const prefs = this.loadPOSPreferences();
    this.savePOSPreferences(prefs.autoClose, seconds);
    this.renderTabContent();
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

    if (!silent && resultDiv) {
      resultDiv.innerHTML = `
        <div style="padding: 15px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px;">
          <h4 style="color: #f39c12; margin-bottom: 8px;">Checking terminal status...</h4>
        </div>
      `;
    }

    const requestBody = {
      register_id: terminal.register_id,
      auth_key: terminal.auth_key,
      tpn: terminal.tpn,
    };

    try {
      const response = await fetch('/.netlify/functions/check-terminal-status', {
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
      this.renderTabContent();

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
      console.error('❌ Fetch error:', error);
      if (!silent && resultDiv) {
        resultDiv.innerHTML = `
          <div style="padding: 15px; background: rgba(231, 76, 60, 0.1); border: 1px solid rgba(231, 76, 60, 0.3); border-radius: 6px;">
            <h4 style="color: #e74c3c; margin-bottom: 8px;">Connection Error</h4>
            <pre style="color: #e8e8e8; white-space: pre-wrap; font-size: 12px;">${error.message}</pre>
          </div>
        `;
      }
    }
  },
};
