const { Client } = require('pg');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const params = event.queryStringParameters || {};
  const { id } = params;

  if (!id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Customer ID is required',
      }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();

    // Get customer basic info
    const customerQuery = `
      SELECT 
        id,
        first_name,
        last_name,
        email,
        country_code,
        currency_code,
        customer_status,
        club_member_status,
        lifetime_value_cents,
        total_spend_cents,
        order_count,
        visit_count
      FROM customers
      WHERE id = $1 AND deleted_at IS NULL
    `;

    const customerResult = await client.query(customerQuery, [id]);

    if (customerResult.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Customer not found',
        }),
      };
    }

    const customer = customerResult.rows[0];

    // Get order statistics from orders table
    const orderStatsQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_spent,
        COALESCE(AVG(total_amount), 0) as average_order_value,
        MIN(created_at) as first_order_date,
        MAX(created_at) as last_order_date
      FROM orders
      WHERE customer_id = $1
    `;

    const orderStatsResult = await client.query(orderStatsQuery, [id]);
    const orderStats = orderStatsResult.rows[0];

    // Get recent orders
    const recentOrdersQuery = `
      SELECT 
        id,
        order_number,
        total_amount,
        tax_amount,
        order_source,
        created_at
      FROM orders
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const recentOrdersResult = await client.query(recentOrdersQuery, [id]);

    // Get reservation statistics if reservations table exists
    let reservationStats = null;
    try {
      const reservationStatsQuery = `
        SELECT 
          COUNT(*) as total_reservations,
          COUNT(*) FILTER (WHERE visit_status = 'completed') as completed_visits,
          COUNT(*) FILTER (WHERE no_show = true) as no_shows,
          MAX(datetime) as last_visit_date
        FROM reservations
        WHERE customer_id = $1 AND deleted_at IS NULL
      `;

      const reservationStatsResult = await client.query(reservationStatsQuery, [id]);
      reservationStats = reservationStatsResult.rows[0];
    } catch (error) {
      // Reservations table might not exist yet
      console.log('Reservations table not found, skipping reservation stats');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        customer,
        order_stats: {
          total_orders: parseInt(orderStats.total_orders),
          total_spent: parseFloat(orderStats.total_spent),
          average_order_value: parseFloat(orderStats.average_order_value),
          first_order_date: orderStats.first_order_date,
          last_order_date: orderStats.last_order_date,
        },
        recent_orders: recentOrdersResult.rows,
        reservation_stats: reservationStats,
      }),
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to retrieve customer statistics',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
