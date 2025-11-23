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
        p.vintage,
        p.varietal,
        p.price,
        p.sku,
        p.description,
        p.category,
        p.track_inventory,
        p.supply_price,
        p.average_cost,
        p.brand_id,
        p.type,
        p.supplier_id,
        p.tags,
        p.image_url,
        p.created_at,
        p.updated_at,
        p.version,
        p.barcode,
        p.weight,
        p.has_variants,
        p.variant_parent_id,
        p.variant_name,
        p.variant_attribute_values,
        p.variant_definitions,
        p.variant_options,
        p.reorder_point,
        p.restock_level,
        p.loyalty_value,
        p.serial_numbers,
        p.components,
        p.product_codes,
        p.tagline,
        p.url_key,
        p.short_description,
        p.full_description,
        p.available_date,
        p.online_status,
        p.inventory_status,
        p.wine_color,
        p.origin_country,
        p.wine_region,
        p.appellation,
        p.body_weight,
        p.sweetness_level,
        p.acidity_level,
        p.tannin_level,
        p.fruit_intensity,
        p.producer_id,
        p.display_template,
        p.bottle_volume,
        p.category_id,
        p.product_groups,
        p.original_price,
        p.cogs,
        p.tax_category,
        p.ships_direct,
        p.backorder_policy,
        p.available_quantity,
        p.allocated_quantity,
        p.committed_quantity,
        p.custom_attributes,
        p.visibility,
        wp.is_active as is_active_for_pos,
        wp.price as winery_price
      FROM products p
      LEFT JOIN winery_products wp ON p.id = wp.product_id AND wp.winery_id = $1
      WHERE p.deleted_at IS NULL
        AND p.name LIKE $2
      ORDER BY p.name ASC, p.vintage DESC
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
        error: 'Failed to retrieve products',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
