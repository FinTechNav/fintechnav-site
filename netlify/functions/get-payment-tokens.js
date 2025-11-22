// netlify/functions/get-payment-tokens.js
const { Client } = require('pg');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

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
    ssl: false,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const result = await client.query(
      `
      SELECT 
        id,
        payment_type,
        provider,
        reusable_token,
        card_fingerprint,
        card_last_four,
        card_brand,
        card_exp_month,
        card_exp_year,
        cardholder_name,
        is_default,
        created_at,
        updated_at
      FROM payment_methods
      WHERE customer_id = $1 
        AND is_active = TRUE
        AND deleted_at IS NULL
      ORDER BY is_default DESC, updated_at DESC
    `,
      [customerId]
    );

    console.log(`✅ Retrieved ${result.rows.length} payment methods for customer ${customerId}`);

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
        error: 'Failed to retrieve payment methods',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
