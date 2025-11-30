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
  const { allocation_release_id, products } = data;

  if (!allocation_release_id || !products || !Array.isArray(products)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'allocation_release_id and products array are required',
      }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();
    await client.query('BEGIN');

    const deleteQuery = `
      DELETE FROM allocation_products 
      WHERE allocation_release_id = $1
    `;
    await client.query(deleteQuery, [allocation_release_id]);

    const insertedProducts = [];

    for (const product of products) {
      const insertQuery = `
        INSERT INTO allocation_products (
          allocation_release_id, product_id, min_quantity, max_quantity,
          allocated_quantity, available_quantity, price_cents, original_price_cents,
          display_order, featured
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        allocation_release_id,
        product.product_id,
        product.min_quantity || 0,
        product.max_quantity,
        product.allocated_quantity,
        product.available_quantity || product.allocated_quantity,
        product.price_cents || null,
        product.original_price_cents || null,
        product.display_order || 0,
        product.featured || false,
      ]);

      insertedProducts.push(result.rows[0]);
    }

    await client.query('COMMIT');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        products: insertedProducts,
        count: insertedProducts.length,
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
        error: 'Failed to save allocation products',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
