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

    const wineryResult = await client.query('SELECT name FROM wineries WHERE id = $1', [wineryId]);
    const wineryName = wineryResult.rows[0]?.name;

    const result = await client.query(
      `
      SELECT 
        p.id,
        p.name,
        p.vintage,
        p.varietal,
        p.price,
        p.sku,
        p.description,
        p.category
      FROM products p
      INNER JOIN winery_products wp ON p.id = wp.product_id
      WHERE wp.winery_id = $1
        AND wp.is_active = true
        AND p.deleted_at IS NULL
        AND p.name LIKE $2
      ORDER BY p.name ASC, p.vintage DESC
    `,
      [wineryId, wineryName + '%']
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        products: result.rows,
      }),
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to retrieve POS products',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
