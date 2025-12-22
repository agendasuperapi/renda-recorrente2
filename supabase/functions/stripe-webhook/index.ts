import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Retorna configurações para ambos os ambientes (produção e teste)
const getStripeConfigs = () => {
  return {
    production: {
      secretKey: Deno.env.get("STRIPE_SECRET_KEY_PROD") || "",
      webhookSecret: Deno.env.get("STRIPE_WEBHOOK_SECRET_PROD") || "",
    },
    test: {
      secretKey: Deno.env.get("STRIPE_SECRET_KEY_TEST") || "",
      webhookSecret: Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST") || "",
    }
  };
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
      console.error("[Stripe Webhook] Missing stripe-signature header");
      return new Response("Missing stripe-signature", { status: 400 });
    }

    const body = await req.text();
    const configs = getStripeConfigs();
    
    let event: Stripe.Event;
    let stripe: Stripe;
    let environment: string;

    // Tentar verificar com o secret de PRODUÇÃO primeiro
    try {
      stripe = new Stripe(configs.production.secretKey, {
        apiVersion: "2023-10-16",
        httpClient: Stripe.createFetchHttpClient(),
      });
      event = await stripe.webhooks.constructEventAsync(body, signature, configs.production.webhookSecret);
      environment = "production";
      console.log(`[Stripe Webhook] ✓ Verified with PRODUCTION secret`);
    } catch (prodErr: any) {
      console.log(`[Stripe Webhook] Production verification failed: ${prodErr.message}`);
      
      // Se falhou com produção, tentar com TESTE
      try {
        stripe = new Stripe(configs.test.secretKey, {
          apiVersion: "2023-10-16",
          httpClient: Stripe.createFetchHttpClient(),
        });
        event = await stripe.webhooks.constructEventAsync(body, signature, configs.test.webhookSecret);
        environment = "test";
        console.log(`[Stripe Webhook] ✓ Verified with TEST secret`);
      } catch (testErr: any) {
        console.error(`[Stripe Webhook] ✗ Signature verification failed for BOTH environments`);
        console.error(`[Stripe Webhook] Production error: ${prodErr.message}`);
        console.error(`[Stripe Webhook] Test error: ${testErr.message}`);
        return new Response(`Webhook Error: Signature verification failed for both environments`, { status: 400 });
      }
    }

    console.log(`[Stripe Webhook] Event type: ${event.type} | Environment: ${environment}`);

    // Extrair metadata, email e dados de cancelamento do evento
    const eventObject = event.data.object as any;
    let metadata: any = {};
    let eventEmail = null;
    let cancellationDetails = null;
    let eventReason = null;

    // Lógica específica por tipo de evento
    if (event.type.startsWith('invoice.')) {
      // Para eventos de invoice, o metadata está em subscription_details
      metadata = eventObject.subscription_details?.metadata || 
                 eventObject.parent?.subscription_details?.metadata || 
                 {};
      eventEmail = metadata.user_email || 
                   eventObject.customer_email || 
                   null;
      // Extrair billing_reason para eventos de invoice
      eventReason = eventObject.billing_reason || null;
    } else {
      // Para outros eventos, metadata está no objeto raiz
      metadata = eventObject.metadata || {};
      eventEmail = metadata.user_email || 
                   eventObject.email || 
                   eventObject.billing_details?.email ||
                   eventObject.customer_details?.email ||
                   null;
      // Extrair reason para outros tipos de eventos
      eventReason = eventObject.reason || null;
    }

    // Extrair dados de cancelamento se existirem
    if (eventObject.cancellation_details) {
      cancellationDetails = {
        reason: eventObject.cancellation_details.reason || null,
        comment: eventObject.cancellation_details.comment || null,
        feedback: eventObject.cancellation_details.feedback || null,
      };
      // Se não encontramos reason antes, tentar pegar do cancellation_details
      if (!eventReason && eventObject.cancellation_details.reason) {
        eventReason = eventObject.cancellation_details.reason;
      }
    }
    
    console.log(`[Stripe Webhook] Metadata:`, {
      user_id: metadata.user_id,
      plan_id: metadata.plan_id,
      product_id: metadata.product_id,
      email: eventEmail,
      affiliate_id: metadata.affiliate_id,
      affiliate_coupon_id: metadata.affiliate_coupon_id,
      coupon_code: metadata.coupon_code
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
        environment: environment,
        cancellation_details: cancellationDetails,
        reason: eventReason,
        affiliate_id: metadata.affiliate_id || null,
        affiliate_coupon_id: metadata.affiliate_coupon_id || null,
        stripe_subscription_id: eventObject.subscription || null,
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
            environment: environment,
            affiliate_id: subscription.metadata?.affiliate_id || session.metadata?.affiliate_id || null,
            affiliate_coupon_id: subscription.metadata?.affiliate_coupon_id || session.metadata?.affiliate_coupon_id || null,
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
          cancel_at_period_end: subscription.cancel_at_period_end || false,
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

        // Capturar motivo de cancelamento se existir
        if (subscription.cancellation_details) {
          updateData.cancellation_details = {
            reason: subscription.cancellation_details.reason || null,
            comment: subscription.cancellation_details.comment || null,
            feedback: subscription.cancellation_details.feedback || null,
          };
          console.log(`[Stripe Webhook] Cancellation details:`, {
            reason: subscription.cancellation_details.reason,
            comment: subscription.cancellation_details.comment,
            feedback: subscription.cancellation_details.feedback,
          });
        }

        // Verificar se o plano mudou
        if (subscription.items?.data?.[0]?.price?.id) {
          const stripePriceId = subscription.items.data[0].price.id;
          console.log(`[Stripe Webhook] Checking for plan change with price_id:`, stripePriceId);
          
          // Buscar o plan_id correspondente ao novo stripe_price_id
          const { data: planIntegration } = await supabase
            .from("plan_integrations")
            .select("plan_id")
            .eq("stripe_price_id", stripePriceId)
            .eq("environment_type", environment)
            .eq("is_active", true)
            .single();

          if (planIntegration?.plan_id) {
            updateData.plan_id = planIntegration.plan_id;
            console.log(`[Stripe Webhook] Plan changed to:`, planIntegration.plan_id);
          }
        }

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

        const deleteData: any = {
          status: "canceled",
          cancelled_at: new Date().toISOString(),
        };

        // Capturar motivo de cancelamento se existir
        if (subscription.cancellation_details) {
          deleteData.cancellation_details = {
            reason: subscription.cancellation_details.reason || null,
            comment: subscription.cancellation_details.comment || null,
            feedback: subscription.cancellation_details.feedback || null,
          };
          console.log(`[Stripe Webhook] Cancellation details:`, {
            reason: subscription.cancellation_details.reason,
            comment: subscription.cancellation_details.comment,
            feedback: subscription.cancellation_details.feedback,
          });
        }

        const { error: deleteError } = await supabase
          .from("subscriptions")
          .update(deleteData)
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

          // Buscar subscriptions ativas do customer na Stripe
          const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            limit: 1,
            status: 'all',
          });

          if (subscriptions.data.length > 0) {
            const stripeSubscriptionId = subscriptions.data[0].id;
            
            const { error: updateError } = await supabase
              .from("subscriptions")
              .update({ payment_method_data: paymentData })
              .eq("stripe_subscription_id", stripeSubscriptionId);

            if (updateError) {
              console.error("Error updating payment method data:", updateError);
            } else {
              console.log(`[Stripe Webhook] Payment method data updated for subscription ${stripeSubscriptionId}`);
            }
          } else {
            console.log(`[Stripe Webhook] No subscription found for customer ${customerId}`);
          }
        }
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const sessionMetadata = session.metadata || {};
        
        console.log(`[Stripe Webhook] Async payment succeeded for session:`, session.id);
        console.log(`[Stripe Webhook] Session metadata:`, {
          user_id: sessionMetadata.user_id,
          plan_id: sessionMetadata.plan_id,
          product_id: sessionMetadata.product_id,
        });
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const sessionMetadata = session.metadata || {};
        
        console.log(`[Stripe Webhook] Async payment failed for session:`, session.id);
        console.log(`[Stripe Webhook] Failed payment metadata:`, {
          user_id: sessionMetadata.user_id,
          plan_id: sessionMetadata.plan_id,
          product_id: sessionMetadata.product_id,
        });
        // TODO: Enviar notificação ao usuário sobre falha
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const sessionMetadata = session.metadata || {};
        
        console.log(`[Stripe Webhook] Checkout session expired:`, session.id);
        console.log(`[Stripe Webhook] Expired session metadata:`, {
          user_id: sessionMetadata.user_id,
          plan_id: sessionMetadata.plan_id,
          product_id: sessionMetadata.product_id,
        });
        break;
      }

      case "customer.created": {
        const customer = event.data.object as Stripe.Customer;
        const customerMetadata = customer.metadata || {};
        
        console.log(`[Stripe Webhook] Customer created:`, customer.id, customer.email);
        console.log(`[Stripe Webhook] Customer metadata:`, {
          user_id: customerMetadata.user_id,
          product_id: customerMetadata.product_id,
        });
        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionMetadata = subscription.metadata || {};
        
        console.log(`[Stripe Webhook] Trial will end for subscription:`, subscription.id);
        console.log(`[Stripe Webhook] Trial ending metadata:`, {
          user_id: subscriptionMetadata.user_id,
          plan_id: subscriptionMetadata.plan_id,
          product_id: subscriptionMetadata.product_id,
        });
        // TODO: Enviar email/notificação sobre fim do trial
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Trial payments (amount = 0) são processados para criar unified_users
        // mas os triggers de banco evitam comissão e notificação automaticamente
        if (invoice.amount_paid === 0) {
          console.log(`[Stripe Webhook] Trial payment (amount = 0) for invoice: ${invoice.id} - creating user record without commission`);
        }
        
        // Metadata vem direto no evento!
        const invoiceMetadata = (invoice as any).subscription_details?.metadata || 
                                (invoice as any).parent?.subscription_details?.metadata ||
                                {};
        
        console.log(`[Stripe Webhook] Invoice paid:`, invoice.id, `Amount: ${invoice.amount_paid}`);
        console.log(`[Stripe Webhook] Invoice metadata:`, {
          user_id: invoiceMetadata.user_id,
          plan_id: invoiceMetadata.plan_id,
          product_id: invoiceMetadata.product_id,
          user_email: invoiceMetadata.user_email,
          customer: invoice.customer,
          billing_reason: invoice.billing_reason,
        });
        
        // Registrar pagamento na tabela payments
        if (invoiceMetadata.user_id && invoiceMetadata.plan_id) {
          // Buscar subscription_id se tiver stripe_subscription_id
          let subscriptionId = null;
          if (invoice.subscription) {
            const stripeSubId = typeof invoice.subscription === 'string' 
              ? invoice.subscription 
              : invoice.subscription.id;
            
            const { data: subscription } = await supabase
              .from("subscriptions")
              .select("id")
              .eq("stripe_subscription_id", stripeSubId)
              .single();
            
            subscriptionId = subscription?.id || null;
          }
          
          const paymentData = {
            user_id: invoiceMetadata.user_id,
            subscription_id: subscriptionId,
            stripe_invoice_id: invoice.id,
            stripe_subscription_id: invoice.subscription ? 
              (typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id) : null,
            plan_id: invoiceMetadata.plan_id,
            amount: invoice.amount_paid / 100, // Converter centavos para reais
            currency: invoice.currency || 'brl',
            billing_reason: invoice.billing_reason || null,
            status: 'paid',
            payment_date: new Date(invoice.created * 1000).toISOString(),
            environment: environment,
            affiliate_id: invoiceMetadata.affiliate_id || null,
            affiliate_coupon_id: invoiceMetadata.affiliate_coupon_id || null,
            metadata: {
              product_id: invoiceMetadata.product_id,
              invoice_pdf: invoice.invoice_pdf,
              hosted_invoice_url: invoice.hosted_invoice_url,
            },
          };
          
          const { error: paymentError } = await supabase
            .from("payments")
            .insert(paymentData);
          
          if (paymentError) {
            console.error("Error creating payment:", paymentError);
          } else {
            console.log(`[Stripe Webhook] Payment registered for user ${invoiceMetadata.user_id}`);
            console.log(`[Stripe Webhook] Trigger will automatically create commission if user has referrer`);
          }
        } else {
          console.warn(`[Stripe Webhook] Missing user_id or plan_id in invoice metadata`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Metadata vem direto no evento!
        const invoiceMetadata = (invoice as any).subscription_details?.metadata || 
                                (invoice as any).parent?.subscription_details?.metadata ||
                                {};
        
        console.log(`[Stripe Webhook] Invoice payment failed:`, invoice.id);
        console.log(`[Stripe Webhook] Failed invoice metadata:`, {
          user_id: invoiceMetadata.user_id,
          plan_id: invoiceMetadata.plan_id,
          product_id: invoiceMetadata.product_id,
          user_email: invoiceMetadata.user_email,
          customer: invoice.customer,
        });
        // TODO: Enviar notificação de falha de pagamento, pausar acesso
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
