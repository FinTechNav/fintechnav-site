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
  const { customer_id, allocation_id } = params;

  if (!customer_id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'customer_id is required',
      }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();

    let query = `
      SELECT 
        ar.*,
        ae.custom_max_quantity,
        COUNT(DISTINCT ap.product_id) as product_count,
        COALESCE(SUM(acl.quantity_purchased), 0) as total_purchased
      FROM allocation_releases ar
      LEFT JOIN allocation_eligibility ae ON ar.id = ae.allocation_release_id 
        AND (ae.customer_id = $1 OR ae.customer_tag IN (
          SELECT UNNEST(c.tags) FROM customers c WHERE c.id = $1
        ))
        AND ae.status = 'active'
      LEFT JOIN allocation_products ap ON ar.id = ap.allocation_release_id
      LEFT JOIN allocation_customer_limits acl ON ar.id = acl.allocation_release_id 
        AND acl.customer_id = $1
      WHERE ar.deleted_at IS NULL
        AND ae.id IS NOT NULL
    `;

    const queryParams = [customer_id];

    if (allocation_id) {
      query += ' AND ar.id = $2';
      queryParams.push(allocation_id);
    }

    query += ' GROUP BY ar.id, ae.custom_max_quantity ORDER BY ar.start_date DESC';

    const result = await client.query(query, queryParams);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        allocations: result.rows,
        count: result.rows.length,
      }),
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to retrieve customer allocations',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
