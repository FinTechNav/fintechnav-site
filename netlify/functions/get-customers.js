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

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();

    // Parse query parameters
    const params = event.queryStringParameters || {};
    const {
      country_code,
      customer_status,
      club_member_status,
      allocation_list_status,
      search,
      limit = '100',
      offset = '0',
    } = params;

    // Build dynamic WHERE clause
    const conditions = ['deleted_at IS NULL'];
    const values = [];
    let paramIndex = 1;

    if (country_code) {
      conditions.push(`country_code = $${paramIndex}`);
      values.push(country_code);
      paramIndex++;
    }

    if (customer_status) {
      conditions.push(`customer_status = $${paramIndex}`);
      values.push(customer_status);
      paramIndex++;
    }

    if (club_member_status) {
      conditions.push(`club_member_status = $${paramIndex}`);
      values.push(club_member_status);
      paramIndex++;
    }

    if (allocation_list_status) {
      conditions.push(`allocation_list_status = $${paramIndex}`);
      values.push(allocation_list_status);
      paramIndex++;
    }

    if (search) {
      conditions.push(
        `(
          first_name ILIKE $${paramIndex} OR 
          last_name ILIKE $${paramIndex} OR 
          email ILIKE $${paramIndex} OR 
          phone ILIKE $${paramIndex} OR
          customer_code ILIKE $${paramIndex}
        )`
      );
      values.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM customers WHERE ${whereClause}`;
    const countResult = await client.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get customers with country settings
    const query = `
      SELECT 
        c.*,
        cs.country_name,
        cs.default_currency,
        cs.state_label,
        cs.vat_enabled
      FROM customers c
      LEFT JOIN country_settings cs ON c.country_code = cs.country_code
      WHERE ${whereClause}
      ORDER BY c.last_activity_date DESC NULLS LAST, c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(parseInt(limit), parseInt(offset));

    const result = await client.query(query, values);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        customers: result.rows,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      }),
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to retrieve customers',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
