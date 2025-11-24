import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const getStripeConfig = async () => {
  const { data: settings } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "environment_mode")
    .single();

  const isProduction = settings?.value === "production";
  
  const secretKey = isProduction 
    ? Deno.env.get("STRIPE_SECRET_KEY_PROD")
    : Deno.env.get("STRIPE_SECRET_KEY_TEST");
  
  const webhookSecret = isProduction
    ? Deno.env.get("STRIPE_WEBHOOK_SECRET_PROD")
    : Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST");

  const stripe = new Stripe(secretKey || "", {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });

  return { stripe, webhookSecret: webhookSecret || "" };
};

const toIsoFromUnix = (value: number | null | undefined) =>
  typeof value === "number" && value > 0 ? new Date(value * 1000).toISOString() : null;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("Missing stripe-signature header");
      return new Response("Missing stripe-signature", { status: 400 });
    }

    const body = await req.text();
    let event: Stripe.Event;
    const { stripe, webhookSecret } = await getStripeConfig();

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log(`[Stripe Webhook] Event type: ${event.type}`);

    // Extrair metadata e email do evento
    const eventObject = event.data.object as any;
    const metadata = eventObject.metadata || {};
    
    // Tentar extrair email de múltiplas fontes
    let eventEmail = metadata.user_email || 
                     eventObject.email || 
                     eventObject.billing_details?.email ||
                     eventObject.customer_details?.email ||
                     null;
    
    console.log(`[Stripe Webhook] Metadata:`, {
      user_id: metadata.user_id,
      plan_id: metadata.plan_id,
      product_id: metadata.product_id,
      email: eventEmail
    });
    
    // Registrar evento na tabela stripe_events com metadata completo
    const { error: eventInsertError } = await supabase
      .from("stripe_events")
      .insert({
        event_id: event.id,
        event_type: event.type,
        event_data: event.data.object,
        user_id: metadata.user_id || null,
        plan_id: metadata.plan_id || null,
        product_id: metadata.product_id || null,
        email: eventEmail,
        processed: false,
      });

    if (eventInsertError) {
      console.error("Error inserting stripe event:", eventInsertError);
    }

    // Processar eventos relevantes
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`[Stripe Webhook] Checkout completed:`, session.id);

        if (session.mode === "subscription" && session.subscription) {
          const subscriptionId = typeof session.subscription === "string" 
            ? session.subscription 
            : session.subscription.id;

          // Buscar detalhes completos da assinatura
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          
          // Extrair user_id e plan_id dos metadados da subscription
          const userId = subscription.metadata?.user_id || session.metadata?.user_id;
          const planId = subscription.metadata?.plan_id || session.metadata?.plan_id;

          if (!userId || !planId) {
            console.error("Missing user_id or plan_id in subscription/session metadata");
            break;
          }

          // Criar registro de assinatura
          const subscriptionData: any = {
            user_id: userId,
            plan_id: planId,
            stripe_subscription_id: subscription.id,
            status: subscription.status,
          };

          const currentStart = toIsoFromUnix(subscription.current_period_start as number | null | undefined);
          const currentEnd = toIsoFromUnix(subscription.current_period_end as number | null | undefined);
          const trialEnd = toIsoFromUnix(subscription.trial_end as number | null | undefined);
          const cancelAt = toIsoFromUnix(subscription.cancel_at as number | null | undefined);

          if (currentStart) subscriptionData.current_period_start = currentStart;
          if (currentEnd) subscriptionData.current_period_end = currentEnd;
          if (trialEnd) subscriptionData.trial_end = trialEnd;
          if (cancelAt) subscriptionData.cancel_at = cancelAt;

          const { error: subscriptionError } = await supabase
            .from("subscriptions")
            .insert(subscriptionData);

          if (subscriptionError) {
            console.error("Error creating subscription:", subscriptionError);
          } else {
            console.log(`[Stripe Webhook] Subscription created for user ${userId}`);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[Stripe Webhook] Subscription updated:`, subscription.id);

        const updateData: any = {
          status: subscription.status,
        };

        const currentStart = toIsoFromUnix(subscription.current_period_start as number | null | undefined);
        const currentEnd = toIsoFromUnix(subscription.current_period_end as number | null | undefined);
        const trialEnd = toIsoFromUnix(subscription.trial_end as number | null | undefined);
        const cancelAt = toIsoFromUnix(subscription.cancel_at as number | null | undefined);
        const canceledAt = toIsoFromUnix(subscription.canceled_at as number | null | undefined);

        if (currentStart) updateData.current_period_start = currentStart;
        if (currentEnd) updateData.current_period_end = currentEnd;
        if (trialEnd) updateData.trial_end = trialEnd;
        if (cancelAt) updateData.cancel_at = cancelAt;
        if (canceledAt) updateData.cancelled_at = canceledAt;

        const { error: updateError } = await supabase
          .from("subscriptions")
          .update(updateData)
          .eq("stripe_subscription_id", subscription.id);

        if (updateError) {
          console.error("Error updating subscription:", updateError);
        } else {
          console.log(`[Stripe Webhook] Subscription ${subscription.id} updated`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[Stripe Webhook] Subscription deleted:`, subscription.id);

        const { error: deleteError } = await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            cancelled_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (deleteError) {
          console.error("Error deleting subscription:", deleteError);
        } else {
          console.log(`[Stripe Webhook] Subscription ${subscription.id} marked as canceled`);
        }
        break;
      }

      case "payment_method.attached": {
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        console.log(`[Stripe Webhook] Payment method attached:`, paymentMethod.id);

        // Extrair dados do payment method
        const paymentData = {
          brand: paymentMethod.card?.brand || null,
          last4: paymentMethod.card?.last4 || null,
          country: paymentMethod.card?.country || null,
          funding: paymentMethod.card?.funding || null,
          exp_year: paymentMethod.card?.exp_year || null,
          display_brand: paymentMethod.card?.display_brand || null,
          name: paymentMethod.billing_details?.name || null,
          email: paymentMethod.billing_details?.email || null,
        };

        console.log(`[Stripe Webhook] Payment method data:`, paymentData);

        // Buscar subscription do customer para atualizar
        if (paymentMethod.customer) {
          const customerId = typeof paymentMethod.customer === 'string' 
            ? paymentMethod.customer 
            : paymentMethod.customer.id;

          const { data: subscription, error: subError } = await supabase
            .from("subscriptions")
            .select("id, stripe_subscription_id")
            .eq("stripe_subscription_id", customerId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (!subError && subscription) {
            const { error: updateError } = await supabase
              .from("subscriptions")
              .update({ payment_method_data: paymentData })
              .eq("id", subscription.id);

            if (updateError) {
              console.error("Error updating payment method data:", updateError);
            } else {
              console.log(`[Stripe Webhook] Payment method data updated for subscription ${subscription.id}`);
            }
          } else {
            console.log(`[Stripe Webhook] No subscription found for customer ${customerId}`);
          }
        }
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`[Stripe Webhook] Async payment succeeded for session:`, session.id);
        // Evento já registrado, pode ser usado para notificações futuras
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`[Stripe Webhook] Async payment failed for session:`, session.id);
        // Registrar falha de pagamento
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`[Stripe Webhook] Checkout session expired:`, session.id);
        // Registrar sessão expirada
        break;
      }

      case "customer.created": {
        const customer = event.data.object as Stripe.Customer;
        console.log(`[Stripe Webhook] Customer created:`, customer.id, customer.email);
        // Apenas logging, pode ser expandido no futuro
        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[Stripe Webhook] Trial will end for subscription:`, subscription.id);
        // Pode ser usado para enviar notificações antes do fim do trial
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[Stripe Webhook] Invoice paid:`, invoice.id, `Amount: ${invoice.amount_paid}`);
        // Registrar pagamento de invoice
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[Stripe Webhook] Invoice payment failed:`, invoice.id);
        // Registrar falha de pagamento de invoice
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    // Marcar evento como processado
    await supabase
      .from("stripe_events")
      .update({ processed: true })
      .eq("event_id", event.id);

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
