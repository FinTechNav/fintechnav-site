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
        order_number,
        order_date,
        customer_name,
        is_guest,
        order_source,
        subtotal,
        tax,
        total,
        status
      FROM orders
      WHERE winery_id = $1
      ORDER BY order_date DESC
      LIMIT 100
      `,
      [wineryId]
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        orders: result.rows,
      }),
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to retrieve orders',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
