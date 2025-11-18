// netlify/functions/get-dejavoo-config.js
// Returns Dejavoo configuration from environment variables

exports.handler = async (event) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle OPTIONS requests (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: '',
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Get configuration from environment variables
    const config = {
      dejavooAuthToken: process.env.DEJAVOO_AUTH_TOKEN || '',
      merchantId: process.env.IPOS_MERCHANT_ID || '',
      apiAuthToken: process.env.IPOS_API_AUTH_TOKEN || '',
      environment: process.env.DEJAVOO_ENVIRONMENT || 'sandbox', // 'sandbox' or 'production'
    };

    // Validate that required credentials are present
    if (!config.dejavooAuthToken || !config.merchantId || !config.apiAuthToken) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Missing configuration',
          message:
            'Required environment variables not set. Please configure DEJAVOO_AUTH_TOKEN, IPOS_MERCHANT_ID, and IPOS_API_AUTH_TOKEN in Netlify.',
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(config),
    };
  } catch (error) {
    console.error('Error in get-dejavoo-config function:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to retrieve configuration',
        details: error.message,
      }),
    };
  }
};
