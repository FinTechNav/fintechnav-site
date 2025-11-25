const { Client } = require('pg');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  console.log('🔵 process-terminal-sale.js invoked');

  try {
    const body = JSON.parse(event.body);
    const {
      amount,
      subtotal,
      tax,
      tipAmount = 0,
      tpn,
      authkey,
      registerId,
      referenceId,
      invoiceNumber = '',
      captureSignature = false,
      getReceipt = true,
      printReceipt = false,
      cartItems = [],
      wineryId,
      terminalId,
      dbPersistTimeout = 20000, // Default 20 seconds
    } = body;

    console.log('📊 Request parameters:');
    console.log('  - amount:', amount);
    console.log('  - subtotal:', subtotal);
    console.log('  - tax:', tax);
    console.log('  - tipAmount:', tipAmount);
    console.log('  - tpn:', tpn ? `✓ ${tpn}` : '✗ missing');
    console.log('  - authkey:', authkey ? `✓ ${authkey}` : '✗ missing');
    console.log('  - registerId:', registerId ? `✓ ${registerId}` : '✗ missing');
    console.log('  - referenceId:', referenceId);
    console.log('  - cartItems:', cartItems.length, 'items');
    console.log('  - dbPersistTimeout:', dbPersistTimeout, 'ms');

    // Validate required parameters
    if (!amount || !tpn || !authkey || !registerId) {
      console.error('❌ Missing required parameters');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required parameters',
          required: ['amount', 'tpn', 'authkey', 'registerId'],
          received: {
            amount: !!amount,
            tpn: !!tpn,
            authkey: !!authkey,
            registerId: !!registerId,
          },
        }),
      };
    }

    // Build Cart.Amounts array
    const cartAmounts = [];
    if (subtotal !== undefined && tax !== undefined) {
      cartAmounts.push(
        { Name: 'Subtotal', Value: parseFloat(subtotal) },
        { Name: 'Tax', Value: parseFloat(tax) },
        { Name: 'Total', Value: parseFloat(amount) }
      );
    } else {
      cartAmounts.push({ Name: 'Total', Value: parseFloat(amount) });
    }

    // Build Cart.Items array
    let cartItemsArray = [];
    if (cartItems && cartItems.length > 0) {
      console.log('📦 Building items from cart:', cartItems);
      cartItemsArray = cartItems.map((item) => {
        let itemName = '';

        if (item.vintage && item.varietal && item.vintage !== 'null' && item.varietal !== 'null') {
          itemName = `${item.vintage} ${item.varietal}`;
        } else if (item.varietal && item.varietal !== 'null') {
          itemName = item.varietal;
        } else if (item.name) {
          itemName = item.name;
          const wineryPatterns = [/^Jensen Family Winery\s+/i, /^Smith Vineyards\s+/i];
          for (const pattern of wineryPatterns) {
            itemName = itemName.replace(pattern, '');
          }
        } else {
          itemName = 'Wine';
        }

        if (itemName.length > 25) {
          itemName = itemName.substring(0, 22) + '...';
        }

        return {
          Name: itemName,
          Price: parseFloat(item.price) * item.quantity,
          UnitPrice: parseFloat(item.price),
          Quantity: item.quantity,
          AdditionalInfo: '',
          CustomInfos: [],
          Modifiers: [],
        };
      });
    } else {
      cartItemsArray = [
        {
          Name: 'POS Transaction',
          Price: parseFloat(amount),
          UnitPrice: parseFloat(amount),
          Quantity: 1,
          AdditionalInfo: '',
          CustomInfos: [],
          Modifiers: [],
        },
      ];
    }

    console.log('🛒 Cart items to send:', JSON.stringify(cartItemsArray, null, 2));

    const cashPrices = cartItemsArray.map((item) => ({
      Name: item.Name,
      Value: item.Price,
    }));

    // Build SPIN API Sale request
    const saleRequest = {
      Amount: parseFloat(amount),
      TipAmount: parseFloat(tipAmount),
      PaymentType: 'Credit',
      ReferenceId: referenceId || `POS${Date.now()}`,
      InvoiceNumber: invoiceNumber,
      PrintReceipt: printReceipt ? 'Yes' : 'No',
      CaptureSignature: captureSignature,
      GetExtendedData: true,
      Tpn: tpn,
      RegisterId: registerId,
      Authkey: authkey,
      ExternalReceipt: '',
      Cart: {
        Amounts: cartAmounts,
        CashPrices: cashPrices,
        Items: cartItemsArray,
      },
      CallbackInfo: {
        Url: '',
      },
      CustomFields: {},
    };

    console.log('📤 Sending Sale request to SPIN API:');
    console.log('  - Endpoint: https://test.spinpos.net/v2/Payment/Sale');
    console.log('  - Amount:', saleRequest.Amount);
    console.log('  - ReferenceId:', saleRequest.ReferenceId);

    // Create timeout promise
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        console.log(`⏱️ ${dbPersistTimeout}ms timeout reached, will persist to database`);
        resolve({ timeout: true });
      }, dbPersistTimeout);
    });

    // Create SPIN API call promise
    const spinPromise = fetch('https://test.spinpos.net/v2/Payment/Sale', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(saleRequest),
    }).then(async (response) => {
      const responseText = await response.text();
      console.log('📨 SPIN API response status:', response.status);
      console.log('📨 SPIN API raw response:', responseText);

      try {
        const data = JSON.parse(responseText);
        console.log('✅ SPIN API response data:', JSON.stringify(data, null, 2));

        // Add original subtotal and tax to response
        if (subtotal !== undefined && tax !== undefined) {
          if (data.Amounts) {
            data.Amounts.Subtotal = parseFloat(subtotal);
            data.Amounts.TaxAmount = parseFloat(tax);
          } else {
            data.Amounts = {
              TotalAmount: parseFloat(amount),
              Subtotal: parseFloat(subtotal),
              TaxAmount: parseFloat(tax),
              TipAmount: parseFloat(tipAmount),
            };
          }
        }

        return { data, timeout: false };
      } catch (parseError) {
        console.error('❌ Failed to parse SPIN API response:', parseError);
        throw new Error('SPIN API returned invalid response');
      }
    });

    // Race between timeout and SPIN API
    const result = await Promise.race([timeoutPromise, spinPromise]);

    console.log('🏁 Race result:', result.timeout ? 'TIMEOUT' : 'SPIN_RESPONSE');

    if (result.timeout) {
      // Timeout reached - persist to database and return processing status
      console.log('💾 Persisting transaction status to database...');
      console.log('💾 Database URL exists:', !!process.env.DATABASE_URL);
      console.log('💾 Reference ID:', saleRequest.ReferenceId);
      console.log('💾 Winery ID:', wineryId);
      console.log('💾 Terminal ID:', terminalId);
      console.log('💾 Amount:', amount);

      const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: false,
      });

      try {
        console.log('🔌 Connecting to database...');
        await client.connect();
        console.log('✅ Database connected');

        console.log('📝 Executing INSERT query...');
        const insertResult = await client.query(
          `INSERT INTO terminal_transaction_status 
           (reference_id, winery_id, terminal_id, amount, status, spin_request, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           RETURNING id`,
          [
            saleRequest.ReferenceId,
            wineryId,
            terminalId,
            amount,
            'processing',
            JSON.stringify(saleRequest),
          ]
        );
        console.log('✅ Transaction status saved to database, ID:', insertResult.rows[0].id);
      } catch (dbError) {
        console.error('❌ Database error:', dbError);
        console.error('❌ Error code:', dbError.code);
        console.error('❌ Error message:', dbError.message);
        console.error('❌ Error detail:', dbError.detail);
      } finally {
        await client.end();
        console.log('🔌 Database connection closed');
      }

      // Note: Background updates won't work due to Netlify 26s function timeout
      // Frontend will trigger verify-terminal-transaction after 120s via polling

      // Return processing status to frontend
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          status: 'processing',
          reference_id: saleRequest.ReferenceId,
          amount: amount,
        }),
      };
    } else {
      // Got response before timeout - return normally
      console.log('✅ Got SPIN response before timeout');
      console.log('📊 Response data keys:', Object.keys(result.data));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: result.data,
        }),
      };
    }
  } catch (error) {
    console.error('❌ Error processing terminal sale:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to process terminal sale',
        details: error.message,
        stack: error.stack,
      }),
    };
  }
};
