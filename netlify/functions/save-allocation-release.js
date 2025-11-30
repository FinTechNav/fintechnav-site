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

  const release = JSON.parse(event.body);

  if (!release.winery_id || !release.title || !release.start_date || !release.end_date) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'winery_id, title, start_date, and end_date are required',
      }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();

    let result;

    if (release.id) {
      const updateQuery = `
        UPDATE allocation_releases SET
          title = $1,
          slug = $2,
          description = $3,
          content = $4,
          tagline = $5,
          start_date = $6,
          end_date = $7,
          available_date = $8,
          status = $9,
          visibility = $10,
          allow_wishes = $11,
          wish_type = $12,
          image_url = $13,
          seo_title = $14,
          seo_description = $15,
          tags = $16,
          custom_attributes = $17,
          updated_at = NOW(),
          version = version + 1
        WHERE id = $18 AND winery_id = $19 AND deleted_at IS NULL
        RETURNING *
      `;

      result = await client.query(updateQuery, [
        release.title,
        release.slug || null,
        release.description || null,
        release.content || null,
        release.tagline || null,
        release.start_date,
        release.end_date,
        release.available_date || null,
        release.status || 'draft',
        release.visibility || 'private',
        release.allow_wishes !== undefined ? release.allow_wishes : true,
        release.wish_type || 'purchase_and_wish',
        release.image_url || null,
        release.seo_title || null,
        release.seo_description || null,
        release.tags || null,
        release.custom_attributes ? JSON.stringify(release.custom_attributes) : null,
        release.id,
        release.winery_id,
      ]);

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Allocation release not found',
          }),
        };
      }
    } else {
      const insertQuery = `
        INSERT INTO allocation_releases (
          winery_id, title, slug, description, content, tagline,
          start_date, end_date, available_date, status, visibility,
          allow_wishes, wish_type, image_url, seo_title, seo_description,
          tags, custom_attributes, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        )
        RETURNING *
      `;

      result = await client.query(insertQuery, [
        release.winery_id,
        release.title,
        release.slug || null,
        release.description || null,
        release.content || null,
        release.tagline || null,
        release.start_date,
        release.end_date,
        release.available_date || null,
        release.status || 'draft',
        release.visibility || 'private',
        release.allow_wishes !== undefined ? release.allow_wishes : true,
        release.wish_type || 'purchase_and_wish',
        release.image_url || null,
        release.seo_title || null,
        release.seo_description || null,
        release.tags || null,
        release.custom_attributes ? JSON.stringify(release.custom_attributes) : null,
        release.created_by || null,
      ]);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        release: result.rows[0],
      }),
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to save allocation release',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
