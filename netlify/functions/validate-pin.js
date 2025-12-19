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
      // Successful login - device handles lockout, no need for server-side attempt tracking
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          employee: {
            id: employee.id,
            first_name: employee.first_name,
            last_name: employee.last_name,
            layout_preference: employee.layout_preference || 'commerce',
            auto_logout_enabled: employee.auto_logout_enabled !== false,
            auto_logout_minutes: employee.auto_logout_minutes || 5,
          },
        }),
      };
    } else {
      // Invalid PIN - device handles lockout, just return simple error
      return {
        statusCode: 401,
        body: JSON.stringify({
          success: false,
          error: 'Invalid PIN',
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
