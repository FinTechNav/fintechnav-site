// netlify/functions/get-payment-tokens.js
// Retrieves saved payment tokens for a specific customer

const { Client } = require('pg');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Get customer_id from query parameters
  const customerId = event.queryStringParameters?.customer_id;

  if (!customerId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'customer_id parameter is required' }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Query active payment tokens for this customer
    const result = await client.query(
      `
      SELECT 
        token_id,
        payment_token_id,
        reusable_token,
        card_last_four,
        card_type,
        expiry_month,
        expiry_year,
        is_default,
        last_used_at
      FROM dejavoo_payment_tokens
      WHERE customer_id = $1 
        AND is_active = TRUE
      ORDER BY is_default DESC, last_used_at DESC NULLS LAST
    `,
      [customerId]
    );

    console.log(`✅ Retrieved ${result.rows.length} payment tokens for customer ${customerId}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result.rows),
    };
  } catch (error) {
    console.error('❌ Database error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to retrieve payment tokens',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
