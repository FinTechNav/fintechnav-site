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

  // Build XML request for SPIN API Status check - note the query parameter is "TerminalStatus" not "Status"
  const xmlRequest = `<request><AuthKey>${auth_key}</AuthKey><RegisterId>${register_id}</RegisterId><TPN>${tpn}</TPN></request>`;

  // Build URL with XML as query parameter
  const url = `https://test.spin.spinpos.net/spin/cgi.html?Status=${encodeURIComponent(xmlRequest)}`;

  console.log('📤 Sending GET to SPIN API with XML:', xmlRequest);
  console.log('📤 Full URL:', url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml',
      },
    });

    console.log('📨 SPIN API response status:', response.status);

    const responseText = await response.text();
    console.log('📨 SPIN API raw response:', responseText);

    // Parse XML response
    if (responseText.includes('<response>')) {
      // Extract values from XML
      const messageMatch = responseText.match(/<Message>(.*?)<\/Message>/);
      const resultCodeMatch = responseText.match(/<ResultCode>(.*?)<\/ResultCode>/);
      const respMsgMatch = responseText.match(/<RespMSG>(.*?)<\/RespMSG>/);
      const registerIdMatch = responseText.match(/<RegisterId>(.*?)<\/RegisterId>/);
      const tpnMatch = responseText.match(/<TPN>(.*?)<\/TPN>/);

      const parsedResponse = {
        message: messageMatch ? messageMatch[1] : null,
        resultCode: resultCodeMatch ? resultCodeMatch[1] : null,
        responseMessage: respMsgMatch ? respMsgMatch[1] : null,
        registerId: registerIdMatch ? registerIdMatch[1] : null,
        tpn: tpnMatch ? tpnMatch[1] : null,
      };

      console.log('✅ Parsed XML response:', JSON.stringify(parsedResponse, null, 2));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: parsedResponse.resultCode === '0',
          data: parsedResponse,
          rawXml: responseText,
        }),
      };
    } else {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'SPIN API returned unexpected format',
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
