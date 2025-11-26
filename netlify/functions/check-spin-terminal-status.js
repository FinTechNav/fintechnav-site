const fetch = require('node-fetch');

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

  console.log('🔵 check-spin-terminal-status.js invoked');

  try {
    const body = JSON.parse(event.body);
    const { register_id, auth_key, tpn } = body;

    console.log('📊 Request parameters:');
    console.log('  - tpn:', tpn ? `✓ ${tpn}` : '✗ missing');
    console.log('  - register_id:', register_id ? `✓ ${register_id}` : '✗ missing');
    console.log('  - auth_key:', auth_key ? '✓ present' : '✗ missing');

    if (!tpn || !register_id || !auth_key) {
      console.error('❌ Missing required parameters');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required parameters',
          required: ['tpn', 'register_id', 'auth_key'],
        }),
      };
    }

    // Build SPIN TerminalStatus API URL with query parameters
    const url = new URL('https://test.spinpos.net/v2/Common/TerminalStatus');
    url.searchParams.append('request.tpn', tpn);
    url.searchParams.append('request.registerId', register_id);
    url.searchParams.append('request.authkey', auth_key);

    console.log('📤 Calling SPIN TerminalStatus API');
    console.log('  - URL:', url.toString().replace(auth_key, '***'));
    console.log('  - Method: GET');

    // Call SPIN TerminalStatus API
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    console.log('📨 SPIN API response status:', response.status);

    const responseText = await response.text();
    console.log('📨 SPIN API raw response:', responseText);

    if (!response.ok) {
      console.error('❌ SPIN API error:', response.status, responseText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'SPIN API request failed',
          status: response.status,
          details: responseText,
        }),
      };
    }

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('✅ Parsed SPIN response:', JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error('❌ Failed to parse SPIN response:', parseError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid response from SPIN API',
          responsePreview: responseText.substring(0, 500),
        }),
      };
    }

    // Expected response format: { "TerminalStatus": "Online", "Tpn": "220925652296" }
    console.log('✅ Terminal status:', data.TerminalStatus);
    console.log('✅ TPN:', data.Tpn);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: data,
      }),
    };
  } catch (error) {
    console.error('❌ Error checking SPIN terminal status:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to check terminal status',
        details: error.message,
      }),
    };
  }
};
