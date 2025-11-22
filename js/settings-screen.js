// Settings Screen functionality
const SettingsScreen = {
  terminals: [],

  async init() {
    await this.loadTerminals();
    this.renderTerminals();
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
                            <div style="color: #e8e8e8; font-family: monospace; margin-top: 4px;">${cardNotPresent.ftd_auth_token ? '••••••••' + cardNotPresent.ftd_auth_token.slice(-8) : 'Not configured'}</div>
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
      html += `
                <div style="margin-bottom: 30px; padding: 20px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
                    <h4 style="color: #f39c12; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <span>🏪</span> Card Present (Physical Terminal)
                    </h4>
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
                        Check Terminal Status
                    </button>
                    <div id="terminalStatusResult-${cardPresent.id}" style="margin-top: 15px;"></div>
                </div>
            `;
    }

    container.innerHTML = html;
  },

  async checkTerminalStatus(terminalId) {
    const terminal = this.terminals.find((t) => t.id === terminalId);
    const resultDiv = document.getElementById(`terminalStatusResult-${terminalId}`);

    if (!terminal) {
      resultDiv.innerHTML = `
                <div class="status-result error">
                    <h4>Error</h4>
                    <pre>Terminal not found</pre>
                </div>
            `;
      return;
    }

    resultDiv.innerHTML = `
            <div class="status-result">
                <h4>Checking terminal status...</h4>
            </div>
        `;

    try {
      const response = await fetch('https://spinpos.net:443/spin/api.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Status: {
            RegisterId: terminal.register_id,
            AuthKey: terminal.auth_key,
            TPN: terminal.tpn,
          },
        }),
      });

      const data = await response.json();

      resultDiv.innerHTML = `
                <div class="status-result success">
                    <h4>Terminal Status Response</h4>
                    <pre>${JSON.stringify(data, null, 2)}</pre>
                </div>
            `;
    } catch (error) {
      resultDiv.innerHTML = `
                <div class="status-result error">
                    <h4>Connection Error</h4>
                    <pre>${error.message}</pre>
                </div>
            `;
    }
  },
};
