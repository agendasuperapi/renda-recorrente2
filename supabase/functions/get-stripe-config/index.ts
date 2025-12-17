import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar ambiente ativo (test ou production)
    const { data: envSettings, error: envError } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'environment_mode')
      .single();

    if (envError) {
      console.error('[get-stripe-config] Erro ao buscar configuração:', envError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar configuração do ambiente' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const environmentMode = envSettings.value; // 'test' ou 'production'
    console.log('[get-stripe-config] Modo de ambiente:', environmentMode);

    // Retornar a chave pública do Stripe baseada no ambiente
    // As chaves públicas são seguras para expor no frontend
    const publishableKey = environmentMode === 'production'
      ? Deno.env.get('STRIPE_PUBLISHABLE_KEY_PROD')
      : Deno.env.get('STRIPE_PUBLISHABLE_KEY_TEST');

    if (!publishableKey) {
      console.error('[get-stripe-config] Chave pública não configurada para ambiente:', environmentMode);
      return new Response(
        JSON.stringify({ error: 'Chave Stripe não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        publishableKey,
        environment: environmentMode
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[get-stripe-config] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao buscar configuração' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
