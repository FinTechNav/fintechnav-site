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

  console.log('🌐 process-card-not-present-sale.js invoked');

  try {
    const body = JSON.parse(event.body);
    const {
      // Payment method (one of these required)
      paymentTokenId, // Single-use token from Freedom to Design
      cardToken, // Saved card token (chdToken)
      cvv, // CVV for saved card

      // Transaction details
      amount,
      subtotal,
      tax,
      tipAmount = 0,

      // Customer & context
      customerId,
      wineryId,
      referenceId,
      saveCard = false,

      // Billing info (required for new cards)
      billingAddress,
      billingZip,

      // Cart items (optional)
      cartItems = [],
    } = body;

    console.log('📊 Request parameters:');
    console.log(
      '  - Payment method:',
      paymentTokenId ? 'new card (token)' : cardToken ? 'saved card' : 'MISSING'
    );
    console.log('  - Amount:', amount);
    console.log('  - Customer ID:', customerId);
    console.log('  - Winery ID:', wineryId);
    console.log('  - Save card:', saveCard);

    // Validate required parameters
    if (!amount || !wineryId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required parameters',
          required: ['amount', 'wineryId'],
        }),
      };
    }

    if (!paymentTokenId && !cardToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Either paymentTokenId or cardToken is required',
        }),
      };
    }

    if (cardToken && !cvv) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'CVV is required for saved card transactions',
        }),
      };
    }

    // Connect to database to get processor configuration
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: false,
    });

    await client.connect();
    console.log('✅ Database connected');

    // Get winery payment configuration
    const configResult = await client.query(
      `SELECT processor, processor_config, processor_environment
       FROM winery_payment_config
       WHERE winery_id = $1 AND is_active = TRUE`,
      [wineryId]
    );

    if (configResult.rows.length === 0) {
      await client.end();
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Payment processor not configured for this winery' }),
      };
    }

    const config = configResult.rows[0];
    const processorConfig = config.processor_config;

    console.log('💳 Processor:', config.processor);
    console.log('🌍 Environment:', config.processor_environment);

    if (config.processor !== 'dejavoo') {
      await client.end();
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Only Dejavoo processor is currently supported',
        }),
      };
    }

    // Extract Dejavoo credentials
    const merchantId = processorConfig.merchant_id;
    const apiAuthToken = processorConfig.api_auth_token;
    const apiBaseUrl =
      config.processor_environment === 'production'
        ? 'https://api.iposcloud.net/ipostransact'
        : 'https://test.iposcloud.net/ipostransact';

    console.log('🔑 Merchant ID:', merchantId);
    console.log('🔑 API Base URL:', apiBaseUrl);
    console.log('🔑 Auth Token:', apiAuthToken ? '✓ present' : '✗ missing');

    if (!merchantId || !apiAuthToken) {
      await client.end();
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Processor configuration incomplete',
        }),
      };
    }

    // Build iPOS Transact API request
    const transactionReferenceId = referenceId || `WEB${Date.now()}`;

    const requestBody = {
      merchantAuthentication: {
        merchantId: merchantId,
        transactionReferenceId: transactionReferenceId,
      },
      transactionRequest: {
        amount: Math.round(parseFloat(amount) * 100), // Convert to cents
        tipAmount: Math.round(parseFloat(tipAmount) * 100),
        requestCardToken: saveCard, // Request reusable token if saving
      },
    };

    // Add payment method
    if (paymentTokenId) {
      // New card - use single-use token
      requestBody.transactionRequest.paymentTokenId = paymentTokenId;
      console.log('💳 Using payment token (new card)');
    } else {
      // Saved card - use card token + CVV
      requestBody.transactionRequest.cardToken = cardToken;
      requestBody.transactionRequest.cvv = cvv;
      console.log('💳 Using saved card token');
    }

    // Add AVS data if provided
    if (billingAddress || billingZip) {
      const streetNo = billingAddress ? billingAddress.split(' ')[0] : '';
      requestBody.Avs = {
        StreetNo: streetNo,
        Zip: billingZip || '',
      };
    }

    console.log('📤 iPOS Transact Request:');
    console.log('  - API URL:', apiBaseUrl);
    console.log('  - Merchant ID:', merchantId);
    console.log('  - Transaction Reference:', transactionReferenceId);
    console.log('  - Amount (cents):', requestBody.transactionRequest.amount);
    console.log('  - Request card token:', requestBody.transactionRequest.requestCardToken);

    // Call iPOS Transact API
    const response = await fetch(apiBaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        token: apiAuthToken,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📥 API Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API request failed:', errorText);
      await client.end();

      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Payment processor request failed',
          details: errorText,
          declineInfo: {
            code: 'ERROR',
            message: 'API ERROR',
            definition: 'Payment processor API request failed',
            isApproval: false,
          },
        }),
      };
    }

    const responseData = await response.json();
    console.log('📥 API Response Data:', JSON.stringify(responseData, null, 2));

    // Extract transaction data
    const transactionData = responseData.iposhpresponse || responseData.iposTransactResponse;

    if (!transactionData) {
      console.error('❌ No transaction data in response');
      await client.end();

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid response from payment processor',
          declineInfo: {
            code: 'ERROR',
            message: 'INVALID RESPONSE',
            definition: 'Payment processor returned invalid response format',
            isApproval: false,
          },
        }),
      };
    }

    // Extract response code (iPOS uses lowercase 'responseCode')
    const responseCode = transactionData.responseCode || transactionData.ResponseCode || '';
    const responseMessage =
      transactionData.responseMessage || transactionData.errResponseMessage || '';

    console.log('📊 Response code:', responseCode);
    console.log('📊 Response message:', responseMessage);

    // Map decline code
    const declineInfo = mapDeclineCode(responseCode);
    console.log('🔍 Decline mapping:', declineInfo);

    // Check if approved
    const isApproved = declineInfo.isApproval;

    // Close database connection
    await client.end();

    // Build response
    const result = {
      success: true,
      approved: isApproved,
      transactionData: transactionData,
      declineInfo: {
        code: declineInfo.code,
        message: declineInfo.message,
        definition: declineInfo.definition,
        isApproval: declineInfo.isApproval,
        originalMessage: responseMessage,
      },
      referenceId: transactionReferenceId,
      amount: amount,
    };

    console.log('✅ Transaction processed:', isApproved ? 'APPROVED' : 'DECLINED');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('❌ Error processing card-not-present sale:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        approved: false,
        error: 'Failed to process payment',
        details: error.message,
        declineInfo: {
          code: 'ERROR',
          message: 'SYSTEM ERROR',
          definition: error.message || 'An unexpected error occurred',
          isApproval: false,
        },
      }),
    };
  }
};
