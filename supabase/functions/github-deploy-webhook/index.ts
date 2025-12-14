import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('GITHUB_WEBHOOK_SECRET');

    // Validate webhook secret if configured
    const requestSecret = req.headers.get('x-webhook-secret');
    if (webhookSecret && requestSecret !== webhookSecret) {
      console.error('Invalid webhook secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log('Received webhook payload:', JSON.stringify(body));

    const { version, status, run_id, error_message } = body;

    if (!version || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: version, status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate status
    const validStatuses = ['success', 'failed'];
    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: 'Invalid status. Must be: success or failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update app_versions record
    const updateData: Record<string, unknown> = {
      deploy_status: status,
      deploy_completed_at: new Date().toISOString(),
    };

    if (run_id) {
      updateData.github_run_id = run_id;
    }

    if (error_message) {
      updateData.deploy_error = error_message;
    }

    const { data, error } = await supabase
      .from('app_versions')
      .update(updateData)
      .eq('version', version)
      .select()
      .single();

    if (error) {
      console.error('Error updating app_versions:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to update version status', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Deploy status updated for version ${version}: ${status}`);

    // Send notification to admins when deploy is successful
    if (status === 'success') {
      try {
        console.log(`Sending new version notification to admins for version ${version}`);
        
        // Call send-push-notification with admin_only flag
        const { error: notifError } = await supabase.functions.invoke('send-push-notification', {
          body: {
            admin_only: true,
            title: 'Nova Versão Disponível! 🚀',
            body: `A versão ${version} foi publicada com sucesso.`,
            type: 'new_version',
            action_url: '/admin/versions',
            icon: '/app-icon.png',
          },
        });

        if (notifError) {
          console.error('Error sending new version notification:', notifError);
        } else {
          console.log('New version notification sent to admins successfully');
        }
      } catch (notifErr) {
        console.error('Error invoking notification function:', notifErr);
        // Don't fail the webhook if notification fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Deploy status updated to ${status}`,
        version: data 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
