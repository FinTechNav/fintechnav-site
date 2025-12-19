const { Client } = require('pg');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
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

    const result = await client.query(
      `
      SELECT 
        id,
        email,
        first_name,
        last_name,
        role,
        status,
        auto_logout_enabled,
        auto_logout_minutes
      FROM employees
      WHERE winery_id = $1
        AND deleted_at IS NULL
        AND status = 'active'
      ORDER BY first_name ASC, last_name ASC
    `,
      [wineryId]
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        users: result.rows,
      }),
    };
  } catch (error) {
    console.error('❌ Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to retrieve users',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
