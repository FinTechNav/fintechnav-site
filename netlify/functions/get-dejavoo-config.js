const { Client } = require('pg');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const wineryId = event.queryStringParameters?.winery_id;

  if (!wineryId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'winery_id parameter is required' }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();

    // Get winery payment processor configuration
    const result = await client.query(
      `SELECT processor, processor_config, processor_environment
       FROM winery_payment_config
       WHERE winery_id = $1 AND is_active = TRUE`,
      [wineryId]
    );

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'No payment processor configured for this winery',
        }),
      };
    }

    const config = result.rows[0];
    const processorConfig = config.processor_config;

    // Return configuration for Freedom to Design (card-not-present)
    const response = {
      dejavooAuthToken: processorConfig.ftd_security_key || processorConfig.api_auth_token || '',
      merchantId: processorConfig.merchant_id || '',
      apiAuthToken: processorConfig.api_auth_token || processorConfig.ftd_security_key || '',
      environment: config.processor_environment || 'sandbox',
    };

    if (!response.dejavooAuthToken || !response.merchantId || !response.apiAuthToken) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Incomplete payment processor configuration',
          message: 'Required credentials missing in database',
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to retrieve payment configuration',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
