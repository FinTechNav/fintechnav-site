exports.handler = async (event, context) => {
  console.log(`🔄 Starting scheduled token refresh at ${new Date().toISOString()}`);

  const DEJAVOO_API_KEY = process.env.DEJAVOO_API_KEY;
  const DEJAVOO_SECRET_KEY = process.env.DEJAVOO_SECRET_KEY;
  const DEJAVOO_ENVIRONMENT = process.env.DEJAVOO_ENVIRONMENT || 'sandbox';

  if (!DEJAVOO_API_KEY || !DEJAVOO_SECRET_KEY) {
    console.error('❌ Missing Dejavoo API credentials');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing DEJAVOO_API_KEY or DEJAVOO_SECRET_KEY' }),
    };
  }

  const AUTH_ENDPOINT =
    DEJAVOO_ENVIRONMENT === 'sandbox'
      ? 'https://auth.ipospays.tech/v1/authenticate-token'
      : 'https://auth.ipospays.com/v1/authenticate-token';

  console.log(`📌 Environment: ${DEJAVOO_ENVIRONMENT}`);
  console.log(`📌 Auth Endpoint: ${AUTH_ENDPOINT}`);

  try {
    console.log('📡 Requesting new token from Dejavoo...');

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
      console.error(`❌ Dejavoo token generation failed: ${tokenResponse.status}`);
      console.error(`Error details: ${errorText}`);

      return {
        statusCode: tokenResponse.status,
        body: JSON.stringify({
          error: 'Dejavoo token generation failed',
          status: tokenResponse.status,
          details: errorText,
        }),
      };
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.responseCode !== '00') {
      console.error('❌ Dejavoo returned error:', tokenData);
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Dejavoo API error',
          errorCode: tokenData.errorCode,
          errorMessage: tokenData.errorMessage,
        }),
      };
    }

    const newToken = tokenData.token;

    if (!newToken) {
      console.error('❌ No token found in Dejavoo response:', tokenData);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'No token in Dejavoo response',
          response: tokenData,
        }),
      };
    }

    console.log('✅ New auth token generated from Dejavoo');
    console.log(`📌 Token preview: ${newToken.substring(0, 30)}...`);
    console.log(`📌 Created: ${new Date(parseInt(tokenData.createdDt)).toISOString()}`);
    console.log('🎉 Token refresh completed successfully');

    // Note: On Netlify free tier, we can't store this in env vars
    // The token will be generated on-demand by get-auth-token function

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Token refreshed successfully',
        timestamp: new Date().toISOString(),
        environment: DEJAVOO_ENVIRONMENT,
        expiresIn: '24 hours',
        tokenCreated: new Date(parseInt(tokenData.createdDt)).toISOString(),
        tokenPreview: newToken.substring(0, 30) + '...',
        note: 'On Netlify free tier - tokens generated on-demand via get-auth-token endpoint',
      }),
    };
  } catch (error) {
    console.error('❌ Unexpected error during token refresh:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Token refresh failed',
        message: error.message,
        stack: error.stack,
      }),
    };
  }
};
