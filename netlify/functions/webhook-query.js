// netlify/functions/webhook-query.js

// This function allows the frontend to query for recent webhooks
// It also helps with deduplication of incoming webhooks

// Storage for recent webhooks - changed to array to match UI expectations
let storedWebhooks = [];
const recentHashes = [];
const hashTimestamps = {};
const MAX_RECENT_HASHES = 100;
const MAX_STORED_WEBHOOKS = 50;

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

  // Extract webhook hash from query for deduplication checks
  const webhookHash = event.queryStringParameters?.hash;

  // Handle POST request (storing a webhook)
  if (event.httpMethod === 'POST') {
    try {
      // Store the webhook
      const webhookData = JSON.parse(event.body);
      console.log(`[webhook-query] Storing webhook with eventType: ${webhookData.eventType}`);

      // Add hash if provided
      if (webhookData.hash) {
        // Store this hash in our recent hashes list
        if (!recentHashes.includes(webhookData.hash)) {
          recentHashes.unshift(webhookData.hash);

          // Trim the list if it gets too long
          if (recentHashes.length > MAX_RECENT_HASHES) {
            recentHashes.length = MAX_RECENT_HASHES;
          }
        }

        // Update timestamp for this hash
        hashTimestamps[webhookData.hash] = Date.now();
      }

      // Create webhook record in format expected by UI
      const webhookRecord = {
        id: webhookData.id || `wh_${Date.now()}`,
        timestamp: webhookData.timestamp || new Date().toISOString(),
        type: webhookData.eventType || 'unknown',
        data: webhookData.payload || webhookData,
        verified: webhookData.verified || false,
        received: Date.now(),
      };

      // Add to the beginning of the array (most recent first)
      storedWebhooks.unshift(webhookRecord);

      // Limit the number of stored webhooks
      if (storedWebhooks.length > MAX_STORED_WEBHOOKS) {
        storedWebhooks.length = MAX_STORED_WEBHOOKS;
      }

      console.log(`[webhook-query] Stored webhook. Total stored: ${storedWebhooks.length}`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Webhook stored for query',
          status: 'success',
          hash: webhookData.hash,
          stored: webhookRecord,
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

  // Handle GET request (retrieving webhook info)
  if (event.httpMethod === 'GET') {
    // If a hash is provided, check if we've seen it recently
    if (webhookHash) {
      const hashExists = recentHashes.includes(webhookHash);
      const hashTimestamp = hashTimestamps[webhookHash] || null;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          hashExists: hashExists,
          hashTimestamp: hashTimestamp,
          recentHashes: recentHashes,
          hashTimestamps: hashTimestamps,
        }),
      };
    }

    // Return all stored webhooks in format expected by UI
    console.log(`[webhook-query] GET request - returning ${storedWebhooks.length} webhooks`);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        webhooks: storedWebhooks,
        hasWebhooks: storedWebhooks.length > 0,
        count: storedWebhooks.length,
        recentHashes: recentHashes,
        hashTimestamps: hashTimestamps,
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
