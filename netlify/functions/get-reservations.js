const { Client } = require('pg');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const { winery_id, date } = event.queryStringParameters || {};

  if (!winery_id || !date) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'winery_id and date are required',
      }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();

    const result = await client.query(
      `
      SELECT 
        r.id,
        r.customer_id,
        c.name as customer_name,
        c.email as customer_email,
        r.service_id,
        r.service_name,
        r.venue_id,
        r.datetime,
        r.party_size,
        r.visit_status,
        r.check_in_status,
        r.confirmation_code,
        r.customer_notes,
        r.special_requests
      FROM reservations r
      JOIN customers c ON r.customer_id = c.id
      WHERE r.winery_id = $1
        AND DATE(r.datetime) = $2
        AND r.deleted_at IS NULL
        AND r.visit_status NOT IN ('cancelled')
      ORDER BY r.datetime
    `,
      [winery_id, date]
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        reservations: result.rows,
      }),
    };
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to fetch reservations',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
