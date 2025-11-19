exports.handler = async (event) => {
  const tests = [
    {
      name: 'Test 1: Exact format from Arun email',
      body: {
        apiKey: 'dakey_ukDjnA8iJfnKN5ueKfsaKfxxEv71WvAu',
        secretKey: 'dskey_CW7jTskWYx507pKwoZ2yJeZqcbcYG9Gv',
        scope: 'PaymentTokenization',
      },
    },
    {
      name: 'Test 2: Try with no Content-Type header',
      body: {
        apiKey: 'dakey_ukDjnA8iJfnKN5ueKfsaKfxxEv71WvAu',
        secretKey: 'dskey_CW7jTskWYx507pKwoZ2yJeZqcbcYG9Gv',
        scope: 'PaymentTokenization',
      },
      noContentType: true,
    },
    {
      name: 'Test 3: Try form-encoded instead of JSON',
      formEncoded: true,
      body: 'apiKey=dakey_ukDjnA8iJfnKN5ueKfsaKfxxEv71WvAu&secretKey=dskey_CW7jTskWYx507pKwoZ2yJeZqcbcYG9Gv&scope=PaymentTokenization',
    },
  ];

  const results = [];

  for (const test of tests) {
    try {
      const headers = test.noContentType
        ? {}
        : test.formEncoded
          ? { 'Content-Type': 'application/x-www-form-urlencoded' }
          : { 'Content-Type': 'application/json' };

      const body = test.formEncoded ? test.body : JSON.stringify(test.body);

      const response = await fetch('https://auth.ipospays.tech/v1/authenticate-token', {
        method: 'POST',
        headers,
        body,
      });

      const text = await response.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch (e) {}

      results.push({
        test: test.name,
        status: response.status,
        statusText: response.statusText,
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
    body: JSON.stringify(
      {
        message: 'Keys were generated yesterday (Nov 18). May need 24-48hrs to activate.',
        currentTime: new Date().toISOString(),
        keyGeneratedTime: 'Nov 18, 2025 ~12:09 AM EST',
        hoursElapsed: '~10 hours',
        results,
      },
      null,
      2
    ),
  };
};
