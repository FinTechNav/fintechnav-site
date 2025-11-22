// Settings Screen functionality
const SettingsScreen = {
  terminals: [],
  terminalStatuses: {},
  lastChecked: {},

  async init() {
    await this.loadTerminals();
    this.renderTerminals();
    // Auto-check terminal status on screen load
    await this.checkAllTerminalStatuses();
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

  async checkAllTerminalStatuses() {
    const cardPresentTerminals = this.terminals.filter((t) => t.terminal_type === 'card_present');
    for (const terminal of cardPresentTerminals) {
      await this.checkTerminalStatus(terminal.id, true);
    }
  },

  renderTerminals() {
    const container = document.getElementById('terminalSettings');

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
            <span>🏪</span> Card Present (Physical Terminal)
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
      this.renderTerminals();

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
