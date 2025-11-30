const { Client } = require('pg');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();

    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      const { allocation_id, customer_id } = params;

      if (!allocation_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'allocation_id is required',
          }),
        };
      }

      let query = `
        SELECT 
          aw.*,
          p.name as product_name,
          p.sku,
          wp.vintage,
          wp.varietal,
          c.first_name,
          c.last_name,
          c.email
        FROM allocation_wishes aw
        JOIN products p ON aw.product_id = p.id
        LEFT JOIN wine_products wp ON p.id = wp.product_id
        JOIN customers c ON aw.customer_id = c.id
        WHERE aw.allocation_release_id = $1
      `;

      const queryParams = [allocation_id];

      if (customer_id) {
        query += ' AND aw.customer_id = $2';
        queryParams.push(customer_id);
      }

      query += ' ORDER BY aw.priority_rank NULLS LAST, aw.created_at DESC';

      const result = await client.query(query, queryParams);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          wishes: result.rows,
        }),
      };
    }

    if (event.httpMethod === 'POST') {
      const wish = JSON.parse(event.body);

      if (
        !wish.allocation_release_id ||
        !wish.customer_id ||
        !wish.product_id ||
        !wish.quantity_wished
      ) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error:
              'allocation_release_id, customer_id, product_id, and quantity_wished are required',
          }),
        };
      }

      const upsertQuery = `
        INSERT INTO allocation_wishes (
          allocation_release_id, customer_id, product_id, quantity_wished,
          quantity_granted, wish_status, customer_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (allocation_release_id, customer_id, product_id)
        DO UPDATE SET
          quantity_wished = $4,
          wish_status = $6,
          customer_notes = $7,
          updated_at = NOW()
        RETURNING *
      `;

      const result = await client.query(upsertQuery, [
        wish.allocation_release_id,
        wish.customer_id,
        wish.product_id,
        wish.quantity_wished,
        wish.quantity_granted || 0,
        wish.wish_status || 'pending',
        wish.customer_notes || null,
      ]);

      await client.query(
        `UPDATE allocation_products 
         SET wished_quantity = (
           SELECT COALESCE(SUM(quantity_wished), 0) 
           FROM allocation_wishes 
           WHERE allocation_release_id = $1 AND product_id = $2
         )
         WHERE allocation_release_id = $1 AND product_id = $2`,
        [wish.allocation_release_id, wish.product_id]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          wish: result.rows[0],
        }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to manage wish',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
