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
      `SELECT 
        processor,
        processor_config,
        processor_environment,
        features_enabled,
        is_active
       FROM winery_payment_config
       WHERE winery_id = $1 AND is_active = TRUE`,
      [wineryId]
    );

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'No payment processor configured for this winery',
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        config: result.rows[0],
      }),
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to retrieve processor configuration',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
