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
  const { winery_id, status, active_only } = params;

  if (!winery_id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'winery_id is required',
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
        COUNT(DISTINCT ap.product_id) as product_count,
        COUNT(DISTINCT ae.customer_id) as eligible_customer_count,
        COALESCE(SUM(ap.purchased_quantity), 0) as total_purchased,
        COALESCE(SUM(ap.wished_quantity), 0) as total_wished,
        COALESCE(SUM(ap.available_quantity), 0) as total_available
      FROM allocation_releases ar
      LEFT JOIN allocation_products ap ON ar.id = ap.allocation_release_id
      LEFT JOIN allocation_eligibility ae ON ar.id = ae.allocation_release_id AND ae.status = 'active'
      WHERE ar.winery_id = $1
        AND ar.deleted_at IS NULL
    `;

    const queryParams = [winery_id];
    let paramIndex = 2;

    if (status) {
      query += ` AND ar.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (active_only === 'true') {
      query += " AND ar.status = 'active' AND ar.start_date <= NOW() AND ar.end_date >= NOW()";
    }

    query += ' GROUP BY ar.id ORDER BY ar.start_date DESC';

    const result = await client.query(query, queryParams);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        releases: result.rows,
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
        error: 'Failed to retrieve allocation releases',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
