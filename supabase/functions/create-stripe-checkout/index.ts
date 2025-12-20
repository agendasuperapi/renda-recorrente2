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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autenticação necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { plan_id, user_email, user_name, user_id, coupon, return_url } = await req.json();

    // Verify that the authenticated user matches the user_id in the request
    if (authUser.id !== user_id) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado para criar checkout para outro usuário' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!plan_id || !user_email || !user_name || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Dados incompletos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-stripe-checkout] Iniciando processo para plano:', plan_id);
    console.log('[create-stripe-checkout] Coupon data received:', coupon);

    // 1. Buscar plano para obter product_id e features (para trial_days)
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('product_id, features')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      console.error('[create-stripe-checkout] Erro ao buscar plano:', planError);
      return new Response(
        JSON.stringify({ error: 'Plano não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const product_id = plan.product_id;

    // Calcular trial days do cupom (prioridade sobre trial do plano)
    let couponTrialDays = null; // null = não há cupom de trial, 0 ou mais = valor do cupom
    if (coupon) {
      if (coupon.type === 'days') {
        couponTrialDays = coupon.value || 0; // Ex: 7 dias (pode ser 0)
        console.log('[create-stripe-checkout] Cupom de trial days aplicado:', couponTrialDays);
      } else if (coupon.type === 'free_trial') {
        couponTrialDays = (coupon.value || 0) * 30; // Ex: 1 mês = 30 dias (pode ser 0)
        console.log('[create-stripe-checkout] Cupom de mês grátis aplicado:', couponTrialDays, 'dias');
      }
    }

    // Extrair trial_days das features do plano (usado apenas se cupom não fornecer trial)
    let planTrialDays = 0;
    const features = plan.features || [];
    
    for (const feature of features) {
      if (typeof feature === 'string' && feature.startsWith('trial_days:')) {
        const days = parseInt(feature.split(':')[1]);
        if (!isNaN(days) && days > 0) {
          planTrialDays = days;
          console.log('[create-stripe-checkout] Trial days do plano encontrado:', planTrialDays);
          break;
        }
      }
    }

    // Trial final: cupom tem prioridade sobre plano (mesmo que seja 0)
    const finalTrialDays = couponTrialDays !== null ? couponTrialDays : planTrialDays;
    console.log('[create-stripe-checkout] Trial days final:', finalTrialDays, '(coupon:', couponTrialDays, ', plan:', planTrialDays, ')');

    // 2. Buscar ambiente ativo (test ou production)
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

    let environmentMode = envSettings.value; // 'test' ou 'production'
    console.log('[create-stripe-checkout] Modo de ambiente do sistema:', environmentMode);

    // EXCEÇÃO: emails @testex.com sempre usam ambiente de teste (modo desenvolvedor)
    const isTestEmail = user_email.toLowerCase().endsWith('@testex.com');
    if (isTestEmail) {
      console.log('[create-stripe-checkout] Email de teste detectado (@testex.com), forçando ambiente test');
      environmentMode = 'test';
    }

    console.log('[create-stripe-checkout] Ambiente efetivo:', environmentMode);

    // Usar a chave Stripe correta baseada no ambiente efetivo
    const stripeSecretKey = environmentMode === 'production'
      ? Deno.env.get('STRIPE_SECRET_KEY_PROD')
      : Deno.env.get('STRIPE_SECRET_KEY_TEST');

    if (!stripeSecretKey) {
      console.error('[create-stripe-checkout] Chave Stripe não configurada para ambiente:', environmentMode);
      return new Response(
        JSON.stringify({ error: 'Chave Stripe não configurada para o ambiente atual' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Buscar integração Stripe do plano
    const { data: integration, error: integrationError } = await supabase
      .from('plan_integrations')
      .select('*')
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

    // 4. Inicializar Stripe com a chave correta
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // 5. Criar ou buscar customer
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

    // 6. Criar sessão de checkout EMBEDDED
    const origin = req.headers.get('origin') || 'https://renda-recorrente2.lovable.app';
    const checkoutReturnUrl = return_url || `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`;

    const sessionConfig: any = {
      customer: customerId,
      line_items: [
        {
          price: integration.stripe_price_id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      ui_mode: 'embedded',
      return_url: checkoutReturnUrl,
      metadata: {
        user_id: user_id,
        plan_id: plan_id,
        product_id: product_id || '',
        user_email: user_email,
        environment: environmentMode,
        affiliate_id: coupon?.affiliate_id || '',
        affiliate_coupon_id: coupon?.affiliate_coupon_id || '',
        coupon_code: coupon?.code || ''
      },
      subscription_data: {
        metadata: {
          user_id: user_id,
          plan_id: plan_id,
          product_id: product_id || '',
          user_email: user_email,
          environment: environmentMode,
          affiliate_id: coupon?.affiliate_id || '',
          affiliate_coupon_id: coupon?.affiliate_coupon_id || '',
          coupon_code: coupon?.code || ''
        }
      }
    };

    // Adicionar trial period se configurado
    if (finalTrialDays > 0) {
      sessionConfig.subscription_data.trial_period_days = finalTrialDays;
      console.log('[create-stripe-checkout] Adicionando trial period de', finalTrialDays, 'dias');
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log('[create-stripe-checkout] Sessão de checkout embedded criada:', session.id);

    return new Response(
      JSON.stringify({ 
        client_secret: session.client_secret,
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
