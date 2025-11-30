// POS Screen functionality
const POSScreen = {
  products: [],
  cart: [],
  TAX_RATE: 0.0775,
  selectedCustomer: null,
  customers: [],
  pollingInterval: null,
  pollingStartTime: null,
  currentReferenceId: null,
  loadingState: {
    products: false,
    customers: false,
  },

  async init() {
    this.loadingState.products = true;
    this.loadingState.customers = true;
    this.renderProducts();
    this.renderCustomerSelector();

    await this.loadProducts();
    this.loadingState.products = false;
    this.renderProducts();

    await this.loadCustomers();
    this.loadingState.customers = false;
    this.renderCustomerSelector();

    this.setupPayButton();
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
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      this.products = [];
    }
  },

  async loadCustomers() {
    if (!App.currentWinery) return;

    try {
      const response = await fetch('/.netlify/functions/get-customers?limit=1000');
      const data = await response.json();

      if (data.success) {
        this.customers = data.customers;
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
      this.customers = [];
    }
  },

  renderCustomerSelector() {
    const container = document.getElementById('customerSelector');
    if (!container) return;

    if (this.loadingState.customers) {
      container.innerHTML = '<option value="">Loading customers...</option>';
      return;
    }

    const options = [
      '<option value="">Guest Checkout</option>',
      ...this.customers.map((c) => {
        const name =
          c.first_name || c.last_name
            ? `${c.first_name || ''} ${c.last_name || ''}`.trim()
            : c.email;
        return `<option value="${c.id}">${name}</option>`;
      }),
    ];

    container.innerHTML = options.join('');
  },

  selectCustomer(customerId) {
    this.selectedCustomer = customerId ? this.customers.find((c) => c.id === customerId) : null;
  },

  renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    if (this.loadingState.products) {
      grid.innerHTML = this.renderProductsLoadingState();
      return;
    }

    if (this.products.length === 0) {
      grid.innerHTML =
        '<p style="text-align: center; color: #95a5a6; padding: 40px;">No products available for sale</p>';
      return;
    }

    grid.innerHTML = this.products
      .map((product) => {
        // Determine icon and details based on product type
        const icon =
          product.type === 'wine'
            ? '🍷'
            : product.category === 'Payment Testing'
              ? '💳'
              : product.category === 'Stemware'
                ? '🍸'
                : product.category === 'Decanter'
                  ? '🍾'
                  : product.category === 'Provisions'
                    ? '🧺'
                    : '📦';

        const details =
          product.type === 'wine'
            ? [product.vintage, product.varietal, product.wine_region].filter(Boolean).join(' • ')
            : product.description || product.category || '';

        return `
                <div class="product-card" onclick="POSScreen.addToCart('${product.id}')">
                    <div class="product-icon">${icon}</div>
                    <div class="product-name">${product.name}</div>
                    ${details ? `<div class="product-details">${details}</div>` : ''}
                    <div class="product-price">$${parseFloat(product.price).toFixed(2)}</div>
                </div>
            `;
      })
      .join('');
  },

  renderProductsLoadingState() {
    return Array(12)
      .fill(0)
      .map(
        () => `
      <div style="
        background: #34495e;
        padding: 15px;
        border-radius: 8px;
        text-align: center;
      ">
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          margin: 0 auto 10px;
        "></div>
        <div style="
          height: 16px;
          width: 80%;
          margin: 0 auto 8px;
          background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        "></div>
        <div style="
          height: 14px;
          width: 60%;
          margin: 0 auto 8px;
          background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        "></div>
        <div style="
          height: 18px;
          width: 50%;
          margin: 10px auto 0;
          background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        "></div>
      </div>

      <style>
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      </style>
    `
      )
      .join('');
  },

  addToCart(productId) {
    const product = this.products.find((p) => p.id === productId);
    if (!product) return;

    const existingItem = this.cart.find((item) => item.id === productId);
    if (existingItem) {
      existingItem.quantity++;
    } else {
      this.cart.push({
        ...product,
        quantity: 1,
      });
    }

    this.updateCart();
  },

  updateQuantity(productId, change) {
    const item = this.cart.find((item) => item.id === productId);
    if (!item) return;

    item.quantity += change;

    if (item.quantity <= 0) {
      this.cart = this.cart.filter((item) => item.id !== productId);
    }

    this.updateCart();
  },

  removeFromCart(productId) {
    this.cart = this.cart.filter((item) => item.id !== productId);
    this.updateCart();
  },

  updateCart() {
    this.renderCart();
    this.updateTotals();
  },

  renderCart() {
    const container = document.getElementById('cartItems');

    if (this.cart.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #95a5a6; padding: 20px;">Cart is empty</p>';
      return;
    }

    container.innerHTML = this.cart
      .map(
        (item) => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">$${parseFloat(item.price).toFixed(2)}</div>
                </div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="POSScreen.updateQuantity('${item.id}', -1)">−</button>
                    <span class="qty">${item.quantity}</span>
                    <button class="qty-btn" onclick="POSScreen.updateQuantity('${item.id}', 1)">+</button>
                    <button class="remove-btn" onclick="POSScreen.removeFromCart('${item.id}')">×</button>
                </div>
            </div>
        `
      )
      .join('');
  },

  updateTotals() {
    const subtotal = this.cart.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    );
    const tax = subtotal * this.TAX_RATE;
    const total = subtotal + tax;

    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('tax').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('total').textContent = `$${total.toFixed(2)}`;
  },

  setupPayButton() {
    const payBtn = document.getElementById('payButton');
    if (payBtn) {
      payBtn.onclick = () => this.showPaymentScreen();
    }
  },

  showPaymentScreen() {
    if (this.cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    const paymentScreen = document.getElementById('paymentScreen');
    paymentScreen.style.display = 'flex';

    const subtotal = this.cart.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    );
    const tax = subtotal * this.TAX_RATE;
    const total = subtotal + tax;

    document.getElementById('paymentSubtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('paymentTax').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('paymentTotal').textContent = `$${total.toFixed(2)}`;
  },

  hidePaymentScreen() {
    document.getElementById('paymentScreen').style.display = 'none';
  },

  async processCardPayment() {
    if (this.cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    const subtotal = this.cart.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    );
    const tax = subtotal * this.TAX_RATE;
    const total = subtotal + tax;

    try {
      // Create order first
      const orderResponse = await fetch('/.netlify/functions/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winery_id: App.currentWinery.id,
          customer_id: this.selectedCustomer?.id || null,
          items: this.cart.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
            price: item.price,
          })),
          subtotal: subtotal,
          tax: tax,
          total: total,
          order_source: 'pos',
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      // Process payment via terminal
      const paymentResponse = await fetch('/.netlify/functions/process-terminal-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winery_id: App.currentWinery.id,
          amount: total,
          order_id: orderData.order_id,
        }),
      });

      const paymentData = await paymentResponse.json();

      if (paymentData.success) {
        this.showPaymentSuccess();
        this.reset();
      } else {
        throw new Error(paymentData.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert(`Payment failed: ${error.message}`);
    }
  },

  async processCashPayment() {
    // Similar implementation to card payment but for cash
    alert('Cash payment processing - to be implemented');
  },

  showPaymentSuccess() {
    alert('Payment successful!');
    this.hidePaymentScreen();
  },

  reset() {
    this.cart = [];
    this.selectedCustomer = null;
    this.updateCart();
    const selector = document.getElementById('customerSelector');
    if (selector) selector.value = '';
  },
};
