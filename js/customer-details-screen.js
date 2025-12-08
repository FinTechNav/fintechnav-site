// Customer Details Screen Module
class CustomerDetailsScreen {
  constructor() {
    this.currentCustomer = null;
    this.activityFilter = 'all';
    this.orders = [];
    this.savedPaymentMethods = [];
    this.activities = [];
    this.loadingState = {
      customer: false,
      orders: false,
      paymentMethods: false,
      activities: false,
    };
    this.viewMode = 'split'; // 'split', 'timeline-max', 'orders-max'
    this.activitySortOrder = 'desc'; // 'desc' = newest first, 'asc' = oldest first
    this.ordersSortOrder = 'desc'; // 'desc' = newest first, 'asc' = oldest first
  }

  async show(customerId) {
    // Set loading state and render immediately
    this.loadingState = {
      customer: true,
      orders: true,
      paymentMethods: true,
      activities: true,
    };
    this.currentCustomer = { id: customerId };
    this.orders = [];
    this.savedPaymentMethods = [];
    this.activities = [];
    this.render();

    try {
      // Fetch customer data
      const url = `/.netlify/functions/get-customer-stats?id=${customerId}`;

      const response = await fetch(url);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.details || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      if (!data.success) {
        throw new Error(data.error || data.details || 'Failed to load customer');
      }

      this.currentCustomer = data.customer;
      this.orders = data.recent_orders || [];
      this.loadingState.customer = false;
      this.loadingState.orders = false;
      this.render();

      // Fetch payment methods
      await this.loadPaymentMethods(customerId);
      this.loadingState.paymentMethods = false;
      this.render();

      // Fetch activities
      await this.loadActivities(customerId);
      this.loadingState.activities = false;
      this.render();
    } catch (error) {
      this.loadingState = {
        customer: false,
        orders: false,
        paymentMethods: false,
        activities: false,
      };

      alert(
        `Failed to load customer details:\n\n${error.message}\n\nCheck browser console for details.`
      );
    }
  }

  async loadPaymentMethods(customerId) {
    try {
      const url = `/.netlify/functions/get-payment-methods?customer_id=${customerId}`;

      const response = await fetch(url);

      const data = await response.json();

      if (data.success) {
        this.savedPaymentMethods = data.payment_methods || [];
      } else {
        this.savedPaymentMethods = [];
      }
    } catch (error) {
      this.savedPaymentMethods = [];
    }
  }

