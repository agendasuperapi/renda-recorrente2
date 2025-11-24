import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user's email
    const userEmail = user.email;
    if (!userEmail) {
      throw new Error('User email not found');
    }

    // Get active environment
    const { data: settingsData } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'active_environment')
      .single();

    const environment = settingsData?.value || 'test';
    console.log(`[Customer Portal] Environment: ${environment}`);

    // Get Stripe secret key based on environment
    const stripeSecretKey = environment === 'production'
      ? Deno.env.get('STRIPE_SECRET_KEY_PRODUCTION')
      : Deno.env.get('STRIPE_SECRET_KEY_TEST');

    if (!stripeSecretKey) {
      throw new Error(`Stripe secret key not configured for ${environment} environment`);
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    console.log(`[Customer Portal] Looking for customer with email: ${userEmail}`);

    // Find or create customer
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    let customerId: string;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log(`[Customer Portal] Found existing customer: ${customerId}`);
    } else {
      throw new Error('No Stripe customer found for this user');
    }

    // Get return URL and flow data from request
    const { return_url, flow_data } = await req.json();
    const returnUrl = return_url || `${req.headers.get('origin') || 'http://localhost:8080'}/plan`;

    // Create customer portal session configuration
    const sessionConfig: any = {
      customer: customerId,
      return_url: returnUrl,
    };

    // Add flow_data if provided to go directly to subscription update
    if (flow_data) {
      sessionConfig.flow_data = flow_data;
      console.log(`[Customer Portal] Creating session with flow_data:`, flow_data);
    }

    const session = await stripe.billingPortal.sessions.create(sessionConfig);

    console.log(`[Customer Portal] Session created: ${session.id}`);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Customer Portal] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
