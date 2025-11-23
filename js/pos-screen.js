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

    // Check if winery has a terminal configured
    const terminalConfig = await this.getTerminalConfig();

    if (terminalConfig && terminalConfig.tpn) {
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

      if (
        cardPresentTerminal &&
        cardPresentTerminal.tpn &&
        cardPresentTerminal.register_id &&
        cardPresentTerminal.auth_key
      ) {
        return {
          tpn: cardPresentTerminal.tpn,
          registerId: cardPresentTerminal.register_id,
          authkey: cardPresentTerminal.auth_key,
        };
      }

      console.log('ℹ️ No card_present terminal configuration found for winery');
      return null;
    } catch (error) {
      console.error('❌ Error fetching terminal config:', error);
      return null;
    }
  },

  async processTerminalSale(terminal, subtotal, tax, total) {
    try {
      const referenceId = `POS${Date.now()}`;

      console.log('🔄 Processing terminal sale...');
      console.log('  Terminal Config:', {
        tpn: terminal.tpn,
        registerId: terminal.registerId,
      });
      console.log('  Amounts:', {
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
      });

      this.showProcessingOverlay('Processing payment on terminal...');

      const saleRequest = {
        amount: parseFloat(total.toFixed(2)),
        tipAmount: 0,
        cart: {
          amounts: [
            { name: 'Subtotal', value: parseFloat(subtotal.toFixed(2)) },
            { name: 'Tax', value: parseFloat(tax.toFixed(2)) },
            { name: 'Total', value: parseFloat(total.toFixed(2)) },
          ],
          items: this.cart.map((item) => ({
            name: item.name,
            price: parseFloat(item.price),
            quantity: item.quantity,
          })),
        },
        paymentType: 'Credit',
        referenceId: referenceId,
        printReceipt: 'No',
        tpn: terminal.tpn,
        registerId: terminal.registerId,
        authkey: terminal.authkey,
      };

      console.log('📤 Sale request:', JSON.stringify(saleRequest, null, 2));

      const response = await fetch('/.netlify/functions/process-terminal-sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saleRequest),
      });

      console.log('📥 Response status:', response.status);

      const result = await response.json();
      console.log('📥 Terminal sale response:', result);
      console.log('📥 Response structure:', {
        success: result.success,
        hasData: !!result.data,
        dataKeys: result.data ? Object.keys(result.data) : [],
        fullData: JSON.stringify(result.data, null, 2),
      });

      this.hideProcessingOverlay();

      if (result.success && result.data) {
        const transactionData = result.data;

        console.log('🔍 Checking transaction data:', {
          hasGeneralResponse: !!transactionData.GeneralResponse,
          generalResponse: JSON.stringify(transactionData.GeneralResponse, null, 2),
          responseCode: transactionData.ResponseCode,
          message: transactionData.Message,
        });

        // Check if transaction was approved
        // SPIN API may return data in GeneralResponse object
        const responseData = transactionData.GeneralResponse || transactionData;
        const responseCode = responseData.ResponseCode || transactionData.ResponseCode;
        const message = responseData.Message || transactionData.Message;

        console.log('🔍 Extracted values:', {
          responseCode,
          message,
          authCode: responseData.AuthCode || transactionData.AuthCode,
        });

        if (responseCode === '00' || responseCode === '0' || message === 'Approved') {
          console.log('✅ Transaction approved');

          // Save order to database - pass COMPLETE transactionData, not just responseData
          await this.saveOrderWithPayment(subtotal, tax, total, transactionData, referenceId);
        } else {
          console.error('❌ Transaction declined or error');
          console.error('❌ Full response:', JSON.stringify(transactionData, null, 2));
          alert(
            `Payment failed: ${message || 'Unknown error'}\n\nResponse Code: ${responseCode || 'N/A'}\n\nPlease try again or use a different payment method.`
          );
        }
      } else {
        console.error('❌ Terminal sale failed:', result.error);
        alert(
          `Terminal error: ${result.error || 'Unknown error'}\n\nPlease check terminal connection and try again.`
        );
      }
    } catch (error) {
      console.error('💥 Error processing terminal sale:', error);
      this.hideProcessingOverlay();
      alert(
        'Failed to process payment on terminal.\n\nPlease check terminal connection and try again.'
      );
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

        alert(
          `Order #${data.order_number} completed successfully!\n\nTotal: $${total.toFixed(2)}\nPayment: Approved\nAuth Code: ${transactionData.AuthCode || 'N/A'}`
        );

        this.reset();
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
      overlay.classList.remove('active');
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
