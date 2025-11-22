// netlify/functions/save-payment-token.js
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

  const requiredFields = [
    'customer_id',
    'payment_token',
    'card_fingerprint',
    'card_last_four',
    'card_brand',
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
    ssl: false,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const existingCards = await client.query(
      'SELECT COUNT(*) as count FROM payment_methods WHERE customer_id = $1 AND is_active = TRUE',
      [tokenData.customer_id]
    );

    const isFirstCard = existingCards.rows[0].count === '0';

    const result = await client.query(
      `
      INSERT INTO payment_methods (
        customer_id,
        payment_type,
        provider,
        payment_token,
        reusable_token,
        card_fingerprint,
        card_last_four,
        card_brand,
        card_exp_month,
        card_exp_year,
        cardholder_name,
        billing_address,
        is_default,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, created_at
    `,
      [
        tokenData.customer_id,
        tokenData.payment_type || 'card',
        tokenData.provider || 'dejavoo',
        tokenData.payment_token,
        tokenData.reusable_token || null,
        tokenData.card_fingerprint,
        tokenData.card_last_four,
        tokenData.card_brand,
        tokenData.card_exp_month || null,
        tokenData.card_exp_year || null,
        tokenData.cardholder_name || null,
        tokenData.billing_address ? JSON.stringify(tokenData.billing_address) : null,
        isFirstCard,
        true,
      ]
    );

    console.log('✅ Payment token saved:', result.rows[0]);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        payment_method_id: result.rows[0].id,
        created_at: result.rows[0].created_at,
      }),
    };
  } catch (error) {
    console.error('❌ Database error:', error);

    if (error.code === '23505') {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: 'This payment method already exists for this customer',
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
