import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Check, Shield, Trophy, Lock, Users, ExternalLink, AlertCircle, Calendar, CreditCard, MousePointer2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as LucideIcons from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

const PRODUCT_ID = "bb582482-b006-47b8-b6ea-a6944d8cfdfd";

interface Plan {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  billing_period: string;
  is_free: boolean;
  plan_features?: { feature_id: string }[];
}

interface Feature {
  id: string;
  name: string;
  icon: string;
}

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  stripe_subscription_id: string | null;
  cancel_at_period_end: boolean | null;
  plan: Plan;
}

const Plan = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [selectingPlan, setSelectingPlan] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState<any>(null);

  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Check for pending checkout
  const { data: pendingCheckoutData } = useQuery({
    queryKey: ["pending-checkout", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await (supabase as any)
        .from("pending_checkouts")
        .select("*, plans(name, price, billing_period)")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (pendingCheckoutData) {
      setPendingCheckout(pendingCheckoutData);
    }
  }, [pendingCheckoutData]);

  // Fetch current subscription
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          *,
          plan:plans(*)
        `)
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error("Error fetching subscription:", error);
        return null;
      }

      return data as unknown as Subscription;
    },
    enabled: !!user?.id,
  });

  // Fetch all plans
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select(`
          *,
          plan_features(feature_id)
        `)
        .eq("is_active", true)
        .eq("product_id", PRODUCT_ID)
        .order("price", { ascending: true });

      if (error) throw error;
      return data as Plan[];
    },
  });

  // Fetch product icons
  const { data: product } = useQuery({
    queryKey: ["product", PRODUCT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("icone_dark, icone_light")
        .eq("id", PRODUCT_ID)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch features
  const { data: features = [] } = useQuery({
    queryKey: ["features"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_features")
        .select("*")
        .eq("is_active", true)
        .order("order_position", { ascending: true });

      if (error) throw error;
      return data as Feature[];
    },
  });

  // Fetch commission levels for the product
  const { data: commissionLevels = [] } = useQuery({
    queryKey: ["product-commission-levels", PRODUCT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_commission_levels")
        .select("*")
        .eq("product_id", PRODUCT_ID)
        .eq("level", 1)
        .eq("is_active", true);

      if (error) throw error;
      return data;
    },
  });

  // Helper to get commission percentage based on plan type
  const getCommissionPercentage = (isFree: boolean): number => {
    const planType = isFree ? "FREE" : "PRO";
    const level = commissionLevels.find(l => l.plan_type === planType);
    return level?.percentage ?? 0;
  };

  const getIconComponent = (iconName: string): React.ComponentType<any> => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent || LucideIcons.CheckCircle2;
  };

  const handleSelectPlan = async (planId: string) => {
    try {
      setSelectingPlan(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Não está logado - vai para signup
        window.location.href = `/signup/${planId}`;
        return;
      }
      
      // Está logado - criar checkout embedded
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", session.user.id)
        .single();

      const selectedPlan = plans.find(p => p.id === planId);

      const response = await supabase.functions.invoke("create-stripe-checkout", {
        body: {
          plan_id: planId,
          user_email: session.user.email,
          user_name: profile?.name || session.user.email,
          user_id: session.user.id,
          coupon: null,
          return_url: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`
        }
      });
      
      if (response.error) throw response.error;
      
      if (response.data?.client_secret) {
        // Save checkout data to database
        const { error: insertError } = await (supabase as any)
          .from("pending_checkouts")
          .insert({
            user_id: session.user.id,
            plan_id: planId,
            checkout_url: '', // Não temos mais URL, usamos embedded
            stripe_session_id: response.data.session_id,
            status: "pending",
          });

        if (insertError) {
          console.error("Erro ao salvar checkout pendente:", insertError);
        }

        // Clear pending checkout state
        setPendingCheckout(null);

        // Navegar para página de checkout com client_secret
        navigate('/checkout', {
          state: {
            clientSecret: response.data.client_secret,
            sessionId: response.data.session_id,
            planId,
            planName: selectedPlan?.name
          }
        });
      }
    } catch (error) {
      console.error("Erro ao criar checkout:", error);
      toast.error("Erro ao processar pagamento. Tente novamente.");
    } finally {
      setSelectingPlan(false);
    }
  };

  const handleContinuePendingCheckout = async () => {
    // Recria o checkout embedded para continuar
    if (pendingCheckout?.plan_id) {
      await handleSelectPlan(pendingCheckout.plan_id);
    }
  };

  const handleManageSubscription = async (flowPath?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Você precisa estar autenticado");
        return;
      }

      const body: any = { return_url: window.location.href };
      if (flowPath) {
        body.flow_data = {
          type: "subscription_update",
          subscription_update: {
            subscription: subscription?.stripe_subscription_id
          }
        };
      }

      const response = await supabase.functions.invoke("create-customer-portal-session", {
        body,
      });

      if (response.error) throw response.error;

      if (response.data?.url) {
        // No editor da Lovable, abre em nova aba. Quando publicado, na mesma aba
        if (import.meta.env.DEV) {
          window.open(response.data.url, '_blank');
        } else {
          window.location.href = response.data.url;
        }
      }
    } catch (error) {
      console.error("Error creating portal session:", error);
      toast.error("Erro ao acessar o portal de assinatura");
    }
  };

  const isTrialActive = subscription?.trial_end && new Date(subscription.trial_end) > new Date();
  const trialEndDate = subscription?.trial_end ? new Date(subscription.trial_end) : null;

  if (subscriptionLoading || plansLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Alert para checkout pendente */}
      {user && !subscription && pendingCheckout && (
        <Alert className="border-2 border-primary bg-primary/5">
          <AlertCircle className="h-5 w-5 text-primary" />
          <AlertDescription>
            <div className="space-y-3">
              <p className="font-semibold text-foreground">Checkout Pendente</p>
              <p className="text-muted-foreground">
                Você iniciou o processo de assinatura do plano <strong>{pendingCheckout.plans?.name}</strong> ({pendingCheckout.plans?.billing_period === 'monthly' ? 'Mensal' : 'Anual'}).
                Deseja continuar com este plano?
              </p>
              <Button 
                onClick={handleContinuePendingCheckout}
                className="w-full sm:w-auto"
              >
                Pagar Plano ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingCheckout.plans?.price || 0)})
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Ou escolha um novo plano abaixo
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Alert quando não tem plano ativo e não tem checkout pendente */}
      {!subscription && user && !pendingCheckout && (
        <Alert className="border-destructive bg-destructive/10">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Você ainda não possui um plano ativo</p>
              <p className="text-muted-foreground">
                Escolha um dos planos abaixo para começar a usar todas as funcionalidades do aplicativo e começar a ganhar comissões!
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan Info */}
      {subscription && (
        <Card className={subscription.cancel_at_period_end ? "border-destructive" : ""}>
          <CardHeader>
            <CardTitle>Plano Atual</CardTitle>
            <CardDescription>Informações sobre sua assinatura</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Plano</p>
                  <p className="text-lg font-semibold">{subscription.plan.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Período</p>
                  <p className="text-base">
                    {format(new Date(subscription.current_period_start), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(subscription.current_period_end), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <AlertCircle className={`w-5 h-5 mt-0.5 ${subscription.cancel_at_period_end ? "text-destructive" : "text-primary"}`} />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Situação</p>
                <Badge variant={subscription.cancel_at_period_end ? "destructive" : subscription.status === "trialing" ? "trial" : subscription.status === "active" ? "default" : "secondary"}>
                  {subscription.cancel_at_period_end ? "Cancelamento solicitado" : subscription.status === "active" ? "Ativo" : subscription.status === "trialing" ? "Período de teste" : subscription.status}
                </Badge>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Comissão</p>
                  <p className="text-lg font-semibold text-primary">{getCommissionPercentage(subscription.plan.is_free)}%</p>
                </div>
              </div>
            </div>

            {isTrialActive && trialEndDate && (
              <Alert className="border-primary/30 bg-primary/5">
                <AlertCircle className="h-4 w-4 text-primary" />
                <AlertDescription className="text-foreground">
                  Seu período de teste termina em {format(trialEndDate, "dd/MM/yyyy HH:mm", { locale: ptBR })}. Depois desse período o valor do plano será cobrado no seu cartão.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cancellation Notice */}
      {subscription?.cancel_at_period_end && (
        <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/30">
          <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-500" />
          <AlertDescription className="text-orange-900 dark:text-orange-200">
            <div className="space-y-2">
              <p className="font-semibold">Cancelamento solicitado</p>
              <p>
                Você solicitou o cancelamento da sua assinatura. Ela permanecerá ativa até{" "}
                <span className="font-semibold">
                  {format(new Date(subscription.current_period_end), "dd/MM/yyyy", { locale: ptBR })}
                </span>
                {" "}e você poderá usar todos os benefícios do plano até esta data.
              </p>
              <p>
                Caso deseje continuar com seu plano e desfazer o cancelamento, você pode reativá-lo a qualquer momento através do botão "Gerenciar Assinatura" abaixo.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Plans Section */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Planos Disponíveis</h2>
        <p className="text-muted-foreground mb-6">
          {subscription ? "Altere seu plano quando quiser" : "Escolha o plano ideal para maximizar seus ganhos"}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = subscription?.plan_id === plan.id;
            const isFree = plan.is_free;
            const isPro = !isFree;

            return (
              <div
                key={plan.id}
                className={`relative bg-card rounded-2xl p-6 md:p-8 border-2 transition-all duration-300 hover:scale-105 hover:shadow-2xl flex flex-col mt-8 ${
                  isCurrent ? "border-primary shadow-lg" : "border-border"
                }`}
              >
                {/* Badge */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                  <Badge className={
                    isCurrent 
                      ? "bg-primary text-primary-foreground px-4 py-2 text-sm font-bold shadow-lg border-2 border-primary whitespace-nowrap" 
                      : "bg-secondary text-secondary-foreground px-4 py-2 text-sm font-semibold whitespace-nowrap"
                  }>
                    {isCurrent ? "Plano Atual" : isFree ? "Para conhecer" : "Mais lucrativo"}
                  </Badge>
                </div>

                {/* Plan Name */}
                <h3 className="text-primary text-2xl font-bold text-center mb-6 mt-8">
                  {plan.name}
                </h3>

                {/* Features */}
                <ul className="space-y-2 mb-8 flex-grow">
                  {features.map((feature) => {
                    const IconComponent = getIconComponent(feature.icon);
                    const hasPlanFeatures = Array.isArray(plan.plan_features) && plan.plan_features.length > 0;
                    const isIncluded = hasPlanFeatures
                      ? plan.plan_features!.some((pf) => pf.feature_id === feature.id)
                      : false;

                    return (
                      <li key={feature.id} className="flex items-start gap-3">
                        <IconComponent
                          className={`h-5 w-5 shrink-0 mt-0.5 ${
                            isIncluded ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                        <span className={isIncluded ? "text-foreground" : "text-muted-foreground line-through"}>
                          {feature.name}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {/* Bottom Section - Always aligned */}
                <div className="mt-auto">
                  {/* Commission Badge */}
                  <div className={`mb-6 p-4 rounded-lg border-2 ${
                    !plan.is_free 
                      ? 'bg-primary/10 border-primary' 
                      : 'bg-muted border-border'
                  }`}>
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-medium">Comissão recorrente</p>
                      <p className="text-2xl font-bold text-primary">
                        {getCommissionPercentage(plan.is_free)}%
                      </p>
                    </div>
                  </div>

                  {/* Pricing */}
                  {isPro && plan.original_price && plan.original_price > plan.price ? (
                    <div className="text-center mb-2">
                      <span className="text-muted-foreground text-sm">de </span>
                      <span className="text-muted-foreground line-through text-sm">
                        R${plan.original_price.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground text-sm"> por:</span>
                    </div>
                  ) : (
                    <div className="h-6 mb-2"></div>
                  )}
                  
                  <div className="text-center mb-2">
                    {plan.is_free ? (
                      <span className="text-primary text-5xl md:text-6xl font-bold">
                        FREE
                      </span>
                    ) : (
                      <>
                        <span className="text-primary text-4xl font-bold">
                          R${plan.price.toFixed(2)}
                        </span>
                        <span className="text-muted-foreground text-lg">
                          /{plan.billing_period === 'monthly' ? 'mês' : plan.billing_period === 'yearly' ? 'ano' : plan.billing_period}
                        </span>
                      </>
                    )}
                  </div>

                  {isPro && plan.original_price && plan.original_price > plan.price ? (
                    <div className="text-center mb-6">
                      <span className="text-sm font-medium text-muted-foreground">
                        R$ {(plan.original_price - plan.price).toFixed(2)} de desconto
                      </span>
                    </div>
                  ) : (
                    <div className="h-5 mt-2 mb-6"></div>
                  )}

                  {/* Button */}
                  <Button
                    className="w-full font-medium py-6 rounded-xl mb-4"
                    disabled={isCurrent || selectingPlan}
                    onClick={() => {
                      if (!isCurrent) {
                        if (subscription) {
                          handleManageSubscription("/subscriptions/update");
                        } else {
                          handleSelectPlan(plan.id);
                        }
                      }
                    }}
                  >
                    <MousePointer2 className="mr-2 h-5 w-5" />
                    {isCurrent ? "Plano Atual" : selectingPlan ? "Processando..." : `Selecionar ${plan.name}`}
                  </Button>

                  {/* Trial Text */}
                  {isPro && !isCurrent ? (
                    <p className="text-primary text-center text-sm font-medium mb-6">
                      Teste Grátis por 7 dias
                    </p>
                  ) : (
                    <div className="h-5 mb-6"></div>
                  )}

                  {/* Trust Badges */}
                  <div className="flex justify-center gap-6">
                    <div className="flex flex-col items-center">
                      <Shield className="h-6 w-6 text-foreground mb-1" />
                      <span className="text-xs text-foreground text-center">Compra<br/>Segura</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Trophy className="h-6 w-6 text-foreground mb-1" />
                      <span className="text-xs text-foreground text-center">Satisfação<br/>Garantida</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Lock className="h-6 w-6 text-foreground mb-1" />
                      <span className="text-xs text-foreground text-center">Privacidade<br/>Protegida</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Manage Subscription Section */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Gerenciar Assinatura</CardTitle>
            <CardDescription>
              Gerencie sua assinatura, altere a forma de pagamento ou cancele quando quiser.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => handleManageSubscription()} className="w-full md:w-auto">
              <ExternalLink className="mr-2 h-4 w-4" />
              Gerenciar Assinatura
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Plan;
