const { Client } = require('pg');

exports.handler = async (event) => {
  console.log('=== get-customer-stats called ===');
  console.log('Event:', JSON.stringify(event, null, 2));

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
    console.log('ERROR: Invalid method:', event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const params = event.queryStringParameters || {};
  const { id } = params;

  console.log('Customer ID requested:', id);

  if (!id) {
    console.log('ERROR: No customer ID provided');
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
    console.log('Connecting to database...');
    await client.connect();
    console.log('Database connected successfully');

    // Get customer basic info - fetch ALL fields to ensure we have everything
    console.log('Fetching customer data for ID:', id);
    const customerQuery = `
      SELECT *
      FROM customers
      WHERE id = $1 AND deleted_at IS NULL
    `;

    const customerResult = await client.query(customerQuery, [id]);
    console.log('Customer query result rows:', customerResult.rows.length);

    if (customerResult.rows.length === 0) {
      console.log('ERROR: Customer not found for ID:', id);
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
    console.log('Customer found:', {
      id: customer.id,
      email: customer.email,
      first_name: customer.first_name,
      last_name: customer.last_name,
    });

    // Get order statistics - handle both total_amount and total_amount_cents
    console.log('Fetching order statistics...');
    const orderStatsQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE 
          WHEN total_amount_cents IS NOT NULL THEN total_amount_cents 
          WHEN total_amount IS NOT NULL THEN total_amount * 100 
          ELSE 0 
        END), 0) as total_spent_cents,
        COALESCE(AVG(CASE 
          WHEN total_amount_cents IS NOT NULL THEN total_amount_cents 
          WHEN total_amount IS NOT NULL THEN total_amount * 100 
          ELSE 0 
        END), 0) as average_order_value_cents,
        MIN(created_at) as first_order_date,
        MAX(created_at) as last_order_date
      FROM orders
      WHERE customer_id = $1 AND deleted_at IS NULL
    `;

    const orderStatsResult = await client.query(orderStatsQuery, [id]);
    const orderStats = orderStatsResult.rows[0];
    console.log('Order stats:', {
      total_orders: orderStats.total_orders,
      total_spent_cents: orderStats.total_spent_cents,
      first_order: orderStats.first_order_date,
      last_order: orderStats.last_order_date,
    });

    // Get recent orders - handle both amount fields
    console.log('Fetching recent orders...');
    const recentOrdersQuery = `
      SELECT 
        id,
        order_number,
        CASE 
          WHEN total_amount_cents IS NOT NULL THEN total_amount_cents 
          WHEN total_amount IS NOT NULL THEN total_amount * 100 
          ELSE 0 
        END as total_amount_cents,
        CASE 
          WHEN tax_amount_cents IS NOT NULL THEN tax_amount_cents 
          WHEN tax_amount IS NOT NULL THEN tax_amount * 100 
          ELSE 0 
        END as tax_amount_cents,
        order_source,
        created_at,
        shipped_at
      FROM orders
      WHERE customer_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const recentOrdersResult = await client.query(recentOrdersQuery, [id]);
    console.log('Recent orders found:', recentOrdersResult.rows.length);

    // Get reservation statistics if reservations table exists
    let reservationStats = null;
    try {
      console.log('Attempting to fetch reservation statistics...');
      const reservationStatsQuery = `
        SELECT 
          COUNT(*) as total_reservations,
          COUNT(*) FILTER (WHERE visit_status = 'completed' OR visit_status = 'left') as completed_visits,
          COUNT(*) FILTER (WHERE visit_status = 'no_show') as no_shows,
          MAX(datetime) as last_visit_date
        FROM reservations
        WHERE customer_id = $1 AND deleted_at IS NULL
      `;

      const reservationStatsResult = await client.query(reservationStatsQuery, [id]);
      reservationStats = reservationStatsResult.rows[0];
      console.log('Reservation stats:', reservationStats);
    } catch (error) {
      console.log('Reservations table not found or error:', error.message);
      // Reservations table might not exist yet - this is okay
    }

    const response = {
      success: true,
      customer,
      order_stats: {
        total_orders: parseInt(orderStats.total_orders),
        total_spent_cents: parseInt(orderStats.total_spent_cents),
        average_order_value_cents: Math.round(parseFloat(orderStats.average_order_value_cents)),
        first_order_date: orderStats.first_order_date,
        last_order_date: orderStats.last_order_date,
      },
      recent_orders: recentOrdersResult.rows,
      reservation_stats: reservationStats,
    };

    console.log('=== SUCCESS: Returning response ===');
    console.log('Response summary:', {
      customer_id: customer.id,
      customer_email: customer.email,
      total_orders: response.order_stats.total_orders,
      recent_orders_count: response.recent_orders.length,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('=== ERROR in get-customer-stats ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to retrieve customer statistics',
        details: error.message,
        errorCode: error.code,
        errorName: error.name,
      }),
    };
  } finally {
    try {
      console.log('Closing database connection...');
      await client.end();
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error.message);
    }
  }
};
