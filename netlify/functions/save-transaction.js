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

  const requiredFields = ['winery_id', 'amount', 'status', 'transaction_type', 'payment_method'];

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

    const result = await client.query(
      `
      INSERT INTO transactions (
        winery_id,
        customer_id,
        amount,
        currency,
        transaction_type,
        payment_method,
        status,
        payment_method_id,
        terminal_id,
        employee_id,
        order_number,
        receipt_number,
        dejavoo_request,
        dejavoo_response,
        notes,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id, created_at, updated_at
    `,
      [
        transactionData.winery_id,
        transactionData.customer_id || null,
        transactionData.amount,
        transactionData.currency || 'USD',
        transactionData.transaction_type,
        transactionData.payment_method,
        transactionData.status,
        transactionData.payment_method_id || null,
        transactionData.terminal_id || null,
        transactionData.employee_id || null,
        transactionData.order_number || null,
        transactionData.receipt_number || null,
        transactionData.dejavoo_request ? JSON.stringify(transactionData.dejavoo_request) : null,
        transactionData.dejavoo_response ? JSON.stringify(transactionData.dejavoo_response) : null,
        transactionData.notes || null,
        transactionData.metadata ? JSON.stringify(transactionData.metadata) : null,
      ]
    );

    console.log('✅ Transaction saved:', result.rows[0]);

    if (transactionData.payment_method_id) {
      await client.query('UPDATE payment_methods SET updated_at = NOW() WHERE id = $1', [
        transactionData.payment_method_id,
      ]);
      console.log('✅ Updated payment method timestamp');
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        transaction_id: result.rows[0].id,
        created_at: result.rows[0].created_at,
        updated_at: result.rows[0].updated_at,
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
