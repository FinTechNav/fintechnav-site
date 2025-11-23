const { Client } = require('pg');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const productId = event.queryStringParameters?.product_id;

  if (!productId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'product_id parameter is required' }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();

    // Soft delete by setting deleted_at timestamp
    const result = await client.query(
      `
      UPDATE products 
      SET deleted_at = CURRENT_TIMESTAMP,
          online_status = 'discontinued',
          inventory_status = 'discontinued'
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id, name
      `,
      [productId]
    );

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Product not found or already deleted',
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Product ${result.rows[0].name} deleted successfully`,
        product_id: result.rows[0].id,
      }),
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to delete product',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
