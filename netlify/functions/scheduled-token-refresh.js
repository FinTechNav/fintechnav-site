exports.handler = async (event, context) => {
  console.log(`🔄 Starting scheduled token refresh at ${new Date().toISOString()}`);

  const DEJAVOO_API_KEY = process.env.DEJAVOO_API_KEY;
  const DEJAVOO_SECRET_KEY = process.env.DEJAVOO_SECRET_KEY;
  const DEJAVOO_ENVIRONMENT = process.env.DEJAVOO_ENVIRONMENT || 'sandbox';
  const NETLIFY_AUTH_TOKEN = process.env.NETLIFY_AUTH_TOKEN;
  const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID;

  // Validate all required variables
  if (!DEJAVOO_API_KEY || !DEJAVOO_SECRET_KEY) {
    console.error('❌ Missing Dejavoo API credentials');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing DEJAVOO_API_KEY or DEJAVOO_SECRET_KEY' }),
    };
  }

  if (!NETLIFY_AUTH_TOKEN || !NETLIFY_SITE_ID) {
    console.error('❌ Missing Netlify credentials');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing NETLIFY_AUTH_TOKEN or NETLIFY_SITE_ID' }),
    };
  }

  const AUTH_ENDPOINT =
    DEJAVOO_ENVIRONMENT === 'sandbox'
      ? 'https://auth.ipospays.tech/v1/authenticate-token'
      : 'https://auth.ipospays.com/v1/authenticate-token';

  console.log(`📌 Environment: ${DEJAVOO_ENVIRONMENT}`);
  console.log(`📌 Auth Endpoint: ${AUTH_ENDPOINT}`);

  try {
    // STEP 1: Generate new auth token from Dejavoo
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
      console.error(
        `❌ Dejavoo token generation failed: ${tokenResponse.status} ${tokenResponse.statusText}`
      );
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

    // STEP 2: Get account slug from site info
    console.log('📡 Getting Netlify account slug...');

    const siteResponse = await fetch(`https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}`, {
      headers: {
        Authorization: `Bearer ${NETLIFY_AUTH_TOKEN}`,
      },
    });

    if (!siteResponse.ok) {
      const errorText = await siteResponse.text();
      console.error(`❌ Failed to get site info: ${siteResponse.status}`);
      console.error(`Error details: ${errorText}`);

      return {
        statusCode: siteResponse.status,
        body: JSON.stringify({
          error: 'Failed to get Netlify site info',
          status: siteResponse.status,
          details: errorText,
          newToken: newToken,
          message:
            'Token generated but could not update automatically. Manually update IPOS_API_AUTH_TOKEN',
        }),
      };
    }

    const siteData = await siteResponse.json();
    const accountSlug = siteData.account_slug;

    console.log(`✅ Account slug: ${accountSlug}`);

    // STEP 3: Update Netlify environment variable with new token
    console.log('📡 Updating IPOS_API_AUTH_TOKEN in Netlify...');

    const netlifyResponse = await fetch(
      `https://api.netlify.com/api/v1/accounts/${accountSlug}/env/IPOS_API_AUTH_TOKEN`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${NETLIFY_AUTH_TOKEN}`,
        },
        body: JSON.stringify({
          context: 'all',
          value: newToken,
        }),
      }
    );

    if (!netlifyResponse.ok) {
      const errorText = await netlifyResponse.text();
      console.error(
        `❌ Netlify API update failed: ${netlifyResponse.status} ${netlifyResponse.statusText}`
      );
      console.error(`Error details: ${errorText}`);

      return {
        statusCode: netlifyResponse.status,
        body: JSON.stringify({
          error: 'Netlify update failed but token was generated',
          status: netlifyResponse.status,
          details: errorText,
          newToken: newToken,
          message: 'Manually update IPOS_API_AUTH_TOKEN with the newToken value',
        }),
      };
    }

    console.log('✅ IPOS_API_AUTH_TOKEN updated successfully in Netlify');
    console.log('🎉 Token refresh completed successfully');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Token refreshed and updated successfully',
        timestamp: new Date().toISOString(),
        environment: DEJAVOO_ENVIRONMENT,
        expiresIn: '24 hours',
        tokenCreated: new Date(parseInt(tokenData.createdDt)).toISOString(),
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
