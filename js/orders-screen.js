// Orders Screen functionality
const OrdersScreen = {
  orders: [],
  displayedOrders: [],
  itemsPerPage: 50,
  currentPage: 0,
  isLoadingMore: false,
  scrollContainer: null,
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
        this.currentPage = 0;
        this.displayedOrders = this.orders.slice(0, this.itemsPerPage);
      }
    } catch (error) {
    } finally {
      this.loadingState.orders = false;
      this.renderOrders();
      this.setupInfiniteScroll();
    }
  },

  setupInfiniteScroll() {
    setTimeout(() => {
      const tbody = document.querySelector('#ordersContainer .data-table tbody');
      if (tbody) {
        if (this.scrollContainer) {
          this.scrollContainer.removeEventListener('scroll', this.handleScroll);
        }
        this.scrollContainer = tbody;
        this.scrollContainer.addEventListener('scroll', this.handleScroll.bind(this));
      }
    }, 100);
  },

  handleScroll(e) {
    if (this.isLoadingMore) return;

    const container = e.target;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    if (scrollHeight - scrollTop - clientHeight < 300) {
      this.loadMoreOrders();
    }
  },

  loadMoreOrders() {
    if (this.isLoadingMore) return;

    const remainingOrders = this.orders.length - this.displayedOrders.length;
    if (remainingOrders === 0) return;

    this.isLoadingMore = true;
    this.currentPage++;

    const startIndex = this.currentPage * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const nextBatch = this.orders.slice(startIndex, endIndex);

    this.displayedOrders = [...this.displayedOrders, ...nextBatch];

    this.isLoadingMore = false;
    this.renderMoreOrders(nextBatch);
  },

  renderMoreOrders(newOrders) {
    const tbody = document.querySelector('#ordersContainer .data-table tbody');
    if (tbody) {
      const html = newOrders.map((order) => this.renderOrderRow(order)).join('');
      tbody.insertAdjacentHTML('beforeend', html);
    }
  },

  renderOrderRow(order) {
    return `
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
    `;
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
          ${this.displayedOrders.map((order) => this.renderOrderRow(order)).join('')}
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
