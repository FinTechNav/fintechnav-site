const { Client } = require('pg');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  let customer;
  try {
    customer = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Invalid JSON in request body',
      }),
    };
  }

  if (!customer.id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Customer ID is required',
      }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();

    // Check if customer exists
    const existingCustomer = await client.query(
      'SELECT id, version FROM customers WHERE id = $1 AND deleted_at IS NULL',
      [customer.id]
    );

    if (existingCustomer.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Customer not found',
        }),
      };
    }

    // Build dynamic UPDATE query based on provided fields
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    const updatableFields = [
      'email',
      'first_name',
      'last_name',
      'phone',
      'phone_country_code',
      'phone_type',
      'customer_code',
      'title',
      'company',
      'job_title',
      'address',
      'address2',
      'city',
      'state_code',
      'province',
      'zip_code',
      'country_code',
      'locale',
      'timezone',
      'preferred_language',
      'email_marketing_status',
      'sms_marketing_status',
      'contact_preference',
      'marketing_opt_in_source',
      'marketing_opt_in_date',
      'currency_code',
      'acquisition_channel',
      'customer_status',
      'club_member_status',
      'club_tier',
      'club_join_date',
      'allocation_list_status',
      'allocation_tier',
      'dietary_notes',
      'food_preferences',
      'allergy_notes',
      'dislikes',
      'visit_preferences',
      'spouse_name',
      'spouse_customer_id',
      'loyalty_card_number',
      'loyalty_account_id',
      'loyalty_provider',
      'loyalty_tier',
      'loyalty_points_balance',
      'account_balance_cents',
      'store_credit_cents',
      'tax_exempt_status',
      'tax_id',
      'vat_number',
      'customer_group_id',
      'tags',
      'staff_notices',
      'internal_notes',
      'avatar_url',
      'visit_count',
      'last_visit_date',
      'external_system_id',
      'social_profile_id',
      'birth_date',
    ];

    const jsonbFields = ['special_days', 'external_attributes', 'custom_attributes'];

    // Process regular fields
    updatableFields.forEach((field) => {
      if (customer[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        values.push(customer[field]);
        paramIndex++;
      }
    });

    // Process JSONB fields
    jsonbFields.forEach((field) => {
      if (customer[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        values.push(customer[field] ? JSON.stringify(customer[field]) : null);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'No fields to update',
        }),
      };
    }

    // Always update updated_at
    updateFields.push('updated_at = NOW()');

    // Add customer ID as last parameter
    values.push(customer.id);

    const query = `
      UPDATE customers 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex} AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await client.query(query, values);

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
        error: 'Failed to update customer',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
