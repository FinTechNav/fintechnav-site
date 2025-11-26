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

  const { winery_id } = event.queryStringParameters || {};

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

    const result = await client.query(
      `
      SELECT 
        id,
        winery_id,
        name,
        description,
        default_duration_minutes,
        base_price_cents,
        pricing_per_person,
        min_party_size,
        max_party_size,
        is_active,
        online_booking_enabled
      FROM service_offerings
      WHERE winery_id = $1 
        AND is_active = true
      ORDER BY name
    `,
      [winery_id]
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        offerings: result.rows,
      }),
    };
  } catch (error) {
    console.error('Error fetching service offerings:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to fetch service offerings',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
