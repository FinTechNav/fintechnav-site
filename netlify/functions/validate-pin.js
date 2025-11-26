const { Client } = require('pg');

exports.handler = async (event) => {
  console.log('🔐 validate-pin function called');

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
    console.log('📦 Request data:', { employee_id, pin });

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
    console.log('✅ Database connected');

    // Get employee data
    const employeeQuery = `
      SELECT id, first_name, last_name, pin_hash, pin_attempts, pin_locked_until, layout_preference
      FROM employees
      WHERE id = $1 AND status = 'active' AND deleted_at IS NULL
    `;

    const result = await client.query(employeeQuery, [employee_id]);
    console.log('📊 Query result:', result.rows.length, 'rows');

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
    console.log('👤 Employee found:', employee.first_name, employee.last_name);
    console.log('🔑 Has pin_hash:', !!employee.pin_hash);

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

    // Try to load bcrypt
    let bcrypt;
    try {
      bcrypt = require('bcryptjs');
      console.log('✅ bcryptjs loaded');
    } catch (e) {
      console.error('❌ bcryptjs not available:', e.message);
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error:
            'bcryptjs module not installed. Run: npm install bcryptjs in netlify/functions directory',
        }),
      };
    }

    // Validate PIN
    console.log('🔐 Validating PIN...');
    const isValid = await bcrypt.compare(pin, employee.pin_hash);
    console.log('🔐 PIN valid:', isValid);

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
      const lockUntil = newAttempts >= 5 ? new Date(Date.now() + 15 * 60000) : null;

      await client.query(
        'UPDATE employees SET pin_attempts = $1, pin_locked_until = $2 WHERE id = $3',
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
    console.error('❌ Error in validate-pin:', error);
    console.error('Error stack:', error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to validate PIN',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
