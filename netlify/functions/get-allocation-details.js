const { Client } = require('pg');

exports.handler = async (event) => {
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

  const params = event.queryStringParameters || {};
  const { allocation_id } = params;

  if (!allocation_id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'allocation_id is required',
      }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();

    const releaseQuery = `
      SELECT ar.*
      FROM allocation_releases ar
      WHERE ar.id = $1 AND ar.deleted_at IS NULL
    `;

    const releaseResult = await client.query(releaseQuery, [allocation_id]);

    if (releaseResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Allocation release not found',
        }),
      };
    }

    const productsQuery = `
      SELECT 
        ap.*,
        p.name as product_name,
        p.sku,
        p.price as default_price,
        wp.vintage,
        wp.varietal,
        wp.wine_color,
        wp.wine_region
      FROM allocation_products ap
      JOIN products p ON ap.product_id = p.id
      LEFT JOIN wine_products wp ON p.id = wp.product_id
      WHERE ap.allocation_release_id = $1
      ORDER BY ap.display_order, p.name
    `;

    const productsResult = await client.query(productsQuery, [allocation_id]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        release: releaseResult.rows[0],
        products: productsResult.rows,
      }),
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to retrieve allocation details',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
