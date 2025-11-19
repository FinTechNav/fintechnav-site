exports.handler = async (event) => {
  const DEJAVOO_API_KEY = process.env.DEJAVOO_API_KEY;
  const DEJAVOO_SECRET_KEY = process.env.DEJAVOO_SECRET_KEY;
  const DEJAVOO_ENVIRONMENT = process.env.DEJAVOO_ENVIRONMENT || 'sandbox';

  const AUTH_ENDPOINT =
    DEJAVOO_ENVIRONMENT === 'sandbox'
      ? 'https://payment.ipospays.tech/api/v3/auth/token'
      : 'https://payment.ipospays.com/api/v3/auth/token';

  // Test 1: Check credentials exist
  const diagnosis = {
    step1_credentials: {
      hasApiKey: !!DEJAVOO_API_KEY,
      hasSecretKey: !!DEJAVOO_SECRET_KEY,
      apiKeyPreview: DEJAVOO_API_KEY?.substring(0, 15) + '...',
      secretKeyPreview: DEJAVOO_SECRET_KEY?.substring(0, 15) + '...',
      environment: DEJAVOO_ENVIRONMENT,
      endpoint: AUTH_ENDPOINT,
    },
  };

  if (!DEJAVOO_API_KEY || !DEJAVOO_SECRET_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Missing credentials',
        diagnosis,
      }),
    };
  }

  // Test 2: Try the API call and capture full response
  try {
    const response = await fetch(AUTH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: DEJAVOO_API_KEY,
        secretKey: DEJAVOO_SECRET_KEY,
        scope: 'PaymentTokenization',
      }),
    });

    const responseText = await response.text();
    let responseJson;
    try {
      responseJson = JSON.parse(responseText);
    } catch (e) {
      responseJson = null;
    }

    diagnosis.step2_api_response = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      bodyText: responseText,
      bodyJson: responseJson,
      url: AUTH_ENDPOINT,
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(diagnosis, null, 2),
    };
  } catch (error) {
    diagnosis.step2_api_response = {
      error: error.message,
      stack: error.stack,
    };

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(diagnosis, null, 2),
    };
  }
};
