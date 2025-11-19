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

  try {
    // Get fresh auth token dynamically
    const protocol = event.headers.host.includes('localhost') ? 'http' : 'https';
    const tokenResponse = await fetch(
      `${protocol}://${event.headers.host}/.netlify/functions/get-auth-token`
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return {
        statusCode: tokenResponse.status,
        headers,
        body: JSON.stringify({
          error: 'Failed to get auth token',
          details: errorText,
        }),
      };
    }

    const tokenData = await tokenResponse.json();

    const config = {
      dejavooAuthToken: process.env.DEJAVOO_AUTH_TOKEN || '',
      merchantId: process.env.IPOS_MERCHANT_ID || '',
      apiAuthToken: tokenData.token, // Fresh token generated on every request
      environment: process.env.DEJAVOO_ENVIRONMENT || 'sandbox',
    };

    if (!config.dejavooAuthToken || !config.merchantId || !config.apiAuthToken) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Missing configuration',
          message: 'Required environment variables not set',
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(config),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Configuration fetch failed',
        message: error.message,
      }),
    };
  }
};
