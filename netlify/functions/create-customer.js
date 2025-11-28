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

  // Validate required fields
  if (!customer.email) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Email is required',
      }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();

    // Check for duplicate email
    const duplicateCheck = await client.query(
      'SELECT id FROM customers WHERE email = $1 AND deleted_at IS NULL',
      [customer.email]
    );

    if (duplicateCheck.rows.length > 0) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Customer with this email already exists',
          existing_id: duplicateCheck.rows[0].id,
        }),
      };
    }

    // Set defaults based on country_code if not provided
    const countryCode = customer.country_code || 'US';
    const countrySettings = await client.query(
      'SELECT * FROM country_settings WHERE country_code = $1',
      [countryCode]
    );

    const defaults =
      countrySettings.rows.length > 0
        ? countrySettings.rows[0]
        : {
            default_currency: 'USD',
            default_locale: 'en-US',
            default_timezone: 'America/Los_Angeles',
          };

    const query = `
      INSERT INTO customers (
        email,
        first_name,
        last_name,
        phone,
        phone_country_code,
        phone_type,
        customer_code,
        title,
        company,
        job_title,
        address,
        address2,
        city,
        state_code,
        province,
        zip_code,
        country_code,
        locale,
        timezone,
        preferred_language,
        email_marketing_status,
        sms_marketing_status,
        contact_preference,
        marketing_opt_in_source,
        marketing_opt_in_date,
        currency_code,
        acquisition_channel,
        customer_status,
        club_member_status,
        club_tier,
        club_join_date,
        allocation_list_status,
        allocation_tier,
        dietary_notes,
        food_preferences,
        allergy_notes,
        dislikes,
        visit_preferences,
        special_days,
        spouse_name,
        spouse_customer_id,
        loyalty_card_number,
        loyalty_account_id,
        loyalty_provider,
        loyalty_tier,
        tax_exempt_status,
        tax_id,
        vat_number,
        customer_group_id,
        tags,
        staff_notices,
        internal_notes,
        avatar_url,
        external_system_id,
        external_attributes,
        social_profile_id,
        birth_date,
        custom_attributes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
        $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
        $51, $52, $53, $54, $55, $56, $57, $58, $59, $60,
        $61
      )
      RETURNING *
    `;

    const values = [
      customer.email,
      customer.first_name || null,
      customer.last_name || null,
      customer.phone || null,
      customer.phone_country_code || null,
      customer.phone_type || 'mobile',
      customer.customer_code || null,
      customer.title || null,
      customer.company || null,
      customer.job_title || null,
      customer.address || null,
      customer.address2 || null,
      customer.city || null,
      customer.state_code || null,
      customer.province || null,
      customer.zip_code || null,
      countryCode,
      customer.locale || defaults.default_locale,
      customer.timezone || defaults.default_timezone,
      customer.preferred_language || 'en',
      customer.email_marketing_status || 'pending',
      customer.sms_marketing_status || 'pending',
      customer.contact_preference || 'email',
      customer.marketing_opt_in_source || null,
      customer.marketing_opt_in_date || null,
      customer.currency_code || defaults.default_currency,
      customer.acquisition_channel || null,
      customer.customer_status || 'active',
      customer.club_member_status || 'none',
      customer.club_tier || null,
      customer.club_join_date || null,
      customer.allocation_list_status || 'none',
      customer.allocation_tier || null,
      customer.dietary_notes || null,
      customer.food_preferences || null,
      customer.allergy_notes || null,
      customer.dislikes || null,
      customer.visit_preferences || null,
      customer.special_days ? JSON.stringify(customer.special_days) : null,
      customer.spouse_name || null,
      customer.spouse_customer_id || null,
      customer.loyalty_card_number || null,
      customer.loyalty_account_id || null,
      customer.loyalty_provider || null,
      customer.loyalty_tier || null,
      customer.tax_exempt_status || false,
      customer.tax_id || null,
      customer.vat_number || null,
      customer.customer_group_id || null,
      customer.tags || null,
      customer.staff_notices || null,
      customer.internal_notes || null,
      customer.avatar_url || null,
      customer.external_system_id || null,
      customer.external_attributes ? JSON.stringify(customer.external_attributes) : null,
      customer.social_profile_id || null,
      customer.wine_style_preferences ? JSON.stringify(customer.wine_style_preferences) : null,
      customer.birth_date || null,
      customer.custom_attributes ? JSON.stringify(customer.custom_attributes) : null,
    ];

    const result = await client.query(query, values);

    return {
      statusCode: 201,
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
        error: 'Failed to create customer',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
