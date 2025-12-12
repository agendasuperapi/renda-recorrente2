import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExternalPlan {
  id: string;
  name: string;
  price_cents?: number;
  credits?: number;
  stripe_price_id?: string;
  active?: boolean;
  competitor_price_cents?: number;
  plan_type?: string;
}

interface SyncRequest {
  action: "sync_plan" | "sync_plans";
  product_id: string;
  plan?: ExternalPlan;
  plans?: ExternalPlan[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: SyncRequest = await req.json();
    console.log("Received sync-plans request:", JSON.stringify(body, null, 2));

    // Validate required fields
    if (!body.action) {
      return new Response(
        JSON.stringify({ error: "Missing required field: action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.product_id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: product_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate product_id is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(body.product_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid product_id format. Must be a valid UUID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify product exists
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, nome")
      .eq("id", body.product_id)
      .single();

    if (productError || !product) {
      console.error("Product not found:", body.product_id);
      return new Response(
        JSON.stringify({ error: `Product not found: ${body.product_id}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let plansToSync: ExternalPlan[] = [];

    if (body.action === "sync_plan") {
      if (!body.plan) {
        return new Response(
          JSON.stringify({ error: "Missing required field: plan" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      plansToSync = [body.plan];
    } else if (body.action === "sync_plans") {
      if (!body.plans || !Array.isArray(body.plans)) {
        return new Response(
          JSON.stringify({ error: "Missing or invalid field: plans (must be an array)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      plansToSync = body.plans;
    } else {
      return new Response(
        JSON.stringify({ error: `Invalid action: ${body.action}. Must be 'sync_plan' or 'sync_plans'` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Syncing ${plansToSync.length} plan(s) for product ${product.nome}`);

    // Transform and upsert plans
    const results = {
      total: plansToSync.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const externalPlan of plansToSync) {
      try {
        // Validate plan ID
        if (!externalPlan.id) {
          results.failed++;
          results.errors.push("Plan missing required field: id");
          continue;
        }

        if (!uuidRegex.test(externalPlan.id)) {
          results.failed++;
          results.errors.push(`Invalid plan id format: ${externalPlan.id}`);
          continue;
        }

        // Transform external plan to local format
        const localPlan = {
          id: externalPlan.id,
          name: externalPlan.name || "Plano Importado",
          price: externalPlan.price_cents ? externalPlan.price_cents / 100 : 0,
          original_price: externalPlan.competitor_price_cents || externalPlan.price_cents || null,
          billing_period: "monthly",
          product_id: body.product_id,
          is_active: externalPlan.active !== false,
          is_free: false,
          test_stripe_price_id: externalPlan.stripe_price_id || null,
          features: {
            credits: externalPlan.credits || null,
            plan_type: externalPlan.plan_type || null,
          },
          updated_at: new Date().toISOString(),
        };

        console.log(`Upserting plan: ${externalPlan.id} - ${localPlan.name}`);

        const { error: upsertError } = await supabase
          .from("plans")
          .upsert(localPlan, { onConflict: "id" });

        if (upsertError) {
          console.error(`Error upserting plan ${externalPlan.id}:`, upsertError);
          results.failed++;
          results.errors.push(`Plan ${externalPlan.id}: ${upsertError.message}`);
        } else {
          results.success++;
          console.log(`Successfully synced plan: ${externalPlan.id}`);
        }
      } catch (planError: unknown) {
        const errorMessage = planError instanceof Error ? planError.message : "Unknown error";
        console.error(`Error processing plan:`, planError);
        results.failed++;
        results.errors.push(`Plan ${externalPlan.id || "unknown"}: ${errorMessage}`);
      }
    }

    console.log(`Sync completed: ${results.success} success, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${results.success} of ${results.total} plans`,
        results,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Error in sync-plans:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
