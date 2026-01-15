// Reports Screen - Daily Sales Dashboard

class ReportsScreen {
  constructor() {
    this.reportData = null;
    this.selectedDate = null;
    this.loading = false;
    this.winery = null;
  }

  async init() {
    this.loading = true;
    this.render();

    await this.loadWineryInfo();
    await this.loadYesterdayReport();

    this.loading = false;
    this.render();
    this.attachEventListeners();
  }

  async loadWineryInfo() {
    const wineryId = typeof App !== 'undefined' && App.currentWinery ? App.currentWinery.id : null;
    if (!wineryId) return;

    try {
      const url = `/.netlify/functions/get-winery-info?winery_id=${wineryId}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        this.winery = data.winery;
      }
    } catch (error) {}
  }

  async loadYesterdayReport() {
    const wineryId = typeof App !== 'undefined' && App.currentWinery ? App.currentWinery.id : null;
    if (!wineryId) return;

    try {
      const response = await fetch(
        'https://api.heavypourwine.com/api/v1/reports/daily-sales?include=employees,products,club',
        {
          headers: {
            'x-api-key': localStorage.getItem('apiKey') || '',
            'x-winery-id': wineryId,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        this.reportData = data;
        this.selectedDate = data.window?.start || null;
      }
    } catch (error) {}
  }

  async loadReportForDate(date) {
    const wineryId = typeof App !== 'undefined' && App.currentWinery ? App.currentWinery.id : null;
    if (!wineryId) return;

    this.loading = true;
    this.render();

    try {
      const response = await fetch(
        'https://api.heavypourwine.com/api/v1/reports/daily-sales?date=' +
          date +
          '&include=employees,products,club',
        {
          headers: {
            'x-api-key': localStorage.getItem('apiKey') || '',
            'x-winery-id': wineryId,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        this.reportData = data;
        this.selectedDate = data.window?.start || date;
      }
    } catch (error) {}

    this.loading = false;
    this.render();
  }

  attachEventListeners() {
    const dateInput = document.getElementById('reportDateInput');
    if (dateInput) {
      dateInput.addEventListener('change', (e) => {
        this.loadReportForDate(e.target.value);
      });
    }

    const yesterdayBtn = document.getElementById('yesterdayBtn');
    if (yesterdayBtn) {
      yesterdayBtn.addEventListener('click', () => {
        this.loadYesterdayReport();
      });
    }

    const todayBtn = document.getElementById('todayBtn');
    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        const today = new Date().toISOString().split('T')[0];
        this.loadReportForDate(today);
      });
    }
  }

  formatCurrency(cents) {
    if (!this.winery || !cents) return '$0.00';
    const amount = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.winery.currency || 'USD',
    }).format(amount);
  }

  formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  render() {
    const container = document.getElementById('reportsScreen');
    if (!container) return;

    if (this.loading) {
      container.innerHTML = this.renderLoadingState();
      return;
    }

    container.innerHTML = `
      <div class="screen-header">
        <h2>Daily Sales Report</h2>
        <div class="report-date-controls">
          <button id="yesterdayBtn" class="date-btn">Yesterday</button>
          <button id="todayBtn" class="date-btn">Today</button>
          <input type="date" id="reportDateInput" class="date-input" value="${this.selectedDate || ''}" />
        </div>
      </div>

      ${this.reportData ? this.renderDashboard() : this.renderEmptyState()}
    `;
  }

  renderLoadingState() {
    return `
      <div class="screen-header">
        <h2>Daily Sales Report</h2>
      </div>
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading report data...</p>
      </div>
    `;
  }

  renderEmptyState() {
    return `
      <div class="empty-state">
        <p>No report data available</p>
      </div>
    `;
  }

  renderDashboard() {
    const data = this.reportData;
    const totals = data.totals || {};
    const dateStr = data.window?.start || this.selectedDate;

    return `
      <div class="report-date-header">
        <h3>${this.formatDate(dateStr)}</h3>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Orders</div>
          <div class="kpi-value">${totals.orders_count || 0}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Revenue</div>
          <div class="kpi-value">${this.formatCurrency(totals.revenue)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Tax Collected</div>
          <div class="kpi-value">${this.formatCurrency(totals.tax)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Tips</div>
          <div class="kpi-value">${this.formatCurrency(totals.tips)}</div>
        </div>
      </div>

      ${data.by_employee && data.by_employee.length > 0 ? this.renderEmployeeSales(data.by_employee) : ''}
      
      ${data.top_products && data.top_products.length > 0 ? this.renderTopProducts(data.top_products) : ''}
      
      ${data.wine_club ? this.renderWineClub(data.wine_club) : ''}
    `;
  }

  renderEmployeeSales(employees) {
    return `
      <div class="report-section">
        <h4>Sales by Employee</h4>
        <table class="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th class="text-right">Orders</th>
              <th class="text-right">Revenue</th>
              <th class="text-right">Avg Order</th>
            </tr>
          </thead>
          <tbody>
            ${employees
              .map((emp) => {
                const avgOrder = emp.orders_count > 0 ? emp.revenue / emp.orders_count : 0;
                return `
                <tr>
                  <td>${emp.employee_name || 'Unknown'}</td>
                  <td class="text-right">${emp.orders_count || 0}</td>
                  <td class="text-right">${this.formatCurrency(emp.revenue)}</td>
                  <td class="text-right">${this.formatCurrency(avgOrder)}</td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderTopProducts(products) {
    return `
      <div class="report-section">
        <h4>Top Products</h4>
        <table class="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th class="text-right">Quantity</th>
              <th class="text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${products
              .map(
                (product) => `
              <tr>
                <td>${product.product_name}</td>
                <td class="text-right">${product.quantity || 0}</td>
                <td class="text-right">${this.formatCurrency(product.revenue)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderWineClub(clubData) {
    return `
      <div class="report-section">
        <h4>Wine Club Activity</h4>
        <div class="club-stats">
          <div class="club-stat">
            <span class="club-stat-label">New Signups</span>
            <span class="club-stat-value">${clubData.signups || 0}</span>
          </div>
          <div class="club-stat">
            <span class="club-stat-label">Cancellations</span>
            <span class="club-stat-value">${clubData.cancels || 0}</span>
          </div>
        </div>
      </div>
    `;
  }
}

const ReportsScreenInstance = new ReportsScreen();
