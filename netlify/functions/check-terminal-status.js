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

  console.log('🔵 check-terminal-status.js invoked');

  try {
    const { reference_id } = event.queryStringParameters || {};
    console.log('📊 Query params:', event.queryStringParameters);
    console.log('📊 Reference ID:', reference_id);

    if (!reference_id) {
      console.error('❌ No reference_id provided');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'reference_id is required' }),
      };
    }

    console.log('🔌 Connecting to database...');
    console.log('🔌 Database URL exists:', !!process.env.DATABASE_URL);

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: false,
    });

    await client.connect();
    console.log('✅ Database connected');

    console.log('🔍 Querying for reference_id:', reference_id);
    const result = await client.query(
      `SELECT 
        status, 
        updated_at, 
        spin_response->>'ResultCode' as result_code,
        spin_response->'GeneralResponse'->>'Message' as message,
        amount
      FROM terminal_transaction_status 
      WHERE reference_id = $1`,
      [reference_id]
    );

    console.log('📊 Query result rows:', result.rows.length);
    if (result.rows.length > 0) {
      console.log('📊 Found row:', result.rows[0]);
    }

    await client.end();
    console.log('🔌 Database connection closed');

    if (result.rows.length === 0) {
      console.log('ℹ️ Transaction not found');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'not_found',
          message: 'Transaction not found',
        }),
      };
    }

    console.log('✅ Returning status:', result.rows[0].status);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result.rows[0]),
    };
  } catch (error) {
    console.error('❌ Error checking terminal status:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to check terminal status',
        details: error.message,
      }),
    };
  }
};
