const { Client } = require('pg');

exports.handler = async (event, context) => {
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

  try {
    const { reference_id } = event.queryStringParameters || {};

    if (!reference_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'reference_id is required' }),
      };
    }

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: false,
    });

    await client.connect();

    const result = await client.query(
      'SELECT * FROM terminal_transaction_status WHERE reference_id = $1',
      [reference_id]
    );

    await client.end();

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Transaction not found',
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        transaction: result.rows[0],
      }),
    };
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to fetch transaction',
        details: error.message,
      }),
    };
  }
};
