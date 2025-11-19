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

  // For V2 endpoint, use the portal-generated token
  const config = {
    dejavooAuthToken: process.env.DEJAVOO_AUTH_TOKEN || '', // V2 portal token for Freedom to Design
    merchantId: process.env.IPOS_MERCHANT_ID || '',
    apiAuthToken: process.env.DEJAVOO_AUTH_TOKEN || '', // Use SAME V2 portal token for transactions
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
};
