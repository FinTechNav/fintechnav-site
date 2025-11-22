const fetch = require('node-fetch');

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
      tipAmount = 0,
      tpn,
      authkey,
      registerId,
      referenceId,
      invoiceNumber = '',
      captureSignature = false,
      getReceipt = true,
      printReceipt = false,
    } = body;

    console.log('📊 Request parameters:');
    console.log('  - amount:', amount);
    console.log('  - tipAmount:', tipAmount);
    console.log('  - tpn:', tpn ? `✓ ${tpn}` : '✗ missing');
    console.log('  - authkey:', authkey ? `✓ ${authkey}` : '✗ missing');
    console.log('  - registerId:', registerId ? `✓ ${registerId}` : '✗ missing');
    console.log('  - referenceId:', referenceId);

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

    // Build SPIN API Sale request
    const saleRequest = {
      Amount: parseFloat(amount),
      TipAmount: parseFloat(tipAmount),
      PaymentType: 'Credit',
      ReferenceId: referenceId || `POS${Date.now()}`,
      InvoiceNumber: invoiceNumber,
      PrintReceipt: printReceipt ? 'Yes' : 'No',
      GetReceipt: getReceipt ? 'Yes' : 'No',
      CaptureSignature: captureSignature,
      GetExtendedData: true,
      Tpn: tpn,
      RegisterId: registerId,
      Authkey: authkey,
      ExternalReceipt: '',
      Cart: {
        Amounts: [],
        CashPrices: [],
        Items: [],
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
