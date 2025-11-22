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

  const { register_id, auth_key, tpn } = JSON.parse(event.body);

  if (!register_id || !auth_key || !tpn) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'register_id, auth_key, and tpn are required' }),
    };
  }

  try {
    const response = await fetch('https://spinpos.net:443/spin/api.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Status: {
          RegisterId: register_id,
          AuthKey: auth_key,
          TPN: tpn,
        },
      }),
    });

    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: data,
      }),
    };
  } catch (error) {
    console.error('SPIN API error:', error);
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
