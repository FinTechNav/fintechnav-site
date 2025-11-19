exports.handler = async (event) => {
  const DEJAVOO_API_KEY = process.env.DEJAVOO_API_KEY;
  const DEJAVOO_SECRET_KEY = process.env.DEJAVOO_SECRET_KEY;

  const tests = [
    {
      name: 'V1 authenticate-token - Original format',
      url: 'https://auth.ipospays.tech/v1/authenticate-token',
      body: {
        apiKey: DEJAVOO_API_KEY,
        secretKey: DEJAVOO_SECRET_KEY,
        scope: 'PaymentTokenization',
      },
    },
    {
      name: 'V1 authenticate-token - Without scope',
      url: 'https://auth.ipospays.tech/v1/authenticate-token',
      body: {
        apiKey: DEJAVOO_API_KEY,
        secretKey: DEJAVOO_SECRET_KEY,
      },
    },
    {
      name: 'V1 authenticate-token - Different field names',
      url: 'https://auth.ipospays.tech/v1/authenticate-token',
      body: {
        api_key: DEJAVOO_API_KEY,
        secret_key: DEJAVOO_SECRET_KEY,
      },
    },
    {
      name: 'V3 auth/token with header auth',
      url: 'https://payment.ipospays.tech/api/v3/auth/token',
      headers: {
        'api-key': DEJAVOO_API_KEY,
        'secret-key': DEJAVOO_SECRET_KEY,
      },
      body: { scope: 'PaymentTokenization' },
    },
  ];

  const results = [];

  for (const test of tests) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(test.headers || {}),
      };

      const response = await fetch(test.url, {
        method: 'POST',
        headers,
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
