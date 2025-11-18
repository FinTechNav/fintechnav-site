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

  const config = {
    dejavooAuthToken: process.env.DEJAVOO_AUTH_TOKEN || '',
    merchantId: process.env.IPOS_MERCHANT_ID || '',
    apiAuthToken: process.env.IPOS_API_AUTH_TOKEN || '', // This gets auto-updated daily
    environment: process.env.DEJAVOO_ENVIRONMENT || 'sandbox',
  };

  // Validate required credentials
  if (!config.dejavooAuthToken || !config.merchantId || !config.apiAuthToken) {
    console.error('❌ Missing configuration:', {
      hasDejavooAuthToken: !!config.dejavooAuthToken,
      hasMerchantId: !!config.merchantId,
      hasApiAuthToken: !!config.apiAuthToken,
    });

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Missing configuration',
        message: 'Required environment variables not set in Netlify',
      }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(config),
  };
};
