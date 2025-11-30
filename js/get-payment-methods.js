const { Client } = require('pg');

exports.handler = async (event) => {
  console.log('=== get-payment-methods called ===');
  console.log('Event:', JSON.stringify(event, null, 2));

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

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Database connected successfully');

    console.log('Fetching payment methods for customer:', customer_id);
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

    const result = await client.query(query, [customer_id]);
    console.log('Payment methods found:', result.rows.length);

    const response = {
      success: true,
      payment_methods: result.rows,
    };

    console.log('=== SUCCESS: Returning payment methods ===');
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
