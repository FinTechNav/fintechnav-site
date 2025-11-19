exports.handler = async (event) => {
  const DEJAVOO_API_KEY = process.env.DEJAVOO_API_KEY;
  const DEJAVOO_SECRET_KEY = process.env.DEJAVOO_SECRET_KEY;

  const tests = [
    {
      name: 'Exact format from docs',
      body: {
        apiKey: DEJAVOO_API_KEY,
        secretKey: DEJAVOO_SECRET_KEY,
        scope: 'PaymentTokenization',
      },
    },
    {
      name: 'Empty scope string',
      body: {
        apiKey: DEJAVOO_API_KEY,
        secretKey: DEJAVOO_SECRET_KEY,
        scope: '',
      },
    },
    {
      name: 'Lowercase scope',
      body: {
        apiKey: DEJAVOO_API_KEY,
        secretKey: DEJAVOO_SECRET_KEY,
        scope: 'paymentTokenization',
      },
    },
    {
      name: 'All lowercase fields',
      body: {
        apikey: DEJAVOO_API_KEY,
        secretkey: DEJAVOO_SECRET_KEY,
        scope: 'PaymentTokenization',
      },
    },
    {
      name: 'Check if keys have line breaks or spaces',
      debug: {
        apiKeyLength: DEJAVOO_API_KEY?.length,
        secretKeyLength: DEJAVOO_SECRET_KEY?.length,
        apiKeyTrimmed: DEJAVOO_API_KEY?.trim() === DEJAVOO_API_KEY,
        secretKeyTrimmed: DEJAVOO_SECRET_KEY?.trim() === DEJAVOO_SECRET_KEY,
        apiKeyPreview: DEJAVOO_API_KEY?.substring(0, 30),
        secretKeyPreview: DEJAVOO_SECRET_KEY?.substring(0, 30),
      },
    },
  ];

  const results = [];

  for (const test of tests) {
    if (test.debug) {
      results.push({
        test: test.name,
        debug: test.debug,
      });
      continue;
    }

    try {
      const response = await fetch('https://auth.ipospays.tech/v1/authenticate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(test.body),
      });

      const text = await response.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch (e) {}

      results.push({
        test: test.name,
        status: response.status,
        responseText: text,
        responseJson: json,
        requestBody: test.body,
      });
    } catch (error) {
      results.push({
        test: test.name,
        error: error.message,
      });
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(results, null, 2),
  };
};
