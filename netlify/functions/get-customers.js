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

  if (!wineryId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'winery_id parameter is required' }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const query = `
      SELECT 
        c.id,
        c.name,
        c.email,
        c.phone,
        c.created_at
      FROM customers c
      INNER JOIN customer_wineries cw ON c.id = cw.customer_id
      WHERE cw.winery_id = $1
        AND c.deleted_at IS NULL
        AND cw.deleted_at IS NULL
      ORDER BY c.name ASC
    `;

    const result = await client.query(query, [wineryId]);

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
