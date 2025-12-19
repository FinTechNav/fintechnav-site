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

    const { employee_id, winery_id, current_screen, pos_state } = JSON.parse(event.body);

    console.log('💾 Saving session for employee:', employee_id, 'at winery:', winery_id);
    console.log('📍 Current screen:', current_screen);
    console.log('🛒 POS state:', JSON.stringify(pos_state));

    if (!employee_id || !winery_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'employee_id and winery_id are required',
        }),
      };
    }

    // First, cleanup expired sessions
    await client.query(
      "DELETE FROM user_sessions WHERE last_activity_at < NOW() - INTERVAL '5 hours'"
    );

    // Upsert the session (insert or update if exists)
    const result = await client.query(
      `INSERT INTO user_sessions (employee_id, winery_id, current_screen, pos_state, last_activity_at)
       VALUES ($1, $2, $3, $4::jsonb, NOW())
       ON CONFLICT (employee_id, winery_id) 
       DO UPDATE SET 
         current_screen = EXCLUDED.current_screen,
         pos_state = EXCLUDED.pos_state,
         last_activity_at = NOW()
       RETURNING id, last_activity_at`,
      [employee_id, winery_id, current_screen || 'pos', JSON.stringify(pos_state || {})]
    );

    console.log('✅ Session saved:', result.rows[0].id);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        session_id: result.rows[0].id,
        last_activity_at: result.rows[0].last_activity_at,
      }),
    };
  } catch (error) {
    console.error('❌ Error saving session:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to save session',
        details: error.message,
        stack: error.stack,
      }),
    };
  } finally {
    await client.end();
  }
};
