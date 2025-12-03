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
  searchDebounceTimer: null,
  loadingState: {
    products: false,
    customers: false,
  },

  async init() {
    this.loadingState.products = true;
    this.loadingState.customers = true;
    this.renderProducts();
    this.setupCustomerSearch();

    await this.loadProducts();
    this.loadingState.products = false;
    this.renderProducts();

    await this.loadCustomers();
    this.loadingState.customers = false;

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

  setupCustomerSearch() {
    const searchInput = document.getElementById('customerSearch');
    const resultsContainer = document.getElementById('customerSearchResults');

    if (!searchInput || !resultsContainer) return;

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();

      clearTimeout(this.searchDebounceTimer);

      if (query.length === 0) {
        resultsContainer.style.display = 'none';
        return;
      }

      this.searchDebounceTimer = setTimeout(() => {
        this.searchCustomers(query);
      }, 300);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const results = resultsContainer.querySelectorAll('.customer-search-item');
        if (results.length === 1) {
          results[0].click();
        }
      }
    });

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
        resultsContainer.style.display = 'none';
      }
    });
  },

  searchCustomers(query) {
    const resultsContainer = document.getElementById('customerSearchResults');
    const searchLower = query.toLowerCase();

    const matches = this.customers
      .filter((c) => {
        const name = `${c.first_name || ''} ${c.last_name || ''}`.trim().toLowerCase();
        const email = (c.email || '').toLowerCase();
        const phone = (c.phone || '').toLowerCase();
        const customerCode = (c.customer_code || '').toLowerCase();

        return (
          name.includes(searchLower) ||
          email.includes(searchLower) ||
          phone.includes(searchLower) ||
          customerCode.includes(searchLower)
        );
      })
      .slice(0, 10);

    if (matches.length === 0) {
      resultsContainer.innerHTML = `
        <div style="padding: 15px; text-align: center; color: #7f8c8d; font-size: 14px;">
          No customers found
        </div>
      `;
      resultsContainer.style.display = 'block';
      return;
    }

    resultsContainer.innerHTML = matches
      .map((customer) => {
        const name =
          customer.first_name || customer.last_name
            ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
            : customer.email;

        return `
          <div class="customer-search-item" data-customer-id="${customer.id}" style="padding: 12px; cursor: pointer; border-bottom: 1px solid rgba(255, 255, 255, 0.05); transition: background 0.2s;">
            <div style="font-weight: 600; color: #e8e8e8; font-size: 14px;">${name}</div>
            ${customer.email ? `<div style="font-size: 12px; color: #95a5a6; margin-top: 2px;">${customer.email}</div>` : ''}
            ${customer.phone ? `<div style="font-size: 12px; color: #95a5a6; margin-top: 2px;">${customer.phone}</div>` : ''}
          </div>
        `;
      })
      .join('');

    resultsContainer.style.display = 'block';

    const items = resultsContainer.querySelectorAll('.customer-search-item');
    items.forEach((item) => {
      item.addEventListener('mouseenter', function () {
        this.style.background = 'rgba(255, 255, 255, 0.08)';
      });
      item.addEventListener('mouseleave', function () {
        this.style.background = 'transparent';
      });
      item.addEventListener('click', function () {
        POSScreen.selectCustomer(this.dataset.customerId);
      });
    });
  },

  selectCustomer(customerId) {
    const customer = this.customers.find((c) => c.id === customerId);
    if (!customer) return;

    this.selectedCustomer = customer;

    const searchInput = document.getElementById('customerSearch');
    const resultsContainer = document.getElementById('customerSearchResults');
    const selectedDisplay = document.getElementById('selectedCustomerDisplay');
    const selectedName = document.getElementById('selectedCustomerName');
    const selectedEmail = document.getElementById('selectedCustomerEmail');

    const name =
      customer.first_name || customer.last_name
        ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
        : customer.email;

    searchInput.value = '';
    resultsContainer.style.display = 'none';
    selectedDisplay.style.display = 'block';
    selectedName.textContent = name;
    selectedEmail.textContent = customer.email || customer.phone || '';
  },

  clearCustomerSelection() {
    this.selectedCustomer = null;

    const searchInput = document.getElementById('customerSearch');
    const selectedDisplay = document.getElementById('selectedCustomerDisplay');

    searchInput.value = '';
    selectedDisplay.style.display = 'none';
  },

  renderProducts() {
    const grid = document.getElementById('productsGrid');

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
          product.vintage &&
          product.varietal &&
          product.vintage !== 'null' &&
          product.varietal !== 'null'
            ? `${product.vintage} - ${product.varietal}`
            : product.category || product.type || '';

        return `
            <div class="product-card" onclick="POSScreen.addToCart(${product.id})">
                <div class="wine-icon">${icon}</div>
                <div class="product-name">${product.name}</div>
                <div class="product-vintage">${details}</div>
                <div class="product-price">$${parseFloat(product.price).toFixed(2)}</div>
            </div>
          `;
      })
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
      const cardButton = document.getElementById('payCardButton');
      const cashButton = document.getElementById('payCashButton');
      if (cardButton) cardButton.disabled = true;
      if (cashButton) cashButton.disabled = true;
      return;
    }

    const cardButton = document.getElementById('payCardButton');
    const cashButton = document.getElementById('payCashButton');
    if (cardButton) cardButton.disabled = false;
    if (cashButton) cashButton.disabled = false;

    cartItems.innerHTML = this.cart
      .map((item) => {
        const details =
          item.vintage && item.varietal && item.vintage !== 'null' && item.varietal !== 'null'
            ? `${item.vintage} ${item.varietal}`
            : item.category || item.type || '';

        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-details">${details}</div>
                </div>
                <div class="cart-item-qty">
                    <div class="qty-btn" onclick="POSScreen.updateQuantity(${item.id}, -1)">−</div>
                    <div class="qty-display">${item.quantity}</div>
                    <div class="qty-btn" onclick="POSScreen.updateQuantity(${item.id}, 1)">+</div>
                </div>
                <div class="cart-item-price">$${(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
            </div>
          `;
      })
      .join('');
  },

  updateTotals() {
    const subtotal = this.cart.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    );

    const taxableSubtotal = this.cart.reduce((sum, item) => {
      if (item.tax_category === 'tax_exempt') {
        return sum;
      }
      return sum + parseFloat(item.price) * item.quantity;
    }, 0);

    const tax = taxableSubtotal * this.TAX_RATE;
    const total = subtotal + tax;

    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('tax').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('total').textContent = `$${total.toFixed(2)}`;
  },

  setupPayButton() {
    const cardButton = document.getElementById('payCardButton');
    const cashButton = document.getElementById('payCashButton');

    if (cardButton && !cardButton._hasListener) {
      cardButton.addEventListener('click', () => this.processOrder());
      cardButton._hasListener = true;
    }

    if (cashButton && !cashButton._hasListener) {
      cashButton.addEventListener('click', () => this.processCashPayment());
      cashButton._hasListener = true;
    }
  },

  async processOrder() {
    if (this.cart.length === 0) return;

    const customer = this.selectedCustomer;
    const customerId = customer ? customer.id : null;
    const customerName = customer
      ? customer.first_name || customer.last_name
        ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
        : customer.email
      : 'Guest';

    const isGuest = !customerId;

    const subtotal = parseFloat(document.getElementById('subtotal').textContent.replace('$', ''));
    const tax = parseFloat(document.getElementById('tax').textContent.replace('$', ''));
    const total = parseFloat(document.getElementById('total').textContent.replace('$', ''));

    const totalCents = Math.round(total * 100);

    const terminal = await this.getTerminal();
    if (!terminal) {
      alert('No terminal configured. Please configure a terminal in Settings.');
      return;
    }

    const referenceId = `POS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.currentReferenceId = referenceId;

    try {
      this.showProcessingModal();

      console.log('📡 Sending to terminal:', {
        tpn: terminal.tpn,
        registerId: terminal.register_id,
        authKey: terminal.auth_key,
        totalCents,
        referenceId,
      });

      const response = await fetch('/.netlify/functions/dejavoo-spin-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tpn: terminal.tpn,
          register_id: terminal.register_id,
          auth_key: terminal.auth_key,
          amount: totalCents,
          reference_id: referenceId,
        }),
      });

      const result = await response.json();
      console.log('📱 Terminal response:', result);

      if (result.success && result.transactionData) {
        this.hideProcessingModal();
        await this.handleTerminalResponse(
          result.transactionData,
          subtotal,
          tax,
          total,
          referenceId
        );
      } else if (result.timeout) {
        console.log('⏱️ Transaction timeout detected');
        this.startPolling(referenceId, subtotal, tax, total);
      } else {
        this.hideProcessingModal();
        alert(`Transaction failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      this.hideProcessingModal();
      console.error('❌ Transaction error:', error);
      alert('Failed to process payment. Please try again.');
    }
  },

  startPolling(referenceId, subtotal, tax, total) {
    console.log('🔄 Starting polling for:', referenceId);

    this.pollingStartTime = Date.now();
    const MAX_POLL_TIME = 120000;
    const POLL_INTERVAL = 5000;

    this.pollingInterval = setInterval(async () => {
      const elapsed = Date.now() - this.pollingStartTime;
      console.log(`🔄 Polling... (${Math.round(elapsed / 1000)}s elapsed)`);

      if (elapsed > MAX_POLL_TIME) {
        console.log('⏱️ Max polling time reached');
        clearInterval(this.pollingInterval);
        this.showTimeoutMessage(referenceId);
        return;
      }

      try {
        const response = await fetch('/.netlify/functions/verify-terminal-transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference_id: referenceId }),
        });

        const result = await response.json();
        console.log('📊 Poll result:', result);

        if (result.success && result.status === 'approved') {
          console.log('✅ Transaction approved via polling');
          clearInterval(this.pollingInterval);
          this.hideProcessingModal();

          await this.saveOrderWithPayment(
            subtotal,
            tax,
            total,
            result.transactionData,
            referenceId
          );
        } else if (result.success && result.status === 'declined') {
          console.log('❌ Transaction declined via polling');
          clearInterval(this.pollingInterval);
          this.hideProcessingModal();

          this.showDeclineModal({
            code: result.transactionData?.GeneralResponse?.HostResponseCode || 'DECLINED',
            message: result.transactionData?.GeneralResponse?.HostResponseMessage || 'Declined',
            definition: 'Transaction was declined',
          });
        }
      } catch (error) {
        console.error('❌ Polling error:', error);
      }
    }, POLL_INTERVAL);
  },

  async getTerminal() {
    try {
      const response = await fetch(
        `/.netlify/functions/get-winery-terminals?winery_id=${App.currentWinery.id}`
      );
      const data = await response.json();

      if (data.success && data.terminals.length > 0) {
        const cardPresentTerminal = data.terminals.find((t) => t.terminal_type === 'card_present');
        return cardPresentTerminal || data.terminals[0];
      }
    } catch (error) {
      console.error('Failed to load terminal:', error);
    }
    return null;
  },

  async saveOrderWithPayment(subtotal, tax, total, transactionData, referenceId) {
    const customer = this.selectedCustomer;
    const customerId = customer ? customer.id : null;
    const customerName = customer
      ? customer.first_name || customer.last_name
        ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
        : customer.email
      : 'Guest';

    const isGuest = !customerId;

    const orderData = {
      winery_id: App.currentWinery.id,
      customer_id: customerId,
      customer_name: customerName,
      is_guest: isGuest,
      employee_id: App.currentUser.id,
      order_source: 'pos',
      subtotal_cents: Math.round(subtotal * 100),
      tax_cents: Math.round(tax * 100),
      total_cents: Math.round(total * 100),
      payment_method: 'card',
      payment_status: 'paid',
      payment_reference: referenceId,
      payment_data: transactionData,
      items: this.cart.map((item) => ({
        product_id: item.id,
        product_name: item.name,
        product_sku: item.sku,
        vintage: item.vintage,
        varietal: item.varietal,
        quantity: item.quantity,
        unit_price_cents: Math.round(parseFloat(item.price) * 100),
        total_cents: Math.round(parseFloat(item.price) * item.quantity * 100),
      })),
    };

    try {
      const response = await fetch('/.netlify/functions/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccessModal(result.order_number, total);
        this.cart = [];
        this.selectedCustomer = null;
        this.clearCustomerSelection();
        this.renderCart();
        this.updateTotals();
      } else {
        alert('Order saved but failed to create record: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to save order:', error);
      alert('Payment successful but failed to save order. Reference: ' + referenceId);
    }
  },

  async processCashPayment() {
    if (this.cart.length === 0) return;

    const customer = this.selectedCustomer;
    const customerId = customer ? customer.id : null;
    const customerName = customer
      ? customer.first_name || customer.last_name
        ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
        : customer.email
      : 'Guest';

    const isGuest = !customerId;

    const subtotal = parseFloat(document.getElementById('subtotal').textContent.replace('$', ''));
    const tax = parseFloat(document.getElementById('tax').textContent.replace('$', ''));
    const total = parseFloat(document.getElementById('total').textContent.replace('$', ''));

    const referenceId = `CASH-${Date.now()}`;

    const orderData = {
      winery_id: App.currentWinery.id,
      customer_id: customerId,
      customer_name: customerName,
      is_guest: isGuest,
      employee_id: App.currentUser.id,
      order_source: 'pos',
      subtotal_cents: Math.round(subtotal * 100),
      tax_cents: Math.round(tax * 100),
      total_cents: Math.round(total * 100),
      payment_method: 'cash',
      payment_status: 'paid',
      payment_reference: referenceId,
      items: this.cart.map((item) => ({
        product_id: item.id,
        product_name: item.name,
        product_sku: item.sku,
        vintage: item.vintage,
        varietal: item.varietal,
        quantity: item.quantity,
        unit_price_cents: Math.round(parseFloat(item.price) * 100),
        total_cents: Math.round(parseFloat(item.price) * item.quantity * 100),
      })),
    };

    try {
      const response = await fetch('/.netlify/functions/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccessModal(result.order_number, total);
        this.cart = [];
        this.selectedCustomer = null;
        this.clearCustomerSelection();
        this.renderCart();
        this.updateTotals();
      } else {
        alert('Failed to create cash order: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to process cash payment:', error);
      alert('Failed to process cash payment. Please try again.');
    }
  },

  showProcessingModal() {
    const existingModal = document.getElementById('processingModal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'processingModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const content = document.createElement('div');
    content.className = 'payment-modal-content';
    content.style.cssText = `
      background: #5a5a5a;
      border-radius: 20px;
      padding: 50px 60px;
      max-width: 450px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
    `;

    content.innerHTML = `
      <div style="margin-bottom: 20px;">
        <img src="https://pub-a8c2855e013441a598cf4513d23f6a8f.r2.dev/AllModes/AllModes-icons-68.svg" alt="Processing" style="width: 80px; height: 80px; animation: pulse 1.5s ease-in-out infinite;" />
      </div>
      <h2 style="color: #f39c12; margin: 0 0 15px 0; font-size: 26px; font-weight: 700;">
        PROCESSING PAYMENT
      </h2>
      <p style="color: #e8e8e8; font-size: 16px; margin: 0 0 25px 0; line-height: 1.6;">
        Please present card to terminal and follow prompts
      </p>
      <div style="margin-top: 25px;">
        <button id="manualStatusCheckButton" style="
          background: rgba(52, 152, 219, 0.2);
          color: #3498db;
          border: 1px solid #3498db;
          padding: 12px 30px;
          font-size: 14px;
          border-radius: 50px;
          cursor: pointer;
          font-weight: 700;
          transition: all 0.2s;
        " onmouseover="this.style.background='rgba(52, 152, 219, 0.3)'" onmouseout="this.style.background='rgba(52, 152, 219, 0.2)'">
          Manual Status Check
        </button>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      </style>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    document.getElementById('manualStatusCheckButton').addEventListener('click', () => {
      if (this.currentReferenceId) {
        this.manualStatusCheck(this.currentReferenceId);
      }
    });
  },

  hideProcessingModal() {
    const modal = document.getElementById('processingModal');
    if (modal) {
      modal.remove();
    }
  },

  showSuccessModal(orderNumber, total) {
    const existingModal = document.getElementById('successModal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'successModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const content = document.createElement('div');
    content.className = 'payment-modal-content';
    content.style.cssText = `
      background: #5a5a5a;
      border-radius: 20px;
      padding: 50px 60px;
      max-width: 450px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
    `;

    content.innerHTML = `
      <div style="margin-bottom: 20px;">
        <img src="https://pub-a8c2855e013441a598cf4513d23f6a8f.r2.dev/AllModes/AllModes-icons-69.svg" alt="Success" style="width: 80px; height: 80px;" />
      </div>
      <h2 style="color: #2ecc71; margin: 0 0 10px 0; font-size: 26px; font-weight: 700;">
        PAYMENT APPROVED
      </h2>
      <p style="color: #e8e8e8; font-size: 16px; margin: 0 0 25px 0;">
        Order ${orderNumber}
      </p>
      <p style="color: #e8e8e8; font-size: 32px; font-weight: 700; margin: 0 0 30px 0;">
        $${total.toFixed(2)}
      </p>
      <button id="closeSuccessModal" style="
        background: #2ecc71;
        color: white;
        border: none;
        padding: 14px 50px;
        font-size: 16px;
        border-radius: 50px;
        cursor: pointer;
        font-weight: 700;
        transition: all 0.2s;
      " onmouseover="this.style.background='#27ae60'" onmouseout="this.style.background='#2ecc71'">
        Done
      </button>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    document.getElementById('closeSuccessModal').addEventListener('click', () => {
      modal.remove();
    });
  },

  async manualStatusCheck(referenceId, silent = false) {
    console.log('🔍 Manual status check for:', referenceId);

    try {
      const response = await fetch('/.netlify/functions/verify-terminal-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference_id: referenceId }),
      });

      const result = await response.json();
      console.log('✅ Manual status check result:', result);

      if (!silent) {
        if (result.success && result.status) {
          alert(
            `Transaction status: ${result.status}\n\nThe status has been updated. Please wait for automatic update or check again.`
          );
        } else {
          alert('Could not verify transaction status. Please try again.');
        }
      }

      return result;
    } catch (error) {
      console.error('❌ Manual status check error:', error);
      if (!silent) {
        alert('Error checking status. Please try again.');
      }
      return null;
    }
  },

  showTimeoutMessage(referenceId) {
    this.hideProcessingModal();

    this.showDeclineModal({
      code: '13',
      message: 'Timed out',
      definition: `Transaction is taking longer than expected. Reference ID: ${referenceId}. You can check this transaction later in order history or use the Manual Status Check button.`,
    });
  },

  async handleTerminalResponse(transactionData, subtotal, tax, total, referenceId) {
    console.log('🔍 Handling terminal response:', transactionData);

    const generalResponse = transactionData.GeneralResponse || {};
    const resultCode = String(generalResponse.ResultCode || '');
    const statusCode = String(generalResponse.StatusCode || '');
    const hostResponseCode = String(generalResponse.HostResponseCode || '');

    console.log('📊 ResultCode:', resultCode, '(type:', typeof resultCode + ')');
    console.log('📊 StatusCode:', statusCode, '(type:', typeof statusCode + ')');
    console.log('📊 HostResponseCode:', hostResponseCode, '(type:', typeof hostResponseCode + ')');

    const spinSuccess = resultCode === '0' && statusCode === '0000';
    console.log(
      '📊 SPIN Success check:',
      spinSuccess,
      '(resultCode===0:',
      resultCode === '0',
      'statusCode===0000:',
      statusCode === '0000',
      ')'
    );

    if (!spinSuccess) {
      console.error('❌ SPIN error');
      this.showDeclineModal({
        code: statusCode || resultCode || 'ERROR',
        message: generalResponse.Message || 'Transaction Error',
        definition:
          generalResponse.DetailedMessage || generalResponse.Message || 'Transaction failed',
      });
      return;
    }

    console.log('✅ SPIN success, checking host response code');
    const isApproved = hostResponseCode === '00';
    console.log(
      '📊 Approval check:',
      isApproved,
      '(hostResponseCode===00:',
      hostResponseCode === '00',
      ')'
    );

    if (isApproved) {
      console.log('✅ Transaction approved (HostResponseCode=00)');
      await this.saveOrderWithPayment(subtotal, tax, total, transactionData, referenceId);
    } else {
      console.error('❌ Transaction declined (HostResponseCode=' + hostResponseCode + ')');
      this.showDeclineModal({
        code: hostResponseCode || 'DECLINED',
        message:
          generalResponse.HostResponseMessage || generalResponse.Message || 'Payment Declined',
        definition: 'Transaction was declined by the card issuer',
      });
    }
  },

  showDeclineModal(declineInfo) {
    const existingModal = document.getElementById('declineModal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'declineModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const content = document.createElement('div');
    content.className = 'payment-modal-content';
    content.style.cssText = `
      background: #5a5a5a;
      border-radius: 20px;
      padding: 50px 60px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
    `;

    content.innerHTML = `
      <div style="margin-bottom: 20px;">
        <img src="https://pub-a8c2855e013441a598cf4513d23f6a8f.r2.dev/AllModes/AllModes-icons-71.svg" alt="Payment Declined" style="width: 80px; height: 80px;" />
      </div>
      <h2 style="color: #c0392b; margin: 0 0 25px 0; font-size: 26px; font-weight: 700;">
        PAYMENT DECLINED
      </h2>
      <div style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); margin-bottom: 30px; text-align: left;">
        <div style="margin-bottom: 15px;">
          <div style="color: #95a5a6; font-size: 13px; margin-bottom: 5px; font-weight: 600;">Decline Code</div>
          <div style="color: #e8e8e8; font-weight: 700; font-size: 16px;">${declineInfo.code || 'N/A'}</div>
        </div>
        <div style="margin-bottom: 15px;">
          <div style="color: #95a5a6; font-size: 13px; margin-bottom: 5px; font-weight: 600;">Authorization Response Message</div>
          <div style="color: #e8e8e8; font-weight: 700; font-size: 16px;">${declineInfo.message || 'Unknown error'}</div>
        </div>
        <div>
          <div style="color: #95a5a6; font-size: 13px; margin-bottom: 5px; font-weight: 600;">Response Definition</div>
          <div style="color: #e8e8e8; font-size: 14px; line-height: 1.5;">${declineInfo.definition || 'No details available'}</div>
        </div>
      </div>
      <button id="closeDeclineModal" style="
        background: #7f8c8d;
        color: white;
        border: none;
        padding: 14px 50px;
        font-size: 16px;
        border-radius: 50px;
        cursor: pointer;
        font-weight: 700;
        transition: all 0.2s;
      " onmouseover="this.style.background='#6c7a89'" onmouseout="this.style.background='#7f8c8d'">
        Close
      </button>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    document.getElementById('closeDeclineModal').addEventListener('click', () => {
      modal.remove();
    });
  },

  renderProductsLoadingState() {
    return Array(12)
      .fill(0)
      .map(
        () => `
      <div class="product-card" style="cursor: default;">
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
};
