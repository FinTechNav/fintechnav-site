exports.handler = async (event) => {
  const DEJAVOO_API_KEY = process.env.DEJAVOO_API_KEY;
  const DEJAVOO_SECRET_KEY = process.env.DEJAVOO_SECRET_KEY;

  const endpoints = [
    'https://payment.ipospays.tech/api/v3/auth/token',
    'https://payment.ipospays.tech/api/v3/auth',
    'https://payment.ipospays.tech/api/v3/token',
    'https://payment.ipospays.tech/api/v3/authenticate',
    'https://payment.ipospays.tech/api/v3/generate-token',
    'https://payment.ipospays.tech/api/auth/token',
    'https://payment.ipospays.tech/auth/v3/token',
    'https://payment.ipospays.tech/v3/auth/token',
  ];

  const results = [];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: DEJAVOO_API_KEY,
          secretKey: DEJAVOO_SECRET_KEY,
          scope: 'PaymentTokenization',
        }),
      });

      const text = await response.text();

      results.push({
        endpoint,
        status: response.status,
        statusText: response.statusText,
        body: text.substring(0, 200),
      });
    } catch (error) {
      results.push({
        endpoint,
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
