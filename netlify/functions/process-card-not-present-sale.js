const { Client } = require('pg');

// Decline code mapping (inlined to avoid module import issues in Netlify)
const DECLINE_CODES = {
  '00': { message: 'APPROVAL', definition: 'Approved and complete', isApproval: true },
  '01': { message: 'CALL', definition: 'Refer to issuer', isApproval: false },
  '02': { message: 'CALL', definition: 'Refer to issuer-Special condition', isApproval: false },
  '03': { message: 'TERM ID ERROR', definition: 'Invalid Merchant ID', isApproval: false },
  '04': { message: 'HOLD-CALL', definition: 'Pick up card (no fraud)', isApproval: false },
  '05': { message: 'DECLINE', definition: 'Do not honor', isApproval: false },
  '06': { message: 'ERROR', definition: 'General Error', isApproval: false },
  '07': {
    message: 'HOLD-CALL',
    definition: 'Pick up card, special condition (fraud account)',
    isApproval: false,
  },
  '08': { message: 'APPROVAL', definition: 'Honor Mastercard with ID', isApproval: true },
  10: {
    message: 'PARTIAL APPROVAL',
    definition: 'Partial approval for the authorized amount returned in Group III',
    isApproval: true,
  },
  11: { message: 'APPROVAL', definition: 'VIP approval', isApproval: true },
  12: { message: 'INVALID TRANS', definition: 'Invalid Transaction', isApproval: false },
  13: { message: 'AMOUNT ERROR', definition: 'Invalid Amount', isApproval: false },
  14: { message: 'CARD NO. ERROR', definition: 'Invalid card number', isApproval: false },
  15: { message: 'NO SUCH ISSUER', definition: 'No such issuer', isApproval: false },
  19: { message: 'RE ENTER', definition: 'Re-enter transaction', isApproval: false },
  21: {
    message: 'NO ACTION TAKEN',
    definition: 'Unable to locate the account number',
    isApproval: false,
  },
  25: {
    message: 'NO CARD NUMBER',
    definition: 'Unable to locate the account number',
    isApproval: false,
  },
  28: { message: 'NO REPLY', definition: 'File is temporarily unavailable', isApproval: false },
  30: {
    message: 'MSG FORMAT ERROR',
    definition: 'Transaction was improperly formatted',
    isApproval: false,
  },
  41: { message: 'HOLD-CALL', definition: 'Lost card, pick up (fraud account)', isApproval: false },
  43: {
    message: 'HOLD-CALL',
    definition: 'Stolen card, pick up (fraud account)',
    isApproval: false,
  },
  46: { message: 'CLOSED ACCOUNT', definition: 'Closed Account', isApproval: false },
  51: { message: 'DECLINE', definition: 'Insufficient funds', isApproval: false },
  52: { message: 'NO CHECK ACCOUNT', definition: 'No checking account', isApproval: false },
  53: { message: 'NO SAVE ACCOUNT', definition: 'No saving account', isApproval: false },
  54: { message: 'EXPIRED CARD', definition: 'Expired card', isApproval: false },
  55: { message: 'WRONG PIN', definition: 'Incorrect PIN', isApproval: false },
  57: {
    message: 'SERV NOT ALLOWED',
    definition: 'Transaction not permitted-Card',
    isApproval: false,
  },
  58: {
    message: 'SERV NOT ALLOWED',
    definition: 'Transaction not permitted-Terminal',
    isApproval: false,
  },
  59: { message: 'SUSPECTED FRAUD', definition: 'Suspected fraud', isApproval: false },
  61: {
    message: 'EXP APPR AMT LIM',
    definition: 'Exceeds approval amount limit',
    isApproval: false,
  },
  62: { message: 'DECLINE', definition: 'Invalid service code, restricted', isApproval: false },
  63: { message: 'SEC VIOLATION', definition: 'Security violation', isApproval: false },
  65: {
    message: 'EXC W/D FREQ LIM',
    definition: 'Exceeds withdrawal frequency limit',
    isApproval: false,
  },
  '6P': { message: 'VERIF DATA FAILD', definition: 'Verification data failed', isApproval: false },
  75: {
    message: 'PIN EXCEEDED',
    definition: 'Allowable number of PIN-entry tries exceeded',
    isApproval: false,
  },
  76: { message: 'UNSOLIC REVERSAL', definition: 'Unable to locate, no match', isApproval: false },
  77: {
    message: 'NO ACTION TAKEN',
    definition: 'Inconsistent, reversed or repeat data',
    isApproval: false,
  },
  78: {
    message: 'NO ACCOUNT',
    definition:
      'Blocked, first used transaction from new cardholder, and card not properly unblocked',
    isApproval: false,
  },
  79: { message: 'ALREADY REVERSED', definition: 'Already reversed at switch', isApproval: false },
  80: {
    message: 'NO IMPACT',
    definition: 'No financial impact (used in reversal response to decline originals)',
    isApproval: false,
  },
  81: { message: 'ENCRYPTION ERROR', definition: 'Cryptographic error', isApproval: false },
  82: {
    message: 'INCORRECT CVV',
    definition: 'CVV data is not correct OR offline PIN authentication interrupted',
    isApproval: false,
  },
  83: { message: "CAN'T VERIFY PIN", definition: 'Cannot verify PIN', isApproval: false },
  85: { message: 'CARD OK', definition: 'No reason to decline', isApproval: true },
  86: { message: "CAN'T VERIFY PIN", definition: 'Cannot verify PIN', isApproval: false },
  91: { message: 'NO REPLY', definition: 'Issuer or switch unavailable', isApproval: false },
  92: { message: 'INVALID ROUTING', definition: 'Destination not found', isApproval: false },
  93: { message: 'DECLINE', definition: 'Violation, cannot complete', isApproval: false },
  94: { message: 'DUPLICATE TRANS', definition: 'Unable to location, no match', isApproval: false },
  96: { message: 'SYSTEM ERROR', definition: 'System malfunction', isApproval: false },
  A1: {
    message: 'ACTIVATED',
    definition: 'POS device authentication successful',
    isApproval: true,
  },
  A2: {
    message: 'NOT ACTIVATED',
    definition: 'POS device authentication not successful',
    isApproval: false,
  },
  A3: {
    message: 'DEACTIVATED',
    definition: 'POS device deactivation successful',
    isApproval: true,
  },
  B1: {
    message: 'SRCHG NOT ALLOWED',
    definition: 'Surcharge amount not permitted on debit card or EBT food stamps',
    isApproval: false,
  },
  B2: {
    message: 'SRCHRG NOT ALLOWED',
    definition: 'Surcharge amount not supported by debit network',
    isApproval: false,
  },
  CV: { message: 'FAILURE HV', definition: 'Card type verification error', isApproval: false },
  D3: {
    message: 'SECUR CRYPT FAIL',
    definition: 'Transaction failure due to missing or invalid 3D-Secure cryptogram',
    isApproval: false,
  },
  E1: {
    message: 'ENCR NOT CONFIGD',
    definition: 'Encryption is not configured',
    isApproval: false,
  },
  E2: {
    message: 'TERM NOT AUTHENT',
    definition: 'Terminal is not authenticated',
    isApproval: false,
  },
  E3: { message: 'DECRYPT FAILURE', definition: 'Data could not be decrypted', isApproval: false },
  EA: { message: 'ACCT LENGTH ERR', definition: 'Verification error', isApproval: false },
  EB: { message: 'CHECK DIGIT ERR', definition: 'Verification error', isApproval: false },
  EC: { message: 'CID FORMAT ERROR', definition: 'Verification error', isApproval: false },
  H1: {
    message: 'SERV NOT ALLOWED',
    definition: 'Contact Merchant Services/Technical Support',
    isApproval: false,
  },
  H2: {
    message: 'SERV NOT ALLOWED',
    definition: 'Contact Merchant Services/Technical Support',
    isApproval: false,
  },
  H4: {
    message: 'SERV NOT ALLOWED',
    definition: 'Contact Merchant Services/Technical Support',
    isApproval: false,
  },
  H5: {
    message: 'SERV NOT ALLOWED',
    definition: 'Contact Merchant Services/Technical Support',
    isApproval: false,
  },
  H6: {
    message: 'SERV NOT ALLOWED',
    definition: 'Contact Merchant Services/Technical Support',
    isApproval: false,
  },
  H7: {
    message: 'SERV NOT ALLOWED',
    definition: 'Contact Merchant Services/Technical Support',
    isApproval: false,
  },
  H8: {
    message: 'SERV NOT ALLOWED',
    definition: 'Contact Merchant Services/Technical Support',
    isApproval: false,
  },
  H9: {
    message: 'SERV NOT ALLOWED',
    definition: 'Contact Merchant Services/Technical Support',
    isApproval: false,
  },
  HV: { message: 'FAILURE HV', definition: 'Hierarchy Verification Error', isApproval: false },
  K0: { message: 'TOKEN RESPONSE', definition: 'Token request was processed', isApproval: true },
  K1: {
    message: 'TOKEN NOT CONFIG',
    definition: 'Tokenization is not configured',
    isApproval: false,
  },
  K3: { message: 'TOKEN FAILURE', definition: 'Data could not be de-tokenized', isApproval: false },
  M0: {
    message: 'DOM DBT NOT ALWD',
    definition: 'Mastercard: Canada region-issued Domestic Debit Transaction not allowed',
    isApproval: false,
  },
  N3: {
    message: 'CASHBACK NOT AVL',
    definition: 'Cash back service not available',
    isApproval: false,
  },
  N4: { message: 'DECLINE', definition: 'Exceeds issuer withdrawal limit', isApproval: false },
  N7: { message: 'CVV2 MISMATCH', definition: 'CVV2 Value supplied is invalid', isApproval: false },
  P0: {
    message: 'SERV NOT ALLOWED',
    definition: 'Contact Merchant Services/Technical Support',
    isApproval: false,
  },
  P1: {
    message: 'SERV NOT ALLOWED',
    definition: 'Contact Merchant Services/Technical Support',
    isApproval: false,
  },
  P2: {
    message: 'SERV NOT ALLOWED',
    definition: 'Contact Merchant Services/Technical Support',
    isApproval: false,
  },
  P3: {
    message: 'SERV NOT ALLOWED',
    definition: 'Contact Merchant Services/Technical Support',
    isApproval: false,
  },
  P4: {
    message: 'SERV NOT ALLOWED',
    definition: 'Contact Merchant Services/Technical Support',
    isApproval: false,
  },
  P5: {
    message: 'SERV NOT ALLOWED',
    definition: 'Contact Merchant Services/Technical Support',
    isApproval: false,
  },
  P6: {
    message: 'SERV NOT ALLOWED',
    definition: 'Contact Merchant Services/Technical Support',
    isApproval: false,
  },
  P7: {
    message: 'MISSING SERIAL NUM',
    definition:
      'The terminal has not yet completed the boarding process. The Serial Number has not been set up.',
    isApproval: false,
  },
  Q1: { message: 'CARD AUTH FAIL', definition: 'Card authentication failed', isApproval: false },
  R0: {
    message: 'STOP RECURRING',
    definition: 'Customer requested stop of all recurring payment',
    isApproval: false,
  },
  R1: {
    message: 'STOP RECURRING',
    definition: 'Customer requested stop of all recurring payments from specific merchant',
    isApproval: false,
  },
  R3: {
    message: 'STOP ALL RECUR',
    definition: 'All recurring payments have been canceled for the card number in the request',
    isApproval: false,
  },
  S0: {
    message: 'INACTIVE CARD',
    definition: 'The PAN used in the transaction is inactive',
    isApproval: false,
  },
  S1: { message: 'MOD 10 FAIL', definition: 'The Mod-10 check failed.', isApproval: false },
  S5: {
    message: 'DCLN NO PRE AUTH',
    definition: 'Decline-no preauthorization found',
    isApproval: false,
  },
  S9: { message: 'MAX BALANCE', definition: 'Maximum working balance exceeded', isApproval: false },
  SA: {
    message: 'SHUT DOWN',
    definition: 'The authorization server is shut down',
    isApproval: false,
  },
  SB: {
    message: 'INVALID STATUS',
    definition: 'Invalid card status-status is other than active',
    isApproval: false,
  },
  SC: {
    message: 'UNKNOWN STORE',
    definition: 'Unknown dealer/store code-special edit',
    isApproval: false,
  },
  SD: {
    message: 'TOO MANY RCHRGS',
    definition: 'Maximum number of recharges is exceeded',
    isApproval: false,
  },
  SE: { message: 'ALREADY USED', definition: 'Card was already used', isApproval: false },
  SF: { message: 'NOT MANUAL', definition: 'Manual transactions not allowed', isApproval: false },
  SH: { message: 'TYPE UNKNOWN', definition: 'Transaction type was unknown', isApproval: false },
  SJ: {
    message: 'INVALID TENDER',
    definition: 'An invalid tender type was submitted',
    isApproval: false,
  },
  SM: {
    message: 'MAX REDEMPTS',
    definition: 'The maximum number of redemptions was exceeded',
    isApproval: false,
  },
  SP: {
    message: 'MAX APN TRIES',
    definition: 'The maximum number of PAN tries was exceeded',
    isApproval: false,
  },
  SR: { message: 'ALREADY ISSUED', definition: 'The card was already issued', isApproval: false },
  SS: { message: 'NOT ISSUED', definition: 'The card was not issued', isApproval: false },
  T0: {
    message: 'APPROVAL',
    definition: 'Frist check is okay and has been converted',
    isApproval: true,
  },
  T1: {
    message: 'CANNOT CONVERT',
    definition: 'The check is okay but cannot be converted. This is a declined transaction',
    isApproval: false,
  },
  T2: {
    message: 'INVALID ABA',
    definition: 'Invalid ABA number, not an ACH participant',
    isApproval: false,
  },
  T3: { message: 'AMOUNT ERROR', definition: 'Amount greater than the limit', isApproval: false },
  V1: { message: 'FAILURE VM', definition: 'Daily threshold exceeded', isApproval: false },
};

