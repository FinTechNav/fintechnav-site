// netlify/functions/test-db-connection.js
// Simple test to verify database connectivity

const { Client } = require('pg');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'DATABASE_URL not set',
        message: 'DATABASE_URL environment variable is missing in Netlify',
      }),
    };
  }

  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  console.log('DATABASE_URL length:', process.env.DATABASE_URL.length);

  // Try to parse the connection string
  let parsedUrl;
  try {
    parsedUrl = new URL(process.env.DATABASE_URL);
    console.log('Database host:', parsedUrl.hostname);
    console.log('Database port:', parsedUrl.port);
    console.log('Database name:', parsedUrl.pathname);
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Invalid DATABASE_URL format',
        message: error.message,
      }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false, // Your server doesn't support SSL
    connectionTimeoutMillis: 5000, // 5 second timeout
  });

  try {
    console.log('Attempting to connect...');
    await client.connect();
    console.log('Connected successfully!');

    // Test basic query
    const result = await client.query('SELECT NOW() as current_time, version()');
    console.log('Query successful');

    // Try to check for our tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'dejavoo_%'
      ORDER BY table_name
    `);

    // Try to count customers
    let customerCount = 0;
    try {
      const countResult = await client.query('SELECT COUNT(*) as count FROM dejavoo_customers');
      customerCount = countResult.rows[0].count;
    } catch (err) {
      console.log('dejavoo_customers table not found:', err.message);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Database connection successful',
        database_time: result.rows[0].current_time,
        postgres_version: result.rows[0].version,
        dejavoo_tables: tablesResult.rows.map((r) => r.table_name),
        customer_count: customerCount,
        connection_info: {
          host: parsedUrl.hostname,
          port: parsedUrl.port || '5432',
          database: parsedUrl.pathname.replace('/', ''),
        },
      }),
    };
  } catch (error) {
    console.error('Database connection error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Database connection failed',
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        connection_info: {
          host: parsedUrl.hostname,
          port: parsedUrl.port || '5432',
        },
      }),
    };
  } finally {
    await client.end();
  }
};
