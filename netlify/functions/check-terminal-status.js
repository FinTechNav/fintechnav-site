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

  // Build URL with query parameters
  const url = new URL('https://test.spinpos.net/v2/Common/TerminalStatus');
  url.searchParams.append('request.tpn', tpn);
  url.searchParams.append('request.registerId', register_id);
  url.searchParams.append('request.authkey', auth_key);

  console.log('📤 Sending GET to SPIN Terminal Status API:', url.toString());

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    console.log('📨 SPIN API response status:', response.status);

    const responseText = await response.text();
    console.log('📨 SPIN API raw response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('✅ SPIN API response data:', JSON.stringify(data, null, 2));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: data,
        }),
      };
    } catch (parseError) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'SPIN API returned invalid response',
          responsePreview: responseText.substring(0, 500),
        }),
      };
    }
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
