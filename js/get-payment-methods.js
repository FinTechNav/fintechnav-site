const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const { customer_id } = event.queryStringParameters;

  if (!customer_id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: 'customer_id required' }),
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('customer_id', customer_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        payment_methods: data,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
};
