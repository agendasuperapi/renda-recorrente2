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

    // Get the authenticated user (the one making the request)
    const { data: { user: requester }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !requester) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { deletion_reason, target_user_id } = await req.json();
    if (!deletion_reason || deletion_reason.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Motivo da exclusão é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if requester is super_admin
    const { data: requesterRoleData, error: requesterRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requester.id)
      .single();

    if (requesterRoleError && requesterRoleError.code !== 'PGRST116') {
      console.error('Requester role check error:', requesterRoleError);
    }

    const isAdmin = requesterRoleData?.role === 'super_admin';

    // Determine target user ID (self-deletion or admin deleting another user)
    let userId: string;
    let deletedByAdmin = false;

    if (target_user_id && target_user_id !== requester.id) {
      // Admin trying to delete another user
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: 'Apenas administradores podem excluir contas de outros usuários' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = target_user_id;
      deletedByAdmin = true;
      console.log(`Admin ${requester.id} deleting user: ${userId}`);
    } else {
      // Self-deletion
      userId = requester.id;
      console.log(`User self-deleting: ${userId}`);
    }

    // Check if target user is super_admin (they cannot be deleted)
    const { data: targetRoleData, error: targetRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (targetRoleError && targetRoleError.code !== 'PGRST116') {
      console.error('Target role check error:', targetRoleError);
    }

    if (targetRoleData?.role === 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Contas de super administradores não podem ser excluídas' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for active subscription without pending cancellation (skip for admin deletions)
    if (!deletedByAdmin) {
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
    }

    // Get target user's auth data for email
    const { data: { user: targetAuthUser }, error: targetAuthError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (targetAuthError) {
      console.error('Target auth user fetch error:', targetAuthError);
    }

    // Get user profile data for audit log
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
    const profileEmail = profile?.email || targetAuthUser?.email || 'email@desconhecido.com';

    // Register deletion in audit table
    const { error: auditError } = await supabaseAdmin
      .from('deleted_users')
      .insert({
        user_id: userId,
        name: userName,
        email: profileEmail,
        deletion_reason: deletion_reason.trim(),
        deleted_by: deletedByAdmin ? requester.id : null,
        metadata: {
          deleted_at_timestamp: new Date().toISOString(),
          deleted_by_admin: deletedByAdmin,
          admin_id: deletedByAdmin ? requester.id : null
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

    // Anonymize profile data
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

    // Mark unified_users as deleted
    const { error: unifiedError } = await supabaseAdmin
      .from('unified_users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('external_user_id', userId);

    if (unifiedError) {
      console.error('Unified users update error:', unifiedError);
      // Don't fail the whole operation for this
    }

    console.log(`Unified users marked as deleted for user: ${userId}`);

    // Delete auth.users using Admin API
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
        message: deletedByAdmin ? 'Conta do usuário excluída com sucesso' : 'Conta excluída com sucesso' 
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
