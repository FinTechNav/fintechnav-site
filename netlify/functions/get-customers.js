// netlify/functions/get-customers.js
const { Client } = require('pg');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
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
    await client.connect();
    console.log('✅ Connected to database');

    const query = `
      SELECT 
        customer_id,
        customer_name,
        email,
        billing_street,
        billing_city,
        billing_state,
        billing_zip,
        billing_country
      FROM dejavoo_customers
      ORDER BY customer_name ASC
    `;

    const result = await client.query(query);

    console.log(`✅ Retrieved ${result.rows.length} customers`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result.rows),
    };
  } catch (error) {
    console.error('❌ Database error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to retrieve customers',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
