const { Client } = require('pg');

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
    const { employee_id, layout_preference } = JSON.parse(event.body);

    if (!employee_id || !layout_preference) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Missing employee_id or layout_preference',
        }),
      };
    }

    if (!['commerce', 'carord'].includes(layout_preference)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Invalid layout_preference. Must be commerce or carord',
        }),
      };
    }

    await client.connect();

    const updateQuery = `
      UPDATE employees 
      SET layout_preference = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, layout_preference
    `;

    const result = await client.query(updateQuery, [layout_preference, employee_id]);

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: 'Employee not found',
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        layout_preference: result.rows[0].layout_preference,
      }),
    };
  } catch (error) {
    console.error('Error updating layout preference:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to update layout preference',
      }),
    };
  } finally {
    await client.end();
  }
};
