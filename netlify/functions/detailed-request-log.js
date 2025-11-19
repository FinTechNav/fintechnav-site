exports.handler = async (event) => {
  const DEJAVOO_API_KEY = process.env.DEJAVOO_API_KEY;
  const DEJAVOO_SECRET_KEY = process.env.DEJAVOO_SECRET_KEY;

  const endpoint = 'https://auth.ipospays.tech/v1/authenticate-token';

  const requestBody = {
    apiKey: DEJAVOO_API_KEY,
    secretKey: DEJAVOO_SECRET_KEY,
    scope: 'PaymentTokenization',
  };

  const requestBodyString = JSON.stringify(requestBody);

  const headers = {
    'Content-Type': 'application/json',
  };

  // Log EVERYTHING about the request
  const requestLog = {
    endpoint: endpoint,
    method: 'POST',
    headers: headers,
    bodyObject: requestBody,
    bodyString: requestBodyString,
    bodyLength: requestBodyString.length,
    bodyBytes: Buffer.from(requestBodyString).toString('hex'),

    // Character-by-character breakdown
    characterBreakdown: {
      apiKey: {
        value: DEJAVOO_API_KEY,
        length: DEJAVOO_API_KEY?.length,
        firstChar: DEJAVOO_API_KEY?.charCodeAt(0),
        lastChar: DEJAVOO_API_KEY?.charCodeAt(DEJAVOO_API_KEY.length - 1),
        hasWhitespace: /\s/.test(DEJAVOO_API_KEY),
        hex: Buffer.from(DEJAVOO_API_KEY || '').toString('hex'),
      },
      secretKey: {
        value: DEJAVOO_SECRET_KEY,
        length: DEJAVOO_SECRET_KEY?.length,
        firstChar: DEJAVOO_SECRET_KEY?.charCodeAt(0),
        lastChar: DEJAVOO_SECRET_KEY?.charCodeAt(DEJAVOO_SECRET_KEY.length - 1),
        hasWhitespace: /\s/.test(DEJAVOO_SECRET_KEY),
        hex: Buffer.from(DEJAVOO_SECRET_KEY || '').toString('hex'),
      },
      scope: {
        value: 'PaymentTokenization',
        length: 'PaymentTokenization'.length,
        hex: Buffer.from('PaymentTokenization').toString('hex'),
      },
    },
  };

  // Now make the actual request
  let response;
  let responseLog;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: requestBodyString,
    });

    const responseText = await response.text();
    let responseJson = null;
    try {
      responseJson = JSON.parse(responseText);
    } catch (e) {}

    responseLog = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      bodyText: responseText,
      bodyJson: responseJson,
      bodyLength: responseText.length,
      bodyBytes: Buffer.from(responseText).toString('hex'),
    };
  } catch (error) {
    responseLog = {
      error: error.message,
      stack: error.stack,
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        request: requestLog,
        response: responseLog,
      },
      null,
      2
    ),
  };
};
