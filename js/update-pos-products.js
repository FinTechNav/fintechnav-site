const { Client } = require('pg');

exports.handler = async (event, context) => {
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

  const { winery_id, product_ids } = JSON.parse(event.body);

  if (!winery_id || !product_ids) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'winery_id and product_ids are required' }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();
    await client.query('BEGIN');

    // Deactivate all products for this winery
    await client.query('UPDATE winery_products SET is_active = false WHERE winery_id = $1', [
      winery_id,
    ]);

    // Activate selected products
    for (const productId of product_ids) {
      await client.query(
        `
        INSERT INTO winery_products (winery_id, product_id, price, is_active)
        SELECT $1, p.id, p.price, true
        FROM products p
        WHERE p.id = $2
        ON CONFLICT (winery_id, product_id) 
        DO UPDATE SET is_active = true
        `,
        [winery_id, productId]
      );
    }

    await client.query('COMMIT');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'POS products updated successfully',
      }),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to update POS products',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
