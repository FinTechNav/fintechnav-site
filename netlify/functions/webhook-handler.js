// netlify/functions/webhook-handler.js
const sendgrid = require('@sendgrid/mail');

exports.handler = async (event) => {
  // Set CORS headers for preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, x-fsk-wh-chksm',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  // Ensure this is a POST request
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse the webhook payload
    const webhookPayload = JSON.parse(event.body);

    // Log the entire payload for debugging
    console.log('Received webhook payload:', JSON.stringify(webhookPayload, null, 2));

    // Extract event type - check multiple possible locations
    let webhookEventType = 'unknown';

    // Check in the standard event.type location
    if (webhookPayload.event && webhookPayload.event.type) {
      webhookEventType = webhookPayload.event.type;
    }
    // Also check in eventData.type location (as shown in your example)
    else if (webhookPayload.eventData && webhookPayload.eventData.type) {
      webhookEventType = webhookPayload.eventData.type;
    }

    console.log('Extracted webhook event type:', webhookEventType);

    // Log the webhook for debugging
    console.log('Webhook received:', {
      type: webhookEventType,
      headers: event.headers,
      checksumHeader: event.headers['x-fsk-wh-chksm'],
    });

    // Set up SendGrid API key
    sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

    // Format email content
    const timestampStr = new Date().toISOString();
    const emailContent = createEmailContent(webhookPayload, webhookEventType, timestampStr);

    // Send email notification
    const msg = {
      to: 'brad@fintechnav.com',
      from: {
        email: 'webhook@fintechnav.com',
        name: 'FinTechNav Webhook',
      },
      subject: `Webhook Notification: ${webhookEventType}`,
      text: emailContent.text,
      html: emailContent.html,
    };

    await sendgrid.send(msg);

    // Create a standard response with the webhook data
    const response = {
      message: 'Webhook received and processed successfully',
      type: webhookEventType,
      timestamp: timestampStr,
      webhook: webhookPayload,
    };

    // Also write the webhook data to a database or static file
    // for persistent storage (if we implement this later)

    // Respond with success
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error processing webhook:', error);

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Failed to process webhook',
        details: error.message,
      }),
    };
  }
};

/**
 * Create formatted email content from webhook payload
 */
function createEmailContent(webhookPayload, eventType, timestamp) {
  // Extract key transaction information when available
  // First try the standard location for transaction ID
  let transactionId = 'N/A';
  let referenceId = 'N/A';
  let amount = 'N/A';
  let paymentMethodDesc = 'N/A';

  // Try to extract from different possible locations in the payload
  if (webhookPayload.originalResponse) {
    transactionId = webhookPayload.originalResponse.id || 'N/A';
    referenceId = webhookPayload.originalResponse.referenceId || 'N/A';

    if (webhookPayload.originalResponse.approvedAmount) {
      amount = formatCurrency(webhookPayload.originalResponse.approvedAmount);
    }

    const paymentMethodInfo = webhookPayload.originalResponse.paymentMethod;
    if (paymentMethodInfo) {
      paymentMethodDesc = `${paymentMethodInfo.description || paymentMethodInfo.type || 'Unknown'} (${paymentMethodInfo.id || 'No ID'})`;
    }
  }

  // Create plain text email content
  const text = `
    Webhook Notification
    ====================
    
    Event Type: ${eventType}
    Timestamp: ${timestamp}
    
    Transaction Details:
    -------------------
    Transaction ID: ${transactionId}
    Reference ID: ${referenceId}
    Amount: ${amount}
    Payment Method: ${paymentMethodDesc}
    
    Full Payload:
    ${JSON.stringify(webhookPayload, null, 2)}
  `;

  // Create HTML email content
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          background-color: #c9a15f;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 5px 5px 0 0;
        }
        .content {
          padding: 20px;
          background-color: #f9f9f9;
          border: 1px solid #ddd;
          border-top: none;
          border-radius: 0 0 5px 5px;
        }
        .event-type {
          font-weight: bold;
          font-size: 18px;
          margin-bottom: 10px;
        }
        .details-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        .details-table th, .details-table td {
          padding: 10px;
          border: 1px solid #ddd;
          text-align: left;
        }
        .details-table th {
          background-color: #f2f2f2;
        }
        pre {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          overflow-x: auto;
          font-size: 13px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>FinTechNav Webhook Notification</h2>
      </div>
      <div class="content">
        <div class="event-type">Event Type: ${eventType}</div>
        <p>Received at: ${timestamp}</p>
        
        <h3>Transaction Details</h3>
        <table class="details-table">
          <tr>
            <th>Transaction ID</th>
            <td>${transactionId}</td>
          </tr>
          <tr>
            <th>Reference ID</th>
            <td>${referenceId}</td>
          </tr>
          <tr>
            <th>Amount</th>
            <td>${amount}</td>
          </tr>
          <tr>
            <th>Payment Method</th>
            <td>${paymentMethodDesc}</td>
          </tr>
        </table>
        
        <h3>Full Payload</h3>
        <pre>${JSON.stringify(webhookPayload, null, 2)}</pre>
      </div>
    </body>
    </html>
  `;

  return { text, html };
}

/**
 * Format currency amount from cents to dollars
 */
function formatCurrency(amountInCents, currencyCode = 'USD') {
  if (typeof amountInCents !== 'number') return 'N/A';

  const amount = amountInCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
}
