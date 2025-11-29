exports.handler = async function (event, context) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
    body: JSON.stringify({
      apiKey: process.env.GOOGLE_MAPS_API_KEY,
    }),
  };
};
