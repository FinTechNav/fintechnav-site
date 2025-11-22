// POS Screen functionality
const POSScreen = {
  products: [
    {
      id: 1,
      name: 'Cabernet Sauvignon',
      vintage: 2019,
      varietal: 'Cabernet Sauvignon',
      price: 65.0,
    },
    {
      id: 2,
      name: 'Pinot Noir',
      vintage: 2020,
      varietal: 'Pinot Noir',
      price: 55.0,
    },
    {
      id: 3,
      name: 'Chardonnay',
      vintage: 2021,
      varietal: 'Chardonnay',
      price: 45.0,
    },
    {
      id: 4,
      name: 'Merlot',
      vintage: 2019,
      varietal: 'Merlot',
      price: 50.0,
    },
    {
      id: 5,
      name: 'Zinfandel',
      vintage: 2020,
      varietal: 'Zinfandel',
      price: 48.0,
    },
  ],

  cart: [],
  TAX_RATE: 0.0775,

  init() {
    this.renderProducts();
    this.setupPayButton();
  },

  renderProducts() {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = this.products
      .map(
        (product) => `
            <div class="product-card" onclick="POSScreen.addToCart(${product.id})">
                <div class="wine-icon">🍷</div>
                <div class="product-name">${product.name}</div>
                <div class="product-vintage">${product.vintage} ${product.varietal}</div>
                <div class="product-price">$${product.price.toFixed(2)}</div>
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
                <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
            </div>
        `
      )
      .join('');
  },

  updateTotals() {
    const subtotal = this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * this.TAX_RATE;
    const total = subtotal + tax;

    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('tax').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('total').textContent = `$${total.toFixed(2)}`;
  },

  setupPayButton() {
    document.getElementById('payButton').addEventListener('click', async () => {
      if (this.cart.length === 0) return;

      const subtotal = this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const tax = subtotal * this.TAX_RATE;
      const total = subtotal + tax;

      alert(
        `Order placed!\nTotal: $${total.toFixed(2)}\n\nOrder will be saved to database in next phase.`
      );

      this.cart = [];
      this.renderCart();
      this.updateTotals();
    });
  },

  reset() {
    this.cart = [];
    this.renderCart();
    this.updateTotals();
  },
};