function mapDeclineCode(code) {
  const normalizedCode = String(code || '')
    .trim()
    .toUpperCase();
  if (DECLINE_CODES[normalizedCode]) {
    return { code: normalizedCode, ...DECLINE_CODES[normalizedCode] };
  }
  return {
    code: normalizedCode,
    message: 'UNKNOWN ERROR',
    definition: `Unknown response code: ${normalizedCode}`,
    isApproval: false,
  };
}

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
  console.log('📋 Event body:', event.body);

  try {
    const body = JSON.parse(event.body);
    console.log('📊 Parsed body:', JSON.stringify(body, null, 2));
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
      orderId,
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

    // Use Netlify proxy instead of direct API call (free tier network restriction workaround)
    // The redirect rule expects /api/ipos-transact-sandbox/* so we need to add the API path
    const apiBaseUrl =
      config.processor_environment === 'production'
        ? '/api/ipos-transact-prod/api/v2/iposTransact'
        : '/api/ipos-transact-sandbox/api/v2/iposTransact';

    console.log('🔑 Merchant ID:', merchantId);
    console.log('🔑 API Base URL:', apiBaseUrl);
    console.log('🔑 Environment:', config.processor_environment);
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
    console.log('  - Full request body:', JSON.stringify(requestBody, null, 2));

    // Call iPOS Transact API via Netlify proxy
    let response;
    try {
      console.log('🔄 Calling fetch...');

      // Construct full URL from environment or request headers
      const baseUrl = process.env.URL || `https://${event.headers.host}`;
      const fullUrl = `${baseUrl}${apiBaseUrl}`;
      console.log('🔗 Full proxy URL:', fullUrl);

      response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          token: apiAuthToken,
        },
        body: JSON.stringify(requestBody),
      });
      console.log('✅ Fetch completed');
    } catch (fetchError) {
      console.error('❌ Fetch error:', fetchError);
      console.error('❌ Fetch error name:', fetchError.name);
      console.error('❌ Fetch error message:', fetchError.message);
      console.error('❌ Fetch error stack:', fetchError.stack);
      await client.end();

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          approved: false,
          error: 'Failed to process payment',
          details: fetchError.message,
          declineInfo: {
            code: 'ERROR',
            message: 'SYSTEM ERROR',
            definition: fetchError.message,
            isApproval: false,
          },
        }),
      };
    }

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

    // Extract additional transaction details
    const processorTransactionId =
      transactionData.transactionId || transactionData.referenceNumber || null;
    const authCode = transactionData.authCode || transactionData.approvalCode || null;
    const batchNumber = transactionData.batchNumber || null;
    const cardType = transactionData.cardType || null;
    const cardLast4 = transactionData.cardNumberMasked
      ? transactionData.cardNumberMasked.slice(-4)
      : null;

    let paymentMethodId = null;
    let transactionId = null;

    // If approved, save payment method and transaction
    if (isApproved) {
      console.log('💾 Transaction approved - saving to database...');

      // Save payment method if this was a new card with saveCard=true
      if (customerId && saveCard && transactionData.cardToken) {
        console.log('💳 Saving payment method for customer:', customerId);

        try {
          // Generate card fingerprint if we have enough data
          let cardFingerprint = null;
          if (transactionData.cardBin && cardLast4 && transactionData.expiryDate) {
            const crypto = require('crypto');
            const fingerprintData = `${transactionData.cardBin}${cardLast4}${transactionData.expiryDate}`;
            cardFingerprint = crypto.createHash('sha256').update(fingerprintData).digest('hex');
            console.log('🔐 Generated card fingerprint');
          }

          // Parse expiry date (format: MMYY)
          let cardExpMonth = null;
          let cardExpYear = null;
          if (transactionData.expiryDate && transactionData.expiryDate.length === 4) {
            cardExpMonth = transactionData.expiryDate.substring(0, 2);
            cardExpYear = '20' + transactionData.expiryDate.substring(2, 4);
          }

          // Check if this is customer's first card for this winery+processor
          const existingCards = await client.query(
            'SELECT COUNT(*) as count FROM payment_methods WHERE customer_id = $1 AND winery_id = $2 AND processor = $3 AND is_active = TRUE',
            [customerId, wineryId, 'dejavoo']
          );
          const isFirstCard = existingCards.rows[0].count === '0';

          // Insert payment method
          const pmResult = await client.query(
            `INSERT INTO payment_methods (
              customer_id, winery_id, processor,
              processor_payment_method_id, card_last_4, card_type, card_brand,
              card_expiry_month, card_expiry_year, card_fingerprint,
              source_channel, billing_zip, is_default
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (customer_id, winery_id, processor, card_fingerprint) 
            DO UPDATE SET
              last_used_at = NOW(),
              usage_count = payment_methods.usage_count + 1,
              is_active = TRUE,
              updated_at = NOW()
            RETURNING id`,
            [
              customerId,
              wineryId,
              'dejavoo',
              transactionData.cardToken,
              cardLast4,
              cardType,
              cardType,
              cardExpMonth,
              cardExpYear,
              cardFingerprint,
              'card_not_present',
              billingZip || null,
              isFirstCard,
            ]
          );

          paymentMethodId = pmResult.rows[0].id;
          console.log('✅ Payment method saved:', paymentMethodId);
        } catch (pmError) {
          console.error('⚠️ Failed to save payment method (non-fatal):', pmError.message);
          // Continue - transaction was approved even if we couldn't save the card
        }
      }

      // Save transaction record
      try {
        console.log('💾 Saving transaction record...');
        const txResult = await client.query(
          `INSERT INTO transactions (
            order_id, winery_id, customer_id, payment_method_id,
            processor, reference_id, processor_transaction_id,
            transaction_channel, transaction_type, payment_method_type,
            amount, subtotal, tax, tip,
            status, status_code, status_message,
            card_type, card_last_4,
            auth_code, batch_number,
            processor_request, processor_response,
            processed_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
          )
          RETURNING id`,
          [
            orderId || null,
            wineryId,
            customerId || null,
            paymentMethodId,
            'dejavoo',
            transactionReferenceId,
            processorTransactionId,
            'card_not_present',
            'sale',
            'card',
            parseFloat(amount),
            parseFloat(subtotal || amount),
            parseFloat(tax || 0),
            parseFloat(tipAmount || 0),
            'approved',
            responseCode,
            responseMessage,
            cardType,
            cardLast4,
            authCode,
            batchNumber,
            JSON.stringify(requestBody),
            JSON.stringify(transactionData),
            new Date(),
          ]
        );

        transactionId = txResult.rows[0].id;
        console.log('✅ Transaction saved:', transactionId);
      } catch (txError) {
        console.error('⚠️ Failed to save transaction (non-fatal):', txError.message);
        // Continue - transaction was approved even if we couldn't save the record
      }
    } else {
      console.log('❌ Transaction declined - not saving to database');
    }

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
      paymentMethodId: paymentMethodId,
      transactionId: transactionId,
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
