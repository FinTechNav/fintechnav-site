const { Client } = require('pg');

exports.handler = async (event) => {
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

  const data = JSON.parse(event.body);
  const { wish_id, wish_status, quantity_granted, admin_notes, denied_reason } = data;

  if (!wish_id || !wish_status) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'wish_id and wish_status are required',
      }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();

    const updateQuery = `
      UPDATE allocation_wishes SET
        wish_status = $1,
        quantity_granted = $2,
        admin_notes = $3,
        denied_reason = $4,
        fulfilled_at = CASE WHEN $1 = 'fulfilled' THEN NOW() ELSE fulfilled_at END,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `;

    const result = await client.query(updateQuery, [
      wish_status,
      quantity_granted || 0,
      admin_notes || null,
      denied_reason || null,
      wish_id,
    ]);

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Wish not found',
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        wish: result.rows[0],
      }),
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to update wish status',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
