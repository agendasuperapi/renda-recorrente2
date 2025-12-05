import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify identity
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const userEmail = user.email;
    console.log(`Processing account deletion for user: ${userId}`);

    // Parse request body
    const { deletion_reason } = await req.json();
    if (!deletion_reason || deletion_reason.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Motivo da exclusão é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Check if user is super_admin (they cannot delete their own account)
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (roleError && roleError.code !== 'PGRST116') {
      console.error('Role check error:', roleError);
    }

    if (roleData?.role === 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Super administradores não podem excluir a própria conta' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Check for active subscription without pending cancellation
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('id, status, cancel_at_period_end, plan_id')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .single();

    if (subError && subError.code !== 'PGRST116') {
      console.error('Subscription check error:', subError);
    }

    if (subscription && !subscription.cancel_at_period_end) {
      return new Response(
        JSON.stringify({ 
          error: 'Você possui um plano ativo. Cancele seu plano antes de excluir a conta.',
          has_active_plan: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Get user profile data for audit log
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('name, email')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar dados do perfil' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userName = profile?.name || 'Usuário';
    const profileEmail = profile?.email || userEmail || 'email@desconhecido.com';

    // 4. Register deletion in audit table
    const { error: auditError } = await supabaseAdmin
      .from('deleted_users')
      .insert({
        user_id: userId,
        name: userName,
        email: profileEmail,
        deletion_reason: deletion_reason.trim(),
        metadata: {
          deleted_at_timestamp: new Date().toISOString(),
          had_subscription: !!subscription,
          subscription_was_cancelled: subscription?.cancel_at_period_end || false
        }
      });

    if (auditError) {
      console.error('Audit insert error:', auditError);
      return new Response(
        JSON.stringify({ error: 'Erro ao registrar exclusão' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Audit record created for user: ${userId}`);

    // 5. Anonymize profile data
    const deletedUsername = `deleted_${userId.substring(0, 8)}_${Date.now()}`;
    
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        name: '##EXCLUÍDO##',
        username: deletedUsername,
        email: null,
        phone: null,
        cpf: null,
        birth_date: null,
        gender: null,
        cep: null,
        street: null,
        number: null,
        complement: null,
        neighborhood: null,
        city: null,
        state: null,
        instagram: null,
        facebook: null,
        tiktok: null,
        youtube: null,
        twitter: null,
        linkedin: null,
        pix_key: null,
        pix_type: null,
        avatar_url: null,
        deleted_at: new Date().toISOString(),
        deleted_reason: deletion_reason.trim()
      })
      .eq('id', userId);

    if (profileUpdateError) {
      console.error('Profile anonymization error:', profileUpdateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao anonimizar dados do perfil' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Profile anonymized for user: ${userId}`);

    // 6. Mark unified_users as deleted
    const { error: unifiedError } = await supabaseAdmin
      .from('unified_users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('external_user_id', userId);

    if (unifiedError) {
      console.error('Unified users update error:', unifiedError);
      // Don't fail the whole operation for this
    }

    console.log(`Unified users marked as deleted for user: ${userId}`);

    // 7. Delete auth.users using Admin API
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error('Auth user deletion error:', deleteAuthError);
      return new Response(
        JSON.stringify({ error: 'Erro ao excluir conta de autenticação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Auth user deleted successfully: ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Conta excluída com sucesso' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
