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

    // Get winery_id from query parameter
    const params = event.queryStringParameters || {};
    const { winery_id } = params;

    if (!winery_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'winery_id parameter is required',
        }),
      };
    }

    // Get specific winery with geocode information
    const query = `
      SELECT *
      FROM wineries
      WHERE id = $1
        AND latitude IS NOT NULL 
        AND longitude IS NOT NULL
      LIMIT 1
    `;

    const result = await client.query(query, [winery_id]);

    console.log('✅ [GET-WINERY-INFO] Query executed successfully');
    console.log('✅ [GET-WINERY-INFO] Row count:', result.rowCount);
    console.log('✅ [GET-WINERY-INFO] Result rows:', JSON.stringify(result.rows, null, 2));
    console.log(
      '✅ [GET-WINERY-INFO] First row keys:',
      result.rows[0] ? Object.keys(result.rows[0]) : 'No rows'
    );

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'No winery found',
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        winery: result.rows[0],
      }),
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to retrieve winery information',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
