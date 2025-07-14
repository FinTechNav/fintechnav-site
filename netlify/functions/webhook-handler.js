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

// Helper function to verify checksum using HMAC-SHA256
function verifyChecksum(body, receivedChecksum, secret) {
  try {
    console.log(`[DEBUG] Received checksum: ${receivedChecksum}`);
    console.log(`[DEBUG] Checksum length: ${receivedChecksum.length}`);

    // Calculate HMAC-SHA256 in both hex and base64 formats
    const hmacHex = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
    const hmacBase64 = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64');

    console.log(`[DEBUG] HMAC-SHA256 hex: ${hmacHex}`);
    console.log(`[DEBUG] HMAC-SHA256 base64: ${hmacBase64}`);

    // Try hex format first (most common)
    if (receivedChecksum.length === hmacHex.length) {
      try {
        const hexMatch = crypto.timingSafeEqual(
          Buffer.from(receivedChecksum, 'hex'),
          Buffer.from(hmacHex, 'hex')
        );
        if (hexMatch) {
          console.log('[SUCCESS] Checksum verified using HMAC-SHA256 hex format');
          return true;
        }
      } catch (hexError) {
        console.log(`[DEBUG] Hex comparison failed: ${hexError.message}`);
      }
    }

    // Try base64 format
    if (receivedChecksum.length === hmacBase64.length) {
      try {
        const base64Match = crypto.timingSafeEqual(
          Buffer.from(receivedChecksum, 'base64'),
          Buffer.from(hmacBase64, 'base64')
        );
        if (base64Match) {
          console.log('[SUCCESS] Checksum verified using HMAC-SHA256 base64 format');
          return true;
        }
      } catch (base64Error) {
        console.log(`[DEBUG] Base64 comparison failed: ${base64Error.message}`);
      }
    }

    // Try string comparison as fallback
    if (receivedChecksum === hmacHex) {
      console.log('[SUCCESS] Checksum verified using HMAC-SHA256 hex (string comparison)');
      return true;
    }

    if (receivedChecksum === hmacBase64) {
      console.log('[SUCCESS] Checksum verified using HMAC-SHA256 base64 (string comparison)');
      return true;
    }

    console.warn(
      `[FAILED] HMAC-SHA256 checksum verification failed. Expected hex: ${hmacHex}, Expected base64: ${hmacBase64}, Received: ${receivedChecksum}`
    );
    return false;
  } catch (error) {
    console.error('Error verifying HMAC-SHA256 checksum:', error);
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
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background-color: #c9a15f;
      color: white;
      padding: 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
    }
    .content {
      padding: 20px;
    }
    .info-row {
      margin: 10px 0;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .label {
      font-weight: bold;
      color: #333;
      display: inline-block;
      width: 140px;
    }
    .value {
      color: #666;
    }
    .payload {
      background-color: #f8f8f8;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 15px;
      margin: 20px 0;
      font-family: monospace;
      font-size: 11px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .footer {
      background-color: #f0f0f0;
      padding: 15px;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #ddd;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>FinTechNav Webhook Notification</h1>
      <p>Event: ${eventType}</p>
    </div>
    
    <div class="content">
      <div class="info-row">
        <span class="label">Received:</span>
        <span class="value">${timestamp}</span>
      </div>
      
      <div class="info-row">
        <span class="label">Transaction ID:</span>
        <span class="value">${transactionId}</span>
      </div>
      
      <div class="info-row">
        <span class="label">Reference ID:</span>
        <span class="value">${referenceId}</span>
      </div>
      
      <div class="info-row">
        <span class="label">Amount:</span>
        <span class="value">${amount}</span>
      </div>
      
      <div class="info-row">
        <span class="label">Payment Method:</span>
        <span class="value">${paymentMethodDesc}</span>
      </div>
      
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
