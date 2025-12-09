const { Client } = require('pg');

exports.handler = async (event, context) => {
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

  const wineryId = event.queryStringParameters?.winery_id;

  if (!wineryId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'winery_id parameter is required' }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    console.log('🔄 Connecting to database...');
    await client.connect();
    console.log('✅ Database connected');

    console.log('🔍 Querying for winery_id:', wineryId);

    // First check if winery exists
    const wineryCheck = await client.query('SELECT id, name FROM wineries WHERE id = $1', [
      wineryId,
    ]);
    console.log('🏢 Winery check result:', wineryCheck.rows);

    // Check total customers in database
    const totalCustomers = await client.query(
      'SELECT COUNT(*) as count FROM customers WHERE deleted_at IS NULL'
    );
    console.log('👥 Total customers in database:', totalCustomers.rows[0].count);

    // Check customer_wineries table
    const cwCount = await client.query(
      'SELECT COUNT(*) as count FROM customer_wineries WHERE winery_id = $1 AND deleted_at IS NULL',
      [wineryId]
    );
    console.log('🔗 customer_wineries entries for this winery:', cwCount.rows[0].count);

    // Check if customer_wineries table exists and has the correct schema
    const tableCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customer_wineries'
      ORDER BY ordinal_position
    `);
    console.log('📋 customer_wineries table schema:', JSON.stringify(tableCheck.rows, null, 2));

    // Try junction table first
    let result = await client.query(
      `
      SELECT 
        c.id,
        c.email,
        c.name,
        c.phone,
        c.created_at
      FROM customers c
      INNER JOIN customer_wineries cw ON c.id = cw.customer_id
      WHERE cw.winery_id = $1
        AND c.deleted_at IS NULL
        AND cw.deleted_at IS NULL
      ORDER BY c.name ASC
    `,
      [wineryId]
    );

    console.log('📊 Junction table query returned', result.rows.length, 'customers');

    // If junction table returns 0, try direct winery_id column
    if (result.rows.length === 0) {
      console.log('🔄 Junction table empty, trying direct winery_id column...');

      result = await client.query(
        `
        SELECT 
          c.id,
          c.email,
          c.name,
          c.phone,
          c.created_at
        FROM customers c
        WHERE c.winery_id = $1
          AND c.deleted_at IS NULL
        ORDER BY c.name ASC
      `,
        [wineryId]
      );

      console.log('📊 Direct winery_id query returned', result.rows.length, 'customers');
    }

    if (result.rows.length > 0) {
      console.log('📦 Sample customer data:', JSON.stringify(result.rows[0], null, 2));
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        customers: result.rows,
      }),
    };
  } catch (error) {
    console.error('❌ Database error:', error);
    console.error('❌ Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to retrieve customers',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
