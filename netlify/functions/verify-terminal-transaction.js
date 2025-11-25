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

  try {
    const body = JSON.parse(event.body);
    const { reference_id } = body;

    if (!reference_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'reference_id is required' }),
      };
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: false,
    });

    await client.connect();

    // Get transaction details from database
    const result = await client.query(
      'SELECT spin_request FROM terminal_transaction_status WHERE reference_id = $1',
      [reference_id]
    );

    if (result.rows.length === 0) {
      await client.end();
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Transaction not found' }),
      };
    }

    const spinRequest = result.rows[0].spin_request;

    // Build SPIN Status API request
    const statusRequest = {
      TransType: 'Status',
      RefId: reference_id,
      Tpn: spinRequest.Tpn,
      RegisterId: spinRequest.RegisterId,
      Authkey: spinRequest.Authkey,
    };

    console.log('🔍 Checking SPIN Status API for:', reference_id);

    // Call SPIN Status API
    const response = await fetch('https://test.spinpos.net/v2/Payment/Status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(statusRequest),
    });

    const responseText = await response.text();
    let statusData;

    try {
      statusData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse SPIN Status response:', parseError);
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

    // Update database with status check result
    await client.query(
      `UPDATE terminal_transaction_status 
       SET status = $1, 
           spin_response = $2, 
           status_checked_at = NOW()
       WHERE reference_id = $3`,
      [finalStatus, JSON.stringify(statusData), reference_id]
    );

    await client.end();

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
    console.error('Error verifying terminal transaction:', error);
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
