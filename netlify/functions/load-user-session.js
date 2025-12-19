const { Client } = require('pg');

exports.handler = async (event) => {
  // Only allow GET
  if (event.httpMethod !== 'GET') {
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

    const { employee_id, winery_id } = event.queryStringParameters || {};

    if (!employee_id || !winery_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'employee_id and winery_id are required',
        }),
      };
    }

    console.log('📖 Loading session for employee:', employee_id, 'at winery:', winery_id);

    // First, cleanup expired sessions
    await client.query(
      "DELETE FROM user_sessions WHERE last_activity_at < NOW() - INTERVAL '5 hours'"
    );

    // Load the session
    const result = await client.query(
      `SELECT id, current_screen, pos_state, last_activity_at, created_at
       FROM user_sessions
       WHERE employee_id = $1 AND winery_id = $2
       AND last_activity_at > NOW() - INTERVAL '5 hours'`,
      [employee_id, winery_id]
    );

    if (result.rows.length === 0) {
      console.log('ℹ️ No active session found');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          session_found: false,
          message: 'No active session (expired or never created)',
        }),
      };
    }

    const session = result.rows[0];
    console.log('✅ Session loaded:', session.id);
    console.log('📍 Screen:', session.current_screen);
    console.log('🛒 POS state:', JSON.stringify(session.pos_state));

    // Update last_activity_at since loading a session counts as activity
    await client.query('UPDATE user_sessions SET last_activity_at = NOW() WHERE id = $1', [
      session.id,
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        session_found: true,
        session: {
          id: session.id,
          current_screen: session.current_screen,
          pos_state: session.pos_state,
          last_activity_at: session.last_activity_at,
          created_at: session.created_at,
        },
      }),
    };
  } catch (error) {
    console.error('❌ Error loading session:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to load session',
        details: error.message,
        stack: error.stack,
      }),
    };
  } finally {
    await client.end();
  }
};
