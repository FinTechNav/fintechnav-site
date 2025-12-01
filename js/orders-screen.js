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
      console.error('Failed to load orders:', error);
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
      container.innerHTML = '<p style="text-align: center; color: #95a5a6;">No orders found</p>';
      return;
    }

    const tableHtml = `
            <table class="data-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: rgba(255, 255, 255, 0.05); border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                        <th style="padding: 12px; text-align: left; color: #f39c12;">Order #</th>
                        <th style="padding: 12px; text-align: left; color: #f39c12;">Date/Time</th>
                        <th style="padding: 12px; text-align: left; color: #f39c12;">Customer</th>
                        <th style="padding: 12px; text-align: left; color: #f39c12;">Source</th>
                        <th style="padding: 12px; text-align: right; color: #f39c12;">Total</th>
                        <th style="padding: 12px; text-align: center; color: #f39c12;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.orders
                      .map(
                        (order) => `
                        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05); cursor: pointer;" onclick="OrdersScreen.viewOrder('${order.id}')">
                            <td style="padding: 12px; color: #f39c12;">#${order.order_number}</td>
                            <td style="padding: 12px; color: #e8e8e8;">${new Date(order.order_date).toLocaleString()}</td>
                            <td style="padding: 12px; color: #e8e8e8;">
                                ${order.customer_name}
                                ${order.is_guest ? '<span style="color: #95a5a6; font-size: 11px;"> (Guest)</span>' : ''}
                            </td>
                            <td style="padding: 12px; color: #95a5a6; text-transform: uppercase; font-size: 12px;">${order.order_source}</td>
                            <td style="padding: 12px; color: #f39c12; text-align: right; font-weight: 600;">$${parseFloat(order.total).toFixed(2)}</td>
                            <td style="padding: 12px; text-align: center;">
                                <span style="padding: 4px 12px; background: rgba(46, 204, 113, 0.2); color: #2ecc71; border-radius: 12px; font-size: 11px; text-transform: uppercase;">
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
      <table class="data-table" style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: rgba(255, 255, 255, 0.05); border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
            <th style="padding: 12px; text-align: left; color: #f39c12;">Order #</th>
            <th style="padding: 12px; text-align: left; color: #f39c12;">Date/Time</th>
            <th style="padding: 12px; text-align: left; color: #f39c12;">Customer</th>
            <th style="padding: 12px; text-align: left; color: #f39c12;">Source</th>
            <th style="padding: 12px; text-align: right; color: #f39c12;">Total</th>
            <th style="padding: 12px; text-align: center; color: #f39c12;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${Array(10)
            .fill(0)
            .map(
              () => `
            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
              <td style="padding: 12px;">
                <div style="
                  height: 16px;
                  width: 60px;
                  background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                  background-size: 200% 100%;
                  animation: shimmer 1.5s infinite;
                  border-radius: 4px;
                "></div>
              </td>
              <td style="padding: 12px;">
                <div style="
                  height: 16px;
                  width: 140px;
                  background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                  background-size: 200% 100%;
                  animation: shimmer 1.5s infinite;
                  border-radius: 4px;
                "></div>
              </td>
              <td style="padding: 12px;">
                <div style="
                  height: 16px;
                  width: 120px;
                  background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                  background-size: 200% 100%;
                  animation: shimmer 1.5s infinite;
                  border-radius: 4px;
                "></div>
              </td>
              <td style="padding: 12px;">
                <div style="
                  height: 16px;
                  width: 50px;
                  background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                  background-size: 200% 100%;
                  animation: shimmer 1.5s infinite;
                  border-radius: 4px;
                "></div>
              </td>
              <td style="padding: 12px; text-align: right;">
                <div style="
                  height: 16px;
                  width: 60px;
                  margin-left: auto;
                  background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                  background-size: 200% 100%;
                  animation: shimmer 1.5s infinite;
                  border-radius: 4px;
                "></div>
              </td>
              <td style="padding: 12px; text-align: center;">
                <div style="
                  height: 20px;
                  width: 80px;
                  margin: 0 auto;
                  background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                  background-size: 200% 100%;
                  animation: shimmer 1.5s infinite;
                  border-radius: 12px;
                "></div>
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <style>
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      </style>
    `;
  },
};
