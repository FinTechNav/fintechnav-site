exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  let requestData;
  try {
    requestData = JSON.parse(event.body);
    console.log('📥 Received request:', JSON.stringify(requestData, null, 2));
  } catch (error) {
    console.error('❌ Failed to parse request body:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON in request body' }),
    };
  }

  const { register_id, auth_key, tpn } = requestData;

  console.log('🔍 Validating parameters:');
  console.log('  - register_id:', register_id ? `✓ ${register_id}` : '✗ missing');
  console.log('  - auth_key:', auth_key ? `✓ ${auth_key}` : '✗ missing');
  console.log('  - tpn:', tpn ? `✓ ${tpn}` : '✗ missing');

  if (!register_id || !auth_key || !tpn) {
    console.error('❌ Missing required parameters');
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'register_id, auth_key, and tpn are required',
        received: {
          register_id: !!register_id,
          auth_key: !!auth_key,
          tpn: !!tpn,
        },
      }),
    };
  }

  // Build URL with query parameters for GET request
  const url = new URL('https://spinpos.net/spin/cgi.html');
  url.searchParams.append('registerid', register_id);
  url.searchParams.append('authkey', auth_key);
  url.searchParams.append('tpn', tpn);
  url.searchParams.append('type', 'Status');

  console.log('📤 Sending GET to SPIN API:', url.toString());

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    console.log('📨 SPIN API response status:', response.status);
    console.log(
      '📨 SPIN API response headers:',
      JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)
    );

    // Get raw response text first
    const responseText = await response.text();
    console.log('📨 SPIN API raw response (first 500 chars):', responseText.substring(0, 500));

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('✅ SPIN API response data:', JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error('❌ Failed to parse response as JSON');
      console.error('Response was HTML or invalid JSON:', responseText.substring(0, 1000));
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'SPIN API returned invalid response',
          details:
            'API returned HTML instead of JSON. This may indicate wrong endpoint or authentication issue.',
          responsePreview: responseText.substring(0, 500),
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: data,
      }),
    };
  } catch (error) {
    console.error('❌ SPIN API error:', error);
    console.error('Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to check terminal status',
        details: error.message,
        stack: error.stack,
      }),
    };
  }
};
