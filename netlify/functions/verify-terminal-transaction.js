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

  console.log('🔵 verify-terminal-transaction.js invoked');

  try {
    const body = JSON.parse(event.body);
    const { reference_id } = body;
    console.log('📊 Reference ID:', reference_id);

    if (!reference_id) {
      console.error('❌ No reference_id provided');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'reference_id is required' }),
      };
    }

    console.log('🔌 Connecting to database...');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: false,
    });

    await client.connect();
    console.log('✅ Database connected');

    // Get transaction details from database
    console.log('🔍 Querying for transaction details...');
    const result = await client.query(
      'SELECT spin_request FROM terminal_transaction_status WHERE reference_id = $1',
      [reference_id]
    );

    console.log('📊 Query result rows:', result.rows.length);

    if (result.rows.length === 0) {
      await client.end();
      console.log('❌ Transaction not found in database');
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Transaction not found' }),
      };
    }

    const spinRequest = result.rows[0].spin_request;
    console.log('📋 SPIN request TPN:', spinRequest.Tpn);
    console.log('📋 SPIN request RegisterId:', spinRequest.RegisterId);
    console.log('📋 Original PaymentType:', spinRequest.PaymentType);

    // Build SPIN Status API request matching official format
    const statusRequest = {
      TransactionNumber: null,
      PaymentType: spinRequest.PaymentType || 'Credit',
      ReferenceId: reference_id,
      PrintReceipt: 'No',
      GetReceipt: 'No',
      MerchantNumber: null,
      CaptureSignature: false,
      GetExtendedData: true,
      IsReadyForIS: false,
      CallbackInfo: {
        Url: '',
      },
      Tpn: spinRequest.Tpn,
      RegisterId: spinRequest.RegisterId,
      Authkey: spinRequest.Authkey,
      SPInProxyTimeout: null,
      CustomFields: {},
    };

    console.log('🔍 Checking SPIN Status API for:', reference_id);
    console.log('📤 Status request:', JSON.stringify(statusRequest, null, 2));

    // Call SPIN Status API
    const response = await fetch('https://test.spinpos.net/v2/Payment/Status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(statusRequest),
    });

    console.log('📨 SPIN Status API response status:', response.status);
    const responseText = await response.text();
    console.log('📨 SPIN Status API raw response:', responseText);

    let statusData;

    try {
      statusData = JSON.parse(responseText);
      console.log('✅ Parsed SPIN Status response:', JSON.stringify(statusData, null, 2));
    } catch (parseError) {
      console.error('❌ Failed to parse SPIN Status response:', parseError);
      await client.end();
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Invalid response from SPIN Status API',
          responsePreview: responseText.substring(0, 500),
        }),
      };
    }

    // Determine final status based on SPIN response
    let finalStatus = 'error';
    const resultCode = statusData.GeneralResponse?.ResultCode || statusData.ResultCode;
    const statusCode = statusData.GeneralResponse?.StatusCode || statusData.StatusCode;
    const message = statusData.GeneralResponse?.Message || statusData.Message || '';

    console.log('🔍 Determining status from:', { resultCode, statusCode, message });

    if (resultCode === '0' || resultCode === 0) {
      if (statusCode === '0000' || message.toLowerCase().includes('approved')) {
        finalStatus = 'approved';
      } else if (message.toLowerCase().includes('declined')) {
        finalStatus = 'declined';
      }
    } else if (message.toLowerCase().includes('timeout')) {
      finalStatus = 'timeout';
    } else if (message.toLowerCase().includes('processing')) {
      finalStatus = 'processing';
    }

    console.log('📊 Final status determined:', finalStatus);

    // Update database with status check result
    console.log('📝 Updating database with status:', finalStatus);
    const updateResult = await client.query(
      `UPDATE terminal_transaction_status 
       SET status = $1, 
           spin_response = $2, 
           status_checked_at = NOW()
       WHERE reference_id = $3
       RETURNING id`,
      [finalStatus, JSON.stringify(statusData), reference_id]
    );

    if (updateResult.rows.length > 0) {
      console.log('✅ Database updated, ID:', updateResult.rows[0].id);
    } else {
      console.error('❌ No rows updated');
    }

    await client.end();
    console.log('🔌 Database connection closed');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        status: finalStatus,
        data: statusData,
      }),
    };
  } catch (error) {
    console.error('❌ Error verifying terminal transaction:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to verify terminal transaction',
        details: error.message,
      }),
    };
  }
};
