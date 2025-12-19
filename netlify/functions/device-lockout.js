const { Client } = require('pg');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    const { winery_id, action } =
      event.httpMethod === 'POST' ? JSON.parse(event.body) : event.queryStringParameters;

    if (!winery_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'winery_id is required',
        }),
      };
    }

    if (event.httpMethod === 'GET') {
      // Get current lockout status
      const result = await client.query(
        `SELECT failed_attempts, locked_until 
         FROM device_lockout 
         WHERE winery_id = $1`,
        [winery_id]
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            failed_attempts: 0,
            locked_until: null,
            is_locked: false,
          }),
        };
      }

      const lockout = result.rows[0];
      const isLocked = lockout.locked_until && new Date(lockout.locked_until) > new Date();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          failed_attempts: lockout.failed_attempts || 0,
          locked_until: lockout.locked_until,
          is_locked: isLocked,
        }),
      };
    }

    if (event.httpMethod === 'POST') {
      if (action === 'increment') {
        // Increment failed attempts
        const result = await client.query(
          `INSERT INTO device_lockout (winery_id, failed_attempts, updated_at)
           VALUES ($1, 1, NOW())
           ON CONFLICT (winery_id) 
           DO UPDATE SET 
             failed_attempts = device_lockout.failed_attempts + 1,
             updated_at = NOW()
           RETURNING failed_attempts`,
          [winery_id]
        );

        const failedAttempts = result.rows[0].failed_attempts;

        // Apply lockout if >= 5 attempts
        if (failedAttempts >= 5) {
          const lockoutSeconds = (failedAttempts - 4) * 5;
          const lockedUntil = new Date(Date.now() + lockoutSeconds * 1000);

          await client.query(
            `UPDATE device_lockout 
             SET locked_until = $1 
             WHERE winery_id = $2`,
            [lockedUntil, winery_id]
          );

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              failed_attempts: failedAttempts,
              locked_until: lockedUntil,
              is_locked: true,
              lockout_seconds: lockoutSeconds,
            }),
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            failed_attempts: failedAttempts,
            locked_until: null,
            is_locked: false,
          }),
        };
      }

      if (action === 'reset') {
        // Reset on successful login
        await client.query(
          `UPDATE device_lockout 
           SET failed_attempts = 0, locked_until = NULL, updated_at = NOW()
           WHERE winery_id = $1`,
          [winery_id]
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            failed_attempts: 0,
            locked_until: null,
            is_locked: false,
          }),
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid action. Use "increment" or "reset"',
        }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('Error in device-lockout:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to manage device lockout',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
