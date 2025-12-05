import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncUserData {
  external_user_id: string;
  product_id: string;
  name?: string;
  email: string;
  phone?: string;
  cpf?: string;
  affiliate_code?: string;
  affiliate_id?: string;
  // Campos de subscription
  environment?: string;
  plan_id?: string;
  cancel_at_period_end?: boolean;
  trial_end?: string;
  status?: string;
  current_period_start?: string;
  current_period_end?: string;
}

interface SyncPaymentData {
  external_payment_id?: string;
  external_user_id: string;
  product_id: string;
  plan_id?: string;
  stripe_invoice_id: string;
  stripe_subscription_id?: string;
  amount: number;
  currency?: string;
  billing_reason?: string;
  status?: string;
  payment_date?: string;
  affiliate_id?: string;
  affiliate_coupon_id?: string;
  environment?: string;
  metadata?: Record<string, any>;
}

interface SyncSubscriptionData {
  external_user_id: string;
  product_id: string;
  environment?: string;
  plan_id?: string;
  cancel_at_period_end?: boolean;
  trial_end?: string;
  status?: string;
  current_period_start?: string;
  current_period_end?: string;
}

interface SyncRequest {
  action: 'sync_user' | 'sync_payment' | 'sync_both' | 'sync_subscription';
  user?: SyncUserData;
  payment?: SyncPaymentData;
  subscription?: SyncSubscriptionData;
  api_key?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify authentication - require admin role or service key
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Autenticação necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Check if it's the service role key (for internal API calls) or anon key
    const isServiceKey = token === supabaseKey || token === supabaseAnonKey;
    
    if (!isServiceKey) {
      // Verify user token and check for admin role
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Token inválido' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user is admin
      const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
      const { data: roleData } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!roleData || roleData.role !== 'super_admin') {
        return new Response(
          JSON.stringify({ success: false, error: 'Acesso não autorizado' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const body: SyncRequest = await req.json();
    console.log('📥 Sync request received:', { 
      action: body.action, 
      product_id: body.user?.product_id || body.payment?.product_id || body.subscription?.product_id 
    });

    // Validação básica
    if (!body.action || !['sync_user', 'sync_payment', 'sync_both', 'sync_subscription'].includes(body.action)) {
      throw new Error('Invalid action. Must be: sync_user, sync_payment, sync_both, or sync_subscription');
    }

    const response: any = {
      success: true,
      action: body.action,
      data: {}
    };

    // Sync User
    if (body.action === 'sync_user' || body.action === 'sync_both') {
      if (!body.user) {
        throw new Error('User data is required for sync_user action');
      }

      const { user } = body;

      // Validar campos obrigatórios
      if (!user.external_user_id || !user.product_id || !user.email) {
        throw new Error('Missing required user fields: external_user_id, product_id, email');
      }

      console.log('👤 Syncing user:', user.email);

      // Upsert do usuário unificado
      const { data: unifiedUser, error: userError } = await supabase
        .from('unified_users')
        .upsert({
          external_user_id: user.external_user_id,
          product_id: user.product_id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          cpf: user.cpf,
          affiliate_code: user.affiliate_code,
          affiliate_id: user.affiliate_id,
          environment: user.environment,
          plan_id: user.plan_id,
          cancel_at_period_end: user.cancel_at_period_end,
          trial_end: user.trial_end,
          status: user.status,
          current_period_start: user.current_period_start,
          current_period_end: user.current_period_end,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'external_user_id,product_id',
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (userError) {
        console.error('❌ Error syncing user:', userError);
        throw userError;
      }

      console.log('✅ User synced successfully:', unifiedUser.id);
      response.data.user = unifiedUser;
    }

    // Sync Subscription (apenas atualiza dados de subscription no unified_users)
    if (body.action === 'sync_subscription') {
      if (!body.subscription) {
        throw new Error('Subscription data is required for sync_subscription action');
      }

      const { subscription } = body;

      // Validar campos obrigatórios
      if (!subscription.external_user_id || !subscription.product_id) {
        throw new Error('Missing required subscription fields: external_user_id, product_id');
      }

      console.log('🔄 Syncing subscription for user:', subscription.external_user_id);

      // Atualizar apenas os campos de subscription do unified_users
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (subscription.environment !== undefined) updateData.environment = subscription.environment;
      if (subscription.plan_id !== undefined) updateData.plan_id = subscription.plan_id;
      if (subscription.cancel_at_period_end !== undefined) updateData.cancel_at_period_end = subscription.cancel_at_period_end;
      if (subscription.trial_end !== undefined) updateData.trial_end = subscription.trial_end;
      if (subscription.status !== undefined) updateData.status = subscription.status;
      if (subscription.current_period_start !== undefined) updateData.current_period_start = subscription.current_period_start;
      if (subscription.current_period_end !== undefined) updateData.current_period_end = subscription.current_period_end;

      const { data: updatedUser, error: subscriptionError } = await supabase
        .from('unified_users')
        .update(updateData)
        .eq('external_user_id', subscription.external_user_id)
        .eq('product_id', subscription.product_id)
        .select()
        .single();

      if (subscriptionError) {
        console.error('❌ Error syncing subscription:', subscriptionError);
        throw subscriptionError;
      }

      console.log('✅ Subscription synced successfully for user:', updatedUser.id);
      response.data.subscription = updatedUser;
    }

    // Sync Payment
    if (body.action === 'sync_payment' || body.action === 'sync_both') {
      if (!body.payment) {
        throw new Error('Payment data is required for sync_payment action');
      }

      const { payment } = body;

      // Validar campos obrigatórios
      if (!payment.external_user_id || !payment.product_id || !payment.amount || !payment.stripe_invoice_id) {
        throw new Error('Missing required payment fields: external_user_id, product_id, amount, stripe_invoice_id');
      }

      console.log('💰 Syncing payment:', payment.stripe_invoice_id);

      // Buscar o unified_user_id
      const { data: unifiedUser, error: findUserError } = await supabase
        .from('unified_users')
        .select('id')
        .eq('external_user_id', payment.external_user_id)
        .eq('product_id', payment.product_id)
        .single();

      if (findUserError || !unifiedUser) {
        console.error('❌ Unified user not found for external_user_id:', payment.external_user_id);
        throw new Error(`Unified user not found. Please sync user first. External ID: ${payment.external_user_id}`);
      }

      // Upsert do pagamento unificado
      const { data: unifiedPayment, error: paymentError } = await supabase
        .from('unified_payments')
        .upsert({
          external_payment_id: payment.external_payment_id,
          unified_user_id: unifiedUser.id,
          product_id: payment.product_id,
          plan_id: payment.plan_id,
          stripe_invoice_id: payment.stripe_invoice_id,
          stripe_subscription_id: payment.stripe_subscription_id,
          amount: payment.amount,
          currency: payment.currency || 'brl',
          billing_reason: payment.billing_reason,
          status: payment.status || 'paid',
          payment_date: payment.payment_date || new Date().toISOString(),
          affiliate_id: payment.affiliate_id,
          affiliate_coupon_id: payment.affiliate_coupon_id,
          environment: payment.environment || 'production',
          metadata: payment.metadata || {},
        }, {
          onConflict: payment.external_payment_id ? 'external_payment_id,product_id' : undefined,
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (paymentError) {
        console.error('❌ Error syncing payment:', paymentError);
        throw paymentError;
      }

      console.log('✅ Payment synced successfully:', unifiedPayment.id);
      console.log('🎯 Commission trigger will be executed automatically');
      response.data.payment = unifiedPayment;
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: errorDetails,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
