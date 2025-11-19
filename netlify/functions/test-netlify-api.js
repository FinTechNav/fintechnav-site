exports.handler = async (event) => {
  const NETLIFY_AUTH_TOKEN = process.env.NETLIFY_AUTH_TOKEN;
  const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID;

  if (!NETLIFY_AUTH_TOKEN || !NETLIFY_SITE_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Missing credentials',
        hasToken: !!NETLIFY_AUTH_TOKEN,
        hasSiteId: !!NETLIFY_SITE_ID,
      }),
    };
  }

  const tests = [];

  // Test 1: Get site info to verify credentials
  try {
    const siteResponse = await fetch(`https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}`, {
      headers: {
        Authorization: `Bearer ${NETLIFY_AUTH_TOKEN}`,
      },
    });

    const siteData = await siteResponse.json();

    tests.push({
      test: 'Get site info',
      status: siteResponse.status,
      success: siteResponse.ok,
      siteName: siteData.name,
      siteId: siteData.id,
    });
  } catch (error) {
    tests.push({
      test: 'Get site info',
      error: error.message,
    });
  }

  // Test 2: List environment variables (correct API v2 endpoint)
  try {
    const envResponse = await fetch(
      `https://api.netlify.com/api/v1/accounts/${NETLIFY_SITE_ID}/env`,
      {
        headers: {
          Authorization: `Bearer ${NETLIFY_AUTH_TOKEN}`,
        },
      }
    );

    const envData = await envResponse.json();

    tests.push({
      test: 'List env vars (v1/accounts endpoint)',
      status: envResponse.status,
      success: envResponse.ok,
      hasIPOS_API_AUTH_TOKEN: envData?.some?.((v) => v.key === 'IPOS_API_AUTH_TOKEN'),
    });
  } catch (error) {
    tests.push({
      test: 'List env vars (v1/accounts endpoint)',
      error: error.message,
    });
  }

  // Test 3: Try getting the site's account ID first
  try {
    const siteResponse = await fetch(`https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}`, {
      headers: {
        Authorization: `Bearer ${NETLIFY_AUTH_TOKEN}`,
      },
    });

    const siteData = await siteResponse.json();
    const accountSlug = siteData.account_slug;

    tests.push({
      test: 'Get account info from site',
      status: siteResponse.status,
      accountSlug: accountSlug,
      correctEnvEndpoint: `https://api.netlify.com/api/v1/accounts/${accountSlug}/env/IPOS_API_AUTH_TOKEN`,
    });
  } catch (error) {
    tests.push({
      test: 'Get account info from site',
      error: error.message,
    });
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      {
        message: 'Testing Netlify API endpoints',
        siteIdProvided: NETLIFY_SITE_ID,
        tests,
      },
      null,
      2
    ),
  };
};
