import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReprocessResult {
  payment_id: string;
  status: "already_processed" | "commissions_found" | "reprocessed" | "error";
  message: string;
  commissions_count?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { payment_ids, process_all_pending } = await req.json();

    console.log("Reprocess request:", { payment_ids, process_all_pending });

    const results: ReprocessResult[] = [];

    // Get payments to process
    let paymentsToProcess: any[] = [];

    if (process_all_pending) {
      // Get all unprocessed payments
      const { data: pendingPayments, error: fetchError } = await supabase
        .from("unified_payments")
        .select("*")
        .or("commission_processed.eq.false,commission_processed.is.null")
        .is("commission_error", null)
        .order("created_at", { ascending: false })
        .limit(100);

      if (fetchError) {
        console.error("Error fetching pending payments:", fetchError);
        throw fetchError;
      }

      paymentsToProcess = pendingPayments || [];
      console.log(`Found ${paymentsToProcess.length} pending payments to process`);
    } else if (payment_ids && payment_ids.length > 0) {
      // Get specific payments
      const { data: specificPayments, error: fetchError } = await supabase
        .from("unified_payments")
        .select("*")
        .in("id", payment_ids);

      if (fetchError) {
        console.error("Error fetching specific payments:", fetchError);
        throw fetchError;
      }

      paymentsToProcess = specificPayments || [];
      console.log(`Found ${paymentsToProcess.length} specific payments to process`);
    }

    // Process each payment
    for (const payment of paymentsToProcess) {
      try {
        console.log(`Processing payment ${payment.id}...`);

        // Check if commissions already exist for this payment
        const { data: existingCommissions, error: checkError } = await supabase
          .from("commissions")
          .select("id, amount, affiliate_id, level")
          .eq("unified_payment_id", payment.id);

        if (checkError) {
          console.error(`Error checking commissions for payment ${payment.id}:`, checkError);
          results.push({
            payment_id: payment.id,
            status: "error",
            message: `Erro ao verificar comissões: ${checkError.message}`,
          });
          continue;
        }

        const commissionsCount = existingCommissions?.length || 0;

        if (commissionsCount > 0) {
          // Commissions exist but tracking field wasn't updated
          console.log(`Payment ${payment.id} has ${commissionsCount} commissions but wasn't marked as processed`);

          // Update the tracking fields
          const { error: updateError } = await supabase
            .from("unified_payments")
            .update({
              commission_processed: true,
              commission_processed_at: new Date().toISOString(),
              commissions_generated: commissionsCount,
              commission_error: null,
            })
            .eq("id", payment.id);

          if (updateError) {
            console.error(`Error updating payment ${payment.id}:`, updateError);
            results.push({
              payment_id: payment.id,
              status: "error",
              message: `Erro ao atualizar registro: ${updateError.message}`,
            });
          } else {
            results.push({
              payment_id: payment.id,
              status: "commissions_found",
              message: `${commissionsCount} comissão(ões) já existiam - registro atualizado`,
              commissions_count: commissionsCount,
            });
          }
        } else {
          // No commissions exist, need to generate them
          console.log(`Payment ${payment.id} has no commissions, attempting to generate...`);

          // Call the commission generation logic manually
          const generationResult = await generateCommissionsForPayment(supabase, payment);

          if (generationResult.success) {
            results.push({
              payment_id: payment.id,
              status: "reprocessed",
              message: `${generationResult.count} comissão(ões) gerada(s)`,
              commissions_count: generationResult.count,
            });
          } else {
            results.push({
              payment_id: payment.id,
              status: "error",
              message: generationResult.error || "Erro desconhecido ao gerar comissões",
            });
          }
        }
      } catch (paymentError) {
        console.error(`Error processing payment ${payment.id}:`, paymentError);
        results.push({
          payment_id: payment.id,
          status: "error",
          message: paymentError instanceof Error ? paymentError.message : "Erro desconhecido",
        });
      }
    }

    const summary = {
      total: results.length,
      already_processed: results.filter(r => r.status === "already_processed").length,
      commissions_found: results.filter(r => r.status === "commissions_found").length,
      reprocessed: results.filter(r => r.status === "reprocessed").length,
      errors: results.filter(r => r.status === "error").length,
    };

    console.log("Processing complete:", summary);

    return new Response(
      JSON.stringify({ success: true, summary, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in reprocess-commissions:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateCommissionsForPayment(
  supabase: any,
  payment: any
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // Get plan info to check commission percentage
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("commission_percentage, is_free")
      .eq("id", payment.plan_id)
      .single();

    if (planError || !plan) {
      // Update as processed with 0 commissions (no valid plan)
      await supabase
        .from("unified_payments")
        .update({
          commission_processed: true,
          commission_processed_at: new Date().toISOString(),
          commissions_generated: 0,
          commission_error: null,
        })
        .eq("id", payment.id);

      return { success: true, count: 0 };
    }

    // Get unified user's external_user_id
    let externalUserId: string | null = null;
    if (payment.unified_user_id) {
      const { data: unifiedUser } = await supabase
        .from("unified_users")
        .select("external_user_id")
        .eq("id", payment.unified_user_id)
        .single();

      externalUserId = unifiedUser?.external_user_id;
    }

    // Get product name for notes
    const { data: product } = await supabase
      .from("products")
      .select("nome")
      .eq("id", payment.product_id)
      .single();

    const productName = product?.nome || "N/A";
    let commissionsGenerated = 0;

    // Helper function to determine affiliate plan type (FREE or PRO)
    async function getAffiliatePlanType(affiliateId: string): Promise<string> {
      const { data: affiliateSub } = await supabase
        .from("subscriptions")
        .select("plan_id, plans!inner(is_free)")
        .eq("user_id", affiliateId)
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!affiliateSub || affiliateSub.plans?.is_free === undefined) {
        return "FREE"; // Default to FREE if no active plan
      }

      return affiliateSub.plans.is_free ? "FREE" : "PRO";
    }

    // Try to get affiliate hierarchy from sub_affiliates
    if (externalUserId) {
      const { data: affiliateHierarchy } = await supabase
        .from("sub_affiliates")
        .select(`
          parent_affiliate_id,
          level,
          profiles!sub_affiliates_parent_affiliate_id_fkey(name)
        `)
        .eq("sub_affiliate_id", externalUserId)
        .order("level", { ascending: true });

      if (affiliateHierarchy && affiliateHierarchy.length > 0) {
        for (const affiliate of affiliateHierarchy) {
          // Get affiliate's plan type (FREE or PRO)
          const affiliatePlanType = await getAffiliatePlanType(affiliate.parent_affiliate_id);

          console.log(`Affiliate ${affiliate.parent_affiliate_id} is ${affiliatePlanType}, level ${affiliate.level}`);

          // Get commission percentage from product_commission_levels using product + type + level
          const { data: levelConfig } = await supabase
            .from("product_commission_levels")
            .select("percentage")
            .eq("product_id", payment.product_id)
            .eq("plan_type", affiliatePlanType)
            .eq("level", affiliate.level)
            .eq("is_active", true)
            .single();

          if (!levelConfig?.percentage) {
            console.log(`No commission config found for product ${payment.product_id}, type ${affiliatePlanType}, level ${affiliate.level}`);
            continue;
          }

          const commissionAmount = (payment.amount * levelConfig.percentage) / 100;

          // Insert commission
          const { error: insertError } = await supabase
            .from("commissions")
            .insert({
              affiliate_id: affiliate.parent_affiliate_id,
              product_id: payment.product_id,
              unified_payment_id: payment.id,
              unified_user_id: payment.unified_user_id,
              amount: commissionAmount,
              percentage: levelConfig.percentage,
              level: affiliate.level,
              commission_type: payment.billing_reason === "subscription_create" 
                ? "primeira_venda" 
                : payment.billing_reason === "one_time_purchase"
                ? "venda_avulsa"
                : "renovacao",
              status: "pending",
              payment_date: payment.payment_date,
              reference_month: payment.payment_date 
                ? new Date(payment.payment_date).toISOString().slice(0, 7) + "-01"
                : null,
              notes: `Comissão N${affiliate.level} (${affiliatePlanType}) (reprocessada) - Produto: ${productName}`,
            });

          if (!insertError) {
            commissionsGenerated++;
            console.log(`Commission N${affiliate.level} generated for affiliate ${affiliate.parent_affiliate_id} (${affiliatePlanType})`);
          } else {
            console.error(`Error inserting commission:`, insertError);
          }
        }
      }
    }

    // Fallback: if no hierarchy found but payment has affiliate_id
    if (commissionsGenerated === 0 && payment.affiliate_id) {
      console.log(`Using fallback affiliate_id: ${payment.affiliate_id}`);

      // Get affiliate's plan type (FREE or PRO)
      const affiliatePlanType = await getAffiliatePlanType(payment.affiliate_id);

      console.log(`Fallback affiliate is ${affiliatePlanType}`);

      // Get level 1 commission percentage from product_commission_levels
      const { data: levelConfig } = await supabase
        .from("product_commission_levels")
        .select("percentage")
        .eq("product_id", payment.product_id)
        .eq("plan_type", affiliatePlanType)
        .eq("level", 1)
        .eq("is_active", true)
        .single();

      if (levelConfig?.percentage) {
        const commissionAmount = (payment.amount * levelConfig.percentage) / 100;

        const { error: insertError } = await supabase
          .from("commissions")
          .insert({
            affiliate_id: payment.affiliate_id,
            product_id: payment.product_id,
            unified_payment_id: payment.id,
            unified_user_id: payment.unified_user_id,
            amount: commissionAmount,
            percentage: levelConfig.percentage,
            level: 1,
            commission_type: payment.billing_reason === "subscription_create" 
              ? "primeira_venda" 
              : payment.billing_reason === "one_time_purchase"
              ? "venda_avulsa"
              : "renovacao",
            status: "pending",
            payment_date: payment.payment_date,
            reference_month: payment.payment_date 
              ? new Date(payment.payment_date).toISOString().slice(0, 7) + "-01"
              : null,
            notes: `Comissão N1 (${affiliatePlanType}) (reprocessada - direto) - Produto: ${productName}`,
          });

        if (!insertError) {
          commissionsGenerated++;
        }
      } else {
        console.log(`No commission config found for product ${payment.product_id}, type ${affiliatePlanType}, level 1`);
      }
    }

    // Update tracking fields
    await supabase
      .from("unified_payments")
      .update({
        commission_processed: true,
        commission_processed_at: new Date().toISOString(),
        commissions_generated: commissionsGenerated,
        commission_error: null,
      })
      .eq("id", payment.id);

    return { success: true, count: commissionsGenerated };
  } catch (error) {
    console.error("Error generating commissions:", error);

    // Update with error
    await supabase
      .from("unified_payments")
      .update({
        commission_processed: false,
        commission_processed_at: new Date().toISOString(),
        commissions_generated: 0,
        commission_error: error instanceof Error ? error.message : "Erro desconhecido",
      })
      .eq("id", payment.id);

    return { 
      success: false, 
      count: 0, 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    };
  }
}
