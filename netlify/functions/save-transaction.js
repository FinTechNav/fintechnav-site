const { Client } = require('pg');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  let transactionData;
  try {
    transactionData = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON in request body' }),
    };
  }

  // Validate required fields
  const requiredFields = ['winery_id', 'reference_id', 'amount', 'status'];

  for (const field of requiredFields) {
    if (!transactionData[field]) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `Missing required field: ${field}`,
          received: transactionData,
        }),
      };
    }
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Determine status from response code
    let status = 'error';
    if (transactionData.response_code === '200' || transactionData.response_code === 200) {
      status = 'approved';
    } else if (transactionData.response_message?.toLowerCase().includes('declined')) {
      status = 'declined';
    }

    // Insert the transaction into new transactions table
    const result = await client.query(
      `INSERT INTO transactions (
        winery_id,
        customer_id,
        order_id,
        processor,
        reference_id,
        processor_transaction_id,
        transaction_channel,
        transaction_type,
        payment_method_type,
        amount,
        status,
        status_code,
        status_message,
        card_type,
        card_last_4,
        auth_code,
        batch_number,
        processor_request,
        processor_response,
        processed_at,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW()
      )
      RETURNING id, created_at, processed_at
      `,
      [
        transactionData.winery_id,
        transactionData.customer_id || null,
        transactionData.order_id || null,
        'dejavoo',
        transactionData.reference_id,
        transactionData.transaction_id || null,
        'card_not_present',
        'sale',
        'card',
        parseFloat(transactionData.amount),
        status,
        transactionData.response_code?.toString() || null,
        transactionData.response_message || null,
        transactionData.card_type || null,
        transactionData.card_last_4 || null,
        transactionData.approval_code || null,
        transactionData.batch_number || null,
        transactionData.request_data ? JSON.stringify(transactionData.request_data) : null,
        transactionData.response_data ? JSON.stringify(transactionData.response_data) : null,
      ]
    );

    console.log('✅ Transaction saved:', result.rows[0]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        transaction: result.rows[0],
      }),
    };
  } catch (error) {
    console.error('❌ Database error:', error);
    console.error('Error detail:', error.detail);
    console.error('Error code:', error.code);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to save transaction',
        details: error.message,
        code: error.code,
      }),
    };
  } finally {
    await client.end();
  }
};
