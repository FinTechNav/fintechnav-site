const { Client } = require('pg');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const { winery_id, query } = event.queryStringParameters || {};

  if (!winery_id || !query) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'winery_id and query are required',
      }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();

    // Search customers by name or email
    const result = await client.query(
      `
      SELECT 
        id,
        name,
        email,
        phone
      FROM customers
      WHERE (
        LOWER(name) LIKE LOWER($1)
        OR LOWER(email) LIKE LOWER($1)
        OR phone LIKE $1
      )
      AND deleted_at IS NULL
      ORDER BY name
      LIMIT 10
    `,
      [`%${query}%`]
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        customers: result.rows,
      }),
    };
  } catch (error) {
    console.error('Error searching customers:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to search customers',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
