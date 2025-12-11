import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { Check, X, Edit, Trash2, Tag, Plus, Minus, FileText, CreditCard, Package, FileQuestion, Box } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useState } from "react";
import { ScrollAnimation } from "@/components/ScrollAnimation";

const planFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  billing_period: z.enum(["monthly", "yearly", "daily"]),
  price: z.coerce.number().min(0),
  original_price: z.coerce.number().optional(),
  description: z.string().optional(),
  obs_plan: z.string().optional(),
  obs_discount: z.string().optional(),
  obs_coupon: z.string().optional(),
  coupon_id: z.string().optional(),
  trial_days: z.coerce.number().min(0).default(0),
  commission_percentage: z.coerce.number().min(0).max(100).default(25),
  is_active: z.boolean().default(true),
  is_free: z.boolean().default(false),
  product_id: z.string().optional(),
});

type PlanFormData = z.infer<typeof planFormSchema>;

type Product = {
  id: string;
  nome: string;
};

type Coupon = {
  id: string;
  code: string;
  name: string;
  value: number;
  type: string;
};

const AdminPlans = () => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>("bb582482-b006-47b8-b6ea-a6944d8cfdfd");
  const [isStripeDialogOpen, setIsStripeDialogOpen] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  
  const [stripeFormData, setStripeFormData] = useState({
    banco: "STRIPE",
    conta: "",
    nome: "",
    produto_id: "",
    preco_id: "",
    environment_type: "production" as "test" | "production",
  });
  const [isEditingIntegration, setIsEditingIntegration] = useState(false);
  const [editingIntegrationId, setEditingIntegrationId] = useState<string | null>(null);

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: "",
      billing_period: "monthly",
      price: 0,
      original_price: 0,
      description: "",
      obs_plan: "",
      obs_discount: "",
      obs_coupon: "",
      coupon_id: "",
      trial_days: 0,
      commission_percentage: 25,
      is_active: true,
      is_free: false,
      product_id: "",
    },
  });

  const { data: plans, isLoading, isFetching, error } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      console.log("[AdminPlans] Iniciando busca de planos...");
      const { data, error } = await supabase
        .from("plans")
        .select(`
          *,
          products (
            id,
            nome,
            icone_light,
            icone_dark
          ),
          accounts (
            id,
            name
          )
        `)
        .order("created_at", { ascending: false });
      
      if (error) {
        if (import.meta.env.DEV) {
          console.error("[AdminPlans] Erro ao carregar:", error);
        }
        throw error;
      }
      console.log("[AdminPlans] Planos carregados:", data?.length ?? 0, data);
      return data;
    },
    staleTime: 0, // Sempre considerar dados como stale para garantir refetch
    refetchOnMount: true, // Sempre refetch ao montar o componente
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: coupons } = useQuery({
    queryKey: ["coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("is_active", true);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("nome", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select(`
          *,
          banks (
            name
          )
        `)
        .eq("is_active", true)
        .order("name", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: planIntegrations } = useQuery({
    queryKey: ["plan-integrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_integrations")
        .select(`
          *,
          accounts (
            id,
            name
          )
        `);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: landingFeatures } = useQuery({
    queryKey: ["landing-features"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_features")
        .select("*")
        .eq("is_active", true)
        .order("order_position", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: PlanFormData) => {
      const features = [
        `obs_plan:${data.obs_plan || ""}`,
        `obs_discount:${data.obs_discount || ""}`,
        `obs_coupon:${data.obs_coupon || ""}`,
        `coupon_id:${data.coupon_id || ""}`,
        `trial_days:${data.trial_days}`,
      ];

      const { data: newPlan, error } = await supabase.from("plans").insert({
        name: data.name,
        description: data.description,
        price: data.price,
        original_price: data.original_price,
        billing_period: data.billing_period,
        commission_percentage: data.commission_percentage,
        is_active: data.is_active,
        is_free: data.is_free,
        features,
        product_id: data.product_id || null,
      }).select().single();
      
      if (error) throw error;

      // Insert selected features
      if (newPlan && selectedFeatures.length > 0) {
        const planFeaturesData = selectedFeatures.map(featureId => ({
          plan_id: newPlan.id,
          feature_id: featureId,
        }));

        const { error: featuresError } = await supabase
          .from("plan_features")
          .insert(planFeaturesData);

        if (featuresError) throw featuresError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      toast.success("Plano criado com sucesso!");
      handleCancelEdit();
    },
    onError: (error) => {
      toast.error("Erro ao criar plano");
      if (import.meta.env.DEV) {
        console.error(error);
      }
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PlanFormData }) => {
      const features = [
        `obs_plan:${data.obs_plan || ""}`,
        `obs_discount:${data.obs_discount || ""}`,
        `obs_coupon:${data.obs_coupon || ""}`,
        `coupon_id:${data.coupon_id || ""}`,
        `trial_days:${data.trial_days}`,
      ];

      const { error } = await supabase
        .from("plans")
        .update({
          name: data.name,
          description: data.description,
          price: data.price,
          original_price: data.original_price,
          billing_period: data.billing_period,
          commission_percentage: data.commission_percentage,
          is_active: data.is_active,
          is_free: data.is_free,
          features,
          product_id: data.product_id || null,
        })
        .eq("id", id);
      
      if (error) throw error;

      // Delete existing plan features
      const { error: deleteError } = await supabase
        .from("plan_features")
        .delete()
        .eq("plan_id", id);

      if (deleteError) throw deleteError;

      // Insert new selected features
      if (selectedFeatures.length > 0) {
        const planFeaturesData = selectedFeatures.map(featureId => ({
          plan_id: id,
          feature_id: featureId,
        }));

        const { error: featuresError } = await supabase
          .from("plan_features")
          .insert(planFeaturesData);

        if (featuresError) throw featuresError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      toast.success("Plano atualizado com sucesso!");
      handleCancelEdit();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar plano");
      if (import.meta.env.DEV) {
        console.error(error);
      }
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("plans")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      toast.success("Plano excluído com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir plano");
      if (import.meta.env.DEV) {
        console.error(error);
      }
    },
  });

  const onSubmit = (data: PlanFormData) => {
    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan.id, data });
    } else {
      createPlanMutation.mutate(data);
    }
  };

  const handleEditPlan = async (plan: any) => {
    setEditingPlan(plan);
    setIsDialogOpen(true);
    const features = Array.isArray(plan.features) ? plan.features : [];
    
    form.reset({
      name: plan.name,
      billing_period: plan.billing_period,
      price: plan.price,
      original_price: plan.original_price || 0,
      obs_plan: features.find((f: string) => f.startsWith("obs_plan:"))?.replace("obs_plan:", "") || "",
      obs_discount: features.find((f: string) => f.startsWith("obs_discount:"))?.replace("obs_discount:", "") || "",
      obs_coupon: features.find((f: string) => f.startsWith("obs_coupon:"))?.replace("obs_coupon:", "") || "",
      coupon_id: features.find((f: string) => f.startsWith("coupon_id:"))?.replace("coupon_id:", "") || "",
      trial_days: parseInt(features.find((f: string) => f.startsWith("trial_days:"))?.replace("trial_days:", "") || "0"),
      commission_percentage: plan.commission_percentage,
      is_active: plan.is_active,
      is_free: plan.is_free ?? false,
      product_id: plan.product_id || "",
    });

    // Load selected features for this plan
    const { data: planFeatures } = await supabase
      .from("plan_features")
      .select("feature_id")
      .eq("plan_id", plan.id);

    setSelectedFeatures(planFeatures?.map(pf => pf.feature_id) || []);
    
    // Limpar dados do Stripe
    setStripeFormData({
      banco: "STRIPE",
      conta: "",
      nome: plan.name ?? "",
      produto_id: "",
      preco_id: "",
      environment_type: "production",
    });
  };

  const handleNewPlan = () => {
    setEditingPlan(null);
    setIsDialogOpen(true);
    setSelectedFeatures([]);
    form.reset({
      name: "",
      billing_period: "monthly",
      price: 0,
      original_price: 0,
      description: "",
      obs_plan: "",
      obs_discount: "",
      obs_coupon: "",
      coupon_id: "",
      trial_days: 0,
      commission_percentage: 25,
      is_active: true,
      is_free: false,
      product_id: "",
    });
    
    // Resetar dados do Stripe
    setStripeFormData({
      banco: "STRIPE",
      conta: "",
      nome: "",
      produto_id: "",
      preco_id: "",
      environment_type: "production",
    });
  };

  const handleDeletePlan = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este plano?")) {
      deletePlanMutation.mutate(id);
    }
  };

  const handleCancelEdit = () => {
    setEditingPlan(null);
    setIsDialogOpen(false);
    setSelectedFeatures([]);
    form.reset();
  };

  const handleSaveStripe = async () => {
    if (!editingPlan) {
      toast.error("Nenhum plano selecionado");
      return;
    }

    if (!stripeFormData.produto_id || !stripeFormData.preco_id) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!stripeFormData.conta) {
      toast.error("Selecione uma conta");
      return;
    }

    // Ao criar uma nova integração ativa, desativa as outras do mesmo tipo
    if (stripeFormData.environment_type) {
      const { error: deactivateError } = await supabase
        .from("plan_integrations")
        .update({ is_active: false })
        .eq("plan_id", editingPlan.id)
        .eq("environment_type", stripeFormData.environment_type)
        .eq("is_active", true);

      if (deactivateError) {
        if (import.meta.env.DEV) {
          console.error("Erro ao desativar integrações anteriores:", deactivateError);
        }
      }
    }

    const payload = {
      plan_id: editingPlan.id,
      account_id: stripeFormData.conta,
      stripe_product_id: stripeFormData.produto_id,
      stripe_price_id: stripeFormData.preco_id,
      environment_type: stripeFormData.environment_type,
      is_active: true,
    };

    // Se estiver editando, atualiza; senão, insere
    let error;
    if (editingIntegrationId) {
      const result = await supabase
        .from("plan_integrations")
        .update(payload)
        .eq("id", editingIntegrationId);
      error = result.error;
    } else {
      const result = await supabase
        .from("plan_integrations")
        .insert(payload);
      error = result.error;
    }

    if (error) {
      toast.error("Erro ao salvar integração Stripe");
      if (import.meta.env.DEV) {
        console.error(error);
      }
    } else {
      toast.success("Integração Stripe salva com sucesso");
      setIsStripeDialogOpen(false);
      setEditingIntegrationId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      queryClient.invalidateQueries({ queryKey: ["plan-integrations"] });
      setIsEditingIntegration(false);
      setStripeFormData({
        banco: "STRIPE",
        conta: "",
        nome: "",
        produto_id: "",
        preco_id: "",
        environment_type: "production",
      });
    }
  };

  const handleEditStripeIntegration = (plan: any, environmentType: "test" | "production", integrationId: string) => {
    setEditingPlan(plan);
    const integration = planIntegrations?.find(int => int.id === integrationId);
    
    if (integration) {
      setStripeFormData({
        banco: "STRIPE",
        conta: integration.account_id ?? "",
        nome: plan.name ?? "",
        produto_id: integration.stripe_product_id ?? "",
        preco_id: integration.stripe_price_id ?? "",
        environment_type: environmentType,
      });
      setEditingIntegrationId(integration.id);
    }
    
    setIsEditingIntegration(true);
    setIsStripeDialogOpen(true);
  };

  const handleNewStripeIntegration = (plan: any, environmentType: "test" | "production") => {
    setEditingPlan(plan);
    setStripeFormData({
      banco: "STRIPE",
      conta: "",
      nome: plan.name ?? "",
      produto_id: "",
      preco_id: "",
      environment_type: environmentType,
    });
    setEditingIntegrationId(null);
    setIsEditingIntegration(true);
    setIsStripeDialogOpen(true);
  };

  const handleToggleIntegration = async (integration: any) => {
    const newActiveState = !integration.is_active;
    
    // Se está ativando, desativa as outras do mesmo tipo primeiro
    if (newActiveState) {
      const { error: deactivateError } = await supabase
        .from("plan_integrations")
        .update({ is_active: false })
        .eq("plan_id", integration.plan_id)
        .eq("environment_type", integration.environment_type)
        .eq("is_active", true)
        .neq("id", integration.id);

      if (deactivateError) {
        toast.error("Erro ao desativar outras integrações");
        if (import.meta.env.DEV) {
          console.error(deactivateError);
        }
        return;
      }
    }
    
    const { error } = await supabase
      .from("plan_integrations")
      .update({ is_active: newActiveState })
      .eq("id", integration.id);

    if (error) {
      toast.error("Erro ao atualizar status da integração");
      if (import.meta.env.DEV) {
        console.error(error);
      }
      return;
    }

    toast.success(`Integração ${newActiveState ? "ativada" : "desativada"} com sucesso`);
    queryClient.invalidateQueries({ queryKey: ["plan-integrations"] });
  };


  const handleDeleteStripeIntegration = async (integrationId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta integração Stripe?")) {
      return;
    }

    const { error } = await supabase
      .from("plan_integrations")
      .delete()
      .eq("id", integrationId);

    if (error) {
      toast.error("Erro ao remover integração Stripe");
      if (import.meta.env.DEV) {
        console.error(error);
      }
    } else {
      toast.success("Integração Stripe removida com sucesso");
      queryClient.invalidateQueries({ queryKey: ["plan-integrations"] });
    }
  };

  return (
    <div className="min-h-screen">
        <div className="w-full">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl lg:text-2xl font-bold">Planos</h1>
          </div>

          <div className="space-y-3 lg:space-y-4">
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-end">
              <Select value={selectedProductFilter} onValueChange={setSelectedProductFilter}>
                <SelectTrigger className="w-full sm:w-[280px]">
                  <SelectValue placeholder="Filtrar por produto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      Todos os produtos
                    </div>
                  </SelectItem>
                  <SelectItem value="no-product">
                    <div className="flex items-center gap-2">
                      <FileQuestion className="h-4 w-4 text-muted-foreground" />
                      Sem produto
                    </div>
                  </SelectItem>
                  {products?.map((product: any) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center gap-2">
                        {product.icone_light ? (
                          <img 
                            src={product.icone_light} 
                            alt="" 
                            className="h-4 w-4 rounded object-contain"
                          />
                        ) : (
                          <Box className="h-4 w-4 text-muted-foreground" />
                        )}
                        {product.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleNewPlan} className="w-full sm:w-auto border border-white">
                <Plus className="h-4 w-4 mr-2" />
                Novo Plano
              </Button>
            </div>

          <div className="space-y-4">
              {(isLoading || isFetching) ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center gap-2 text-muted-foreground">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span>Carregando planos...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-destructive mb-4">Erro ao carregar planos</p>
                  <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-plans"] })}>
                    Tentar novamente
                  </Button>
                </div>
              ) : !plans || plans.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">Nenhum plano cadastrado no sistema</p>
                  <Button onClick={handleNewPlan}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Plano
                  </Button>
                </div>
              ) : selectedProductFilter === "all" ? (
                // Group by period and then by product when "all" is selected
                <>
                  {["monthly", "yearly", "daily", "one_time"].map((period) => {
                      const periodPlans = plans?.filter((p: any) => p.billing_period === period) || [];
                      if (periodPlans.length === 0) return null;

                      const periodTitle = period === "monthly" ? "Mensal" : period === "yearly" ? "Anual" : period === "daily" ? "Diário" : "Avulso";
                      
                      // Group plans by product for this period
                      const plansWithProduct = periodPlans.filter((p: any) => p.product_id);
                      const plansWithoutProduct = periodPlans.filter((p: any) => !p.product_id);
                      
                      const productGroups = plansWithProduct.reduce((acc: any, plan: any) => {
                        const productId = plan.product_id;
                        if (!acc[productId]) acc[productId] = [];
                        acc[productId].push(plan);
                        return acc;
                      }, {});

                      return (
                        <div key={period} className="space-y-3">
                          <h2 className="text-lg font-bold text-purple-400 border-b border-purple-600/30 pb-1">{periodTitle}</h2>
                          
                          {/* Plans grouped by product */}
                          {Object.entries(productGroups).map(([productId, productPlans]: [string, any]) => {
                            const product = (productPlans as any[])[0]?.products;
                            return (
                              <div key={productId} className="space-y-2">
                                <div className="flex items-center gap-2 pl-2">
                                  {product?.icone_light && (
                                    <img src={product.icone_light} alt={product.nome} className="w-5 h-5 dark:hidden" />
                                  )}
                                  {product?.icone_dark && (
                                    <img src={product.icone_dark} alt={product.nome} className="w-5 h-5 hidden dark:block" />
                                  )}
                                  <h3 className="text-sm font-semibold text-muted-foreground">{product?.nome || "Produto"}</h3>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                                  {(productPlans as any[]).sort((a: any, b: any) => parseFloat(a.price) - parseFloat(b.price)).map((plan: any, index: number) => {
                                    const features = Array.isArray(plan.features) ? plan.features : [];
                                    const couponId = features.find((f: string) => f.startsWith("coupon_id:"))?.replace("coupon_id:", "");
                                    const coupon = coupons?.find((c: any) => c.id === couponId);

                                    return (
                                      <ScrollAnimation key={plan.id} animation="fade-up" delay={index * 50}>
                                      <Card 
                                        className={`hover:border-primary/50 hover:shadow-sm transition-all ${!plan.is_active ? 'border-destructive/50 bg-destructive/5' : ''}`}
                                      >
                                        <CardContent className="p-2 space-y-1">
                                          <div className="flex items-center justify-between gap-1">
                                            <span className="text-xs font-medium truncate">{plan.name}</span>
                                            <div className="flex gap-0.5 -mr-0.5">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5"
                                              onClick={() => handleEditPlan(plan)}
                                              >
                                                <Edit className="h-2.5 w-2.5" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 hover:text-destructive"
                                              onClick={() => handleDeletePlan(plan.id)}
                                              >
                                                <Trash2 className="h-2.5 w-2.5" />
                                              </Button>
                                            </div>
                                          </div>
                                          <span className="text-sm font-bold text-foreground block">
                                            R$ {parseFloat(plan.price).toFixed(2)}
                                          </span>
                                          <div className="flex flex-wrap gap-1">
                                            <Badge variant={plan.is_active ? "default" : "secondary"} className="text-[10px] px-1 py-0 h-4">
                                              {plan.is_active ? "Ativo" : "Inativo"}
                                            </Badge>
                                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{plan.commission_percentage}%</Badge>
                                        </div>
                                      </CardContent>
                                    </Card>
                                    </ScrollAnimation>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}

                          {/* Plans without product */}
                          {plansWithoutProduct.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="text-sm font-semibold text-muted-foreground pl-2">Sem produto associado</h3>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                                {plansWithoutProduct.map((plan: any) => {
                                  const features = Array.isArray(plan.features) ? plan.features : [];
                                  const couponId = features.find((f: string) => f.startsWith("coupon_id:"))?.replace("coupon_id:", "");
                                  const coupon = coupons?.find((c: any) => c.id === couponId);

                                  return (
                                    <Card 
                                      key={plan.id} 
                                      className={`hover:border-primary/50 hover:shadow-sm transition-all ${!plan.is_active ? 'border-destructive/50 bg-destructive/5' : ''}`}
                                    >
                                      <CardContent className="p-2 space-y-1">
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="text-xs font-medium truncate">{plan.name}</span>
                                          <div className="flex gap-0.5 -mr-0.5">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-5 w-5"
                                            onClick={() => handleEditPlan(plan)}
                                            >
                                              <Edit className="h-2.5 w-2.5" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-5 w-5 hover:text-destructive"
                                            onClick={() => handleDeletePlan(plan.id)}
                                            >
                                              <Trash2 className="h-2.5 w-2.5" />
                                            </Button>
                                          </div>
                                        </div>
                                        <span className="text-sm font-bold text-foreground block">
                                          R$ {parseFloat(plan.price).toFixed(2)}
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                          <Badge variant={plan.is_active ? "default" : "secondary"} className="text-[10px] px-1 py-0 h-4">
                                            {plan.is_active ? "Ativo" : "Inativo"}
                                          </Badge>
                                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{plan.commission_percentage}%</Badge>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                ) : (
                  // Show plans for specific product filter
                  (() => {
                    // Verifica se ainda está carregando/buscando antes de aplicar filtro
                    if (isLoading || isFetching || !plans) {
                      return (
                        <div className="text-center py-12">
                          <div className="inline-flex items-center gap-2 text-muted-foreground">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            <span>Carregando planos...</span>
                          </div>
                        </div>
                      );
                    }

                    const filteredPlans = plans.filter((p: any) => {
                      if (selectedProductFilter === "no-product") return !p.product_id;
                      return p.product_id === selectedProductFilter;
                    });

                    console.log("[AdminPlans] Planos após filtro:", filteredPlans.length, "de", plans.length);

                    if (filteredPlans.length === 0) {
                      return (
                        <div className="text-center py-12 text-muted-foreground">
                          Nenhum plano encontrado para este filtro
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                        {filteredPlans.sort((a: any, b: any) => parseFloat(a.price) - parseFloat(b.price)).map((plan: any) => {
                      const features = Array.isArray(plan.features) ? plan.features : [];
                      const couponId = features.find((f: string) => f.startsWith("coupon_id:"))?.replace("coupon_id:", "");
                      const coupon = coupons?.find((c: any) => c.id === couponId);

                      return (
                        <Card 
                          key={plan.id} 
                          className={`hover:border-primary/50 transition-colors ${!plan.is_active ? 'border-destructive/50 bg-destructive/5' : ''}`}
                        >
                          <CardHeader className="p-2 pb-1">
                            <div className="flex items-start justify-between gap-1">
                              <CardTitle className="text-xs font-medium leading-tight line-clamp-2">{plan.name}</CardTitle>
                              <div className="flex gap-0.5 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => handleEditPlan(plan)}
                                >
                                  <Edit className="h-2.5 w-2.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 hover:text-destructive"
                                  onClick={() => handleDeletePlan(plan.id)}
                                >
                                  <Trash2 className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-2 pt-0 space-y-1.5">
                            <span className="text-sm font-bold text-foreground">
                              R$ {parseFloat(plan.price).toFixed(2)}
                            </span>
                            {coupon && (
                              <Badge variant="outline" className="gap-0.5 h-4 text-[10px] px-1">
                                <Tag className="h-2 w-2" />
                                {coupon.code}
                              </Badge>
                            )}
                            <div className="flex flex-wrap gap-1">
                              <Badge variant={plan.is_active ? "default" : "secondary"} className="h-4 text-[10px] px-1.5 py-0">
                                {plan.is_active ? "Ativo" : "Inativo"}
                              </Badge>
                              <Badge variant="outline" className="h-4 text-[10px] px-1.5 py-0">{plan.commission_percentage}%</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                );
              })()
            )}
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="w-full h-full max-w-full max-h-full m-0 rounded-none lg:w-auto lg:h-auto lg:max-w-4xl lg:max-h-[90vh] lg:m-6 lg:rounded-lg bg-card flex flex-col overflow-hidden p-0">
              <DialogHeader className="px-6 pt-6 pb-0 flex-shrink-0">
                <DialogTitle className="text-foreground">
                  {editingPlan ? "Editar Plano" : "Novo Plano"}
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="plan" className="flex flex-col flex-1 overflow-hidden">
                <TabsList className="mx-6 mt-4 flex-shrink-0">
                  <TabsTrigger value="plan" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Dados do Plano
                  </TabsTrigger>
                  {form.watch("product_id") === "bb582482-b006-47b8-b6ea-a6944d8cfdfd" && (
                    <TabsTrigger value="stripe" className="gap-2">
                      <CreditCard className="h-4 w-4" />
                      Integração Stripe
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="plan" className="space-y-6 px-6 pb-6 overflow-y-auto flex-1 mt-6">
                  <Form {...form}>
                    <form 
                      onSubmit={form.handleSubmit(onSubmit)} 
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
                          e.preventDefault();
                          const form = e.target.form;
                          if (form) {
                            const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
                            const index = inputs.indexOf(e.target);
                            const nextInput = inputs[index + 1] as HTMLElement;
                            if (nextInput) {
                              nextInput.focus();
                            }
                          }
                        }
                      }}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="billing_period"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Período do plano</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o período" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="monthly">Mensal</SelectItem>
                                  <SelectItem value="yearly">Anual</SelectItem>
                                  <SelectItem value="daily">Diário</SelectItem>
                                  <SelectItem value="one_time">Avulso</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome do Plano</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="Ex: Plano Mensal"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="product_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Produto</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                value={field.value || ""}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um produto" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">Nenhum produto</SelectItem>
                                  {products?.map((product: Product) => (
                                    <SelectItem key={product.id} value={product.id}>
                                      {product.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor Assinatura/Recorrente</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="original_price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Preço anterior</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />


                        {/* Campos específicos do APP Renda Recorrente */}
                        {form.watch("product_id") === "bb582482-b006-47b8-b6ea-a6944d8cfdfd" && (
                          <>
                            {/* Funcionalidades */}
                            <div className="md:col-span-2 space-y-3">
                              <FormLabel>Funcionalidades do Plano</FormLabel>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border rounded-md">
                                {landingFeatures?.map((feature) => (
                                  <div key={feature.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`feature-${feature.id}`}
                                      checked={selectedFeatures.includes(feature.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedFeatures([...selectedFeatures, feature.id]);
                                        } else {
                                          setSelectedFeatures(selectedFeatures.filter(id => id !== feature.id));
                                        }
                                      }}
                                    />
                                    <label
                                      htmlFor={`feature-${feature.id}`}
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                      {feature.name}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <FormField
                              control={form.control}
                              name="obs_plan"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Observação do Plano</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      placeholder="Ex: Mais contratado"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="obs_discount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Observação de Desconto</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      placeholder="Ex: R$10,00 de desconto"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="obs_coupon"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Observação Cupom</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      placeholder="Ex: Cupom de desconto 10%"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="coupon_id"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Selecione o CUPOM</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    value={field.value || ""}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione um cupom" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {coupons?.map((coupon: Coupon) => (
                                        <SelectItem key={coupon.id} value={coupon.id}>
                                          {coupon.code} - {coupon.name} ({coupon.value}{coupon.type === 'percentage' ? '%' : ' dias'})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="trial_days"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tempo de teste (dias)</FormLabel>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => field.onChange(Math.max(0, field.value - 1))}
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <FormControl>
                                      <Input 
                                        {...field} 
                                        type="number"
                                        className="text-center"
                                      />
                                    </FormControl>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => field.onChange(field.value + 1)}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <FormDescription className="text-xs">
                                    Será ignorado quando o cliente digitar cupom de dias/mês/ano grátis
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="commission_percentage"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Percentual de Comissão (%)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      type="number"
                                      min="0"
                                      max="100"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="is_free"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                  <div className="space-y-0.5">
                                    <FormLabel>Plano Gratuito</FormLabel>
                                    <FormDescription className="text-xs">
                                      Marque se este plano é FREE (não pago)
                                    </FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </>
                        )}

                        <FormField
                          control={form.control}
                          name="is_active"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel>Ativo</FormLabel>
                                <FormDescription className="text-xs">
                                  Plano disponível para assinatura
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex gap-3 justify-end pt-6 border-t border-border">
                        <Button
                          type="button"
                          onClick={handleCancelEdit}
                          variant="outline"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Salvar
                        </Button>
                      </div>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="stripe" className="space-y-4 px-6 pb-6 overflow-y-auto flex-1 mt-6">
                    {/* Integrações de Produção */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">
                          Integrações de Produção
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editingPlan && handleNewStripeIntegration(editingPlan, "production")}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Nova Integração
                        </Button>
                      </div>
                      
                      {planIntegrations
                        ?.filter(int => int.plan_id === editingPlan?.id && int.environment_type === "production")
                        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                        .map((integration) => (
                          <Card key={integration.id} className={integration.is_active ? "border-primary/50" : "border-destructive/50 bg-destructive/5"}>
                            <CardContent className="pt-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant={integration.is_active ? "default" : "destructive"}>
                                    {integration.is_active ? "Ativa" : "Inativa"}
                                  </Badge>
                                  <span className="text-sm font-medium">
                                    {integration.accounts?.name}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleToggleIntegration(integration)}
                                  >
                                    {integration.is_active ? "Desativar" : "Ativar"}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editingPlan && handleEditStripeIntegration(editingPlan, "production", integration.id)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteStripeIntegration(integration.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <p>Produto: {integration.stripe_product_id}</p>
                                <p>Preço: {integration.stripe_price_id}</p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        
                      {!planIntegrations?.some(int => int.plan_id === editingPlan?.id && int.environment_type === "production") && (
                        <p className="text-sm text-muted-foreground">Nenhuma integração de produção configurada</p>
                      )}
                    </div>

                    {/* Integrações de Teste */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">
                          Integrações de Teste
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editingPlan && handleNewStripeIntegration(editingPlan, "test")}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Nova Integração
                        </Button>
                      </div>
                      
                      {planIntegrations
                        ?.filter(int => int.plan_id === editingPlan?.id && int.environment_type === "test")
                        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                        .map((integration) => (
                          <Card key={integration.id} className={integration.is_active ? "border-primary/50" : "border-destructive/50 bg-destructive/5"}>
                            <CardContent className="pt-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant={integration.is_active ? "default" : "destructive"}>
                                    {integration.is_active ? "Ativa" : "Inativa"}
                                  </Badge>
                                  <span className="text-sm font-medium">
                                    {integration.accounts?.name}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleToggleIntegration(integration)}
                                  >
                                    {integration.is_active ? "Desativar" : "Ativar"}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editingPlan && handleEditStripeIntegration(editingPlan, "test", integration.id)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteStripeIntegration(integration.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <p>Produto: {integration.stripe_product_id}</p>
                                <p>Preço: {integration.stripe_price_id}</p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        
                      {!planIntegrations?.some(int => int.plan_id === editingPlan?.id && int.environment_type === "test") && (
                        <p className="text-sm text-muted-foreground">Nenhuma integração de teste configurada</p>
                      )}
                    </div>
                  </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>

          {/* Dialog/Drawer de Integração Stripe */}
          {isMobile ? (
            <Drawer open={isStripeDialogOpen} onOpenChange={(open) => {
              setIsStripeDialogOpen(open);
              if (!open) setIsEditingIntegration(false);
            }}>
              <DrawerContent className="max-h-[95vh]">
                {/* Handle bar para drag */}
                <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
                  <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
                </div>

                <DrawerHeader className="px-4 pt-2 pb-3 flex-shrink-0 relative">
                  <DrawerTitle className="text-base text-foreground">
                    {isEditingIntegration ? "Editar Integração Stripe" : "Configurar Integração Stripe"}
                  </DrawerTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isEditingIntegration 
                      ? "Atualize os dados da integração Stripe deste plano."
                      : "Configure a integração Stripe para este plano."}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 h-7 w-7"
                    onClick={() => setIsStripeDialogOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DrawerHeader>

                <ScrollArea className="h-[calc(95vh-140px)] px-4">
                  <div className="pb-4 space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs text-foreground font-medium">Banco</label>
                        <Select
                          value={stripeFormData.banco}
                          onValueChange={(value) => setStripeFormData({ ...stripeFormData, banco: value })}
                        >
                          <SelectTrigger className="text-xs h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="STRIPE">STRIPE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-foreground font-medium">Conta</label>
                        <Select
                          value={stripeFormData.conta}
                          onValueChange={(value) => setStripeFormData({ ...stripeFormData, conta: value })}
                        >
                          <SelectTrigger className="text-xs h-9">
                            <SelectValue placeholder="Selecione uma conta" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts
                              ?.filter((account: any) => 
                                account.product_id === editingPlan?.product_id &&
                                account.is_production === (stripeFormData.environment_type === "production")
                              )
                              .map((account: any) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.name} - {account.banks?.name || "Sem banco"}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-foreground font-medium">
                          Nome da assinatura (No cadastro do Stripe)
                        </label>
                        <Input
                          value={stripeFormData.nome}
                          onChange={(e) => setStripeFormData({ ...stripeFormData, nome: e.target.value })}
                          placeholder="Nome da assinatura"
                          className="bg-background text-foreground text-xs h-9"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-foreground font-medium">ID Produto *</label>
                        <Input
                          value={stripeFormData.produto_id}
                          onChange={(e) => setStripeFormData({ ...stripeFormData, produto_id: e.target.value })}
                          placeholder="prod_XXXXXX"
                          className="bg-background text-foreground text-xs h-9"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-foreground font-medium">ID Preço *</label>
                        <Input
                          value={stripeFormData.preco_id}
                          onChange={(e) => setStripeFormData({ ...stripeFormData, preco_id: e.target.value })}
                          placeholder="price_XXXXXX"
                          className="bg-background text-foreground text-xs h-9"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-3">
                      <Button
                        type="button"
                        onClick={() => setIsStripeDialogOpen(false)}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSaveStripe}
                        size="sm"
                        className="text-xs"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Salvar
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              </DrawerContent>
            </Drawer>
          ) : (
            <Dialog open={isStripeDialogOpen} onOpenChange={(open) => {
              setIsStripeDialogOpen(open);
              if (!open) setIsEditingIntegration(false);
            }}>
              <DialogContent className="max-w-2xl max-h-[90vh] bg-card flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
                  <DialogTitle className="text-foreground">
                    {isEditingIntegration ? "Editar Integração Stripe" : "Configurar Integração Stripe"}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    {isEditingIntegration 
                      ? "Atualize os dados da integração Stripe deste plano."
                      : "Configure a integração Stripe para este plano. Ao salvar, substituirá a integração atual (se existir)."}
                  </p>
                </DialogHeader>

                <div className="px-6 pb-6 overflow-y-auto flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-foreground font-medium">Banco</label>
                      <Select
                        value={stripeFormData.banco}
                        onValueChange={(value) => setStripeFormData({ ...stripeFormData, banco: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STRIPE">STRIPE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-foreground font-medium">Conta</label>
                      <Select
                        value={stripeFormData.conta}
                        onValueChange={(value) => setStripeFormData({ ...stripeFormData, conta: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma conta" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts
                            ?.filter((account: any) => 
                              account.product_id === editingPlan?.product_id &&
                              account.is_production === (stripeFormData.environment_type === "production")
                            )
                            .map((account: any) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name} - {account.banks?.name || "Sem banco"}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-foreground font-medium">
                        Nome da assinatura (No cadastro do Stripe)
                      </label>
                      <Input
                        value={stripeFormData.nome}
                        onChange={(e) => setStripeFormData({ ...stripeFormData, nome: e.target.value })}
                        placeholder="Nome da assinatura"
                        className="bg-background text-foreground"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-foreground font-medium">ID Produto *</label>
                      <Input
                        value={stripeFormData.produto_id}
                        onChange={(e) => setStripeFormData({ ...stripeFormData, produto_id: e.target.value })}
                        placeholder="prod_XXXXXX"
                        className="bg-background text-foreground"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm text-foreground font-medium">ID Preço *</label>
                      <Input
                        value={stripeFormData.preco_id}
                        onChange={(e) => setStripeFormData({ ...stripeFormData, preco_id: e.target.value })}
                        placeholder="price_XXXXXX"
                        className="bg-background text-foreground"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-4">
                    <Button
                      type="button"
                      onClick={() => setIsStripeDialogOpen(false)}
                      variant="outline"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveStripe}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Salvar Integração
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    );
  };
  
  export default AdminPlans;
