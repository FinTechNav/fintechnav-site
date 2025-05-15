// netlify/functions/webhook-handler.js
const sendgrid = require('@sendgrid/mail');

exports.handler = async (event) => {
  // Ensure this is a POST request
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse the webhook payload
    const webhookPayload = JSON.parse(event.body);
    const webhookEventType = webhookPayload.event?.type || 'unknown';

    // Log the webhook for debugging
    console.log('Webhook received:', {
      type: webhookEventType,
      headers: event.headers,
      checksumHeader: event.headers['x-fsk-wh-chksm'],
      payload: webhookPayload,
    });

    // In a production environment, you would validate the checksum
    // For this example, we'll skip detailed validation and assume the webhook is valid
    // const isValid = validateChecksum(webhookPayload, event.headers['x-fsk-wh-chksm']);
    // if (!isValid) {
    //   return {
    //     statusCode: 401,
    //     body: JSON.stringify({ error: 'Invalid checksum' })
    //   };
    // }

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

    // Respond with success
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Webhook received and processed successfully',
        type: webhookEventType,
        timestamp: timestampStr,
      }),
    };
  } catch (error) {
    console.error('Error processing webhook:', error);

    return {
      statusCode: 500,
      headers: {
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
  const transactionId = webhookPayload.originalResponse?.id || 'N/A';
  const referenceId = webhookPayload.originalResponse?.referenceId || 'N/A';
  const amount = webhookPayload.originalResponse?.approvedAmount
    ? formatCurrency(webhookPayload.originalResponse.approvedAmount)
    : 'N/A';

  const paymentMethodInfo = webhookPayload.originalResponse?.paymentMethod;
  const paymentMethodDesc = paymentMethodInfo
    ? `${paymentMethodInfo.description || paymentMethodInfo.type || 'Unknown'} (${paymentMethodInfo.id || 'No ID'})`
    : 'N/A';

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

/**
 * Validate webhook checksum (implementation would depend on your shared secret)
 */
function validateChecksum(webhookPayload, checksumHeader) {
  // In a production environment, you would implement this validation
  // based on the Integrated Commerce API documentation

  // Example pseudo-code:
  // 1. Extract required fields from the payload
  // 2. Concatenate fields in the correct order with the shared secret
  // 3. Compute SHA-256 hash and compare with the provided checksum

  // For this example, we'll return true to bypass validation
  return true;
}
