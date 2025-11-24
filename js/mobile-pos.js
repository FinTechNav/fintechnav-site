// Mobile POS - Step-by-step checkout flow
const MobilePOS = {
  currentStep: 1,
  cart: [],
  selectedCustomer: null,
  selectedPaymentMethod: null,
  products: [],
  customers: [],
  TAX_RATE: 0.0775,

  init() {
    this.setupMobileLayout();
    this.loadProducts();
    this.loadCustomers();
    this.renderStep();
  },

  setupMobileLayout() {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;

    document.body.classList.add('mobile-layout');

    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    mainContent.innerHTML = `
      <!-- Mobile Top Bar -->
      <div class="mobile-top-bar">
        <div class="mobile-menu-icon" onclick="MobilePOS.toggleMenu()">
          <div class="hamburger">
            <span style="display:block;width:24px;height:3px;background:#1a1a2e;margin:4px 0;"></span>
            <span style="display:block;width:24px;height:3px;background:#1a1a2e;margin:4px 0;"></span>
            <span style="display:block;width:24px;height:3px;background:#1a1a2e;margin:4px 0;"></span>
          </div>
        </div>
        <div class="mobile-total-display">
          <div class="mobile-total-amount" id="mobileTotal">$0.00</div>
          <div class="mobile-total-label">Total</div>
        </div>
      </div>

      <!-- Mobile Step Indicator -->
      <div class="mobile-step-indicator">
        <div class="mobile-step" data-step="1">Items</div>
        <div class="mobile-step" data-step="2">Customer</div>
        <div class="mobile-step" data-step="3">Payment</div>
        <div class="mobile-step" data-step="4">Complete</div>
      </div>

      <!-- Mobile Content -->
      <div class="mobile-content" id="mobileStepContent"></div>

      <!-- Bottom Navigation -->
      <div class="mobile-bottom-nav" id="mobileBottomNav"></div>
    `;
  },

  async loadProducts() {
    if (!App.currentWinery) return;

    try {
      const response = await fetch(
        `/.netlify/functions/get-pos-products?winery_id=${App.currentWinery.id}`
      );
      const data = await response.json();

      if (data.success) {
        this.products = data.products;
        if (this.currentStep === 1) this.renderStep();
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  },

  async loadCustomers() {
    if (!App.currentWinery) return;

    try {
      const response = await fetch(
        `/.netlify/functions/get-winery-customers?winery_id=${App.currentWinery.id}`
      );
      const data = await response.json();

      if (data.success) {
        this.customers = data.customers;
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  },

  renderStep() {
    // Update step indicator
    document.querySelectorAll('.mobile-step').forEach((step) => {
      const stepNum = parseInt(step.dataset.step);
      step.classList.toggle('active', stepNum === this.currentStep);
    });

    // Render step content
    const content = document.getElementById('mobileStepContent');
    const bottomNav = document.getElementById('mobileBottomNav');

    switch (this.currentStep) {
      case 1:
        this.renderProductSelection(content, bottomNav);
        break;
      case 2:
        this.renderCustomerSelection(content, bottomNav);
        break;
      case 3:
        this.renderPaymentScreen(content, bottomNav);
        break;
      case 4:
        this.renderCompleteScreen(content, bottomNav);
        break;
    }

    this.updateTotal();
  },

  renderProductSelection(content, bottomNav) {
    const cartCount = this.cart.reduce((sum, item) => sum + item.quantity, 0);

    content.innerHTML = `
      <div class="mobile-products-container">
        ${this.products
          .map((product) => {
            const cartItem = this.cart.find((item) => item.id === product.id);
            const quantity = cartItem ? cartItem.quantity : 0;

            const vintageText =
              product.vintage && product.vintage !== 'null' ? product.vintage : '';
            const varietalText =
              product.varietal && product.varietal !== 'null' ? product.varietal : '';
            const separator = vintageText && varietalText ? ' - ' : '';
            const details = vintageText + separator + varietalText;

            return `
            <div class="mobile-product-item">
              <div class="mobile-product-image">🍷</div>
              <div class="mobile-product-info">
                <div class="mobile-product-name">${product.name}</div>
                ${details ? `<div class="mobile-product-details">${details}</div>` : ''}
                <div class="mobile-product-price">$${parseFloat(product.price).toFixed(2)}</div>
              </div>
              <div class="mobile-product-quantity">
                <button class="mobile-qty-btn" onclick="MobilePOS.updateQuantity(${product.id}, -1)" ${quantity === 0 ? 'disabled' : ''}>−</button>
                <div class="mobile-qty-display">${quantity}</div>
                <button class="mobile-qty-btn" onclick="MobilePOS.updateQuantity(${product.id}, 1)">+</button>
              </div>
            </div>
          `;
          })
          .join('')}
      </div>
    `;

    bottomNav.innerHTML = `
      <button class="mobile-nav-btn primary" onclick="MobilePOS.nextStep()" ${cartCount === 0 ? 'disabled' : ''}>
        Next: Select Customer
        <span class="mobile-cart-badge" style="position:static;margin-left:8px;">${cartCount}</span>
      </button>
    `;
  },

  renderCustomerSelection(content, bottomNav) {
    content.innerHTML = `
      <div class="mobile-customer-container">
        <div class="mobile-customer-option ${!this.selectedCustomer ? 'selected' : ''}" onclick="MobilePOS.selectCustomer(null)">
          <div class="mobile-customer-name">Guest Checkout</div>
          <div class="mobile-customer-email">Continue without customer info</div>
        </div>
        
        ${this.customers
          .map(
            (customer) => `
          <div class="mobile-customer-option ${this.selectedCustomer?.id === customer.id ? 'selected' : ''}" onclick="MobilePOS.selectCustomer('${customer.id}')">
            <div class="mobile-customer-name">${customer.name || 'Customer'}</div>
            <div class="mobile-customer-email">${customer.email || ''}</div>
          </div>
        `
          )
          .join('')}
      </div>
    `;

    bottomNav.innerHTML = `
      <button class="mobile-nav-btn secondary" onclick="MobilePOS.previousStep()">Back</button>
      <button class="mobile-nav-btn primary" onclick="MobilePOS.nextStep()">Next: Payment</button>
    `;
  },

  renderPaymentScreen(content, bottomNav) {
    const { subtotal, tax, total } = this.calculateTotals();

    content.innerHTML = `
      <div class="mobile-summary-container">
        <div class="mobile-summary-card">
          <div class="mobile-summary-header">Order Summary</div>
          ${this.cart
            .map(
              (item) => `
            <div class="mobile-summary-item">
              <div class="mobile-summary-item-name">${item.name}</div>
              <div class="mobile-summary-item-qty">×${item.quantity}</div>
              <div class="mobile-summary-item-price">$${(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
            </div>
          `
            )
            .join('')}
          
          <div class="mobile-summary-totals">
            <div class="mobile-summary-row">
              <span>Subtotal</span>
              <span>$${subtotal.toFixed(2)}</span>
            </div>
            <div class="mobile-summary-row">
              <span>Tax (7.75%)</span>
              <span>$${tax.toFixed(2)}</span>
            </div>
            <div class="mobile-summary-total-row">
              <span class="mobile-summary-total-label">Total</span>
              <span class="mobile-summary-total-amount">$${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div class="mobile-summary-card">
          <div class="mobile-summary-header">Payment Method</div>
          <div class="mobile-payment-methods">
            <div class="mobile-payment-method ${this.selectedPaymentMethod === 'card' ? 'selected' : ''}" onclick="MobilePOS.selectPaymentMethod('card')">
              <div class="mobile-payment-icon">💳</div>
              <div class="mobile-payment-label">Card</div>
            </div>
            <div class="mobile-payment-method ${this.selectedPaymentMethod === 'cash' ? 'selected' : ''}" onclick="MobilePOS.selectPaymentMethod('cash')">
              <div class="mobile-payment-icon">💵</div>
              <div class="mobile-payment-label">Cash</div>
            </div>
          </div>
        </div>
      </div>
    `;

    bottomNav.innerHTML = `
      <button class="mobile-nav-btn secondary" onclick="MobilePOS.previousStep()">Back</button>
      <button class="mobile-nav-btn primary" onclick="MobilePOS.processPayment()" ${!this.selectedPaymentMethod ? 'disabled' : ''}>
        Complete Payment
      </button>
    `;
  },

  renderCompleteScreen(content, bottomNav) {
    const { total } = this.calculateTotals();

    content.innerHTML = `
      <div class="mobile-complete-container">
        <div class="mobile-complete-icon">✓</div>
        <div class="mobile-complete-status">Payment Complete</div>
        <div class="mobile-complete-amount">$${total.toFixed(2)}</div>
        
        <div class="mobile-summary-card" style="text-align:left;margin-top:20px;">
          <div class="mobile-summary-header">Order #${Date.now().toString().slice(-6)}</div>
          <div class="mobile-summary-row">
            <span>Payment Method</span>
            <span>${this.selectedPaymentMethod === 'card' ? 'Card' : 'Cash'}</span>
          </div>
          <div class="mobile-summary-row">
            <span>Customer</span>
            <span>${this.selectedCustomer ? this.selectedCustomer.name : 'Guest'}</span>
          </div>
        </div>

        <div class="mobile-receipt-options">
          <button class="mobile-receipt-btn primary" onclick="MobilePOS.emailReceipt()">📧 Email Receipt</button>
          <button class="mobile-receipt-btn" onclick="MobilePOS.printReceipt()">🖨️ Print Receipt</button>
        </div>
      </div>
    `;

    bottomNav.innerHTML = `
      <button class="mobile-nav-btn primary" onclick="MobilePOS.newOrder()">New Order</button>
    `;
  },

  updateQuantity(productId, change) {
    const product = this.products.find((p) => p.id === productId);
    if (!product) return;

    const cartItem = this.cart.find((item) => item.id === productId);

    if (cartItem) {
      cartItem.quantity += change;
      if (cartItem.quantity <= 0) {
        this.cart = this.cart.filter((item) => item.id !== productId);
      }
    } else if (change > 0) {
      this.cart.push({ ...product, quantity: 1 });
    }

    this.renderStep();
  },

  selectCustomer(customerId) {
    this.selectedCustomer = customerId ? this.customers.find((c) => c.id === customerId) : null;
    this.renderStep();
  },

  selectPaymentMethod(method) {
    this.selectedPaymentMethod = method;
    this.renderStep();
  },

  calculateTotals() {
    const subtotal = this.cart.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    );
    const tax = subtotal * this.TAX_RATE;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  },

  updateTotal() {
    const totalEl = document.getElementById('mobileTotal');
    if (totalEl) {
      const { total } = this.calculateTotals();
      totalEl.textContent = `$${total.toFixed(2)}`;
    }
  },

  nextStep() {
    if (this.currentStep < 4) {
      this.currentStep++;
      this.renderStep();
    }
  },

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.renderStep();
    }
  },

  async processPayment() {
    // Here you would integrate with your actual payment processing
    // For now, just move to complete screen
    this.currentStep = 4;
    this.renderStep();
  },

  newOrder() {
    this.cart = [];
    this.selectedCustomer = null;
    this.selectedPaymentMethod = null;
    this.currentStep = 1;
    this.renderStep();
  },

  emailReceipt() {
    alert('Email receipt functionality coming soon');
  },

  printReceipt() {
    alert('Print receipt functionality coming soon');
  },

  toggleMenu() {
    // Toggle sidebar for mobile
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      App.toggleSidebar();
    }
  },
};

// Initialize mobile POS if on mobile device
if (window.innerWidth <= 768 && App.currentWinery) {
  MobilePOS.init();
}