  async loadActivities(customerId) {
    try {
      const filterParam = this.activityFilter === 'all' ? '' : `&type=${this.activityFilter}`;
      const url = `/.netlify/functions/get-customer-activities?customer_id=${customerId}${filterParam}`;

      const response = await fetch(url);

      const data = await response.json();

      if (data.success) {
        this.activities = data.activities || [];
      } else {
        this.activities = [];
      }
    } catch (error) {
      this.activities = [];
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
        background: #444443;
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
        background: #444443;
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
    if (this.loadingState.customer) {
      return `
        <div style="
          width: 280px;
          background: #444443;
          padding: 20px;
          overflow-y: auto;
          border-radius: 8px;
        ">
          <!-- Avatar skeleton -->
          <div style="
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            margin: 0 auto 20px;
          "></div>

          <!-- Name skeleton -->
          <div style="
            height: 24px;
            width: 70%;
            margin: 0 auto 10px;
            background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 4px;
          "></div>

          <!-- Email skeleton -->
          <div style="
            height: 16px;
            width: 80%;
            margin: 0 auto 20px;
            background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 4px;
          "></div>

          <!-- Contact info skeletons -->
          ${[1, 2, 3, 4]
            .map(
              () => `
            <div style="margin-bottom: 15px;">
              <div style="
                height: 12px;
                width: 40%;
                margin-bottom: 5px;
                background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: 4px;
              "></div>
              <div style="
                height: 16px;
                width: 70%;
                background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: 4px;
              "></div>
            </div>
          `
            )
            .join('')}
          
          <style>
            @keyframes shimmer {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
          </style>
        </div>
      `;
    }

    return `
      <div style="
        width: 280px;
        background: #444443;
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
        <p style="color: #95a5a6; text-align: center; margin: 0 0 20px; font-size: 14px;">${customer.email || ''}</p>

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
    const timelineHeight =
      this.viewMode === 'timeline-max'
        ? 'calc(100vh - 200px)'
        : this.viewMode === 'orders-max'
          ? '0'
          : '400px';
    const ordersHeight =
      this.viewMode === 'orders-max'
        ? 'calc(100vh - 200px)'
        : this.viewMode === 'timeline-max'
          ? '0'
          : '400px';

    return `
      <div style="
        flex: 1;
        display: flex;
        flex-direction: column;
        background: #444443;
        border-radius: 8px;
        overflow: hidden;
      ">
        ${this.renderActionButtons()}
        
        <!-- Activity Timeline Section -->
        ${
          this.viewMode !== 'orders-max'
            ? `
          <div style="
            height: ${timelineHeight};
            display: flex;
            flex-direction: column;
            padding: 0 20px;
            margin-bottom: ${this.viewMode === 'split' ? '20px' : '0'};
          ">
            ${this.renderActivityTimeline()}
          </div>
        `
            : ''
        }
        
        <!-- Orders Section -->
        ${
          this.viewMode !== 'timeline-max'
            ? `
          <div style="
            height: ${ordersHeight};
            display: flex;
            flex-direction: column;
            padding: 0 20px 20px;
          ">
            ${this.renderOrdersSection()}
          </div>
        `
            : ''
        }
      </div>
    `;
  }

  renderActionButtons() {
    return `
      <div style="
        display: flex;
        gap: 10px;
        padding: 20px 20px 15px;
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
          color: #444443;
          font-size: 14px;
          cursor: pointer;
          font-weight: 600;
        ">🛒 Order</button>
      </div>
    `;
  }

  renderActivityTimeline() {
    return `
      <div style="display: flex; flex-direction: column; height: 100%;">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding-top: 15px;
        ">
          <h3 style="color: #ecf0f1; margin: 0; font-family: Georgia, serif;">Activity Timeline</h3>
          <div style="display: flex; gap: 10px; align-items: center;">
            ${this.renderActivityFilter()}
            <button onclick="customerDetailsScreen.toggleActivitySort()" style="
              background: transparent;
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 6px;
              color: #ecf0f1;
              padding: 8px 12px;
              font-size: 14px;
              cursor: pointer;
            " title="Sort ${this.activitySortOrder === 'desc' ? 'oldest first' : 'newest first'}">${this.activitySortOrder === 'desc' ? '↓' : '↑'}</button>
            <button onclick="customerDetailsScreen.toggleViewMode('${this.viewMode === 'timeline-max' ? 'split' : 'timeline-max'}')" style="
              background: transparent;
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 6px;
              color: #ecf0f1;
              padding: 8px 12px;
              font-size: 14px;
              cursor: pointer;
            " title="${this.viewMode === 'timeline-max' ? 'Show both' : 'Maximize timeline'}">${this.viewMode === 'timeline-max' ? '⊟' : '⊞'}</button>
          </div>
        </div>
        
        <div id="activityTimelineContent" style="
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
        ">
          ${this.renderActivityItems()}
        </div>
      </div>
    `;
  }

  renderActivityFilter() {
    const filters = [
      { value: 'all', label: 'All' },
      { value: 'order_placed', label: 'Orders' },
      { value: 'note_added', label: 'Notes' },
      { value: 'email_sent', label: 'Emails' },
      { value: 'payment_method_added', label: 'Payments' },
    ];

    return `
      <select onchange="customerDetailsScreen.filterActivity(this.value)" style="
        background: #444443;
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
    if (this.loadingState.activities) {
      return `
        <div style="position: relative;">
          ${[1, 2, 3]
            .map(
              (_, index) => `
            <div style="
              position: relative;
              padding-left: 40px;
              padding-bottom: ${index < 2 ? '20px' : '0'};
            ">
              <!-- Timeline dot skeleton -->
              <div style="
                position: absolute;
                left: 0;
                top: 0;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: linear-gradient(90deg, rgba(210,180,140,0.3) 25%, rgba(210,180,140,0.5) 50%, rgba(210,180,140,0.3) 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
              "></div>
              
              ${
                index < 2
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
              
              <!-- Content skeleton -->
              <div>
                <div style="
                  height: 16px;
                  width: 120px;
                  margin-bottom: 5px;
                  background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                  background-size: 200% 100%;
                  animation: shimmer 1.5s infinite;
                  border-radius: 4px;
                "></div>
                <div style="
                  height: 14px;
                  width: 200px;
                  margin-bottom: 5px;
                  background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                  background-size: 200% 100%;
                  animation: shimmer 1.5s infinite;
                  border-radius: 4px;
                "></div>
                <div style="
                  height: 12px;
                  width: 80px;
                  background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                  background-size: 200% 100%;
                  animation: shimmer 1.5s infinite;
                  border-radius: 4px;
                "></div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `;
    }

    if (this.activities.length === 0) {
      return '<p style="color: #95a5a6; text-align: center; padding: 40px;">No activity yet</p>';
    }

    return `
      <div style="position: relative;">
        ${this.activities
          .map(
            (activity, index) => `
          <div style="
            position: relative;
            padding-left: 40px;
            padding-bottom: ${index < this.activities.length - 1 ? '20px' : '0'};
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
            ">${this.getActivityIcon(activity.activity_type)}</div>
            
            <!-- Timeline line -->
            ${
              index < this.activities.length - 1
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
              <div style="color: #ecf0f1; font-weight: 600; margin-bottom: 3px;">${activity.activity_title}</div>
              <div style="color: #95a5a6; font-size: 14px; margin-bottom: 3px;">${activity.activity_description}</div>
              <div style="color: #7f8c8d; font-size: 12px;">
                ${this.formatDateTime(activity.created_at)}
                ${activity.employee_first_name ? ` • by ${activity.employee_first_name} ${activity.employee_last_name || ''}` : ''}
              </div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  getActivityIcon(activityType) {
    const icons = {
      order_placed: '🛒',
      payment_received: '💰',
      note_added: '📝',
      email_sent: '📧',
      sms_sent: '💬',
      payment_method_added: '💳',
      payment_method_deleted: '🗑️',
      profile_updated: '✏️',
      reservation_created: '📅',
      reservation_completed: '✅',
      club_joined: '🍷',
      club_cancelled: '❌',
      allocation_joined: '⭐',
    };
    return icons[activityType] || '📌';
  }

  renderOrdersSection() {
    return `
      <div style="display: flex; flex-direction: column; height: 100%;">
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
            <button onclick="customerDetailsScreen.toggleOrdersSort()" style="
              background: transparent;
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 6px;
              color: #ecf0f1;
              padding: 8px 12px;
              font-size: 14px;
              cursor: pointer;
            " title="Sort ${this.ordersSortOrder === 'desc' ? 'oldest first' : 'newest first'}">${this.ordersSortOrder === 'desc' ? '↓' : '↑'}</button>
            <button onclick="customerDetailsScreen.toggleViewMode('${this.viewMode === 'orders-max' ? 'split' : 'orders-max'}')" style="
              background: transparent;
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 6px;
              color: #ecf0f1;
              padding: 8px 12px;
              font-size: 14px;
              cursor: pointer;
            " title="${this.viewMode === 'orders-max' ? 'Show both' : 'Maximize orders'}">${this.viewMode === 'orders-max' ? '⊟' : '⊞'}</button>
          </div>
        </div>
        
        <div style="
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
        ">
          ${this.renderOrdersTable()}
        </div>
      </div>
    `;
  }

  renderOrdersTable() {
    if (this.loadingState.orders) {
      return `
        <div style="
          background: #444443;
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
          
          <!-- Loading rows -->
          ${[1, 2, 3]
            .map(
              () => `
            <div style="
              display: grid;
              grid-template-columns: 150px 120px 120px 120px 100px;
              gap: 15px;
              padding: 15px;
              border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            ">
              <div style="
                height: 16px;
                width: 100px;
                background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: 4px;
              "></div>
              <div style="
                height: 16px;
                width: 80px;
                background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: 4px;
              "></div>
              <div style="
                height: 16px;
                width: 60px;
                background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: 4px;
              "></div>
              <div style="
                height: 24px;
                width: 70px;
                background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: 4px;
              "></div>
              <div style="
                height: 24px;
                width: 50px;
                background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
                border-radius: 4px;
              "></div>
            </div>
          `
            )
            .join('')}
        </div>
      `;
    }

    if (this.orders.length === 0) {
      return '<p style="color: #95a5a6; text-align: center; padding: 40px;">No orders yet</p>';
    }

    return `
      <div style="
        background: #444443;
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
        background: #444443;
        padding: 20px;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      ">
        <div style="flex-shrink: 0;">
          ${this.renderLTVCard(customer)}
        </div>
        <div style="flex: 1; min-height: 0;"></div>
        <div style="flex-shrink: 0;">
          ${this.renderPaymentMethods()}
        </div>
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
        background: linear-gradient(135deg, #444443, #444443);
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
            color: #444443;
            font-size: 12px;
            cursor: pointer;
            font-weight: 600;
          ">+ Add</button>
        </div>
        
        ${
          this.loadingState.paymentMethods
            ? `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${[1, 2]
              .map(
                () => `
              <div style="
                background: rgba(0, 0, 0, 0.2);
                border-radius: 8px;
                padding: 15px;
                border: 1px solid rgba(255, 255, 255, 0.1);
              ">
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                  <div style="
                    width: 24px;
                    height: 24px;
                    background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                    background-size: 200% 100%;
                    animation: shimmer 1.5s infinite;
                    border-radius: 4px;
                  "></div>
                  <div style="flex: 1;">
                    <div style="
                      height: 16px;
                      width: 120px;
                      margin-bottom: 5px;
                      background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                      background-size: 200% 100%;
                      animation: shimmer 1.5s infinite;
                      border-radius: 4px;
                    "></div>
                    <div style="
                      height: 12px;
                      width: 80px;
                      background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                      background-size: 200% 100%;
                      animation: shimmer 1.5s infinite;
                      border-radius: 4px;
                    "></div>
                  </div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        `
            : this.savedPaymentMethods.length === 0
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
    if (!customer || !customer.email) return '?';
    const first = customer.first_name ? customer.first_name[0] : '';
    const last = customer.last_name ? customer.last_name[0] : '';
    return (first + last).toUpperCase() || customer.email[0].toUpperCase();
  }

  getFullName(customer) {
    if (!customer || !customer.email) return 'Loading...';
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

  async filterActivity(filterValue) {
    this.activityFilter = filterValue;

    // Reload activities with new filter
    if (this.currentCustomer) {
      await this.loadActivities(this.currentCustomer.id);

      // Update just the timeline content
      const content = document.getElementById('activityTimelineContent');
      if (content) {
        content.innerHTML = this.renderActivityItems();
      }
    }
  }

  toggleActivitySort() {
    this.activitySortOrder = this.activitySortOrder === 'desc' ? 'asc' : 'desc';
    this.activities.reverse();
    this.render();
  }

  toggleOrdersSort() {
    this.ordersSortOrder = this.ordersSortOrder === 'desc' ? 'asc' : 'desc';
    this.orders.reverse();
    this.render();
  }

  toggleViewMode(newMode) {
    this.viewMode = newMode;
    this.render();
  }

  filterOrders() {
    alert('Filter orders - to be implemented');
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
