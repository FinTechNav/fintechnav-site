// netlify/functions/save-transaction.js
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
  const requiredFields = ['dejavoo_reference_id', 'amount', 'status'];

  for (const field of requiredFields) {
    if (!transactionData[field]) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Missing required field: ${field}` }),
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

    // Insert the transaction
    const result = await client.query(
      `
      INSERT INTO dejavoo_transactions (
        customer_id,
        dejavoo_reference_id,
        amount,
        currency,
        status,
        response_code,
        response_message,
        card_last_four,
        card_type,
        processed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      RETURNING transaction_id, created_at, processed_at
    `,
      [
        transactionData.customer_id ? parseInt(transactionData.customer_id) : null,
        transactionData.dejavoo_reference_id,
        transactionData.amount,
        transactionData.currency || 'USD',
        transactionData.status,
        transactionData.response_code || null,
        transactionData.response_message || null,
        transactionData.card_last_four || null,
        transactionData.card_type || null,
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

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to save transaction',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
