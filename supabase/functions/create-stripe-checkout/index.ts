import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

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

    const { plan_id, user_email, user_name } = await req.json();

    if (!plan_id || !user_email || !user_name) {
      return new Response(
        JSON.stringify({ error: 'Dados incompletos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-stripe-checkout] Iniciando processo para plano:', plan_id);

    // 1. Buscar ambiente ativo (test ou production)
    const { data: envSettings, error: envError } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'environment_mode')
      .single();

    if (envError) {
      console.error('[create-stripe-checkout] Erro ao buscar configuração:', envError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar configuração do ambiente' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const environmentMode = envSettings.value; // 'test' ou 'production'
    console.log('[create-stripe-checkout] Modo de ambiente:', environmentMode);

    // 2. Buscar integração Stripe do plano com dados da conta
    const { data: integration, error: integrationError } = await supabase
      .from('plan_integrations')
      .select(`
        *,
        accounts:account_id (
          key_authorization,
          success_url,
          cancel_url,
          return_url
        )
      `)
      .eq('plan_id', plan_id)
      .eq('environment_type', environmentMode)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      console.error('[create-stripe-checkout] Erro ao buscar integração:', integrationError);
      return new Response(
        JSON.stringify({ error: 'Integração Stripe não encontrada para este plano' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-stripe-checkout] Integração encontrada:', integration.id);

    const account = integration.accounts as any;
    const stripeApiKey = account.key_authorization;
    const successUrl = account.success_url || `${req.headers.get('origin')}/checkout-success`;
    const cancelUrl = account.cancel_url || `${req.headers.get('origin')}/`;

    if (!stripeApiKey) {
      console.error('[create-stripe-checkout] Chave Stripe não encontrada');
      return new Response(
        JSON.stringify({ error: 'Configuração Stripe incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Inicializar Stripe
    const stripe = new Stripe(stripeApiKey, {
      apiVersion: '2023-10-16',
    });

    // 4. Criar ou buscar customer
    let customerId: string;
    
    const existingCustomers = await stripe.customers.list({
      email: user_email,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
      console.log('[create-stripe-checkout] Customer existente:', customerId);
    } else {
      const customer = await stripe.customers.create({
        email: user_email,
        name: user_name,
        metadata: {
          environment: environmentMode
        }
      });
      customerId = customer.id;
      console.log('[create-stripe-checkout] Novo customer criado:', customerId);
    }

    // 5. Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: integration.stripe_price_id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        plan_id: plan_id,
        user_email: user_email,
        environment: environmentMode
      },
      subscription_data: {
        metadata: {
          plan_id: plan_id,
          user_email: user_email,
          environment: environmentMode
        }
      }
    });

    console.log('[create-stripe-checkout] Sessão de checkout criada:', session.id);

    return new Response(
      JSON.stringify({ 
        checkout_url: session.url,
        session_id: session.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[create-stripe-checkout] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao criar sessão de checkout' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
