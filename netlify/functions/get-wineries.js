const { Client } = require('pg');

exports.handler = async (event, context) => {
  // Create database client
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false, // No SSL for local database
  });

  try {
    // Connect to database
    await client.connect();

    // Query wineries table
    const result = await client.query(`
      SELECT 
        id, 
        name, 
        domain, 
        created_at, 
        updated_at 
      FROM wineries 
      ORDER BY created_at DESC
    `);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        count: result.rowCount,
        wineries: result.rows,
      }),
    };
  } catch (error) {
    console.error('Database query error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        details: {
          code: error.code,
          table: 'wineries',
          hint: error.hint || 'Make sure the wineries table exists',
        },
      }),
    };
  } finally {
    await client.end();
  }
};
