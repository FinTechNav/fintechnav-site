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
    // Payment buttons are now handled directly in HTML with separate click handlers
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

  calculateTotals() {
    const subtotal = this.cart.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    );
    const tax = subtotal * this.TAX_RATE;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  },

  async processOrder() {
    if (this.cart.length === 0) return;

    const { subtotal, tax, total } = this.calculateTotals();

    // Check if winery has a terminal configured
    const terminalConfig = await this.getTerminalConfig();

    if (terminalConfig && terminalConfig.terminalId) {
      console.log('✅ Terminal configured, processing via terminal');
      await this.processTerminalSale(terminalConfig, subtotal, tax, total);
    } else {
      console.log('ℹ️ No terminal configured, saving order without payment');
      await this.saveOrderWithoutPayment(subtotal, tax, total);
    }
  },

  async getTerminalConfig() {
    try {
      if (!App.currentWinery) {
        console.error('No winery selected');
        return null;
      }

      console.log('🔍 Fetching terminal config for winery:', App.currentWinery.id);

      const response = await fetch(
        `/.netlify/functions/get-winery-terminals?winery_id=${App.currentWinery.id}`
      );

      if (!response.ok) {
        console.error('Failed to fetch winery terminals:', response.status);
        return null;
      }

      const data = await response.json();
      console.log('📋 Winery terminals:', data);

      if (!data.success || !data.terminals || data.terminals.length === 0) {
        console.log('ℹ️ No terminals found for winery');
        return null;
      }

      // Find card_present terminal
      const cardPresentTerminal = data.terminals.find((t) => t.terminal_type === 'card_present');

      console.log('🖥️ Card present terminal found:', !!cardPresentTerminal);

      if (cardPresentTerminal) {
        console.log('🔍 Terminal config object:', cardPresentTerminal.processor_terminal_config);
        console.log(
          '🔍 Has processor_terminal_config:',
          !!cardPresentTerminal.processor_terminal_config
        );
        console.log('🔍 Has TPN:', !!cardPresentTerminal.processor_terminal_config?.tpn);
        console.log(
          '🔍 Has register_id:',
          !!cardPresentTerminal.processor_terminal_config?.register_id
        );
        console.log('🔍 Has auth_key:', !!cardPresentTerminal.processor_terminal_config?.auth_key);
      }

      if (
        cardPresentTerminal &&
        cardPresentTerminal.processor_terminal_config &&
        cardPresentTerminal.processor_terminal_config.tpn &&
        cardPresentTerminal.processor_terminal_config.register_id &&
        cardPresentTerminal.processor_terminal_config.auth_key
      ) {
        console.log('✅ Terminal configuration valid, returning config');
        return {
          terminalId: cardPresentTerminal.id,
          wineryId: App.currentWinery.id,
        };
      }

      console.log('ℹ️ No card_present terminal configuration found for winery');
      return null;
    } catch (error) {
      console.error('❌ Error fetching terminal config:', error);
      return null;
    }
  },

  async processTerminalSale(terminalConfig, subtotal, tax, total) {
    console.log('🏪 Processing terminal sale with timeout handling...');
    console.log('  - Subtotal:', subtotal);
    console.log('  - Tax:', tax);
    console.log('  - Total:', total);

    // Get timeout settings from localStorage or use defaults
    const dbPersistTimeout =
      parseInt(localStorage.getItem('terminalDbPersistTimeout') || '20') * 1000;
    const pollInterval = parseInt(localStorage.getItem('terminalPollInterval') || '5') * 1000;
    const maxWait = parseInt(localStorage.getItem('terminalMaxWait') || '180') * 1000;
    const enablePolling = localStorage.getItem('terminalEnablePolling') !== 'false';

    this.showProcessingOverlay('Processing payment on terminal...');

    try {
      const referenceId = `POS${Date.now()}`;
      this.currentReferenceId = referenceId;

      const response = await fetch('/.netlify/functions/process-terminal-sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: total,
          subtotal: subtotal,
          tax: tax,
          tipAmount: 0,
          terminalId: terminalConfig.terminalId,
          wineryId: terminalConfig.wineryId,
          referenceId: referenceId,
          wineryId: App.currentWinery?.id,
          terminalId: terminalConfig.terminalId,
          cartItems: this.cart,
          dbPersistTimeout: dbPersistTimeout,
        }),
      });

      const result = await response.json();
      console.log('📥 Terminal sale response:', result);

      if (result.success && result.status === 'processing') {
        // Transaction is still processing
        if (!enablePolling) {
          // Polling is disabled - show error immediately
          this.hideProcessingOverlay();
          console.log('⚠️ Polling disabled, transaction timed out');
          alert(
            `Transaction timeout after 20 seconds.\n\nPolling is disabled in Settings > Terminal Timeouts.\n\nThe transaction may still complete on the terminal. Reference: ${referenceId}`
          );
          return;
        }

        // Polling is enabled - start tracking
        console.log('⏳ Transaction processing, starting status polling...');
        // Keep showing the same overlay, add buttons after 60s
        this.addButtonsToOverlay(referenceId);
        this.startPolling(referenceId, subtotal, tax, total, pollInterval, maxWait);
      } else if (result.success && result.data) {
        // Got immediate response
        this.hideProcessingOverlay();
        await this.handleTerminalResponse(result.data, subtotal, tax, total, referenceId);
      } else {
        this.hideProcessingOverlay();
        console.error('❌ Terminal sale failed:', result.error);
        alert(
          `Terminal error: ${result.error || 'Unknown error'}\n\nPlease check terminal connection and try again.`
        );
      }
    } catch (error) {
      this.hideProcessingOverlay();
      console.error('💥 Error processing terminal sale:', error);
      alert(`Error: ${error.message}\n\nPlease try again.`);
    }
  },

  async saveOrderWithPayment(subtotal, tax, total, transactionData, referenceId) {
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
      payment_status: 'paid',
      payment_method: 'card_present',
      payment_reference: referenceId,
      payment_auth_code:
        transactionData.AuthCode || transactionData.GeneralResponse?.Message || null,
      payment_response_message: transactionData.GeneralResponse?.DetailedMessage || null,
      card_type: transactionData.CardData?.CardType || null,
      card_last_4: transactionData.CardData?.Last4 || null,
      transaction_amount: parseFloat(transactionData.Amounts?.TotalAmount || total),
      transaction_tip: parseFloat(transactionData.Amounts?.TipAmount || 0),
      transaction_fee: parseFloat(transactionData.Amounts?.FeeAmount || 0),
      payment_processed_at: new Date().toISOString(),
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
      console.log('💾 Saving order with payment...');
      const response = await fetch('/.netlify/functions/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Order saved:', data.order_number);

        // Now save the complete terminal transaction
        console.log('💾 Saving terminal transaction...');
        const terminalTxnResponse = await fetch('/.netlify/functions/save-terminal-transaction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            order_id: data.order_id,
            winery_id: App.currentWinery.id,
            customer_id: this.selectedCustomer?.id || null,
            employee_id: App.currentUser.id,
            terminal_id: null, // Could be added later if you track which terminal was used
            transactionData: transactionData,
          }),
        });

        console.log('📥 Terminal transaction response status:', terminalTxnResponse.status);

        const terminalTxnData = await terminalTxnResponse.json();
        console.log('📥 Terminal transaction response data:', terminalTxnData);

        if (terminalTxnData.success) {
          console.log('✅ Terminal transaction saved:', terminalTxnData.transaction_id);
        } else {
          console.error('⚠️ Failed to save terminal transaction:', terminalTxnData);
          console.error('⚠️ Error details:', terminalTxnData.details);
          console.error('⚠️ Error code:', terminalTxnData.code);
        }

        this.showPaymentReceivedScreen({
          orderNumber: data.order_number,
          total: total,
          subtotal: subtotal,
          tax: tax,
          paymentMethod: 'Credit/Debit',
          authCode: transactionData.AuthCode || 'N/A',
          cardType: transactionData.CardData?.CardType || 'Card',
          cardLast4: transactionData.CardData?.Last4 || '****',
          items: this.cart,
        });
      } else {
        alert('Payment successful but failed to save order: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('Payment successful but failed to save order');
    }
  },

  async saveOrderWithoutPayment(subtotal, tax, total) {
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
      payment_status: 'pending',
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
        alert(
          `Order #${data.order_number} placed successfully!\nTotal: $${total.toFixed(2)}\n\n(No payment terminal configured)`
        );
        this.reset();
      } else {
        alert('Failed to create order: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('Failed to create order');
    }
  },

  addButtonsToOverlay(referenceId) {
    setTimeout(() => {
      const overlay = document.getElementById('processingOverlay');
      if (!overlay) return;

      const existingButtons = overlay.querySelector('.overlay-buttons');
      if (existingButtons) return; // Already added

      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'overlay-buttons';
      buttonContainer.style.cssText = 'margin-top: 20px;';

      buttonContainer.innerHTML = `
        <button onclick="POSScreen.manualStatusCheck('${referenceId}')" 
                style="background: #8b7355; color: white; border: none; padding: 12px 24px; 
                       border-radius: 5px; cursor: pointer; margin-right: 10px; font-family: Georgia, serif;">
          Check Status Now
        </button>
        <button onclick="POSScreen.cancelPolling()" 
                style="background: #95a5a6; color: white; border: none; padding: 12px 24px; 
                       border-radius: 5px; cursor: pointer; font-family: Georgia, serif;">
          Cancel
        </button>
      `;

      const content = overlay.querySelector('.processing-content');
      if (content) {
        content.appendChild(buttonContainer);
      }
    }, 60000); // 60 seconds
  },

  showProcessingOverlay(message = 'Processing...') {
    let overlay = document.getElementById('processingOverlay');

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'processingOverlay';
      overlay.className = 'processing-overlay';
      overlay.innerHTML = `
        <div class="processing-content">
          <div class="spinner"></div>
          <h3 id="processingMessage">${message}</h3>
          <p style="color: #666; margin-top: 10px; font-size: 0.9rem;">
            Please wait...
          </p>
        </div>
      `;
      document.body.appendChild(overlay);
    } else {
      document.getElementById('processingMessage').textContent = message;
    }

    overlay.classList.add('active');
  },

  hideProcessingOverlay() {
    const overlay = document.getElementById('processingOverlay');
    if (overlay) {
      overlay.remove(); // Remove from DOM completely to avoid button persistence
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

  processCashPayment() {
    const { subtotal, tax, total } = this.calculateTotals();

    const modal = document.createElement('div');
    modal.id = 'cashPaymentModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const quickAmounts = [
      total,
      Math.ceil(total / 5) * 5,
      Math.ceil(total / 10) * 10,
      Math.ceil(total / 20) * 20,
    ];

    modal.innerHTML = `
      <div style="background: #2c3e50; padding: 40px; border-radius: 12px; max-width: 600px; width: 90%; color: #e8e8e8;">
        <h2 style="color: #f39c12; margin-bottom: 10px; text-align: center;">Amount to Pay</h2>
        <div style="text-align: center; font-size: 48px; color: #f39c12; font-weight: 700; margin-bottom: 30px;">$${total.toFixed(2)}</div>
        
        <h3 style="color: #e8e8e8; margin-bottom: 15px; text-align: center;">Amount given by customer</h3>
        
        <input type="text" id="cashAmountInput" value="0.00" style="
          width: 100%;
          padding: 20px;
          font-size: 32px;
          text-align: center;
          background: rgba(0,0,0,0.3);
          border: 2px solid rgba(243, 156, 18, 0.5);
          border-radius: 8px;
          color: #f39c12;
          font-weight: 700;
          margin-bottom: 20px;
        " />
        
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
          ${quickAmounts
            .map(
              (amount) => `
            <button onclick="POSScreen.setCashAmount(${amount.toFixed(2)})" style="
              padding: 15px;
              background: rgba(52, 152, 219, 0.2);
              border: 1px solid rgba(52, 152, 219, 0.5);
              border-radius: 8px;
              color: #3498db;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
            " onmouseover="this.style.background='rgba(52, 152, 219, 0.3)'" onmouseout="this.style.background='rgba(52, 152, 219, 0.2)'">
              $${amount.toFixed(2)}
            </button>
          `
            )
            .join('')}
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <button onclick="POSScreen.completeCashPayment()" style="
            padding: 15px;
            background: linear-gradient(135deg, #27ae60, #229954);
            border: none;
            border-radius: 8px;
            color: white;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
          ">Complete Payment</button>
          
          <button onclick="POSScreen.closeCashPaymentModal()" style="
            padding: 15px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: #e8e8e8;
            font-size: 18px;
            cursor: pointer;
          ">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Focus the input
    setTimeout(() => {
      const input = document.getElementById('cashAmountInput');
      if (input) {
        input.select();
        input.addEventListener('input', (e) => {
          let value = e.target.value.replace(/[^\d.]/g, '');
          const parts = value.split('.');
          if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
          }
          e.target.value = value;
        });
      }
    }, 100);
  },

  setCashAmount(amount) {
    const input = document.getElementById('cashAmountInput');
    if (input) {
      input.value = amount.toFixed(2);
    }
  },

  closeCashPaymentModal() {
    const modal = document.getElementById('cashPaymentModal');
    if (modal) modal.remove();
  },

  async completeCashPayment() {
    const input = document.getElementById('cashAmountInput');
    const cashGiven = parseFloat(input?.value || 0);
    const { subtotal, tax, total } = this.calculateTotals();

    if (cashGiven < total) {
      alert(
        `Insufficient cash. Need $${total.toFixed(2)} but only received $${cashGiven.toFixed(2)}`
      );
      return;
    }

    this.closeCashPaymentModal();

    // Save order with cash payment
    await this.saveOrderWithCash(subtotal, tax, total, cashGiven);
  },

  async saveOrderWithCash(subtotal, tax, total, cashGiven) {
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
      payment_status: 'paid',
      payment_method: 'cash',
      payment_reference: `CASH${Date.now()}`,
      transaction_amount: total,
      payment_processed_at: new Date().toISOString(),
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
        const change = cashGiven - total;
        this.showCashChangeScreen({
          orderNumber: data.order_number,
          total: total,
          cashGiven: cashGiven,
          change: change,
          items: this.cart,
        });
      } else {
        alert('Failed to save order: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('Failed to create order');
    }
  },

  showCashChangeScreen({ orderNumber, total, cashGiven, change, items }) {
    const modal = document.createElement('div');
    modal.id = 'cashChangeModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const changeMessage =
      change > 0
        ? `<div style="font-size: 64px; color: #27ae60; font-weight: 700; margin: 20px 0;">$${change.toFixed(2)}</div>
           <div style="font-size: 24px; color: #95a5a6; margin-bottom: 30px;">Change Due</div>`
        : '<div style="font-size: 48px; color: #27ae60; font-weight: 700; margin: 30px 0;">Exact Payment</div>';

    // Build items list
    const itemsHtml = items
      .map(
        (item) => `
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
        <div style="flex: 1; text-align: left;">
          <div style="color: #e8e8e8; font-size: 14px;">${item.quantity} ${item.name}</div>
          <div style="color: #95a5a6; font-size: 12px;">${item.vintage} ${item.varietal}</div>
        </div>
        <div style="color: #e8e8e8; font-weight: 600; font-size: 14px;">$${(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
      </div>
    `
      )
      .join('');

    const subtotal = items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
    const tax = total - subtotal;

    modal.innerHTML = `
      <div style="background: #2c3e50; padding: 40px; border-radius: 12px; max-width: 700px; width: 90%; color: #e8e8e8;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
          <!-- Left Side: Sale Summary -->
          <div style="border-right: 1px solid rgba(255, 255, 255, 0.1); padding-right: 30px;">
            <h3 style="color: #f39c12; margin-bottom: 20px; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">Sale Summary</h3>
            
            <div style="margin-bottom: 20px;">
              ${itemsHtml}
            </div>
            
            <div style="padding-top: 15px; border-top: 2px solid rgba(255, 255, 255, 0.1);">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #95a5a6; font-size: 14px;">Subtotal</span>
                <span style="color: #e8e8e8; font-size: 14px;">$${subtotal.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #95a5a6; font-size: 14px;">Tax</span>
                <span style="color: #e8e8e8; font-size: 14px;">$${tax.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                <span style="color: #f39c12; font-size: 18px; font-weight: 700;">Total</span>
                <span style="color: #f39c12; font-size: 18px; font-weight: 700;">$${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <!-- Right Side: Payment Info -->
          <div style="display: flex; flex-direction: column; justify-content: center; text-align: center;">
            <div style="font-size: 64px; margin-bottom: 20px;">💵</div>
            <h2 style="color: #27ae60; margin-bottom: 20px; font-size: 32px;">Payment Received</h2>
            
            ${changeMessage}
            
            <div style="background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="color: #95a5a6; font-size: 14px;">Cash Given:</span>
                <span style="color: #e8e8e8; font-weight: 600; font-size: 14px;">$${cashGiven.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                <span style="color: #95a5a6; font-size: 14px;">Change:</span>
                <span style="color: #27ae60; font-weight: 700; font-size: 18px;">$${change.toFixed(2)}</span>
              </div>
            </div>
            
            <div style="color: #95a5a6; font-size: 12px; margin-bottom: 20px;">Order #${orderNumber}</div>
            
            <button onclick="POSScreen.closeCashChangeScreen()" style="
              width: 100%;
              padding: 15px;
              background: linear-gradient(135deg, #27ae60, #229954);
              border: none;
              border-radius: 8px;
              color: white;
              font-size: 18px;
              font-weight: 700;
              cursor: pointer;
            ">Done (ESC)</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Auto-close if enabled
    this.scheduleAutoClose(modal);

    // ESC key handler
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeCashChangeScreen();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  },

  closeCashChangeScreen() {
    const modal = document.getElementById('cashChangeModal');
    if (modal) modal.remove();
    this.reset();
  },

  showPaymentReceivedScreen({
    orderNumber,
    total,
    subtotal,
    tax,
    paymentMethod,
    authCode,
    cardType,
    cardLast4,
    items,
  }) {
    const modal = document.createElement('div');
    modal.id = 'paymentReceivedModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    // Build items list
    const itemsHtml = items
      .map(
        (item) => `
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
        <div style="flex: 1; text-align: left;">
          <div style="color: #e8e8e8; font-size: 14px;">${item.quantity} ${item.name}</div>
          <div style="color: #95a5a6; font-size: 12px;">${item.vintage} ${item.varietal}</div>
        </div>
        <div style="color: #e8e8e8; font-weight: 600; font-size: 14px;">$${(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
      </div>
    `
      )
      .join('');

    modal.innerHTML = `
      <div style="background: #2c3e50; padding: 40px; border-radius: 12px; max-width: 700px; width: 90%; color: #e8e8e8;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
          <!-- Left Side: Sale Summary -->
          <div style="border-right: 1px solid rgba(255, 255, 255, 0.1); padding-right: 30px;">
            <h3 style="color: #f39c12; margin-bottom: 20px; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">Sale Summary</h3>
            
            <div style="margin-bottom: 20px;">
              ${itemsHtml}
            </div>
            
            <div style="padding-top: 15px; border-top: 2px solid rgba(255, 255, 255, 0.1);">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #95a5a6; font-size: 14px;">Subtotal</span>
                <span style="color: #e8e8e8; font-size: 14px;">$${subtotal.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #95a5a6; font-size: 14px;">Tax</span>
                <span style="color: #e8e8e8; font-size: 14px;">$${tax.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                <span style="color: #f39c12; font-size: 18px; font-weight: 700;">Total</span>
                <span style="color: #f39c12; font-size: 18px; font-weight: 700;">$${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <!-- Right Side: Payment Info -->
          <div style="display: flex; flex-direction: column; justify-content: center; text-align: center;">
            <div style="font-size: 64px; margin-bottom: 20px;">✓</div>
            <h2 style="color: #27ae60; margin-bottom: 10px; font-size: 32px;">Payment Received</h2>
            <div style="font-size: 16px; color: #95a5a6; margin-bottom: 30px;">Transaction Approved</div>
            
            <div style="background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="color: #95a5a6; font-size: 14px;">Payment Method:</span>
                <span style="color: #e8e8e8; font-weight: 600; font-size: 14px;">${paymentMethod}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="color: #95a5a6; font-size: 14px;">Card:</span>
                <span style="color: #e8e8e8; font-weight: 600; font-size: 14px;">${cardType} ****${cardLast4}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="color: #95a5a6; font-size: 14px;">Amount:</span>
                <span style="color: #e8e8e8; font-weight: 600; font-size: 14px;">$${total.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                <span style="color: #95a5a6; font-size: 14px;">Auth Code:</span>
                <span style="color: #27ae60; font-weight: 700; font-size: 14px;">${authCode}</span>
              </div>
            </div>
            
            <div style="color: #95a5a6; font-size: 12px; margin-bottom: 20px;">Order #${orderNumber}</div>
            
            <button onclick="POSScreen.closePaymentReceivedScreen()" style="
              width: 100%;
              padding: 15px;
              background: linear-gradient(135deg, #27ae60, #229954);
              border: none;
              border-radius: 8px;
              color: white;
              font-size: 18px;
              font-weight: 700;
              cursor: pointer;
            ">Done (ESC)</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Auto-close if enabled
    this.scheduleAutoClose(modal);

    // ESC key handler
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.closePaymentReceivedScreen();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  },

  closePaymentReceivedScreen() {
    const modal = document.getElementById('paymentReceivedModal');
    if (modal) modal.remove();
    this.reset();
  },

  scheduleAutoClose(modal) {
    // Get auto-close setting from localStorage
    const autoClose = localStorage.getItem('posAutoClosePayment') === 'true';
    const autoCloseDelay = parseInt(localStorage.getItem('posAutoCloseDelay') || '5', 10);

    if (autoClose && autoCloseDelay > 0) {
      setTimeout(() => {
        if (modal && modal.parentNode) {
          modal.remove();
          this.reset();
        }
      }, autoCloseDelay * 1000);
    }
  },

  showProcessingModal(referenceId, amount, pollInterval, maxWait) {
    const modal = document.createElement('div');
    modal.id = 'processingModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 40px;
      border-radius: 10px;
      text-align: center;
      max-width: 500px;
      font-family: Georgia, serif;
    `;

    content.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 20px;">⏳</div>
      <h2 style="color: #8b7355; margin-bottom: 10px;">Processing Payment on Terminal</h2>
      <p style="color: #666; font-size: 24px; font-weight: bold; margin: 20px 0;">$${amount.toFixed(2)}</p>
      <p style="color: #666; margin-bottom: 20px;">
        <span id="elapsedTime">0</span> seconds
      </p>
      <p style="color: #999; font-size: 14px;">Reference: ${referenceId}</p>
      <div id="modalButtons" style="margin-top: 30px; display: none;">
        <button onclick="POSScreen.manualStatusCheck('${referenceId}')" 
                style="background: #8b7355; color: white; border: none; padding: 12px 24px; 
                       border-radius: 5px; cursor: pointer; margin-right: 10px; font-family: Georgia, serif;">
          Check Status Now
        </button>
        <button onclick="POSScreen.cancelPolling()" 
                style="background: #95a5a6; color: white; border: none; padding: 12px 24px; 
                       border-radius: 5px; cursor: pointer; font-family: Georgia, serif;">
          Cancel
        </button>
      </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    this.pollingStartTime = Date.now();
    this.updateElapsedTime();

    // Show buttons after 60 seconds
    setTimeout(() => {
      const buttons = document.getElementById('modalButtons');
      if (buttons) {
        buttons.style.display = 'block';
      }
    }, 60000);
  },

  updateElapsedTime() {
    const elapsedElement = document.getElementById('elapsedTime');
    if (elapsedElement && this.pollingStartTime) {
      const elapsed = Math.floor((Date.now() - this.pollingStartTime) / 1000);
      elapsedElement.textContent = elapsed;
      setTimeout(() => this.updateElapsedTime(), 1000);
    }
  },

  hideProcessingModal() {
    const modal = document.getElementById('processingModal');
    if (modal) {
      modal.remove();
    }
    this.pollingStartTime = null;
  },

  async startPolling(referenceId, subtotal, tax, total, pollInterval, maxWait) {
    const startTime = Date.now();
    let lastStatusCheckTime = 0;
    const minStatusCheckDelay = 30000; // Wait at least 30s before first Status API check
    let nextStatusCheckDelay = minStatusCheckDelay; // Can be increased if terminal is busy

    this.pollingInterval = setInterval(async () => {
      const elapsed = Date.now() - startTime;

      if (elapsed > maxWait) {
        console.log('⏱️ Max wait time exceeded');
        this.stopPolling();
        this.showTimeoutMessage(referenceId);
        return;
      }

      // Check Status API with intelligent backoff
      const timeSinceLastCheck = Date.now() - lastStatusCheckTime;
      if (elapsed >= minStatusCheckDelay && timeSinceLastCheck >= nextStatusCheckDelay) {
        console.log('⏱️ Triggering SPIN Status API check');
        lastStatusCheckTime = Date.now();

        try {
          // Pass silent=true to avoid showing alert during automatic checks
          const statusResult = await this.manualStatusCheck(referenceId, true);

          // If terminal is busy, respect the delay it requested
          if (statusResult && statusResult.data && statusResult.data.GeneralResponse) {
            const delaySeconds = statusResult.data.GeneralResponse.DelayBeforeNextRequest;
            if (delaySeconds && delaySeconds > 0) {
              nextStatusCheckDelay = delaySeconds * 1000;
              console.log(`⏱️ Terminal busy, waiting ${delaySeconds}s before next status check`);
            }
          }
        } catch (err) {
          console.error('❌ Auto status check failed:', err);
        }
      }

      try {
        const response = await fetch(
          `/.netlify/functions/check-terminal-status?reference_id=${referenceId}`
        );
        const statusData = await response.json();

        console.log('📊 Poll result:', statusData);

        // Check if transaction was not attempted (terminal timeout with "Not found")
        if (statusData.status === 'error' && statusData.message === 'Not found') {
          console.log('⚠️ Terminal timeout - transaction not attempted');
          this.stopPolling();
          this.hideProcessingOverlay();
          alert('Terminal timed out. No payment was attempted. Please try again.');
          return;
        }

        if (statusData.status === 'approved' || statusData.status === 'declined') {
          this.stopPolling();
          this.hideProcessingOverlay();

          if (statusData.status === 'approved') {
            const fullResponse = await fetch(
              `/.netlify/functions/get-transaction-by-reference?reference_id=${referenceId}`
            );
            const fullData = await fullResponse.json();

            if (fullData.success && fullData.transaction) {
              await this.handleTerminalResponse(
                fullData.transaction.spin_response,
                subtotal,
                tax,
                total,
                referenceId
              );
            } else {
              alert('Transaction approved but could not load details. Please check order history.');
            }
          } else if (statusData.status === 'declined') {
            alert(`Payment declined: ${statusData.message || 'Please try another payment method'}`);
          }
        } else if (statusData.status === 'error' && statusData.message !== 'Not found') {
          // Don't stop polling on other errors - keep checking
          console.log('⚠️ Error status, continuing to poll...');
        }
      } catch (error) {
        console.error('❌ Polling error:', error);
      }
    }, pollInterval);
  },

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  },

  cancelPolling() {
    this.stopPolling();
    this.hideProcessingOverlay();
    alert(
      'Status checking cancelled. Transaction may still be processing. Check order history or use reference ID to verify.'
    );
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

    if (
      confirm(
        'Transaction is taking longer than expected.\n\n' +
          `Reference ID: ${referenceId}\n\n` +
          'Would you like to check the status now?'
      )
    ) {
      this.manualStatusCheck(referenceId);
    } else {
      alert(
        `Transaction reference: ${referenceId}\n\n` +
          'You can check this transaction later in order history or contact support with this reference ID.'
      );
    }
  },

  async handleTerminalResponse(transactionData, subtotal, tax, total, referenceId) {
    console.log('🔍 Handling terminal response:', transactionData);

    const responseData = transactionData.GeneralResponse || transactionData;
    const responseCode = responseData.ResponseCode || transactionData.ResponseCode;
    const message = responseData.Message || transactionData.Message;

    if (responseCode === '00' || responseCode === '0' || message === 'Approved') {
      console.log('✅ Transaction approved');
      await this.saveOrderWithPayment(subtotal, tax, total, transactionData, referenceId);
    } else {
      console.error('❌ Transaction declined or error');
      alert(
        `Payment failed: ${message || 'Unknown error'}\n\n` +
          `Response Code: ${responseCode || 'N/A'}\n\n` +
          'Please try again or use a different payment method.'
      );
    }
  },
};
