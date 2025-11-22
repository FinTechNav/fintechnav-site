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

  const spinRequest = {
    Status: {
      RegisterId: register_id,
      AuthKey: auth_key,
      TPN: tpn,
    },
  };

  console.log('📤 Sending to SPIN API:', JSON.stringify(spinRequest, null, 2));

  try {
    const response = await fetch('https://spinpos.net:443/spin/api.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(spinRequest),
    });

    console.log('📨 SPIN API response status:', response.status);
    console.log(
      '📨 SPIN API response headers:',
      JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)
    );

    const data = await response.json();
    console.log('✅ SPIN API response data:', JSON.stringify(data, null, 2));

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
