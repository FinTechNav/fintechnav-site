// Customer Details Screen Module
class CustomerDetailsScreen {
  constructor() {
    this.currentCustomer = null;
    this.activityFilter = 'all';
    this.orders = [];
    this.savedPaymentMethods = [];
  }

  async show(customerId) {
    console.log('=== CustomerDetailsScreen.show called ===');
    console.log('Customer ID:', customerId);

    try {
      // Fetch customer data
      console.log('Fetching customer stats from API...');
      const url = `/.netlify/functions/get-customer-stats?id=${customerId}`;
      console.log('URL:', url);

      const response = await fetch(url);
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        console.error('HTTP error response:', {
          status: response.status,
          statusText: response.statusText,
          data: data,
        });
        throw new Error(
          data.error || data.details || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      if (!data.success) {
        console.error('API returned success=false:', data);
        throw new Error(data.error || data.details || 'Failed to load customer');
      }

      console.log('Customer data loaded successfully');
      console.log('Customer:', data.customer);
      console.log('Order stats:', data.order_stats);
      console.log('Recent orders count:', (data.recent_orders || []).length);

      this.currentCustomer = data.customer;
      this.orders = data.recent_orders || [];

      // Fetch payment methods
      console.log('Loading payment methods...');
      await this.loadPaymentMethods(customerId);

      console.log('Rendering customer details screen...');
      this.render();
      console.log('=== CustomerDetailsScreen.show completed successfully ===');
    } catch (error) {
      console.error('=== ERROR in CustomerDetailsScreen.show ===');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

      alert(
        `Failed to load customer details:\n\n${error.message}\n\nCheck browser console for details.`
      );
    }
  }

  async loadPaymentMethods(customerId) {
    console.log('Loading payment methods for customer:', customerId);
    try {
      const url = `/.netlify/functions/get-payment-methods?customer_id=${customerId}`;
      console.log('Payment methods URL:', url);

      const response = await fetch(url);
      console.log('Payment methods response status:', response.status);

      const data = await response.json();
      console.log('Payment methods data:', data);

      if (data.success) {
        this.savedPaymentMethods = data.payment_methods || [];
        console.log('Loaded payment methods count:', this.savedPaymentMethods.length);
      } else {
        console.warn('Payment methods API returned success=false:', data);
        this.savedPaymentMethods = [];
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      console.error('This is non-fatal - continuing without payment methods');
      this.savedPaymentMethods = [];
    }
  }

  render() {
    const container = document.getElementById('customersScreen');
    if (!container) return;

    container.innerHTML = this.getHTML();

    // Attach event listeners
    this.attachEventListeners();
  }

  getHTML() {
    const customer = this.currentCustomer;
    const initials = this.getInitials(customer);
    const fullName = this.getFullName(customer);

    return `
      <div style="
        background: #2c3e50;
        min-height: 100vh;
        padding: 20px;
      ">
        ${this.renderHeader(fullName)}
        
        <div style="
          display: flex;
          gap: 20px;
          margin-top: 20px;
        ">
          ${this.renderLeftPane(customer, initials, fullName)}
          ${this.renderMiddlePane(customer)}
          ${this.renderRightPane(customer)}
        </div>
      </div>
    `;
  }

  renderHeader(fullName) {
    return `
      <div style="
        background: #34495e;
        padding: 20px 30px;
        border-radius: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <div style="display: flex; align-items: center; gap: 15px;">
          <button onclick="customerDetailsScreen.close()" style="
            background: transparent;
            border: none;
            color: #ecf0f1;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
          ">←</button>
          <h2 style="color: #ecf0f1; margin: 0; font-family: Georgia, serif;">${fullName}</h2>
        </div>
      </div>
    `;
  }

  renderLeftPane(customer, initials, fullName) {
    return `
      <div style="
        width: 280px;
        background: #34495e;
        padding: 20px;
        overflow-y: auto;
        border-radius: 8px;
      ">
        <!-- Avatar -->
        <div style="
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #D2B48C, #8B7355);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: 700;
          margin: 0 auto 20px;
        ">${initials}</div>

        <h3 style="color: #ecf0f1; text-align: center; margin: 0 0 5px; font-family: Georgia, serif;">${fullName}</h3>
        <p style="color: #95a5a6; text-align: center; margin: 0 0 20px; font-size: 14px;">${customer.email}</p>

        ${this.renderContactInfo(customer)}
        ${this.renderShowMoreButton()}
      </div>
    `;
  }

  renderContactInfo(customer) {
    const visibleFields = [
      { icon: '📧', label: 'Email', value: customer.email },
      { icon: '📱', label: 'Phone', value: customer.phone || '-' },
      { icon: '📍', label: 'Location', value: this.getLocation(customer) },
    ];

    return `
      <div style="margin-top: 20px;">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        ">
          <h4 style="color: #ecf0f1; margin: 0; font-size: 14px; font-weight: 600;">CONTACT INFO</h4>
        </div>
        
        ${visibleFields
          .map(
            (field) => `
          <div style="margin-bottom: 15px;">
            <div style="color: #95a5a6; font-size: 12px; margin-bottom: 3px;">${field.icon} ${field.label}</div>
            <div style="color: #ecf0f1; font-size: 14px;">${field.value}</div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  renderShowMoreButton() {
    return `
      <button onclick="customerDetailsScreen.showAllContactInfo()" style="
        width: 100%;
        padding: 10px;
        background: transparent;
        border: 1px solid rgba(210, 180, 140, 0.3);
        border-radius: 6px;
        color: #D2B48C;
        font-size: 14px;
        cursor: pointer;
        margin-top: 15px;
      ">Show All Contact Details</button>
    `;
  }

  renderMiddlePane(customer) {
    return `
      <div style="
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        background: #34495e;
        border-radius: 8px;
      ">
        ${this.renderActionButtons()}
        ${this.renderActivityTimeline()}
        ${this.renderOrdersSection()}
      </div>
    `;
  }

  renderActionButtons() {
    return `
      <div style="
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        padding-bottom: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      ">
        <button onclick="customerDetailsScreen.addNote()" style="
          padding: 10px 20px;
          background: #3498db;
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 14px;
          cursor: pointer;
        ">📝 Note</button>
        
        <button onclick="customerDetailsScreen.sendEmail()" style="
          padding: 10px 20px;
          background: #9b59b6;
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 14px;
          cursor: pointer;
        ">✉️ Email</button>
        
        <button onclick="customerDetailsScreen.sendSMS()" style="
          padding: 10px 20px;
          background: #1abc9c;
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 14px;
          cursor: pointer;
        ">💬 SMS</button>
        
        <button onclick="customerDetailsScreen.createOrder()" style="
          padding: 10px 20px;
          background: #D2B48C;
          border: none;
          border-radius: 6px;
          color: #2c3e50;
          font-size: 14px;
          cursor: pointer;
          font-weight: 600;
        ">🛒 Order</button>
      </div>
    `;
  }

  renderActivityTimeline() {
    return `
      <div style="margin-bottom: 30px;">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        ">
          <h3 style="color: #ecf0f1; margin: 0; font-family: Georgia, serif;">Activity Timeline</h3>
          ${this.renderActivityFilter()}
        </div>
        
        <div id="activityTimelineContent">
          ${this.renderActivityItems()}
        </div>
      </div>
    `;
  }

  renderActivityFilter() {
    const filters = [
      { value: 'all', label: 'All' },
      { value: 'orders', label: 'Orders' },
      { value: 'notes', label: 'Notes' },
      { value: 'emails', label: 'Emails' },
      { value: 'payments', label: 'Payments' },
    ];

    return `
      <select onchange="customerDetailsScreen.filterActivity(this.value)" style="
        background: #34495e;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        color: #ecf0f1;
        padding: 8px 12px;
        font-size: 14px;
        cursor: pointer;
      ">
        ${filters
          .map(
            (f) => `
          <option value="${f.value}" ${this.activityFilter === f.value ? 'selected' : ''}>${f.label}</option>
        `
          )
          .join('')}
      </select>
    `;
  }

  renderActivityItems() {
    // Mock activity data - in real implementation, fetch from backend
    const activities = [
      {
        type: 'order',
        icon: '🛒',
        title: 'Order Placed',
        description: `Order #${this.orders[0]?.order_number || 'N/A'} • ${this.formatCurrency(this.orders[0]?.total || 0)}`,
        timestamp: this.orders[0]?.created_at || new Date().toISOString(),
      },
      {
        type: 'payment',
        icon: '💳',
        title: 'Payment Method Added',
        description: 'Visa ending in 4002',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        type: 'note',
        icon: '📝',
        title: 'Note Added',
        description: 'Prefers red wines, allergic to sulfites',
        timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
    ];

    return `
      <div style="position: relative;">
        ${activities
          .map(
            (activity, index) => `
          <div style="
            position: relative;
            padding-left: 40px;
            padding-bottom: ${index < activities.length - 1 ? '20px' : '0'};
          ">
            <!-- Timeline dot -->
            <div style="
              position: absolute;
              left: 0;
              top: 0;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: #D2B48C;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
            ">${activity.icon}</div>
            
            <!-- Timeline line -->
            ${
              index < activities.length - 1
                ? `
              <div style="
                position: absolute;
                left: 15px;
                top: 32px;
                width: 2px;
                height: calc(100% - 32px);
                background: rgba(255, 255, 255, 0.1);
              "></div>
            `
                : ''
            }
            
            <!-- Content -->
            <div>
              <div style="color: #ecf0f1; font-weight: 600; margin-bottom: 3px;">${activity.title}</div>
              <div style="color: #95a5a6; font-size: 14px; margin-bottom: 3px;">${activity.description}</div>
              <div style="color: #7f8c8d; font-size: 12px;">${this.formatDateTime(activity.timestamp)}</div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  renderOrdersSection() {
    return `
      <div>
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        ">
          <h3 style="color: #ecf0f1; margin: 0; font-family: Georgia, serif;">Orders</h3>
          <div style="display: flex; gap: 10px;">
            <button onclick="customerDetailsScreen.filterOrders()" style="
              padding: 8px 16px;
              background: transparent;
              border: 1px solid rgba(210, 180, 140, 0.3);
              border-radius: 6px;
              color: #D2B48C;
              font-size: 14px;
              cursor: pointer;
            ">Filter</button>
            <button onclick="customerDetailsScreen.sortOrders()" style="
              padding: 8px 16px;
              background: transparent;
              border: 1px solid rgba(210, 180, 140, 0.3);
              border-radius: 6px;
              color: #D2B48C;
              font-size: 14px;
              cursor: pointer;
            ">Sort</button>
          </div>
        </div>
        
        ${this.renderOrdersTable()}
      </div>
    `;
  }

  renderOrdersTable() {
    if (this.orders.length === 0) {
      return '<p style="color: #95a5a6; text-align: center; padding: 40px;">No orders yet</p>';
    }

    return `
      <div style="
        background: #34495e;
        border-radius: 8px;
        overflow: hidden;
      ">
        <!-- Header -->
        <div style="
          display: grid;
          grid-template-columns: 150px 120px 120px 120px 100px;
          gap: 15px;
          padding: 15px;
          background: rgba(0, 0, 0, 0.2);
          font-weight: 600;
          color: #95a5a6;
          font-size: 12px;
        ">
          <div>ORDER #</div>
          <div>DATE</div>
          <div>TOTAL</div>
          <div>STATUS</div>
          <div>ACTIONS</div>
        </div>
        
        <!-- Rows -->
        ${this.orders
          .map(
            (order) => `
          <div style="
            display: grid;
            grid-template-columns: 150px 120px 120px 120px 100px;
            gap: 15px;
            padding: 15px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            color: #ecf0f1;
          ">
            <div style="font-weight: 600;">${order.order_number}</div>
            <div>${this.formatDate(order.created_at)}</div>
            <div>${this.formatCurrency(order.total)}</div>
            <div>
              <span style="
                padding: 4px 8px;
                background: ${order.status === 'completed' ? '#27ae60' : '#f39c12'};
                border-radius: 4px;
                font-size: 12px;
              ">${order.status || 'Pending'}</span>
            </div>
            <div style="display: flex; gap: 8px;">
              <button onclick="customerDetailsScreen.viewOrder('${order.id}')" style="
                padding: 4px 8px;
                background: #3498db;
                border: none;
                border-radius: 4px;
                color: white;
                font-size: 12px;
                cursor: pointer;
              ">View</button>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  renderRightPane(customer) {
    return `
      <div style="
        width: 320px;
        background: #34495e;
        padding: 20px;
        overflow-y: auto;
        border-radius: 8px;
      ">
        ${this.renderLTVCard(customer)}
        ${this.renderPaymentMethods()}
      </div>
    `;
  }

  renderLTVCard(customer) {
    const stats = [
      {
        label: 'Lifetime Value',
        value: this.formatCurrency(
          (customer.lifetime_value_cents || 0) / 100,
          customer.currency_code
        ),
      },
      { label: 'Total Orders', value: customer.order_count || 0 },
      {
        label: 'Avg Order Value',
        value: this.formatCurrency(
          (customer.average_order_value_cents || 0) / 100,
          customer.currency_code
        ),
      },
      { label: 'Last Order', value: this.formatDate(customer.last_order_date) },
      {
        label: 'Customer Since',
        value: this.formatDate(customer.first_order_date || customer.created_at),
      },
    ];

    // Add customer-specific details
    const details = [];
    if (customer.club_member_status && customer.club_member_status !== 'none') {
      details.push({ label: 'Wine Club', value: customer.club_tier || 'Member' });
    }
    if (customer.allocation_list_status && customer.allocation_list_status !== 'none') {
      details.push({ label: 'Allocation', value: customer.allocation_tier || 'Active' });
    }
    if (customer.tags && customer.tags.length > 0) {
      details.push({ label: 'Tags', value: customer.tags.join(', ') });
    }

    return `
      <div style="
        background: linear-gradient(135deg, #2c3e50, #34495e);
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
      ">
        <h4 style="color: #ecf0f1; margin: 0 0 15px; font-size: 16px; font-weight: 600;">CUSTOMER STATS</h4>
        
        ${stats
          .map(
            (stat) => `
          <div style="margin-bottom: 12px;">
            <div style="color: #95a5a6; font-size: 12px; margin-bottom: 3px;">${stat.label}</div>
            <div style="color: #ecf0f1; font-size: 16px; font-weight: 600;">${stat.value}</div>
          </div>
        `
          )
          .join('')}
        
        ${
          details.length > 0
            ? `
          <div style="
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          ">
            ${details
              .map(
                (detail) => `
              <div style="margin-bottom: 8px;">
                <span style="color: #95a5a6; font-size: 12px;">${detail.label}:</span>
                <span style="color: #D2B48C; font-size: 14px; margin-left: 5px;">${detail.value}</span>
              </div>
            `
              )
              .join('')}
          </div>
        `
            : ''
        }
        
        ${
          customer.internal_notes
            ? `
          <div style="
            margin-top: 15px;
            padding: 10px;
            background: rgba(231, 76, 60, 0.2);
            border-left: 3px solid #e74c3c;
            border-radius: 4px;
          ">
            <div style="color: #e74c3c; font-size: 12px; font-weight: 600; margin-bottom: 5px;">⚠️ INTERNAL NOTE</div>
            <div style="color: #ecf0f1; font-size: 13px;">${customer.internal_notes}</div>
          </div>
        `
            : ''
        }
      </div>
    `;
  }

  renderPaymentMethods() {
    return `
      <div>
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        ">
          <h4 style="color: #ecf0f1; margin: 0; font-size: 16px; font-weight: 600;">SAVED PAYMENT METHODS</h4>
          <button onclick="customerDetailsScreen.addPaymentMethod()" style="
            padding: 6px 12px;
            background: #D2B48C;
            border: none;
            border-radius: 4px;
            color: #2c3e50;
            font-size: 12px;
            cursor: pointer;
            font-weight: 600;
          ">+ Add</button>
        </div>
        
        ${
          this.savedPaymentMethods.length === 0
            ? `
          <p style="color: #95a5a6; text-align: center; padding: 20px; font-size: 14px;">No saved payment methods</p>
        `
            : `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${this.savedPaymentMethods.map((pm) => this.renderPaymentMethodCard(pm)).join('')}
          </div>
        `
        }
      </div>
    `;
  }

  renderPaymentMethodCard(paymentMethod) {
    const cardBrandLogos = {
      VISA: '💳',
      MASTERCARD: '💳',
      AMEX: '💳',
      DISCOVER: '💳',
    };

    return `
      <div style="
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
        padding: 15px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      ">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 24px;">${cardBrandLogos[paymentMethod.card_brand] || '💳'}</span>
            <div>
              <div style="color: #ecf0f1; font-weight: 600;">${paymentMethod.card_brand} •••• ${paymentMethod.last_four}</div>
              <div style="color: #95a5a6; font-size: 12px;">Expires ${paymentMethod.expiry_month}/${paymentMethod.expiry_year}</div>
            </div>
          </div>
          <button onclick="customerDetailsScreen.deletePaymentMethod('${paymentMethod.id}')" style="
            background: transparent;
            border: none;
            color: #e74c3c;
            cursor: pointer;
            font-size: 18px;
          ">🗑️</button>
        </div>
        
        <div style="color: #95a5a6; font-size: 12px;">
          ${paymentMethod.billing_name || ''}
          ${paymentMethod.billing_address ? `<br>${paymentMethod.billing_address}` : ''}
        </div>
      </div>
    `;
  }

  // Helper methods
  getInitials(customer) {
    const first = customer.first_name ? customer.first_name[0] : '';
    const last = customer.last_name ? customer.last_name[0] : '';
    return (first + last).toUpperCase() || customer.email[0].toUpperCase();
  }

  getFullName(customer) {
    if (customer.first_name || customer.last_name) {
      return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    }
    return customer.email;
  }

  getLocation(customer) {
    const parts = [];
    if (customer.city) parts.push(customer.city);
    if (customer.state_code) parts.push(customer.state_code);
    return parts.length > 0 ? parts.join(', ') : '-';
  }

  formatCurrency(amount, currencyCode = 'USD') {
    // Amount is already in dollars (not cents)
    const currency = currencyCode || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
      });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }

  attachEventListeners() {
    // ESC key to close
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  // Action methods
  close() {
    // Instead of restoring innerHTML (which destroys map), just re-render customers screen
    this.currentCustomer = null;
    this.originalContent = null;

    if (window.customersScreen) {
      customersScreen.render();
    }
  }

  showAllContactInfo() {
    alert('Show all contact details modal - to be implemented');
  }

  addNote() {
    alert('Add note modal - to be implemented');
  }

  sendEmail() {
    alert('Send email modal - to be implemented');
  }

  sendSMS() {
    alert('Send SMS modal - to be implemented');
  }

  createOrder() {
    // Close details modal and open POS with this customer selected
    const customerId = this.currentCustomer.id;
    this.close();
    App.navigate('pos');
    // Set customer in POS screen
    if (window.POSScreen && window.POSScreen.selectCustomer) {
      setTimeout(() => {
        POSScreen.selectCustomer(this.currentCustomer);
      }, 100);
    }
  }

  filterActivity(filterValue) {
    this.activityFilter = filterValue;
    const content = document.getElementById('activityTimelineContent');
    if (content) {
      content.innerHTML = this.renderActivityItems();
    }
  }

  filterOrders() {
    alert('Filter orders - to be implemented');
  }

  sortOrders() {
    alert('Sort orders - to be implemented');
  }

  viewOrder(orderId) {
    alert(`View order ${orderId} - to be implemented`);
  }

  shipOrder(orderId) {
    if (confirm('Mark this order as shipped?')) {
      alert(`Ship order ${orderId} - to be implemented`);
    }
  }

  addPaymentMethod() {
    alert('Add payment method - options:\n1. Manual entry\n2. From terminal\n\nTo be implemented');
  }

  deletePaymentMethod(paymentMethodId) {
    if (confirm('Delete this payment method?')) {
      alert(`Delete payment method ${paymentMethodId} - to be implemented`);
    }
  }
}

// Global instance
const customerDetailsScreen = new CustomerDetailsScreen();
