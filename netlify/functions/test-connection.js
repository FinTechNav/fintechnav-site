const { Client } = require('pg');

exports.handler = async (event, context) => {
  // Create database client
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false, // No SSL for local database
  });

  try {
    // Attempt to connect
    await client.connect();

    // Test query
    const result = await client.query('SELECT version(), current_database(), current_user');

    // Get connection info
    const dbInfo = result.rows[0];

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        message: 'Database connection successful!',
        database: dbInfo.current_database,
        user: dbInfo.current_user,
        version: dbInfo.version.split(' ').slice(0, 2).join(' '), // Simplified version
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Database connection error:', error);

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
          hint: error.hint || 'Check your DATABASE_URL environment variable',
        },
      }),
    };
  } finally {
    // Always close the connection
    await client.end();
  }
};
