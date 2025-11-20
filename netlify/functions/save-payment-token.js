// netlify/functions/save-payment-token.js
// Saves a new payment token for a customer

const { Client } = require('pg');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  let tokenData;
  try {
    tokenData = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON in request body' }),
    };
  }

  // Validate required fields
  const requiredFields = [
    'customer_id',
    'payment_token_id',
    'reusable_token',
    'card_last_four',
    'card_type',
    'expiry_month',
    'expiry_year',
  ];

  for (const field of requiredFields) {
    if (!tokenData[field]) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Missing required field: ${field}` }),
      };
    }
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

    // Check if this is the customer's first card
    const existingCards = await client.query(
      'SELECT COUNT(*) as count FROM dejavoo_payment_tokens WHERE customer_id = $1 AND is_active = TRUE',
      [tokenData.customer_id]
    );

    const isFirstCard = existingCards.rows[0].count === '0';

    // Insert the new payment token
    const result = await client.query(
      `
      INSERT INTO dejavoo_payment_tokens (
        customer_id,
        payment_token_id,
        reusable_token,
        card_last_four,
        card_type,
        expiry_month,
        expiry_year,
        is_default,
        is_active,
        last_used_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      RETURNING token_id, created_at
    `,
      [
        tokenData.customer_id,
        tokenData.payment_token_id,
        tokenData.reusable_token,
        tokenData.card_last_four,
        tokenData.card_type,
        tokenData.expiry_month,
        tokenData.expiry_year,
        isFirstCard, // First card is automatically default
        true, // is_active
      ]
    );

    console.log('✅ Payment token saved:', result.rows[0]);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        token_id: result.rows[0].token_id,
        created_at: result.rows[0].created_at,
      }),
    };
  } catch (error) {
    console.error('❌ Database error:', error);

    // Check for duplicate token error
    if (error.code === '23505') {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: 'This payment token already exists',
          details: error.detail,
        }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to save payment token',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
