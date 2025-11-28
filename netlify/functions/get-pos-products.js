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

  const wineryId = event.queryStringParameters?.winery_id;

  if (!wineryId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'winery_id parameter is required' }),
    };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();

    const wineryResult = await client.query('SELECT name FROM wineries WHERE id = $1', [wineryId]);
    const wineryName = wineryResult.rows[0]?.name;

    const result = await client.query(
      `
      SELECT 
        p.id,
        p.name,
        wp_data.vintage,
        wp_data.varietal,
        p.price,
        p.sku,
        p.description,
        p.category,
        wp_data.wine_color,
        p.image_url,
        wp_data.bottle_volume,
        p.short_description,
        p.tags,
        p.available_quantity,
        p.track_inventory,
        p.online_status,
        p.inventory_status,
        p.type,
        p.tax_category
      FROM products p
      LEFT JOIN wine_products wp_data ON p.id = wp_data.product_id
      INNER JOIN winery_products wp ON p.id = wp.product_id
      WHERE wp.winery_id = $1
        AND wp.is_active = true
        AND p.deleted_at IS NULL
        AND p.online_status = 'available'
        AND p.inventory_status = 'available'
        AND p.name LIKE $2
      ORDER BY p.type, p.name ASC, wp_data.vintage DESC
    `,
      [wineryId, wineryName + '%']
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        products: result.rows,
      }),
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to retrieve POS products',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
