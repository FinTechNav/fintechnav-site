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

    // Build Cart.Amounts array - include subtotal and tax if provided, otherwise just total
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

    // Build Cart.Items array from cart items if provided
    let cartItemsArray = [];
    if (cartItems && cartItems.length > 0) {
      console.log('📦 Building items from cart:', cartItems);
      cartItemsArray = cartItems.map((item) => {
        let itemName = '';

        // Priority 1: Use vintage + varietal if both are available and not null
        if (item.vintage && item.varietal && item.vintage !== 'null' && item.varietal !== 'null') {
          itemName = `${item.vintage} ${item.varietal}`;
        }
        // Priority 2: Use just varietal if available
        else if (item.varietal && item.varietal !== 'null') {
          itemName = item.varietal;
        }
        // Priority 3: Use product name, removing winery name if present
        else if (item.name) {
          itemName = item.name;
          // Try to remove winery name from beginning (e.g., "Jensen Family Winery Bordeaux" -> "Bordeaux")
          const wineryPatterns = [
            /^Jensen Family Winery\s+/i,
            /^Smith Vineyards\s+/i,
            // Add more winery patterns as needed
          ];
          for (const pattern of wineryPatterns) {
            itemName = itemName.replace(pattern, '');
          }
        }
        // Priority 4: Fallback
        else {
          itemName = 'Wine';
        }

        // Truncate name if too long (terminal display limit ~25 chars)
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
      // Fallback to generic item if no cart items provided
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

    // Build CashPrices array to match cart items (for terminal display)
    // This prevents $0.00 from showing under each item
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
    console.log('  - TipAmount:', saleRequest.TipAmount);
    console.log('  - ReferenceId:', saleRequest.ReferenceId);
    console.log('  - Cart.Amounts:', JSON.stringify(saleRequest.Cart.Amounts, null, 2));

    const response = await fetch('https://test.spinpos.net/v2/Payment/Sale', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(saleRequest),
    });

    console.log('📨 SPIN API response status:', response.status);

    const responseText = await response.text();
    console.log('📨 SPIN API raw response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('✅ SPIN API response data:', JSON.stringify(data, null, 2));

      // Add our original subtotal and tax to the response
      // This ensures we can save accurate tax data to the database
      if (subtotal !== undefined && tax !== undefined) {
        console.log('📊 Adding original subtotal and tax to response:', {
          subtotal: parseFloat(subtotal),
          tax: parseFloat(tax),
        });

        // Add to the Amounts object if it exists
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

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: data,
        }),
      };
    } catch (parseError) {
      console.error('❌ Failed to parse SPIN API response:', parseError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'SPIN API returned invalid response',
          responsePreview: responseText.substring(0, 500),
        }),
      };
    }
  } catch (error) {
    console.error('❌ Error processing terminal sale:', error);
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
