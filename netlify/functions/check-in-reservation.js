const { Client } = require('pg');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    const body = JSON.parse(event.body);
    const { reservation_id, check_in_time } = body;

    if (!reservation_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'reservation_id is required',
        }),
      };
    }

    await client.connect();

    const arrivalTime = check_in_time || new Date().toISOString();

    // Update reservation status
    const result = await client.query(
      `
      UPDATE reservations
      SET 
        status = 'checked_in',
        checked_in_at = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, status, checked_in_at
    `,
      [reservation_id, arrivalTime]
    );

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Reservation not found',
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        reservation: result.rows[0],
      }),
    };
  } catch (error) {
    console.error('Error checking in reservation:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to check in reservation',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
