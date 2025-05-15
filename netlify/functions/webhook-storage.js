// netlify/functions/webhook-storage.js

// This function acts as a webhook storage mechanism
// It receives webhooks from webhook-handler.js and stores them
// It also provides an endpoint for the frontend to retrieve stored webhooks

// In a real implementation, this would use a database
// For simplicity, we're using a global variable in the function context
// Note: This is NOT persistent across function invocations in production
// It works for demo purposes, but in production use a real database

// We'll simulate storage with a global-ish variable
let webhookStorage = [];
const MAX_STORED_WEBHOOKS = 50;

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
    // Get or store webhooks based on the HTTP method
    if (event.httpMethod === 'GET') {
      // Return the stored webhooks
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          webhooks: webhookStorage,
        }),
      };
    } else if (event.httpMethod === 'POST') {
      // Store a new webhook
      try {
        const webhook = JSON.parse(event.body);

        // Create a record with timestamp
        const webhookRecord = {
          id: `wh_${Date.now()}`,
          timestamp: new Date().toISOString(),
          data: webhook,
        };

        // Add to the beginning of the array
        webhookStorage.unshift(webhookRecord);

        // Limit the number of stored webhooks
        if (webhookStorage.length > MAX_STORED_WEBHOOKS) {
          webhookStorage = webhookStorage.slice(0, MAX_STORED_WEBHOOKS);
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'Webhook stored successfully',
            storedWebhook: webhookRecord,
          }),
        };
      } catch (error) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid webhook data',
            details: error.message,
          }),
        };
      }
    } else {
      // Handle unsupported methods
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({
          error: 'Method not allowed',
        }),
      };
    }
  } catch (error) {
    console.error('Error in webhook-storage function:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process webhook storage operation',
        details: error.message,
      }),
    };
  }
};
