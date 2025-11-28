const { Client } = require('pg');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const params = event.queryStringParameters || {};
  const { id, email } = params;

  if (!id && !email) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Must provide either id or email parameter',
      }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();

    let query;
    let values;

    if (id) {
      query = `
        SELECT 
          c.*,
          cs.country_name,
          cs.default_currency,
          cs.state_label,
          cs.vat_enabled
        FROM customers c
        LEFT JOIN country_settings cs ON c.country_code = cs.country_code
        WHERE c.id = $1 AND c.deleted_at IS NULL
      `;
      values = [id];
    } else {
      query = `
        SELECT 
          c.*,
          cs.country_name,
          cs.default_currency,
          cs.state_label,
          cs.vat_enabled
        FROM customers c
        LEFT JOIN country_settings cs ON c.country_code = cs.country_code
        WHERE c.email = $1 AND c.deleted_at IS NULL
      `;
      values = [email];
    }

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Customer not found',
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        customer: result.rows[0],
      }),
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to retrieve customer',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
