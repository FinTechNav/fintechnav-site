const { Client } = require('pg');
const crypto = require('crypto');

function generateConfirmationCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    const body = JSON.parse(event.body);
    const { winery_id, customer_id, service_id, datetime, party_size, notes } = body;

    if (!winery_id || !customer_id || !service_id || !datetime || !party_size) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields',
        }),
      };
    }

    await client.connect();

    // Get service offering details for pricing
    const serviceResult = await client.query(
      `
      SELECT price_cents, pricing_type
      FROM service_offerings
      WHERE id = $1
    `,
      [service_id]
    );

    if (serviceResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Service offering not found',
        }),
      };
    }

    const service = serviceResult.rows[0];
    const confirmationCode = generateConfirmationCode();

    // Calculate subtotal based on pricing type
    let subtotalCents;
    if (service.pricing_type === 'per_person') {
      subtotalCents = service.price_cents * party_size;
    } else {
      subtotalCents = service.price_cents;
    }

    // Insert reservation
    const result = await client.query(
      `
      INSERT INTO reservations (
        winery_id,
        customer_id,
        service_id,
        datetime,
        party_size,
        visit_status,
        check_in_status,
        confirmation_code,
        notes,
        subtotal_cents,
        total_price_cents,
        balance_due_cents,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING id, confirmation_code
    `,
      [
        winery_id,
        customer_id,
        service_id,
        datetime,
        party_size,
        'expected',
        'none',
        confirmationCode,
        notes || null,
        subtotalCents,
        subtotalCents,
        subtotalCents,
      ]
    );

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        reservation: result.rows[0],
      }),
    };
  } catch (error) {
    console.error('Error creating reservation:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to create reservation',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
