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

  const {
    winery_id,
    customer_id,
    employee_id,
    customer_name,
    is_guest,
    order_source,
    subtotal,
    tax,
    total,
    items,
    payment_method,
    payment_reference,
    payment_status,
    transaction_amount,
    transaction_tip,
  } = JSON.parse(event.body);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();
    await client.query('BEGIN');

    // Generate order number
    const orderNumberResult = await client.query("SELECT nextval('order_number_seq') as order_num");
    const orderNumber = 'ORD-' + orderNumberResult.rows[0].order_num;

    // Create order
    const orderResult = await client.query(
      `
      INSERT INTO orders (
        winery_id, 
        customer_id, 
        employee_id, 
        customer_name, 
        is_guest, 
        order_source, 
        order_number,
        subtotal, 
        tax, 
        total, 
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, order_number
      `,
      [
        winery_id,
        customer_id,
        employee_id,
        customer_name,
        is_guest,
        order_source,
        orderNumber,
        subtotal,
        tax,
        total,
        'completed',
      ]
    );

    const orderId = orderResult.rows[0].id;

    // Create transaction record for non-card payments (cash, ACH, check, etc.)
    // This ensures customer stats trigger fires for all payment types
    if (payment_method && payment_method !== 'credit' && payment_method !== 'card') {
      try {
        console.log('💾 Creating transaction record for', payment_method, 'payment...');

        await client.query(
          `INSERT INTO transactions (
            order_id, winery_id, customer_id, employee_id,
            processor, reference_id,
            transaction_channel, transaction_type, payment_method_type,
            amount, subtotal, tax, tip,
            status, status_code, status_message,
            processed_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
          )`,
          [
            orderId,
            winery_id,
            customer_id || null,
            employee_id || null,
            null, // No processor for cash/check/ACH - constraint only allows 'dejavoo', 'stripe', or NULL
            payment_reference || `${payment_method.toUpperCase()}${Date.now()}`,
            order_source || 'pos',
            'sale',
            payment_method,
            parseFloat(transaction_amount || total),
            parseFloat(subtotal || 0),
            parseFloat(tax || 0),
            parseFloat(transaction_tip || 0),
            payment_status || 'approved',
            '00',
            payment_status === 'paid' ? 'Approved' : 'Pending',
            new Date(),
          ]
        );

        console.log('✅ Transaction record created for', payment_method, 'payment');
      } catch (txError) {
        console.error('⚠️ Failed to create transaction record (non-fatal):', txError.message);
        console.error('   Error code:', txError.code);
        console.error('   Error detail:', txError.detail);
        // Continue - order was created successfully
      }
    }

    // Create order items
    for (const item of items) {
      await client.query(
        `
        INSERT INTO order_items (
          order_id, 
          product_id, 
          product_name, 
          product_sku, 
          vintage, 
          varietal, 
          quantity, 
          unit_price, 
          line_total
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          orderId,
          item.product_id,
          item.product_name,
          item.product_sku,
          item.vintage,
          item.varietal,
          item.quantity,
          item.unit_price,
          item.line_total,
        ]
      );
    }

    await client.query('COMMIT');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        order_id: orderId,
        order_number: orderNumber,
      }),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to create order',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
