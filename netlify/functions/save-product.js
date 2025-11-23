const { Client } = require('pg');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST' && event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const product = JSON.parse(event.body);
  const isUpdate = event.httpMethod === 'PUT' && product.id;

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();

    if (isUpdate) {
      // Update existing product
      const result = await client.query(
        `
        UPDATE products SET
          name = $1,
          vintage = $2,
          varietal = $3,
          price = $4,
          sku = $5,
          description = $6,
          category = $7,
          track_inventory = $8,
          supply_price = $9,
          average_cost = $10,
          brand_id = $11,
          type = $12,
          supplier_id = $13,
          tags = $14,
          image_url = $15,
          barcode = $16,
          weight = $17,
          has_variants = $18,
          variant_parent_id = $19,
          variant_name = $20,
          variant_attribute_values = $21,
          variant_definitions = $22,
          variant_options = $23,
          reorder_point = $24,
          restock_level = $25,
          loyalty_value = $26,
          serial_numbers = $27,
          components = $28,
          product_codes = $29,
          tagline = $30,
          url_key = $31,
          short_description = $32,
          full_description = $33,
          available_date = $34,
          online_status = $35,
          inventory_status = $36,
          wine_color = $37,
          origin_country = $38,
          wine_region = $39,
          appellation = $40,
          body_weight = $41,
          sweetness_level = $42,
          acidity_level = $43,
          tannin_level = $44,
          fruit_intensity = $45,
          producer_id = $46,
          display_template = $47,
          bottle_volume = $48,
          category_id = $49,
          product_groups = $50,
          original_price = $51,
          cogs = $52,
          tax_category = $53,
          ships_direct = $54,
          backorder_policy = $55,
          available_quantity = $56,
          allocated_quantity = $57,
          committed_quantity = $58,
          custom_attributes = $59,
          visibility = $60
        WHERE id = $61
        RETURNING *
        `,
        [
          product.name,
          product.vintage,
          product.varietal,
          product.price,
          product.sku,
          product.description,
          product.category,
          product.track_inventory !== undefined ? product.track_inventory : true,
          product.supply_price,
          product.average_cost,
          product.brand_id,
          product.type || 'wine',
          product.supplier_id,
          product.tags,
          product.image_url,
          product.barcode,
          product.weight,
          product.has_variants || false,
          product.variant_parent_id,
          product.variant_name,
          product.variant_attribute_values
            ? JSON.stringify(product.variant_attribute_values)
            : null,
          product.variant_definitions ? JSON.stringify(product.variant_definitions) : null,
          product.variant_options ? JSON.stringify(product.variant_options) : null,
          product.reorder_point || 0,
          product.restock_level || 0,
          product.loyalty_value || 0,
          product.serial_numbers,
          product.components ? JSON.stringify(product.components) : null,
          product.product_codes ? JSON.stringify(product.product_codes) : null,
          product.tagline,
          product.url_key,
          product.short_description,
          product.full_description,
          product.available_date,
          product.online_status || 'available',
          product.inventory_status || 'available',
          product.wine_color,
          product.origin_country,
          product.wine_region,
          product.appellation,
          product.body_weight,
          product.sweetness_level,
          product.acidity_level,
          product.tannin_level,
          product.fruit_intensity,
          product.producer_id,
          product.display_template,
          product.bottle_volume || 750,
          product.category_id,
          product.product_groups,
          product.original_price,
          product.cogs,
          product.tax_category || 'wine',
          product.ships_direct !== undefined ? product.ships_direct : true,
          product.backorder_policy || 'allow',
          product.available_quantity || 0,
          product.allocated_quantity || 0,
          product.committed_quantity || 0,
          product.custom_attributes ? JSON.stringify(product.custom_attributes) : null,
          product.visibility || 'public',
          product.id,
        ]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          product: result.rows[0],
        }),
      };
    } else {
      // Create new product
      const result = await client.query(
        `
        INSERT INTO products (
          name, vintage, varietal, price, sku, description, category,
          track_inventory, supply_price, average_cost, brand_id, type, supplier_id,
          tags, image_url, barcode, weight, has_variants, variant_parent_id,
          variant_name, variant_attribute_values, variant_definitions, variant_options,
          reorder_point, restock_level, loyalty_value, serial_numbers, components,
          product_codes, tagline, url_key, short_description, full_description,
          available_date, online_status, inventory_status, wine_color, origin_country,
          wine_region, appellation, body_weight, sweetness_level, acidity_level,
          tannin_level, fruit_intensity, producer_id, display_template, bottle_volume,
          category_id, product_groups, original_price, cogs, tax_category,
          ships_direct, backorder_policy, available_quantity, allocated_quantity,
          committed_quantity, custom_attributes, visibility
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
          $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41,
          $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54,
          $55, $56, $57, $58, $59, $60
        )
        RETURNING *
        `,
        [
          product.name,
          product.vintage,
          product.varietal,
          product.price,
          product.sku,
          product.description,
          product.category,
          product.track_inventory !== undefined ? product.track_inventory : true,
          product.supply_price,
          product.average_cost,
          product.brand_id,
          product.type || 'wine',
          product.supplier_id,
          product.tags,
          product.image_url,
          product.barcode,
          product.weight,
          product.has_variants || false,
          product.variant_parent_id,
          product.variant_name,
          product.variant_attribute_values
            ? JSON.stringify(product.variant_attribute_values)
            : null,
          product.variant_definitions ? JSON.stringify(product.variant_definitions) : null,
          product.variant_options ? JSON.stringify(product.variant_options) : null,
          product.reorder_point || 0,
          product.restock_level || 0,
          product.loyalty_value || 0,
          product.serial_numbers,
          product.components ? JSON.stringify(product.components) : null,
          product.product_codes ? JSON.stringify(product.product_codes) : null,
          product.tagline,
          product.url_key,
          product.short_description,
          product.full_description,
          product.available_date,
          product.online_status || 'available',
          product.inventory_status || 'available',
          product.wine_color,
          product.origin_country,
          product.wine_region,
          product.appellation,
          product.body_weight,
          product.sweetness_level,
          product.acidity_level,
          product.tannin_level,
          product.fruit_intensity,
          product.producer_id,
          product.display_template,
          product.bottle_volume || 750,
          product.category_id,
          product.product_groups,
          product.original_price,
          product.cogs,
          product.tax_category || 'wine',
          product.ships_direct !== undefined ? product.ships_direct : true,
          product.backorder_policy || 'allow',
          product.available_quantity || 0,
          product.allocated_quantity || 0,
          product.committed_quantity || 0,
          product.custom_attributes ? JSON.stringify(product.custom_attributes) : null,
          product.visibility || 'public',
        ]
      );

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          product: result.rows[0],
        }),
      };
    }
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: isUpdate ? 'Failed to update product' : 'Failed to create product',
        details: error.message,
      }),
    };
  } finally {
    await client.end();
  }
};
