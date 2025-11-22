// netlify/functions/get-customers.js
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

  const wineryId = event.queryStringParameters?.winery_id;

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    let query;
    let params = [];

    if (wineryId) {
      query = `
        SELECT 
          c.id,
          c.email,
          c.name,
          c.phone,
          c.version,
          c.created_at,
          c.updated_at,
          cw.loyalty_points,
          cw.discount_tier,
          cw.preferred_payment_method_id
        FROM customers c
        INNER JOIN customer_wineries cw ON c.id = cw.customer_id
        WHERE cw.winery_id = $1
          AND c.deleted_at IS NULL
          AND cw.deleted_at IS NULL
        ORDER BY c.name ASC
      `;
      params = [wineryId];
    } else {
      query = `
        SELECT 
          id,
          email,
          name,
          phone,
          version,
          created_at,
          updated_at
        FROM customers
        WHERE deleted_at IS NULL
        ORDER BY name ASC
      `;
    }

    const result = await client.query(query, params);

    console.log(`✅ Retrieved ${result.rows.length} customers`);

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
        error: 'Failed to retrieve customers',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
