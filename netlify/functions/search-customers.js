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
  const { query, limit = '20' } = params;

  if (!query || query.trim().length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Search query is required',
      }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();

    // Advanced search with fuzzy matching
    const searchQuery = `
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.first_name || ' ' || c.last_name as name,
        c.email,
        c.phone,
        c.customer_code,
        c.city,
        c.state_code,
        c.country_code,
        c.customer_status,
        c.club_member_status,
        c.lifetime_value_cents,
        cs.country_name,
        cs.default_currency
      FROM customers c
      LEFT JOIN country_settings cs ON c.country_code = cs.country_code
      WHERE c.deleted_at IS NULL
        AND (
          c.first_name ILIKE $1 OR
          c.last_name ILIKE $1 OR
          c.email ILIKE $1 OR
          c.phone ILIKE $1 OR
          c.customer_code ILIKE $1 OR
          (c.first_name || ' ' || c.last_name) ILIKE $1
        )
      ORDER BY 
        CASE 
          WHEN c.email = $2 THEN 1
          WHEN c.customer_code = $2 THEN 2
          WHEN c.phone = $2 THEN 3
          ELSE 4
        END,
        c.last_activity_date DESC NULLS LAST,
        c.created_at DESC
      LIMIT $3
    `;

    const searchTerm = `%${query.trim()}%`;
    const result = await client.query(searchQuery, [searchTerm, query.trim(), parseInt(limit)]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        customers: result.rows,
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
        error: 'Failed to search customers',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
