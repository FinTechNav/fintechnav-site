// Settings Screen functionality
const SettingsScreen = {
  init() {
    this.setupTerminalCheck();
  },

  setupTerminalCheck() {
    // Already bound in HTML, just document it here
  },

  async checkTerminalStatus() {
    const registerId = document.getElementById('registerId').value;
    const authKey = document.getElementById('authKey').value;
    const tpn = document.getElementById('tpn').value;
    const resultDiv = document.getElementById('statusResult');

    if (!registerId || !authKey || !tpn) {
      resultDiv.innerHTML = `
                <div class="status-result error">
                    <h4>Error</h4>
                    <pre>Please fill in all fields</pre>
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
            RegisterId: registerId,
            AuthKey: authKey,
            TPN: tpn,
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
