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
    console.log('✅ Connected to database');
    console.log('🔍 Querying for winery_id:', wineryId);

    const wineryResult = await client.query('SELECT name FROM wineries WHERE id = $1', [wineryId]);
    const wineryName = wineryResult.rows[0]?.name;
    console.log('🏢 Winery name:', wineryName);

    console.log('📊 Executing products query...');
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
      ORDER BY 
        CASE 
          WHEN p.category = 'Payment Testing' THEN 2
          ELSE 1
        END,
        p.type, 
        p.name ASC, 
        wp_data.vintage DESC
    `,
      [wineryId]
    );

    console.log('📦 Total products returned:', result.rows.length);

    // Count by type
    const byType = result.rows.reduce((acc, p) => {
      acc[p.type || 'unknown'] = (acc[p.type || 'unknown'] || 0) + 1;
      return acc;
    }, {});
    console.log('📊 Products by type:', JSON.stringify(byType));

    // Count by category
    const byCategory = result.rows.reduce((acc, p) => {
      acc[p.category || 'none'] = (acc[p.category || 'none'] || 0) + 1;
      return acc;
    }, {});
    console.log('📊 Products by category:', JSON.stringify(byCategory));

    // Count by tax_category
    const byTaxCategory = result.rows.reduce((acc, p) => {
      acc[p.tax_category || 'null'] = (acc[p.tax_category || 'null'] || 0) + 1;
      return acc;
    }, {});
    console.log('💰 Products by tax_category:', JSON.stringify(byTaxCategory));

    // Show first 5 test products if any
    const testProducts = result.rows.filter((p) => p.category === 'Payment Testing');
    if (testProducts.length > 0) {
      console.log(
        '🧪 Sample test products:',
        testProducts.slice(0, 5).map((p) => ({
          name: p.name,
          price: p.price,
          sku: p.sku,
          tax_category: p.tax_category,
        }))
      );
    } else {
      console.log('⚠️ No Payment Testing products found');
    }

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
