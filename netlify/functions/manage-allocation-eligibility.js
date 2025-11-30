const { Client } = require('pg');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();

    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      const { allocation_id } = params;

      if (!allocation_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'allocation_id is required',
          }),
        };
      }

      const query = `
        SELECT 
          ae.*,
          c.first_name,
          c.last_name,
          c.email
        FROM allocation_eligibility ae
        LEFT JOIN customers c ON ae.customer_id = c.id
        WHERE ae.allocation_release_id = $1
        ORDER BY ae.created_at
      `;

      const result = await client.query(query, [allocation_id]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          rules: result.rows,
        }),
      };
    }

    if (event.httpMethod === 'POST') {
      const rule = JSON.parse(event.body);

      if (!rule.allocation_release_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'allocation_release_id is required',
          }),
        };
      }

      const criteriaCount = [
        rule.customer_id,
        rule.customer_tag,
        rule.club_id,
        rule.tier_level,
      ].filter((x) => x).length;

      if (criteriaCount !== 1) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Exactly one eligibility criterion must be specified',
          }),
        };
      }

      const insertQuery = `
        INSERT INTO allocation_eligibility (
          allocation_release_id, customer_id, customer_tag, club_id,
          tier_level, custom_max_quantity, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        rule.allocation_release_id,
        rule.customer_id || null,
        rule.customer_tag || null,
        rule.club_id || null,
        rule.tier_level || null,
        rule.custom_max_quantity || null,
        rule.status || 'active',
      ]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          rule: result.rows[0],
        }),
      };
    }

    if (event.httpMethod === 'DELETE') {
      const params = event.queryStringParameters || {};
      const { rule_id } = params;

      if (!rule_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'rule_id is required',
          }),
        };
      }

      await client.query('DELETE FROM allocation_eligibility WHERE id = $1', [rule_id]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
        }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to manage eligibility rules',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
