// POS Screen functionality
const POSScreen = {
  products: [],
  cart: [],
  TAX_RATE: 0.0775,
  selectedCustomer: null,
  customers: [],

  async init() {
    await this.loadProducts();
    await this.loadCustomers();
    this.renderProducts();
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
      const response = await fetch(
        `/.netlify/functions/get-winery-customers?winery_id=${App.currentWinery.id}`
      );
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

    const options = [
      '<option value="">Guest Checkout</option>',
      ...this.customers.map((c) => `<option value="${c.id}">${c.name || c.email}</option>`),
    ];

    container.innerHTML = options.join('');
  },

  selectCustomer(customerId) {
    this.selectedCustomer = customerId ? this.customers.find((c) => c.id === customerId) : null;
  },

  renderProducts() {
    const grid = document.getElementById('productsGrid');

    if (this.products.length === 0) {
      grid.innerHTML =
        '<p style="text-align: center; color: #95a5a6; padding: 40px;">No products available for sale</p>';
      return;
    }

    grid.innerHTML = this.products
      .map(
        (product) => `
            <div class="product-card" onclick="POSScreen.addToCart(${product.id})">
                <div class="wine-icon">🍷</div>
                <div class="product-name">${product.name}</div>
                <div class="product-vintage">${product.vintage} - ${product.varietal}</div>
                <div class="product-price">$${parseFloat(product.price).toFixed(2)}</div>
            </div>
        `
      )
      .join('');
  },

  addToCart(productId) {
    const product = this.products.find((p) => p.id === productId);
    const existingItem = this.cart.find((item) => item.id === productId);

    if (existingItem) {
      existingItem.quantity++;
    } else {
      this.cart.push({
        ...product,
        quantity: 1,
      });
    }

    this.renderCart();
    this.updateTotals();
  },

  updateQuantity(productId, delta) {
    const item = this.cart.find((i) => i.id === productId);
    if (item) {
      item.quantity += delta;
      if (item.quantity <= 0) {
        this.cart = this.cart.filter((i) => i.id !== productId);
      }
    }
    this.renderCart();
    this.updateTotals();
  },

  renderCart() {
    const cartItems = document.getElementById('cartItems');

    if (this.cart.length === 0) {
      cartItems.innerHTML = '<div class="empty-cart">Add items to start order</div>';
      document.getElementById('payButton').disabled = true;
      return;
    }

    document.getElementById('payButton').disabled = false;

    cartItems.innerHTML = this.cart
      .map(
        (item) => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-details">${item.vintage} ${item.varietal}</div>
                </div>
                <div class="cart-item-qty">
                    <div class="qty-btn" onclick="POSScreen.updateQuantity(${item.id}, -1)">−</div>
                    <div class="qty-display">${item.quantity}</div>
                    <div class="qty-btn" onclick="POSScreen.updateQuantity(${item.id}, 1)">+</div>
                </div>
                <div class="cart-item-price">$${(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
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
    const payButton = document.getElementById('payButton');
    if (payButton._hasListener) return;

    payButton.addEventListener('click', async () => {
      await this.processOrder();
    });
    payButton._hasListener = true;
  },

  async processOrder() {
    if (this.cart.length === 0) return;

    const subtotal = this.cart.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    );
    const tax = subtotal * this.TAX_RATE;
    const total = subtotal + tax;

    const orderData = {
      winery_id: App.currentWinery.id,
      customer_id: this.selectedCustomer?.id || null,
      employee_id: App.currentUser.id,
      customer_name: this.selectedCustomer?.name || this.selectedCustomer?.email || 'Guest',
      is_guest: !this.selectedCustomer,
      order_source: 'pos',
      subtotal: subtotal,
      tax: tax,
      total: total,
      items: this.cart.map((item) => ({
        product_id: item.id,
        product_name: item.name,
        product_sku: item.sku,
        vintage: item.vintage,
        varietal: item.varietal,
        quantity: item.quantity,
        unit_price: parseFloat(item.price),
        line_total: parseFloat(item.price) * item.quantity,
      })),
    };

    try {
      const response = await fetch('/.netlify/functions/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Order #${data.order_number} placed successfully!\nTotal: $${total.toFixed(2)}`);

        this.cart = [];
        this.selectedCustomer = null;
        document.getElementById('customerSelector').value = '';
        this.renderCart();
        this.updateTotals();
      } else {
        alert('Failed to create order: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('Failed to create order');
    }
  },

  reset() {
    this.cart = [];
    this.selectedCustomer = null;
    const selector = document.getElementById('customerSelector');
    if (selector) selector.value = '';
    this.renderCart();
    this.updateTotals();
  },
};
