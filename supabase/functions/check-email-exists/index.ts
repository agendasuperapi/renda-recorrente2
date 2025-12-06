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

    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[check-email-exists] Checking email:', email);

    // Check if email exists in profiles table (more efficient than listing all auth users)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (profileError) {
      console.error('[check-email-exists] Error checking profiles:', profileError);
    }

    // If found in profiles, return true
    if (profileData) {
      console.log('[check-email-exists] Email found in profiles');
      return new Response(
        JSON.stringify({ exists: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback: Check auth.users using getUserByEmail (more efficient than listUsers)
    // This requires iterating through pages if the user is not in profiles
    let page = 1;
    const perPage = 1000;
    let found = false;

    while (!found) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) {
        console.error('[check-email-exists] Error listing users:', error);
        return new Response(
          JSON.stringify({ error: 'Erro ao verificar email' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if email exists in this page
      found = data.users.some(user => 
        user.email?.toLowerCase().trim() === email.toLowerCase().trim()
      );

      if (found) {
        console.log('[check-email-exists] Email found in auth.users');
        break;
      }

      // If no more users to check, break
      if (data.users.length < perPage) {
        break;
      }

      page++;
    }

    console.log('[check-email-exists] Result:', { exists: found });

    return new Response(
      JSON.stringify({ exists: found }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[check-email-exists] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
