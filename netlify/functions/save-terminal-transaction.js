const { Client } = require('pg');
const crypto = require('crypto');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  console.log('🔵 save-terminal-transaction.js invoked');

  try {
    const body = JSON.parse(event.body);
    const { order_id, winery_id, customer_id, employee_id, terminal_id, transactionData } = body;

    console.log('📊 Request parameters:');
    console.log('  - order_id:', order_id);
    console.log('  - winery_id:', winery_id);
    console.log('  - customer_id:', customer_id);
    console.log('  - employee_id:', employee_id);
    console.log('  - terminal_id:', terminal_id);
    console.log('  - transactionData keys:', Object.keys(transactionData));

    // Validate required parameters
    if (!winery_id || !transactionData) {
      console.error('❌ Missing required parameters');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required parameters',
          required: ['winery_id', 'transactionData'],
        }),
      };
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: false,
    });

    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Database connected');

    // Extract data from SPIN response
    const generalResponse = transactionData.GeneralResponse || {};
    const amounts = transactionData.Amounts || {};
    const cardData = transactionData.CardData || {};
    const extendedData = transactionData.ExtendedDataByApplication || {};

    console.log('📦 Extracted data structures:');
    console.log('  - generalResponse:', Object.keys(generalResponse));
    console.log('  - amounts:', Object.keys(amounts));
    console.log('  - cardData:', Object.keys(cardData));

    // Determine transaction status
    const resultCode = generalResponse.ResultCode || '1';
    const statusCode = generalResponse.StatusCode || '';
    let status = 'error';

    if (resultCode === '0' || resultCode === 0) {
      if (statusCode === '0000' || generalResponse.Message?.toLowerCase().includes('approved')) {
        status = 'approved';
      } else if (generalResponse.Message?.toLowerCase().includes('declined')) {
        status = 'declined';
      }
    }

    console.log('📊 Transaction status determined:', status);

    // Check if payment method should be saved (if iPOS token present and customer_id exists)
    let payment_method_id = null;

    if (transactionData.IPosToken && customer_id && status === 'approved') {
      console.log('💳 iPOS token present, saving payment method...');

      // Generate card fingerprint
      const fingerprintData = `${cardData.BIN || ''}${cardData.Last4}${cardData.ExpirationDate || ''}`;
      const cardFingerprint = crypto.createHash('sha256').update(fingerprintData).digest('hex');

      // Parse expiry date (format: MMYY)
      let cardExpMonth = null;
      let cardExpYear = null;
      if (cardData.ExpirationDate && cardData.ExpirationDate.length === 4) {
        cardExpMonth = cardData.ExpirationDate.substring(0, 2);
        cardExpYear = '20' + cardData.ExpirationDate.substring(2, 4);
      }

      // Check if this is customer's first card
      const existingCards = await client.query(
        'SELECT COUNT(*) as count FROM payment_methods WHERE customer_id = $1 AND winery_id = $2 AND processor = $3 AND is_active = TRUE',
        [customer_id, winery_id, 'dejavoo']
      );

      const isFirstCard = existingCards.rows[0].count === '0';

      // Insert or update payment method
      const pmResult = await client.query(
        `INSERT INTO payment_methods (
          customer_id, winery_id, processor,
          processor_payment_method_id, card_last_4, card_type, card_brand,
          card_expiry_month, card_expiry_year, card_fingerprint,
          source_channel, is_default
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (customer_id, winery_id, processor, card_fingerprint) 
        DO UPDATE SET
          last_used_at = NOW(),
          usage_count = payment_methods.usage_count + 1,
          is_active = TRUE,
          updated_at = NOW()
        RETURNING id`,
        [
          customer_id,
          winery_id,
          'dejavoo',
          transactionData.IPosToken,
          cardData.Last4,
          cardData.CardType,
          cardData.CardType,
          cardExpMonth,
          cardExpYear,
          cardFingerprint,
          'card_present',
          isFirstCard,
        ]
      );

      payment_method_id = pmResult.rows[0].id;
      console.log('✅ Payment method saved/updated:', payment_method_id);
    }

    // Insert transaction record
    const transactionResult = await client.query(
      `INSERT INTO transactions (
        order_id, winery_id, customer_id, employee_id, payment_method_id, terminal_id,
        processor, reference_id, processor_transaction_id,
        transaction_channel, transaction_type, payment_method_type,
        amount, subtotal, tax, tip,
        status, status_code, status_message,
        card_type, card_last_4, card_entry_type,
        auth_code, batch_number,
        processor_request, processor_response,
        processed_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
      )
      RETURNING id`,
      [
        order_id || null,
        winery_id,
        customer_id || null,
        employee_id || null,
        payment_method_id,
        terminal_id || null,
        'dejavoo',
        transactionData.ReferenceId || null,
        transactionData.TransactionNumber || null,
        'card_present',
        'sale',
        'card',
        parseFloat(amounts.TotalAmount || 0),
        parseFloat(amounts.Subtotal || amounts.Amount || 0),
        parseFloat(amounts.TaxAmount || 0),
        parseFloat(amounts.TipAmount || 0),
        status,
        statusCode,
        generalResponse.Message || null,
        cardData.CardType || null,
        cardData.Last4 || null,
        cardData.EntryType || null,
        transactionData.AuthCode || null,
        transactionData.BatchNumber || null,
        JSON.stringify(transactionData),
        JSON.stringify(transactionData),
        new Date(),
      ]
    );

    const transaction_id = transactionResult.rows[0].id;
    console.log('✅ Transaction saved with ID:', transaction_id);

    // Save extended processor data if present
    if (extendedData && Object.keys(extendedData).length > 0) {
      await client.query(
        `INSERT INTO transaction_processor_details (
          transaction_id, processor, processor_extended_data
        ) VALUES ($1, $2, $3)`,
        [transaction_id, 'dejavoo', JSON.stringify(extendedData)]
      );
      console.log('✅ Extended processor data saved');
    }

    await client.end();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        transaction_id: transaction_id,
        payment_method_id: payment_method_id,
      }),
    };
  } catch (error) {
    console.error('❌ Error saving terminal transaction:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    if (error.code) {
      console.error('Database error code:', error.code);
      console.error('Database error detail:', error.detail);
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to save terminal transaction',
        details: error.message,
        code: error.code,
      }),
    };
  }
};
