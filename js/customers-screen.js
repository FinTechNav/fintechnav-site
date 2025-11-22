// Customers Screen functionality
const CustomersScreen = {
  async load() {
    const customersList = document.getElementById('customersList');

    if (!App.currentWinery) {
      customersList.innerHTML =
        '<p style="text-align: center; color: #95a5a6;">Please select a winery</p>';
      return;
    }

    customersList.innerHTML =
      '<p style="text-align: center; color: #95a5a6;">Loading customers...</p>';

    try {
      const response = await fetch(
        `/.netlify/functions/get-winery-customers?winery_id=${App.currentWinery.id}`
      );
      const data = await response.json();

      if (data.success && data.customers.length > 0) {
        const tableHtml = `
                    <table class="data-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: rgba(255, 255, 255, 0.05); border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                                <th style="padding: 12px; text-align: left; color: #f39c12;">Name</th>
                                <th style="padding: 12px; text-align: left; color: #f39c12;">Email</th>
                                <th style="padding: 12px; text-align: left; color: #f39c12;">Phone</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.customers
                              .map(
                                (c) => `
                                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                                    <td style="padding: 12px; color: #e8e8e8;">${c.name || 'N/A'}</td>
                                    <td style="padding: 12px; color: #95a5a6;">${c.email}</td>
                                    <td style="padding: 12px; color: #95a5a6;">${c.phone || 'N/A'}</td>
                                </tr>
                            `
                              )
                              .join('')}
                        </tbody>
                    </table>
                    <p style="margin-top: 15px; color: #95a5a6; font-size: 14px;">Total: ${data.customers.length} customer${data.customers.length !== 1 ? 's' : ''}</p>
                `;
        customersList.innerHTML = tableHtml;
      } else {
        customersList.innerHTML =
          '<p style="text-align: center; color: #95a5a6;">No customers found for this winery</p>';
      }
    } catch (error) {
      customersList.innerHTML =
        '<p style="text-align: center; color: #e74c3c;">Failed to load customers</p>';
      console.error('Failed to load customers:', error);
    }
  },
};
