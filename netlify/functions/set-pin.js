const { Client } = require('pg');
const bcrypt = require('bcryptjs');

exports.handler = async (event) => {
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
    const { employee_id, pin } = JSON.parse(event.body);

    if (!employee_id || !pin) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Missing employee_id or pin',
        }),
      };
    }

    // Validate PIN format (4-6 digits)
    if (!/^\d{4,6}$/.test(pin)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'PIN must be 4-6 digits',
        }),
      };
    }

    await client.connect();

    // Hash the PIN
    const saltRounds = 10;
    const pin_hash = await bcrypt.hash(pin, saltRounds);

    // Update employee record
    const updateQuery = `
      UPDATE employees 
      SET pin_hash = $1, 
          last_pin_change = NOW(), 
          pin_attempts = 0, 
          pin_locked_until = NULL,
          updated_at = NOW()
      WHERE id = $2 AND status = 'active' AND deleted_at IS NULL
      RETURNING id, first_name, last_name
    `;

    const result = await client.query(updateQuery, [pin_hash, employee_id]);

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: 'Employee not found or inactive',
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'PIN set successfully',
      }),
    };
  } catch (error) {
    console.error('Error setting PIN:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to set PIN',
      }),
    };
  } finally {
    await client.end();
  }
};
