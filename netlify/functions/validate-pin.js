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

    await client.connect();

    // Get employee data
    const employeeQuery = `
      SELECT id, first_name, last_name, pin_hash, pin_attempts, pin_locked_until, layout_preference
      FROM employees
      WHERE id = $1 AND status = 'active' AND deleted_at IS NULL
    `;

    const result = await client.query(employeeQuery, [employee_id]);

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: 'Employee not found or inactive',
        }),
      };
    }

    const employee = result.rows[0];

    // Check if account is locked
    if (employee.pin_locked_until && new Date(employee.pin_locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(employee.pin_locked_until) - new Date()) / 60000);
      return {
        statusCode: 403,
        body: JSON.stringify({
          success: false,
          error: `Account locked. Try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}`,
        }),
      };
    }

    // Check if PIN is set
    if (!employee.pin_hash) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'PIN not configured for this employee',
        }),
      };
    }

    // Validate PIN
    const isValid = await bcrypt.compare(pin, employee.pin_hash);

    if (isValid) {
      // Reset failed attempts on successful login
      await client.query(
        'UPDATE employees SET pin_attempts = 0, pin_locked_until = NULL WHERE id = $1',
        [employee_id]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          employee: {
            id: employee.id,
            first_name: employee.first_name,
            last_name: employee.last_name,
            layout_preference: employee.layout_preference || 'commerce',
          },
        }),
      };
    } else {
      // Increment failed attempts
      const newAttempts = (employee.pin_attempts || 0) + 1;
      const lockUntil = newAttempts >= 5 ? new Date(Date.now() + 15 * 60000) : null; // Lock for 15 minutes

      await client.query(
        'UPDATE employees SET pin_attempts = $1, pin_locked_until = $2 WHERE id = $1',
        [newAttempts, lockUntil, employee_id]
      );

      if (lockUntil) {
        return {
          statusCode: 403,
          body: JSON.stringify({
            success: false,
            error: 'Too many failed attempts. Account locked for 15 minutes.',
          }),
        };
      }

      return {
        statusCode: 401,
        body: JSON.stringify({
          success: false,
          error: `Invalid PIN. ${5 - newAttempts} attempt${5 - newAttempts === 1 ? '' : 's'} remaining.`,
        }),
      };
    }
  } catch (error) {
    console.error('Error validating PIN:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to validate PIN',
      }),
    };
  } finally {
    await client.end();
  }
};
