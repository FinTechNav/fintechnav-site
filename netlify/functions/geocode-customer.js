const { Client } = require('pg');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON in request body' }),
    };
  }

  const { customer_id } = requestBody;

  if (!customer_id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'customer_id is required' }),
    };
  }

  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Google Maps API key not configured',
        details: 'GOOGLE_MAPS_API_KEY environment variable is missing',
      }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();

    // Get customer address
    const customerResult = await client.query(
      `SELECT id, address, address2, city, state_code, province, zip_code, country_code 
       FROM customers 
       WHERE id = $1 AND deleted_at IS NULL`,
      [customer_id]
    );

    if (customerResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Customer not found' }),
      };
    }

    const customer = customerResult.rows[0];

    // Build address string
    const addressParts = [
      customer.address,
      customer.address2,
      customer.city,
      customer.state_code || customer.province,
      customer.zip_code,
      customer.country_code,
    ].filter(Boolean);

    if (addressParts.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Customer has no address data to geocode',
        }),
      };
    }

    const addressString = addressParts.join(', ');

    // Call Google Maps Geocoding API
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressString)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();

    if (geocodeData.status !== 'OK') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Geocoding failed',
          status: geocodeData.status,
          message: geocodeData.error_message || 'Unable to geocode address',
        }),
      };
    }

    const result = geocodeData.results[0];
    const location = result.geometry.location;
    const locationType = result.geometry.location_type;

    // Update customer with geocoded data
    const updateResult = await client.query(
      `UPDATE customers 
       SET latitude = $1,
           longitude = $2,
           geocoded_at = CURRENT_TIMESTAMP,
           geocode_quality = $3,
           formatted_address = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, latitude, longitude, geocode_quality, formatted_address, geocoded_at`,
      [
        location.lat,
        location.lng,
        locationType.toLowerCase(),
        result.formatted_address,
        customer_id,
      ]
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        customer: updateResult.rows[0],
        input_address: addressString,
      }),
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to geocode customer address',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
