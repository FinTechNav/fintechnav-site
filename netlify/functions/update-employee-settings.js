const { Client } = require('pg');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    const { employee_id, auto_logout_enabled, auto_logout_minutes } = JSON.parse(event.body);

    if (!employee_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'employee_id is required',
        }),
      };
    }

    await client.connect();

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (auto_logout_enabled !== undefined) {
      updates.push(`auto_logout_enabled = $${paramCount}`);
      values.push(auto_logout_enabled);
      paramCount++;
    }

    if (auto_logout_minutes !== undefined) {
      updates.push(`auto_logout_minutes = $${paramCount}`);
      values.push(auto_logout_minutes);
      paramCount++;
    }

    if (updates.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'No settings to update',
        }),
      };
    }

    updates.push('updated_at = NOW()');
    values.push(employee_id);

    const updateQuery = `
      UPDATE employees 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount} AND status = 'active' AND deleted_at IS NULL
      RETURNING id, auto_logout_enabled, auto_logout_minutes
    `;

    const result = await client.query(updateQuery, values);

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Employee not found or inactive',
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        employee: result.rows[0],
      }),
    };
  } catch (error) {
    console.error('Error updating employee settings:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to update settings',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
