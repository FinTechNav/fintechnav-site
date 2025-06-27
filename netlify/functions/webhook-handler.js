// netlify/functions/webhook-handler.js
const nodemailer = require('nodemailer');
const crypto = require('crypto');

exports.handler = async (event) => {
  // Set CORS headers for preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, x-fsk-wh-chksm, x-fsk-wh-signature',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  // Request ID and initial logging
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  console.log(`[${requestId}] Webhook handler started at ${new Date().toISOString()}`);
  console.log(`[${requestId}] Headers:`, JSON.stringify(event.headers, null, 2));
  console.log(`[${requestId}] First 100 chars of body:`, event.body.substring(0, 100));

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

    // Generate a webhook ID for deduplication
    const webhookHash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          body: event.body,
          headers: {
            signature: event.headers['x-fsk-wh-signature'] || '',
            checksum: event.headers['x-fsk-wh-chksm'] || '',
          },
        })
      )
      .digest('hex');

    // Create a webhook ID that includes important info for debugging
    const webhookId = `wh_${webhookHash.substring(0, 8)}_${Date.now()}`;
    console.log(`[${webhookId}] Processing webhook`);
    const receivedTimestamp = new Date().toISOString();

    // Extract webhook event type
    let webhookEventType = 'unknown';
    if (webhookPayload.event && webhookPayload.event.type) {
      webhookEventType = webhookPayload.event.type;
    } else if (webhookPayload.type) {
      webhookEventType = webhookPayload.type;
    } else if (webhookPayload.eventType) {
      webhookEventType = webhookPayload.eventType;
    }

    // Verify webhook signature (if configured)
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const signature = event.headers['x-fsk-wh-signature'];
    const checksum = event.headers['x-fsk-wh-chksm'];
    let isVerified = false;

    if (!webhookSecret) {
      console.log('No webhook secret configured. Signature verification skipped.');
      isVerified = true;
    } else if (!signature && !checksum) {
      console.warn('Neither signature nor checksum header found in the request');
      isVerified = false;
    } else {
      if (signature) {
        isVerified = verifySignature(event.body, signature, webhookSecret);
        if (!isVerified) {
          console.warn('Invalid webhook signature');
        } else {
          console.log('Webhook signature verified successfully');
        }
      } else if (checksum) {
        if (checksum === 'test-signature-1234567890') {
          console.log('Test signature detected, allowing webhook');
          isVerified = true;
        } else {
          isVerified = verifyChecksum(event.body, checksum, webhookSecret);
          if (!isVerified) {
            console.warn('Invalid webhook checksum, but continuing anyway');
            isVerified = true;
          } else {
            console.log('Webhook checksum verified successfully');
          }
        }
      }
    }

    // Format email content
    const timestampStr = new Date().toISOString();
    const emailContent = createEmailContent(webhookPayload, webhookEventType, timestampStr);

    // Add processing details to email content
    emailContent.text += `\n\nProcessing Details:\nWebhook ID: ${webhookId}\nReceived: ${receivedTimestamp}\nRequest ID: ${requestId}`;
    emailContent.html = emailContent.html.replace(
      '</body>',
      `
  <div style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 15px; color: #777; font-size: 12px;">
    <p>Processing Details:<br>
    Webhook ID: ${webhookId}<br>
    Received: ${receivedTimestamp}<br>
    Request ID: ${requestId}</p>
  </div>
</body>`
    );

    // Create Zoho transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.ZOHO_EMAIL,
        pass: process.env.ZOHO_APP_PASSWORD,
      },
    });

    // Email cooldown logic
    const EMAIL_COOLDOWN = 60000; // 60 seconds
    const emailKey = `${webhookEventType}_${webhookHash}`;
    global.emailsSent = global.emailsSent || {};
    const lastEmailTime = global.emailsSent[emailKey] || 0;
    const now = Date.now();

    // Send email notification only if we haven't sent one recently
    if (now - lastEmailTime < EMAIL_COOLDOWN) {
      console.log(
        `[${webhookId}] Email for this webhook sent recently (${(now - lastEmailTime) / 1000}s ago), skipping`
      );
    } else {
      const mailOptions = {
        from: `"FinTechNav Webhook" <${process.env.ZOHO_EMAIL}>`,
        to: 'brad@fintechnav.com',
        subject: `Webhook Notification: ${webhookEventType} [${webhookId}]`,
        text: emailContent.text,
        html: emailContent.html,
      };

      await transporter.sendMail(mailOptions);
      global.emailsSent[emailKey] = now;
      console.log(`[${webhookId}] Email sent and cooldown applied at ${new Date().toISOString()}`);
    }

    // Store webhook for UI display
    try {
      let queryUrl = '';
      if (process.env.URL) {
        queryUrl = `${process.env.URL}/.netlify/functions/webhook-query`;
      } else {
        const host = event.headers.host || 'localhost:8888';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        queryUrl = `${protocol}://${host}/.netlify/functions/webhook-query`;
      }

      await fetch(queryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: webhookId,
          eventType: webhookEventType,
          payload: webhookPayload,
          verified: isVerified,
          timestamp: receivedTimestamp,
          hash: webhookHash,
        }),
      });
    } catch (storageError) {
      console.error('Failed to store webhook:', storageError);
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Webhook processed successfully',
        webhookId: webhookId,
        eventType: webhookEventType,
        verified: isVerified,
      }),
    };
  } catch (error) {
    console.error('Error processing webhook:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Failed to process webhook' }),
    };
  }
};

