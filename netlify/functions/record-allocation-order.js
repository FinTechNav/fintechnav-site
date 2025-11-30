const { Client } = require('pg');

exports.handler = async (event) => {
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

  const data = JSON.parse(event.body);
  const { allocation_release_id, order_id, customer_id, total_items, subtotal_cents, order_items } =
    data;

  if (!allocation_release_id || !order_id || !customer_id || !total_items || !subtotal_cents) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error:
          'allocation_release_id, order_id, customer_id, total_items, and subtotal_cents are required',
      }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();
    await client.query('BEGIN');

    const insertOrderQuery = `
      INSERT INTO allocation_orders (
        allocation_release_id, order_id, customer_id, total_items, subtotal_cents
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const orderResult = await client.query(insertOrderQuery, [
      allocation_release_id,
      order_id,
      customer_id,
      total_items,
      subtotal_cents,
    ]);

    if (order_items && Array.isArray(order_items)) {
      for (const item of order_items) {
        const checkLimitQuery = `
          SELECT id, quantity_purchased, remaining_allocation
          FROM allocation_customer_limits
          WHERE allocation_release_id = $1 
            AND customer_id = $2 
            AND product_id = $3
        `;

        const limitResult = await client.query(checkLimitQuery, [
          allocation_release_id,
          customer_id,
          item.product_id,
        ]);

        if (limitResult.rows.length > 0) {
          await client.query(
            `UPDATE allocation_customer_limits 
             SET quantity_purchased = quantity_purchased + $1,
                 remaining_allocation = remaining_allocation - $1,
                 updated_at = NOW()
             WHERE id = $2`,
            [item.quantity, limitResult.rows[0].id]
          );
        } else {
          const productLimitQuery = `
            SELECT max_quantity FROM allocation_products
            WHERE allocation_release_id = $1 AND product_id = $2
          `;
          const productLimit = await client.query(productLimitQuery, [
            allocation_release_id,
            item.product_id,
          ]);

          const maxQty = productLimit.rows[0]?.max_quantity || 0;

          await client.query(
            `INSERT INTO allocation_customer_limits (
              allocation_release_id, customer_id, product_id,
              quantity_purchased, remaining_allocation
            ) VALUES ($1, $2, $3, $4, $5)`,
            [
              allocation_release_id,
              customer_id,
              item.product_id,
              item.quantity,
              maxQty - item.quantity,
            ]
          );
        }

        await client.query(
          `UPDATE allocation_products 
           SET purchased_quantity = purchased_quantity + $1,
               available_quantity = available_quantity - $1
           WHERE allocation_release_id = $2 AND product_id = $3`,
          [item.quantity, allocation_release_id, item.product_id]
        );
      }
    }

    await client.query('COMMIT');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        allocation_order: orderResult.rows[0],
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
        error: 'Failed to record allocation order',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
