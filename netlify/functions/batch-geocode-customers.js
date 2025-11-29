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

  const { force_regeocode = false, limit = 20 } = requestBody;

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

    // Get customers that need geocoding
    const whereClause = force_regeocode
      ? 'deleted_at IS NULL'
      : 'deleted_at IS NULL AND (latitude IS NULL OR longitude IS NULL)';

    const customersResult = await client.query(
      `SELECT id, address, address2, city, state_code, province, zip_code, country_code 
       FROM customers 
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    const customers = customersResult.rows;

    if (customers.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'No customers need geocoding',
          processed: 0,
          successful: 0,
          failed: 0,
        }),
      };
    }

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
    };

    // Process each customer with delay to respect API rate limits
    for (const customer of customers) {
      results.processed++;

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
        results.failed++;
        results.errors.push({
          customer_id: customer.id,
          error: 'No address data',
        });
        continue;
      }

      const addressString = addressParts.join(', ');

      try {
        // Call Google Maps Geocoding API
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressString)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();

        if (geocodeData.status === 'OK') {
          const result = geocodeData.results[0];
          const location = result.geometry.location;
          const locationType = result.geometry.location_type;

          // Update customer with geocoded data
          await client.query(
            `UPDATE customers 
             SET latitude = $1,
                 longitude = $2,
                 geocoded_at = CURRENT_TIMESTAMP,
                 geocode_quality = $3,
                 formatted_address = $4,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5`,
            [
              location.lat,
              location.lng,
              locationType.toLowerCase(),
              result.formatted_address,
              customer.id,
            ]
          );

          results.successful++;
        } else {
          results.failed++;
          results.errors.push({
            customer_id: customer.id,
            error: geocodeData.status,
            message: geocodeData.error_message || 'Geocoding failed',
          });
        }

        // Add delay between requests to respect API rate limits (50 requests per second)
        await new Promise((resolve) => setTimeout(resolve, 25));
      } catch (error) {
        results.failed++;
        results.errors.push({
          customer_id: customer.id,
          error: error.message,
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        limit,
        ...results,
      }),
    };
  } catch (error) {
    console.error('Batch geocoding error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to batch geocode customers',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
