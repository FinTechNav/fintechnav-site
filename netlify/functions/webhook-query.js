// netlify/functions/webhook-query.js

// This function allows the frontend to query for the most recent webhook
// It complements the webhook-storage system for better visibility

// Global storage for the most recent webhook
let lastWebhook = null;

exports.handler = async (event) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-fsk-wh-chksm, x-fsk-wh-signature',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  // Handle POST request (storing a webhook)
  if (event.httpMethod === 'POST') {
    try {
      // Store the webhook
      const webhookData = JSON.parse(event.body);
      lastWebhook = {
        timestamp: new Date().toISOString(),
        data: webhookData,
        received: Date.now(),
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Webhook stored for query',
          status: 'success',
        }),
      };
    } catch (error) {
      console.error('Error storing webhook:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to store webhook',
          details: error.message,
        }),
      };
    }
  }

  // Handle GET request (retrieving the most recent webhook)
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        hasWebhook: lastWebhook !== null,
        lastWebhook: lastWebhook,
        currentTime: new Date().toISOString(),
      }),
    };
  }

  // Handle unsupported methods
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};
