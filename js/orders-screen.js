// Orders Screen functionality
const OrdersScreen = {
  orders: [],
  loadingState: {
    orders: false,
  },

  async load() {
    if (!App.currentWinery) return;

    this.loadingState.orders = true;
    this.renderOrders();

    try {
      const response = await fetch(
        `/.netlify/functions/get-winery-orders?winery_id=${App.currentWinery.id}`
      );
      const data = await response.json();

      if (data.success) {
        this.orders = data.orders;
      }
    } catch (error) {
    } finally {
      this.loadingState.orders = false;
      this.renderOrders();
    }
  },

  renderOrders() {
    const container = document.getElementById('ordersContainer');

    if (this.loadingState.orders) {
      container.innerHTML = this.renderLoadingState();
      return;
    }

    if (this.orders.length === 0) {
      container.innerHTML = '<p class="empty-state">No orders found</p>';
      return;
    }

    const tableHtml = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Order #</th>
                        <th>Date/Time</th>
                        <th>Customer</th>
                        <th>Source</th>
                        <th class="text-right">Total</th>
                        <th class="text-center">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.orders
                      .map(
                        (order) => `
                        <tr onclick="OrdersScreen.viewOrder('${order.id}')">
                            <td class="text-accent">#${order.order_number}</td>
                            <td>${new Date(order.order_date).toLocaleString()}</td>
                            <td>
                                ${order.customer_name}
                                ${order.is_guest ? '<span class="guest-indicator">(Guest)</span>' : ''}
                            </td>
                            <td class="text-muted text-uppercase text-small">${order.order_source}</td>
                            <td class="text-accent text-right font-semibold">$${parseFloat(order.total).toFixed(2)}</td>
                            <td class="text-center">
                                <span class="status-badge status-badge--success">
                                    ${order.status}
                                </span>
                            </td>
                        </tr>
                    `
                      )
                      .join('')}
                </tbody>
            </table>
        `;

    container.innerHTML = tableHtml;
  },

  viewOrder(orderId) {
    // Future implementation - show order details
    alert('Order details view coming soon');
  },

  renderLoadingState() {
    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>Order #</th>
            <th>Date/Time</th>
            <th>Customer</th>
            <th>Source</th>
            <th class="text-right">Total</th>
            <th class="text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          ${Array(10)
            .fill(0)
            .map(
              () => `
            <tr>
              <td>
                <div class="skeleton-box skeleton-box--sm"></div>
              </td>
              <td>
                <div class="skeleton-box skeleton-box--lg"></div>
              </td>
              <td>
                <div class="skeleton-box skeleton-box--md"></div>
              </td>
              <td>
                <div class="skeleton-box skeleton-box--sm"></div>
              </td>
              <td class="text-right">
                <div class="skeleton-box skeleton-box--sm skeleton-box--right"></div>
              </td>
              <td class="text-center">
                <div class="skeleton-box skeleton-box--badge"></div>
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
  },
};
