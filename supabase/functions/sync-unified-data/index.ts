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
  stripe_invoice_id?: string;
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

// Helper para validar UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Helper para log com timestamp
const log = (level: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const prefix = {
    'info': '📘',
    'success': '✅',
    'warning': '⚠️',
    'error': '❌',
    'debug': '🔍',
    'start': '🚀',
    'end': '🏁',
    'user': '👤',
    'payment': '💰',
    'subscription': '🔄',
    'commission': '🎯',
  }[level] || '📝';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();
  
  log('start', `[${requestId}] ========== SYNC REQUEST STARTED ==========`);
  log('debug', `[${requestId}] Method: ${req.method}`);
  log('debug', `[${requestId}] URL: ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    log('info', `[${requestId}] CORS preflight request`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Log headers (sem expor tokens completos)
    const authHeader = req.headers.get('Authorization');
    const contentType = req.headers.get('Content-Type');
    log('debug', `[${requestId}] Headers:`, {
      'Content-Type': contentType,
      'Authorization': authHeader ? `${authHeader.slice(0, 20)}...` : 'missing',
    });

    // Verify authentication
    if (!authHeader) {
      log('error', `[${requestId}] Authentication missing`);
      return new Response(
        JSON.stringify({ success: false, error: 'Autenticação necessária', request_id: requestId }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const isServiceKey = token === supabaseKey || token === supabaseAnonKey;
    
    log('debug', `[${requestId}] Auth type: ${isServiceKey ? 'Service/Anon Key' : 'User Token'}`);
    
    if (!isServiceKey) {
      log('info', `[${requestId}] Validating user token...`);
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
      
      if (authError || !user) {
        log('error', `[${requestId}] Invalid token`, { error: authError?.message });
        return new Response(
          JSON.stringify({ success: false, error: 'Token inválido', request_id: requestId }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      log('debug', `[${requestId}] User authenticated: ${user.email}`);

      const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
      const { data: roleData } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!roleData || roleData.role !== 'super_admin') {
        log('error', `[${requestId}] Access denied - not super_admin`, { role: roleData?.role });
        return new Response(
          JSON.stringify({ success: false, error: 'Acesso não autorizado', request_id: requestId }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      log('success', `[${requestId}] User authorized as super_admin`);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const rawBody = await req.text();
    log('debug', `[${requestId}] Raw body length: ${rawBody.length} bytes`);
    
    let body: SyncRequest;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      log('error', `[${requestId}] JSON parse error`, { error: String(parseError), rawBody: rawBody.slice(0, 500) });
      throw new Error('Invalid JSON in request body');
    }

    log('info', `[${requestId}] Action: ${body.action}`);
    log('debug', `[${requestId}] Full request body:`, {
      action: body.action,
      user: body.user ? {
        external_user_id: body.user.external_user_id,
        product_id: body.user.product_id,
        email: body.user.email,
        name: body.user.name,
        affiliate_id: body.user.affiliate_id,
        affiliate_code: body.user.affiliate_code,
        plan_id: body.user.plan_id,
        status: body.user.status,
      } : undefined,
      payment: body.payment ? {
        external_payment_id: body.payment.external_payment_id,
        external_user_id: body.payment.external_user_id,
        product_id: body.payment.product_id,
        plan_id: body.payment.plan_id,
        amount: body.payment.amount,
        billing_reason: body.payment.billing_reason,
        stripe_invoice_id: body.payment.stripe_invoice_id,
        affiliate_id: body.payment.affiliate_id,
        affiliate_coupon_id: body.payment.affiliate_coupon_id,
      } : undefined,
      subscription: body.subscription ? {
        external_user_id: body.subscription.external_user_id,
        product_id: body.subscription.product_id,
        plan_id: body.subscription.plan_id,
        status: body.subscription.status,
        cancel_at_period_end: body.subscription.cancel_at_period_end,
      } : undefined,
    });

    // Validação básica
    if (!body.action || !['sync_user', 'sync_payment', 'sync_both', 'sync_subscription'].includes(body.action)) {
      log('error', `[${requestId}] Invalid action: ${body.action}`);
      throw new Error('Invalid action. Must be: sync_user, sync_payment, sync_both, or sync_subscription');
    }

    const response: any = {
      success: true,
      action: body.action,
      request_id: requestId,
      data: {}
    };

    // Sync User
    if (body.action === 'sync_user' || body.action === 'sync_both') {
      log('user', `[${requestId}] ========== SYNC USER START ==========`);
      
      if (!body.user) {
        log('error', `[${requestId}] User data missing`);
        throw new Error('User data is required for sync_user action');
      }

      const { user } = body;

      if (!user.external_user_id || !user.product_id || !user.email) {
        log('error', `[${requestId}] Missing required user fields`, {
          has_external_user_id: !!user.external_user_id,
          has_product_id: !!user.product_id,
          has_email: !!user.email,
        });
        throw new Error('Missing required user fields: external_user_id, product_id, email');
      }

      // Validar UUIDs
      if (!isValidUUID(user.external_user_id)) {
        log('error', `[${requestId}] Invalid UUID for external_user_id: ${user.external_user_id}`);
        throw new Error(`Invalid UUID format for external_user_id: ${user.external_user_id}`);
      }
      if (!isValidUUID(user.product_id)) {
        log('error', `[${requestId}] Invalid UUID for product_id: ${user.product_id}`);
        throw new Error(`Invalid UUID format for product_id: ${user.product_id}`);
      }
      if (user.affiliate_id && !isValidUUID(user.affiliate_id)) {
        log('error', `[${requestId}] Invalid UUID for affiliate_id: ${user.affiliate_id}`);
        throw new Error(`Invalid UUID format for affiliate_id: ${user.affiliate_id}`);
      }
      if (user.plan_id && !isValidUUID(user.plan_id)) {
        log('error', `[${requestId}] Invalid UUID for plan_id: ${user.plan_id}`);
        throw new Error(`Invalid UUID format for plan_id: ${user.plan_id}`);
      }

      log('info', `[${requestId}] Upserting user: ${user.email} (${user.external_user_id})`);
      log('debug', `[${requestId}] User data to upsert:`, {
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
        status: user.status,
      });

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
        log('error', `[${requestId}] User upsert failed`, {
          error: userError.message,
          code: userError.code,
          details: userError.details,
          hint: userError.hint,
        });
        throw userError;
      }

      log('success', `[${requestId}] User synced - unified_user_id: ${unifiedUser.id}`);
      log('user', `[${requestId}] ========== SYNC USER END ==========`);
      response.data.user = unifiedUser;
    }

    // Sync Subscription
    if (body.action === 'sync_subscription') {
      log('subscription', `[${requestId}] ========== SYNC SUBSCRIPTION START ==========`);
      
      if (!body.subscription) {
        log('error', `[${requestId}] Subscription data missing`);
        throw new Error('Subscription data is required for sync_subscription action');
      }

      const { subscription } = body;

      if (!subscription.external_user_id || !subscription.product_id) {
        log('error', `[${requestId}] Missing required subscription fields`, {
          has_external_user_id: !!subscription.external_user_id,
          has_product_id: !!subscription.product_id,
        });
        throw new Error('Missing required subscription fields: external_user_id, product_id');
      }

      // Validar UUIDs
      if (!isValidUUID(subscription.external_user_id)) {
        log('error', `[${requestId}] Invalid UUID for external_user_id: ${subscription.external_user_id}`);
        throw new Error(`Invalid UUID format for external_user_id: ${subscription.external_user_id}`);
      }
      if (!isValidUUID(subscription.product_id)) {
        log('error', `[${requestId}] Invalid UUID for product_id: ${subscription.product_id}`);
        throw new Error(`Invalid UUID format for product_id: ${subscription.product_id}`);
      }
      if (subscription.plan_id && !isValidUUID(subscription.plan_id)) {
        log('error', `[${requestId}] Invalid UUID for plan_id: ${subscription.plan_id}`);
        throw new Error(`Invalid UUID format for plan_id: ${subscription.plan_id}`);
      }

      log('info', `[${requestId}] Updating subscription for user: ${subscription.external_user_id}`);

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

      log('debug', `[${requestId}] Subscription update data:`, updateData);

      const { data: updatedUser, error: subscriptionError } = await supabase
        .from('unified_users')
        .update(updateData)
        .eq('external_user_id', subscription.external_user_id)
        .eq('product_id', subscription.product_id)
        .select()
        .single();

      if (subscriptionError) {
        log('error', `[${requestId}] Subscription update failed`, {
          error: subscriptionError.message,
          code: subscriptionError.code,
          details: subscriptionError.details,
        });
        throw subscriptionError;
      }

      log('success', `[${requestId}] Subscription synced - unified_user_id: ${updatedUser.id}`);
      log('subscription', `[${requestId}] ========== SYNC SUBSCRIPTION END ==========`);
      response.data.subscription = updatedUser;
    }

    // Sync Payment
    if (body.action === 'sync_payment' || body.action === 'sync_both') {
      log('payment', `[${requestId}] ========== SYNC PAYMENT START ==========`);
      
      if (!body.payment) {
        log('error', `[${requestId}] Payment data missing`);
        throw new Error('Payment data is required for sync_payment action');
      }

      const { payment } = body;

      if (!payment.external_user_id || !payment.product_id || !payment.amount) {
        log('error', `[${requestId}] Missing required payment fields`, {
          has_external_user_id: !!payment.external_user_id,
          has_product_id: !!payment.product_id,
          has_amount: !!payment.amount,
        });
        throw new Error('Missing required payment fields: external_user_id, product_id, amount');
      }

      // Validar UUIDs
      if (!isValidUUID(payment.external_user_id)) {
        log('error', `[${requestId}] Invalid UUID for external_user_id: ${payment.external_user_id}`);
        throw new Error(`Invalid UUID format for external_user_id: ${payment.external_user_id}`);
      }
      if (!isValidUUID(payment.product_id)) {
        log('error', `[${requestId}] Invalid UUID for product_id: ${payment.product_id}`);
        throw new Error(`Invalid UUID format for product_id: ${payment.product_id}`);
      }
      if (payment.affiliate_id && !isValidUUID(payment.affiliate_id)) {
        log('error', `[${requestId}] Invalid UUID for affiliate_id: ${payment.affiliate_id}`);
        throw new Error(`Invalid UUID format for affiliate_id: ${payment.affiliate_id}`);
      }
      if (payment.plan_id && !isValidUUID(payment.plan_id)) {
        log('error', `[${requestId}] Invalid UUID for plan_id: ${payment.plan_id}`);
        throw new Error(`Invalid UUID format for plan_id: ${payment.plan_id}`);
      }
      if (payment.affiliate_coupon_id && !isValidUUID(payment.affiliate_coupon_id)) {
        log('error', `[${requestId}] Invalid UUID for affiliate_coupon_id: ${payment.affiliate_coupon_id}`);
        throw new Error(`Invalid UUID format for affiliate_coupon_id: ${payment.affiliate_coupon_id}`);
      }

      log('info', `[${requestId}] Processing payment: ${payment.stripe_invoice_id || payment.external_payment_id || 'one-time'}`);
      log('debug', `[${requestId}] Payment details:`, {
        amount: payment.amount,
        billing_reason: payment.billing_reason,
        affiliate_id: payment.affiliate_id,
        affiliate_coupon_id: payment.affiliate_coupon_id,
        plan_id: payment.plan_id,
      });

      // Buscar o unified_user_id
      log('debug', `[${requestId}] Looking up unified_user for external_user_id: ${payment.external_user_id}, product_id: ${payment.product_id}`);
      
      const { data: unifiedUser, error: findUserError } = await supabase
        .from('unified_users')
        .select('id, name, email, affiliate_id')
        .eq('external_user_id', payment.external_user_id)
        .eq('product_id', payment.product_id)
        .single();

      if (findUserError || !unifiedUser) {
        log('error', `[${requestId}] Unified user not found`, {
          external_user_id: payment.external_user_id,
          product_id: payment.product_id,
          error: findUserError?.message,
        });
        throw new Error(`Unified user not found. Please sync user first. External ID: ${payment.external_user_id}`);
      }

      log('success', `[${requestId}] Found unified_user: ${unifiedUser.id} (${unifiedUser.email})`);

      // Determinar affiliate_id final
      const finalAffiliateId = payment.affiliate_id || unifiedUser.affiliate_id;
      log('debug', `[${requestId}] Affiliate resolution:`, {
        payment_affiliate_id: payment.affiliate_id,
        user_affiliate_id: unifiedUser.affiliate_id,
        final_affiliate_id: finalAffiliateId,
      });

      const paymentData = {
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
        affiliate_id: finalAffiliateId,
        affiliate_coupon_id: payment.affiliate_coupon_id,
        environment: payment.environment || 'production',
        metadata: payment.metadata || {},
      };

      log('debug', `[${requestId}] Payment data to upsert:`, paymentData);

      const { data: unifiedPayment, error: paymentError } = await supabase
        .from('unified_payments')
        .upsert(paymentData, {
          onConflict: payment.external_payment_id ? 'external_payment_id,product_id' : undefined,
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (paymentError) {
        log('error', `[${requestId}] Payment upsert failed`, {
          error: paymentError.message,
          code: paymentError.code,
          details: paymentError.details,
          hint: paymentError.hint,
        });
        throw paymentError;
      }

      log('success', `[${requestId}] Payment synced - unified_payment_id: ${unifiedPayment.id}`);
      log('commission', `[${requestId}] Commission trigger will execute automatically via database trigger`);
      
      // Verificar se há afiliado para comissão
      if (finalAffiliateId) {
        log('commission', `[${requestId}] Commission will be generated for affiliate: ${finalAffiliateId}`);
      } else {
        log('warning', `[${requestId}] No affiliate_id - commission will NOT be generated`);
      }
      
      log('payment', `[${requestId}] ========== SYNC PAYMENT END ==========`);
      response.data.payment = unifiedPayment;
    }

    const duration = Date.now() - startTime;
    log('end', `[${requestId}] ========== SYNC REQUEST COMPLETED ==========`);
    log('info', `[${requestId}] Duration: ${duration}ms`);
    log('debug', `[${requestId}] Response summary:`, {
      success: true,
      action: body.action,
      synced_user: response.data.user?.id,
      synced_payment: response.data.payment?.id,
      synced_subscription: response.data.subscription?.id,
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    log('error', `[${requestId}] ========== SYNC REQUEST FAILED ==========`);
    log('error', `[${requestId}] Duration: ${duration}ms`);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    log('error', `[${requestId}] Error details:`, {
      message: errorMessage,
      stack: errorStack,
      type: error?.constructor?.name,
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        request_id: requestId,
        details: error instanceof Error ? error.toString() : String(error),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
