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

    // Get wine products
    const wineResult = await client.query(
      `
      SELECT 
        p.*,
        wp_data.vintage,
        wp_data.varietal,
        wp_data.wine_color,
        wp_data.wine_region,
        wp_data.appellation,
        wp_data.body_weight,
        wp_data.sweetness_level,
        wp_data.acidity_level,
        wp_data.tannin_level,
        wp_data.fruit_intensity,
        wp_data.bottle_volume,
        wp_data.producer_id,
        wp.is_active as is_active_for_pos,
        wp.price as winery_price
      FROM products p
      LEFT JOIN wine_products wp_data ON p.id = wp_data.product_id
      LEFT JOIN winery_products wp ON p.id = wp.product_id AND wp.winery_id = $1
      WHERE p.deleted_at IS NULL
        AND p.type = 'wine'
        AND p.name LIKE $2
      ORDER BY p.name ASC, wp_data.vintage DESC
    `,
      [wineryId, wineryName + '%']
    );

    // Get merchandise products
    const merchResult = await client.query(
      `
      SELECT 
        p.*,
        mp.material,
        mp.dimensions,
        mp.manufacturer,
        mp.country_of_origin,
        mp.product_category,
        wp.is_active as is_active_for_pos,
        wp.price as winery_price
      FROM products p
      LEFT JOIN merchandise_products mp ON p.id = mp.product_id
      LEFT JOIN winery_products wp ON p.id = wp.product_id AND wp.winery_id = $1
      WHERE p.deleted_at IS NULL
        AND p.type = 'merchandise'
        AND p.name LIKE $2
      ORDER BY p.name ASC
    `,
      [wineryId, wineryName + '%']
    );

    const result = { rows: [...wineResult.rows, ...merchResult.rows] };

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
        error: 'Failed to retrieve products',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