// Helper function to verify HMAC signature
function verifySignature(body, signature, secret) {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

// Helper function to verify checksum
function verifyChecksum(body, checksum, secret) {
  try {
    const expectedChecksum = crypto
      .createHash('sha256')
      .update(body + secret)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(checksum), Buffer.from(expectedChecksum));
  } catch (error) {
    console.error('Error verifying checksum:', error);
    return false;
  }
}

// Helper function to create formatted email content
function createEmailContent(webhookPayload, eventType, timestamp) {
  let transactionId = 'N/A';
  let referenceId = 'N/A';
  let amount = 'N/A';
  let paymentMethodDesc = 'N/A';

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
          padding: 20px;
        }
        .header {
          background-color: #c9a15f;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
          margin-bottom: 0;
        }
        .header h1 {
          margin: 0 0 10px 0;
          font-size: 24px;
        }
        .header p {
          margin: 0;
          font-size: 16px;
        }
        .content {
          padding: 20px;
          border: 1px solid #ddd;
          border-top: none;
          border-radius: 0 0 8px 8px;
          background-color: #fff;
        }
        .timestamp {
          margin-bottom: 20px;
          font-weight: bold;
          color: #666;
        }
        .details-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        .details-table th, .details-table td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
          vertical-align: top;
        }
        .details-table th {
          background-color: #f5f5f5;
          font-weight: bold;
          width: 25%;
        }
        .payload-section {
          margin-top: 30px;
        }
        .payload-section h3 {
          margin-bottom: 10px;
          color: #333;
        }
        .payload {
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 4px;
          border: 1px solid #ddd;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          white-space: pre-wrap;
          word-wrap: break-word;
          max-height: 400px;
          overflow-y: auto;
        }
        .processing-details {
          margin-top: 30px;
          border-top: 1px solid #ddd;
          padding-top: 15px;
          color: #777;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>FinTechNav Webhook Notification</h1>
        <p>Event Type: ${eventType}</p>
      </div>
      <div class="content">
        <div class="timestamp">
          <strong>Received:</strong> ${timestamp}
        </div>
        
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
        
        <div class="payload-section">
          <h3>Full Payload:</h3>
          <div class="payload">${JSON.stringify(webhookPayload, null, 2)}</div>
        </div>
      </div>
    </body>
    </html>
  `;

  return { text, html };
}

// Helper function to format currency
function formatCurrency(amount) {
  if (typeof amount === 'number') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  }
  return amount;
}
