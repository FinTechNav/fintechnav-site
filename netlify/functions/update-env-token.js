// This function can be called by the scheduled function to automatically
// update the IPOS_API_AUTH_TOKEN environment variable

exports.handler = async (event, context) => {
  const NETLIFY_AUTH_TOKEN = process.env.NETLIFY_AUTH_TOKEN;
  const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID;

  if (!NETLIFY_AUTH_TOKEN || !NETLIFY_SITE_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Missing Netlify credentials',
        message: 'NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID must be set',
      }),
    };
  }

  // Parse the new token from the request
  const { token } = JSON.parse(event.body || '{}');

  if (!token) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Token required in request body' }),
    };
  }

  try {
    // Update the environment variable via Netlify API
    const response = await fetch(
      `https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/env/IPOS_API_AUTH_TOKEN`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${NETLIFY_AUTH_TOKEN}`,
        },
        body: JSON.stringify({
          context: 'all',
          value: token,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Netlify API error: ${response.statusText}`);
    }

    console.log('✅ Environment variable updated successfully');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'IPOS_API_AUTH_TOKEN updated successfully',
      }),
    };
  } catch (error) {
    console.error('❌ Error updating environment variable:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to update environment variable',
        message: error.message,
      }),
    };
  }
};
