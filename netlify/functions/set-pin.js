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

    // Get employee's winery_id
    const employeeQuery = `
      SELECT winery_id 
      FROM employees 
      WHERE id = $1 AND status = 'active' AND deleted_at IS NULL
    `;
    const employeeResult = await client.query(employeeQuery, [employee_id]);

    if (employeeResult.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: 'Employee not found or inactive',
        }),
      };
    }

    const winery_id = employeeResult.rows[0].winery_id;

    // Check if PIN already exists for another employee in this winery
    const duplicateCheckQuery = `
      SELECT id, first_name, last_name, pin_hash
      FROM employees
      WHERE winery_id = $1 
        AND id != $2 
        AND status = 'active' 
        AND deleted_at IS NULL
        AND pin_hash IS NOT NULL
    `;
    const duplicateResult = await client.query(duplicateCheckQuery, [winery_id, employee_id]);

    // Check each existing PIN hash in this winery against the new PIN
    for (const otherEmployee of duplicateResult.rows) {
      const isDuplicate = await bcrypt.compare(pin, otherEmployee.pin_hash);
      if (isDuplicate) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            success: false,
            error: 'Invalid PIN. Please choose a different PIN.',
          }),
        };
      }
    }

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
