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
        terminal_type,
        tpn,
        register_id,
        auth_key,
        ftd_auth_token,
        ftd_merchant_id,
        api_environment,
        name,
        location,
        status
      FROM terminals
      WHERE winery_id = $1
        AND deleted_at IS NULL
        AND status = 'active'
      ORDER BY terminal_type DESC
      `,
      [wineryId]
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        terminals: result.rows,
      }),
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to retrieve terminals',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
