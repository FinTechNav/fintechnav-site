const { Client } = require('pg');

exports.handler = async (event) => {
  console.log('=== get-customer-activities called ===');

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
  const { customer_id, type, limit = '50' } = params;

  console.log('Parameters:', { customer_id, type, limit });

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
    console.log('Database connected');

    // Build query based on filter
    let query = `
      SELECT 
        a.id,
        a.activity_type,
        a.activity_title,
        a.activity_description,
        a.activity_metadata,
        a.created_at,
        e.first_name as employee_first_name,
        e.last_name as employee_last_name
      FROM customer_activities a
      LEFT JOIN employees e ON a.employee_id = e.id
      WHERE a.customer_id = $1
    `;

    const queryParams = [customer_id];

    // Add type filter if provided
    if (type && type !== 'all') {
      query += ' AND a.activity_type = $2';
      queryParams.push(type);
      query += ' ORDER BY a.created_at DESC LIMIT $3';
      queryParams.push(parseInt(limit));
    } else {
      query += ' ORDER BY a.created_at DESC LIMIT $2';
      queryParams.push(parseInt(limit));
    }

    console.log('Executing query with params:', queryParams);

    const result = await client.query(query, queryParams);

    console.log('Activities found:', result.rows.length);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        count: result.rows.length,
        activities: result.rows,
      }),
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to retrieve activities',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
