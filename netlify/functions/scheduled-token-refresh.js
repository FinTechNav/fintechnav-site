const schedule = require('node-schedule');

exports.handler = async (event, context) => {
  // This function runs on a schedule defined in netlify.toml
  // Scheduled for 6:00 AM EST daily (11:00 AM UTC or 10:00 AM UTC depending on DST)

  const DEJAVOO_API_KEY = process.env.DEJAVOO_API_KEY;
  const DEJAVOO_SECRET_KEY = process.env.DEJAVOO_SECRET_KEY;
  const DEJAVOO_ENVIRONMENT = process.env.DEJAVOO_ENVIRONMENT || 'sandbox';

  // Determine the correct authentication endpoint based on environment
  const AUTH_ENDPOINT =
    DEJAVOO_ENVIRONMENT === 'sandbox'
      ? 'https://payment.ipospays.tech/api/v3/auth/token'
      : 'https://payment.ipospays.com/api/v3/auth/token';

  console.log(`🔄 Starting scheduled token refresh at ${new Date().toISOString()}`);
  console.log(`📌 Environment: ${DEJAVOO_ENVIRONMENT}`);

  try {
    // Generate new auth token
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Token generation failed: ${response.status} ${response.statusText}`);
      console.error(`Error details: ${errorText}`);

      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: 'Token generation failed',
          details: errorText,
        }),
      };
    }

    const data = await response.json();
    const newToken = data.token || data.authToken || data.access_token;

    if (!newToken) {
      console.error('❌ No token found in response:', data);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'No token in response',
          response: data,
        }),
      };
    }

    console.log('✅ New auth token generated successfully');
    console.log(`📌 Token preview: ${newToken.substring(0, 20)}...`);

    // Store the new token in Netlify environment variable
    // Note: This requires the Netlify API and a personal access token
    // For now, we'll return the token so you can manually update it
    // or use Netlify's API to update it programmatically

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Token generated successfully',
        token: newToken,
        generatedAt: new Date().toISOString(),
        expiresIn: data.expiresIn || data.expires_in || '24 hours',
        note: 'Update IPOS_API_AUTH_TOKEN environment variable with this token',
      }),
    };
  } catch (error) {
    console.error('❌ Error during token refresh:', error);
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
