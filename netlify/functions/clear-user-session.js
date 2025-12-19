const { Client } = require('pg');

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();
    console.log('📦 Connected to database');

    const { employee_id, winery_id } = JSON.parse(event.body);

    if (!employee_id || !winery_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'employee_id and winery_id are required',
        }),
      };
    }

    console.log('🗑️ Clearing session for employee:', employee_id, 'at winery:', winery_id);

    // Delete the session
    const result = await client.query(
      `DELETE FROM user_sessions 
       WHERE employee_id = $1 AND winery_id = $2
       RETURNING id`,
      [employee_id, winery_id]
    );

    if (result.rows.length === 0) {
      console.log('ℹ️ No session to clear');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No session to clear',
        }),
      };
    }

    console.log('✅ Session cleared:', result.rows[0].id);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Session cleared',
      }),
    };
  } catch (error) {
    console.error('❌ Error clearing session:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to clear session',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
