const { Client } = require('pg');

exports.handler = async (event) => {
  console.log('=== get-payment-methods called ===');
  console.log('Event:', JSON.stringify(event, null, 2));
  console.log('HTTP Method:', event.httpMethod);
  console.log('Query String Parameters:', JSON.stringify(event.queryStringParameters, null, 2));

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    console.log('OPTIONS request - returning 200');
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    console.log('ERROR: Invalid method:', event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const params = event.queryStringParameters || {};
  const { customer_id } = params;

  console.log('Customer ID requested:', customer_id);
  console.log('Customer ID type:', typeof customer_id);

  if (!customer_id) {
    console.log('ERROR: No customer_id provided');
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'customer_id required',
      }),
    };
  }

  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  console.log(
    'DATABASE_URL length:',
    process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0
  );

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    console.log('Attempting to connect to database...');
    await client.connect();
    console.log('Database connected successfully');

    console.log('Executing query for customer:', customer_id);
    const query = `
      SELECT 
        id,
        customer_id,
        card_brand,
        last_four,
        expiry_month,
        expiry_year,
        billing_name,
        billing_address,
        billing_city,
        billing_state,
        billing_zip,
        billing_country,
        card_fingerprint,
        is_default,
        created_at
      FROM payment_methods
      WHERE customer_id = $1 
        AND deleted_at IS NULL
      ORDER BY is_default DESC, created_at DESC
    `;

    console.log('Query parameters:', [customer_id]);
    const result = await client.query(query, [customer_id]);
    console.log('Query executed successfully');
    console.log('Payment methods found:', result.rows.length);
    console.log('Result rows:', JSON.stringify(result.rows, null, 2));

    const response = {
      success: true,
      payment_methods: result.rows,
    };

    console.log('=== SUCCESS: Returning payment methods ===');
    console.log('Response:', JSON.stringify(response, null, 2));
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('=== ERROR in get-payment-methods ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    console.error('Error constraint:', error.constraint);
    console.error('Error table:', error.table);
    console.error('Error column:', error.column);
    console.error(
      'Full error object:',
      JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    );

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to retrieve payment methods',
        details: error.message,
        errorCode: error.code,
        errorName: error.name,
      }),
    };
  } finally {
    try {
      console.log('Closing database connection...');
      await client.end();
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error.message);
    }
  }
};
