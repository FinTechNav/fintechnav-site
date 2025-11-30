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
  const { allocation_id, customer_id } = params;

  if (!allocation_id || !customer_id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'allocation_id and customer_id are required',
      }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();

    const query = `
      SELECT 
        acl.*,
        p.name as product_name,
        p.sku,
        wp.vintage,
        wp.varietal,
        ap.max_quantity as allocation_max_quantity,
        ap.available_quantity as allocation_available_quantity
      FROM allocation_customer_limits acl
      JOIN products p ON acl.product_id = p.id
      LEFT JOIN wine_products wp ON p.id = wp.product_id
      JOIN allocation_products ap ON acl.allocation_release_id = ap.allocation_release_id 
        AND acl.product_id = ap.product_id
      WHERE acl.allocation_release_id = $1 AND acl.customer_id = $2
      ORDER BY p.name
    `;

    const result = await client.query(query, [allocation_id, customer_id]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        limits: result.rows,
      }),
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to retrieve customer limits',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
