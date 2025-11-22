const { Client } = require('pg');

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

    await client.connect();

    // Extract data from SPIN response
    const generalResponse = transactionData.GeneralResponse || {};
    const amounts = transactionData.Amounts || {};
    const cardData = transactionData.CardData || {};
    const emvData = transactionData.EMVData || {};
    const extendedData = transactionData.ExtendedDataByApplication || {};

    // Get the first entry type and application data
    const appKey = Object.keys(extendedData)[0];
    const appData = appKey ? extendedData[appKey] : {};

    // Parse transaction datetime
    let transactionDatetime = null;
    if (appData.DateTime) {
      // Format: "2025-11-2214:13:19" - needs parsing
      const dateStr = appData.DateTime;
      // Extract: YYYY-MM-DDTHH:MM:SS
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(5, 7);
      const day = dateStr.substring(7, 9);
      const hour = dateStr.substring(9, 11);
      const minute = dateStr.substring(12, 14);
      const second = dateStr.substring(15, 17);
      transactionDatetime = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    }

    // Insert transaction record
    const insertQuery = `
      INSERT INTO terminal_transactions (
        order_id,
        winery_id,
        customer_id,
        employee_id,
        terminal_id,
        
        reference_id,
        transaction_number,
        invoice_number,
        serial_number,
        batch_number,
        host_transaction_id,
        transaction_id,
        rrn,
        pn_reference_id,
        
        transaction_type,
        payment_type,
        voided,
        
        total_amount,
        base_amount,
        tip_amount,
        fee_amount,
        tax_amount,
        discount_amount,
        cashback_amount,
        
        result_code,
        status_code,
        host_response_code,
        host_response_message,
        message,
        detailed_message,
        auth_code,
        
        card_type,
        card_last_4,
        card_first_4,
        card_bin,
        card_name,
        card_expiration,
        entry_type,
        
        emv_application_name,
        emv_aid,
        emv_tvr,
        emv_tsi,
        emv_iad,
        emv_arc,
        
        ipos_token,
        
        transaction_start_time,
        transaction_end_time,
        transaction_datetime,
        
        network_mode,
        profile_id,
        offline_pin,
        fallback_mode,
        
        is_partial_approval,
        is_surcharge_applied,
        is_fee_applied_for_debit,
        is_disclose_fee_to_customer,
        is_gift_mode,
        is_wallet_mode,
        is_ibs,
        
        tax_city,
        tax_state,
        tax_commercial,
        
        extended_data
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24,
        $25, $26, $27, $28, $29, $30, $31,
        $32, $33, $34, $35, $36, $37, $38,
        $39, $40, $41, $42, $43, $44,
        $45,
        $46, $47, $48,
        $49, $50, $51, $52,
        $53, $54, $55, $56, $57, $58, $59,
        $60, $61, $62,
        $63
      )
      RETURNING id
    `;

    const values = [
      order_id || null,
      winery_id,
      customer_id || null,
      employee_id || null,
      terminal_id || null,

      transactionData.ReferenceId || null,
      transactionData.TransactionNumber || null,
      transactionData.InvoiceNumber || null,
      transactionData.SerialNumber || null,
      transactionData.BatchNumber || null,
      appData.HostTxnId || null,
      appData.TxnId || null,
      transactionData.RRN || null,
      transactionData.PNReferenceId || null,

      transactionData.TransactionType || null,
      transactionData.PaymentType || null,
      transactionData.Voided || false,

      parseFloat(amounts.TotalAmount || 0),
      parseFloat(appData.BaseAmount || amounts.Amount || 0),
      parseFloat(amounts.TipAmount || appData.Tip || 0),
      parseFloat(amounts.FeeAmount || appData.Fee || 0),
      parseFloat(amounts.TaxAmount || appData.TaxAmount || 0),
      parseFloat(appData.Disc || 0),
      parseFloat(appData.CashBack || 0),

      generalResponse.ResultCode || null,
      generalResponse.StatusCode || null,
      generalResponse.HostResponseCode || null,
      generalResponse.HostResponseMessage || null,
      generalResponse.Message || null,
      generalResponse.DetailedMessage || null,
      transactionData.AuthCode || null,

      cardData.CardType || appData.CardType || null,
      cardData.Last4 || appData.AcntLast4 || null,
      cardData.First4 || appData.AcntFirst4 || null,
      cardData.BIN || appData.BIN || null,
      cardData.Name || appData.Name || null,
      cardData.ExpirationDate || appData.ExpDate || null,
      cardData.EntryType || appData.EntryType || null,

      emvData.ApplicationName || appData.AppName || null,
      emvData.AID || appData.AID || null,
      emvData.TVR || appData.TVR || null,
      emvData.TSI || appData.TSI || null,
      emvData.IAD || null,
      emvData.ARC || null,

      transactionData.IPosToken || null,

      appData.TxnStartTime ? parseInt(appData.TxnStartTime) : null,
      appData.TxnEndTime ? parseInt(appData.TxnEndTime) : null,
      transactionDatetime,

      appData.NetworkMode || null,
      appData.ProfileId || null,
      appData.OfflinePin === 'true',
      appData.FallBackMode || null,

      appData.IsPartialApprovalTxn === 'true',
      appData.IsSurChargeApplied === 'true',
      appData.IsFeeAppliedForDebitCard === 'true',
      appData.IsDiscloseFeeToCustomer === 'true',
      appData.IsGiftMode === 'true',
      appData.IsWalletMode === 'true',
      appData.IsIbs === 'true',

      parseFloat(appData.TaxCity || 0),
      parseFloat(appData.TaxState || 0),
      parseFloat(appData.TaxCommercial || 0),

      JSON.stringify(extendedData),
    ];

    const result = await client.query(insertQuery, values);
    const transactionId = result.rows[0].id;

    console.log('✅ Transaction saved with ID:', transactionId);

    await client.end();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        transaction_id: transactionId,
      }),
    };
  } catch (error) {
    console.error('❌ Error saving terminal transaction:', error);
    console.error('Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to save terminal transaction',
        details: error.message,
      }),
    };
  }
};
