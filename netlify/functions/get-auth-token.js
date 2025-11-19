// This function generates and returns a fresh Dejavoo auth token on every call
// Used by get-dejavoo-config to provide always-fresh tokens to the payment integration

exports.handler = async (event) => {
  const DEJAVOO_API_KEY = process.env.DEJAVOO_API_KEY;
  const DEJAVOO_SECRET_KEY = process.env.DEJAVOO_SECRET_KEY;
  const DEJAVOO_ENVIRONMENT = process.env.DEJAVOO_ENVIRONMENT || 'sandbox';

  if (!DEJAVOO_API_KEY || !DEJAVOO_SECRET_KEY) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Missing API credentials',
        message: 'DEJAVOO_API_KEY and DEJAVOO_SECRET_KEY must be set',
      }),
    };
  }

  const AUTH_ENDPOINT =
    DEJAVOO_ENVIRONMENT === 'sandbox'
      ? 'https://auth.ipospays.tech/v1/authenticate-token'
      : 'https://auth.ipospays.com/v1/authenticate-token';

  try {
    const tokenResponse = await fetch(AUTH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apiKey: DEJAVOO_API_KEY,
        secretKey: DEJAVOO_SECRET_KEY,
        scope: 'PaymentTokenization',
      },
      body: JSON.stringify({}),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return {
        statusCode: tokenResponse.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Failed to generate token',
          details: errorText,
        }),
      };
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.responseCode !== '00') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Dejavoo API error',
          errorCode: tokenData.errorCode,
          errorMessage: tokenData.errorMessage,
        }),
      };
    }

    const newToken = tokenData.token;

    if (!newToken) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'No token in response',
          response: tokenData,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: newToken,
        createdAt: new Date(parseInt(tokenData.createdDt)).toISOString(),
        expiresIn: '24 hours',
        environment: DEJAVOO_ENVIRONMENT,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Token generation failed',
        message: error.message,
      }),
    };
  }
};
