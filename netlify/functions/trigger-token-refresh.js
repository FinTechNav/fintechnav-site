// Manual trigger for token refresh (useful for testing)
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' }),
    };
  }

  console.log('🔄 Manual token refresh triggered');

  // Import and execute the scheduled function
  const scheduledRefresh = require('./scheduled-token-refresh');
  const result = await scheduledRefresh.handler(event, context);

  return result;
};
