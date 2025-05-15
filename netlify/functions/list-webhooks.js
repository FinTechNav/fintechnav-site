// netlify/functions/list-webhooks.js

// This function will help us retrieve stored webhooks from a shared location

exports.handler = async (event) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Handle OPTIONS requests (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: '',
    };
  }

  try {
    // In a production system, we'd fetch webhooks from a database
    // Since we don't have a database, we'll use a shared JSON file
    // This is simulated here - in a real system you'd use DynamoDB, Fauna, etc.

    // For now, let's return success but with a message about the implementation
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'For a complete solution, we need to implement shared webhook storage',
        note: 'This function would normally retrieve webhooks from a database or shared storage',
        recommendedSolution: 'Setup a lightweight database like FaunaDB to store webhooks',
        alternativeSolution:
          'Use Netlify environment variables with encrypted JSON to store the last 10 webhooks',
        temporarySolution: 'Use browser localStorage and refresh the page to see new webhooks',
      }),
    };
  } catch (error) {
    console.error('Error in list-webhooks function:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to retrieve webhooks',
        details: error.message,
      }),
    };
  }
};
