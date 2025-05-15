// netlify/functions/webhook-test.js
exports.handler = async (event) => {
  // This is a simple test function that simulates a webhook being sent
  // You can use this to test your webhook-handler.js without needing to send a real webhook

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Generate a test webhook payload based on the input parameters or use defaults
    let testPayload = {};

    try {
      // Try to parse the body if provided
      const body = JSON.parse(event.body || '{}');
      const webhookType = body.type || 'sale.completed';

      testPayload = createTestWebhook(webhookType, body.amount);
    } catch (e) {
      // If parsing fails, create a default test webhook
      testPayload = createTestWebhook('sale.completed', 1000);
    }

    // Forward this test webhook to the real webhook handler
    const webhookResponse = await fetch(process.env.URL + '/.netlify/functions/webhook-handler', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-fsk-wh-chksm': 'test-signature-1234567890',
      },
      body: JSON.stringify(testPayload),
    });

    const responseData = await webhookResponse.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Test webhook sent successfully',
        testPayload,
        response: responseData,
      }),
    };
  } catch (error) {
    console.error('Error sending test webhook:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Failed to send test webhook',
        details: error.message,
      }),
    };
  }
};

/**
 * Create a test webhook payload based on the specified type and amount
 */
function createTestWebhook(type, amount = 1000) {
  const eventId = 'evt_' + Date.now().toString(36);
  const transactionId = 'trx_' + Math.random().toString(36).substring(2, 12);
  const referenceId = 'ref_' + Math.random().toString(36).substring(2, 12);
  const timestamp = new Date().toISOString();

  // Base webhook structure with event details
  const webhook = {
    event: {
      id: eventId,
      type: type,
      timestamp: timestamp,
    },
  };

  // Add different originalResponse content based on the event type
  switch (type) {
    case 'sale.completed':
      webhook.originalResponse = {
        id: transactionId,
        paymentMethod: {
          id: 'pmt_trm_01JRZPTMTBN41PC3VPQNZ5T3HF',
          type: 'physical',
          currency: 'USD',
          description: 'Main Store Terminal',
        },
        invoiceNumber: 'inv_' + Math.floor(Math.random() * 10000),
        orderNumber: 'order_' + Math.floor(Math.random() * 10000),
        referenceId: referenceId,
        resultCode: 0,
        resultText: 'Successful transaction request',
        requestedAmount: amount,
        approvedAmount: amount,
        balanceAmount: 0,
        transactionResponses: [
          {
            responseCode: 1,
            authCode: '000AAA',
            amountApproved: amount,
            approvedAmountBreakdown: {
              amountGoodsAndServices: amount,
              tax: 0,
              cashBack: 0,
              tip: 0,
            },
            paymentMethod: {
              id: 'pmt_tkn_01JRZPRGFF4J2SZC3HMDBYEN2J',
              type: 'token',
              currency: 'USD',
              description: 'Token for Test Card',
              maskedCardNumber: '************0011',
              cardExpDate: '1225',
            },
            cardType: 'VISA',
            accountType: 'Credit',
            hostResponseText: 'APPROVED 00',
          },
        ],
      };
      break;

    case 'auth.completed':
      webhook.originalResponse = {
        id: transactionId,
        paymentMethod: {
          id: 'pmt_trm_01JRZPTMTBN41PC3VPQNZ5T3HF',
          type: 'physical',
          currency: 'USD',
          description: 'Main Store Terminal',
        },
        invoiceNumber: 'inv_' + Math.floor(Math.random() * 10000),
        orderNumber: 'order_' + Math.floor(Math.random() * 10000),
        referenceId: referenceId,
        resultCode: 0,
        resultText: 'Successful authorization',
        requestedAmount: amount,
        approvedAmount: amount,
        balanceAmount: amount, // Full amount still to be captured
        transactionResponses: [
          {
            responseCode: 1,
            authCode: '000AAA',
            amountApproved: amount,
            paymentMethod: {
              id: 'pmt_tkn_01JRZPRGFF4J2SZC3HMDBYEN2J',
              type: 'token',
              currency: 'USD',
              description: 'Token for Test Card',
              maskedCardNumber: '************0011',
              cardExpDate: '1225',
            },
            cardType: 'VISA',
            accountType: 'Credit',
            hostResponseText: 'APPROVED 00',
          },
        ],
      };
      break;

    case 'capture.completed':
      webhook.originalResponse = {
        id: transactionId,
        referenceId: referenceId,
        paymentMethod: {
          id: 'pmt_tkn_01JRZPRGFF4J2SZC3HMDBYEN2J',
          type: 'token',
          currency: 'USD',
          description: 'Token for Test Card',
          maskedCardNumber: '************0011',
          cardExpDate: '1225',
        },
        invoiceNumber: 'inv_' + Math.floor(Math.random() * 10000),
        orderNumber: 'order_' + Math.floor(Math.random() * 10000),
        resultCode: 0,
        resultText: 'Successful transaction request',
        requestedAmount: amount,
        approvedAmount: amount,
      };
      break;

    case 'refund.completed':
      webhook.originalResponse = {
        id: transactionId,
        referenceId: referenceId,
        paymentMethod: {
          id: 'pmt_tkn_01JRZPRGFF4J2SZC3HMDBYEN2J',
          type: 'token',
          currency: 'USD',
          description: 'Token for Test Card',
          maskedCardNumber: '************0011',
          cardExpDate: '1225',
        },
        invoiceNumber: 'ref_inv_' + Math.floor(Math.random() * 10000),
        orderNumber: 'ref_order_' + Math.floor(Math.random() * 10000),
        resultCode: 0,
        resultText: 'Successful transaction request',
        requestedAmount: amount,
        approvedAmount: amount,
      };
      break;

    case 'token.created':
      webhook.originalResponse = {
        id: transactionId,
        paymentMethod: {
          id: 'pmt_trm_01JRZPTMTBN41PC3VPQNZ5T3HF',
          type: 'physical',
          currency: 'USD',
          description: 'Main Store Terminal',
        },
        referenceId: referenceId,
        resultCode: 0,
        resultText: 'Card successfully tokenized',
        transactionResponses: [
          {
            responseCode: 1,
            authCode: '000AAA',
            paymentMethod: {
              id: 'pmt_tkn_01JRZPRGFF4J2SZC3HMDBYEN2J',
              type: 'token',
              currency: 'USD',
              description: 'Token for Test Card',
              maskedCardNumber: '************0011',
              cardExpDate: '1225',
            },
            cardType: 'VISA',
            accountType: 'Credit',
            hostResponseText: 'APPROVED 00',
          },
        ],
      };
      break;

    case 'token.updated':
      webhook.originalResponse = {
        id: transactionId,
        paymentMethod: {
          id: 'pmt_tkn_01JRZPRGFF4J2SZC3HMDBYEN2J',
          type: 'token',
          currency: 'USD',
          description: 'Token for Test Card',
          maskedCardNumber: '************0011',
          cardExpDate: '1225',
        },
        referenceId: referenceId,
        resultCode: 0,
        resultText: 'Card successfully updated',
      };
      break;

    case 'token.removed':
      webhook.originalResponse = {
        id: transactionId,
        paymentMethod: {
          id: 'pmt_tkn_01JRZPRGFF4J2SZC3HMDBYEN2J',
          type: 'token',
          currency: 'USD',
          description: 'Token for Test Card',
          maskedCardNumber: '************0011',
          cardExpDate: '1225',
        },
        referenceId: referenceId,
        resultCode: 0,
        resultText: 'Card successfully removed',
      };
      break;

    default:
      // For unknown types, use a generic payload
      webhook.originalResponse = {
        id: transactionId,
        referenceId: referenceId,
        resultCode: 0,
        resultText: 'Unknown event type: ' + type,
      };
  }

  return webhook;
}
