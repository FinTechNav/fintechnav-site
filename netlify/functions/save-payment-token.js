const { Client } = require('pg');
const crypto = require('crypto');

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
    'winery_id',
    'processor_payment_method_id',
    'card_last_4',
    'source_channel',
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

    // Get winery's processor
    const processorResult = await client.query(
      'SELECT processor FROM winery_payment_config WHERE winery_id = $1 AND is_active = TRUE',
      [tokenData.winery_id]
    );

    if (processorResult.rows.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No processor configured for this winery' }),
      };
    }

    const processor = processorResult.rows[0].processor;

    // Generate card fingerprint if not provided
    let cardFingerprint = tokenData.card_fingerprint;
    if (
      !cardFingerprint &&
      tokenData.card_bin &&
      tokenData.card_last_4 &&
      tokenData.card_expiry_month &&
      tokenData.card_expiry_year
    ) {
      const fingerprintData = `${tokenData.card_bin}${tokenData.card_last_4}${tokenData.card_expiry_month}${tokenData.card_expiry_year}`;
      cardFingerprint = crypto.createHash('sha256').update(fingerprintData).digest('hex');
    }

    // Check if this is customer's first card for this winery+processor
    const existingCards = await client.query(
      'SELECT COUNT(*) as count FROM payment_methods WHERE customer_id = $1 AND winery_id = $2 AND processor = $3 AND is_active = TRUE',
      [tokenData.customer_id, tokenData.winery_id, processor]
    );

    const isFirstCard = existingCards.rows[0].count === '0';

    // Insert or update payment method
    const result = await client.query(
      `
      INSERT INTO payment_methods (
        customer_id,
        winery_id,
        processor,
        processor_payment_method_id,
        processor_customer_id,
        card_last_4,
        card_type,
        card_brand,
        card_expiry_month,
        card_expiry_year,
        card_fingerprint,
        source_channel,
        source_transaction_id,
        is_default,
        billing_zip
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (customer_id, winery_id, processor, card_fingerprint) 
      DO UPDATE SET
        last_used_at = NOW(),
        usage_count = payment_methods.usage_count + 1,
        is_active = TRUE,
        updated_at = NOW()
      RETURNING id, created_at
    `,
      [
        tokenData.customer_id,
        tokenData.winery_id,
        processor,
        tokenData.processor_payment_method_id,
        tokenData.processor_customer_id || null,
        tokenData.card_last_4,
        tokenData.card_type || null,
        tokenData.card_brand || tokenData.card_type || null,
        tokenData.card_expiry_month || null,
        tokenData.card_expiry_year || null,
        cardFingerprint,
        tokenData.source_channel,
        tokenData.source_transaction_id || null,
        isFirstCard,
        tokenData.billing_zip || null,
      ]
    );

    console.log('✅ Payment method saved:', result.rows[0]);

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
        error: 'Failed to save payment method',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
