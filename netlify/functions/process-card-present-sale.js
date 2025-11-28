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
