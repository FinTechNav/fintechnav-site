const { Client } = require('pg');
const { mapDeclineCode, isApprovalCode } = require('./decline-code-mapper');

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
      terminalId,
      referenceId,
      invoiceNumber = '',
      captureSignature = false,
      getReceipt = true,
      printReceipt = false,
      cartItems = [],
      wineryId,
      dbPersistTimeout = 20000,
    } = body;

    console.log('📊 Request parameters:');
    console.log('  - amount:', amount);
    console.log('  - subtotal:', subtotal);
    console.log('  - tax:', tax);
    console.log('  - tipAmount:', tipAmount);
    console.log('  - terminalId:', terminalId);
    console.log('  - wineryId:', wineryId);
    console.log('  - referenceId:', referenceId);
    console.log('  - cartItems:', cartItems.length, 'items');
    console.log('  - dbPersistTimeout:', dbPersistTimeout, 'ms');

    // Validate required parameters
    if (!amount || !terminalId || !wineryId) {
      console.error('❌ Missing required parameters');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required parameters',
          required: ['amount', 'terminalId', 'wineryId'],
          received: {
            amount: !!amount,
            terminalId: !!terminalId,
            wineryId: !!wineryId,
          },
        }),
      };
    }

    // Connect to database to get terminal configuration
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: false,
    });

    await client.connect();
    console.log('✅ Database connected');

    // Get terminal configuration
    const terminalResult = await client.query(
      `SELECT processor, processor_terminal_config
       FROM terminals
       WHERE id = $1 AND deleted_at IS NULL`,
      [terminalId]
    );

    if (terminalResult.rows.length === 0) {
      await client.end();
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Terminal not found' }),
      };
    }

    const terminal = terminalResult.rows[0];
    const terminalConfig = terminal.processor_terminal_config;

    console.log('🖥️ Terminal processor:', terminal.processor);
    console.log('🖥️ Terminal config keys:', Object.keys(terminalConfig));

    // Extract credentials from terminal config
    const tpn = terminalConfig.tpn;
    const registerId = terminalConfig.register_id;
    const authkey = terminalConfig.auth_key;
    const apiBaseUrl = terminalConfig.api_base_url || 'https://test.spinpos.net';

    console.log('📋 Terminal credentials:');
    console.log('  - TPN:', tpn);
    console.log('  - Register ID:', registerId);
    console.log('  - Auth Key:', authkey ? '✓ present' : '✗ missing');
    console.log('  - API Base URL:', apiBaseUrl);

    if (!tpn || !registerId || !authkey) {
      await client.end();
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Terminal configuration incomplete',
          missing: {
            tpn: !tpn,
            registerId: !registerId,
            authkey: !authkey,
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
    console.log('  - Endpoint:', `${apiBaseUrl}/v2/Payment/Sale`);
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
    const spinPromise = fetch(`${apiBaseUrl}/v2/Payment/Sale`, {
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

        // Extract response code and status code from SPIN API response
        const generalResponse = data.GeneralResponse || {};
        const resultCode = generalResponse.ResultCode;
        const statusCode = generalResponse.StatusCode;
        const hostResponseCode = generalResponse.HostResponseCode;
        const message = generalResponse.Message || generalResponse.DetailedMessage || '';

        console.log('📊 Result code:', resultCode);
        console.log('📊 Status code:', statusCode);
        console.log('📊 Host response code:', hostResponseCode);
        console.log('📊 Message:', message);

        // Determine decline info based on SPIN response
        let declineInfo;

        if (resultCode === '0' && statusCode === '0000') {
          // Success - use host response code for decline mapping
          declineInfo = mapDeclineCode(hostResponseCode || '00');
        } else {
          // SPIN error (ResultCode != 0 or StatusCode != 0000)
          // Use StatusCode for error display
          declineInfo = {
            code: statusCode || 'ERROR',
            message: message || 'Transaction Error',
            definition: generalResponse.DetailedMessage || message || 'Transaction failed',
            isApproval: false,
          };
        }

        console.log('🔍 Decline mapping:', declineInfo);

        // Add decline info to response
        data.declineInfo = {
          code: declineInfo.code,
          message: declineInfo.message,
          definition: declineInfo.definition,
          isApproval: declineInfo.isApproval,
          originalMessage: message,
          resultCode: resultCode,
          statusCode: statusCode,
        };

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

      try {
        console.log('🔍 Executing INSERT query...');
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
      } finally {
        await client.end();
        console.log('🔌 Database connection closed');
      }

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
      await client.end();
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
