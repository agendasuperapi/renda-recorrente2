import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X, Edit, Trash2, Tag, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

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
  product_id: z.string().optional(),
});

type PlanFormData = z.infer<typeof planFormSchema>;

const AdminPlans = () => {
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>("all");
  const [stripeFormData, setStripeFormData] = useState({
    banco: "STRIPE",
    conta: "",
    nome: "",
    produto_id: "",
    preco_id: "",
    plan_id: null as string | null,
  });

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
      product_id: "",
    },
  });

  const { data: plans, isLoading } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select(`
          *,
          products (
            id,
            nome,
            icone_light,
            icone_dark
          )
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
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

  const createPlanMutation = useMutation({
    mutationFn: async (data: PlanFormData) => {
      const features = [
        `obs_plan:${data.obs_plan || ""}`,
        `obs_discount:${data.obs_discount || ""}`,
        `obs_coupon:${data.obs_coupon || ""}`,
        `coupon_id:${data.coupon_id || ""}`,
        `trial_days:${data.trial_days}`,
      ];

      const { error } = await supabase.from("plans").insert({
        name: data.name,
        description: data.description,
        price: data.price,
        original_price: data.original_price,
        billing_period: data.billing_period,
        commission_percentage: data.commission_percentage,
        is_active: data.is_active,
        features,
        product_id: data.product_id || null,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      toast.success("Plano criado com sucesso!");
      handleCancelEdit();
    },
    onError: (error) => {
      toast.error("Erro ao criar plano");
      console.error(error);
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
          features,
          product_id: data.product_id || null,
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      toast.success("Plano atualizado com sucesso!");
      handleCancelEdit();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar plano");
      console.error(error);
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
      console.error(error);
    },
  });

  const onSubmit = (data: PlanFormData) => {
    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan.id, data });
    } else {
      createPlanMutation.mutate(data);
    }
  };

  const handleEditPlan = (plan: any) => {
    setEditingPlan(plan);
    setIsDialogOpen(true);
    const features = Array.isArray(plan.features) ? plan.features : [];
    
    form.reset({
      name: plan.name,
      billing_period: plan.billing_period,
      price: plan.price,
      original_price: plan.original_price || 0,
      description: plan.description || "",
      obs_plan: features.find((f: string) => f.startsWith("obs_plan:"))?.replace("obs_plan:", "") || "",
      obs_discount: features.find((f: string) => f.startsWith("obs_discount:"))?.replace("obs_discount:", "") || "",
      obs_coupon: features.find((f: string) => f.startsWith("obs_coupon:"))?.replace("obs_coupon:", "") || "",
      coupon_id: features.find((f: string) => f.startsWith("coupon_id:"))?.replace("coupon_id:", "") || "",
      trial_days: parseInt(features.find((f: string) => f.startsWith("trial_days:"))?.replace("trial_days:", "") || "0"),
      commission_percentage: plan.commission_percentage,
      is_active: plan.is_active,
      product_id: plan.product_id || "",
    });
  };

  const handleNewPlan = () => {
    setEditingPlan(null);
    setIsDialogOpen(true);
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
      product_id: "",
    });
  };

  const handleCancelEdit = () => {
    setEditingPlan(null);
    setIsDialogOpen(false);
    form.reset();
  };

  const handleSaveStripe = async () => {
    if (!stripeFormData.plan_id) {
      toast.error("Nenhum plano selecionado");
      return;
    }

    const { error } = await supabase
      .from("plans")
      .update({
        stripe_product_id: stripeFormData.produto_id,
        stripe_price_id: stripeFormData.preco_id,
      })
      .eq("id", stripeFormData.plan_id);

    if (error) {
      toast.error("Erro ao salvar integração Stripe");
      console.error(error);
    } else {
      toast.success("Integração Stripe salva com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      setStripeFormData({
        banco: "STRIPE",
        conta: "",
        nome: "",
        produto_id: "",
        preco_id: "",
        plan_id: null,
      });
    }
  };

  const handleEditStripeIntegration = (plan: any) => {
    setStripeFormData({
      banco: "STRIPE",
      conta: "",
      nome: plan.name,
      produto_id: plan.stripe_product_id || "",
      preco_id: plan.stripe_price_id || "",
      plan_id: plan.id,
    });
  };

  const handleDeleteStripeIntegration = async (planId: string) => {
    const { error } = await supabase
      .from("plans")
      .update({
        stripe_product_id: null,
        stripe_price_id: null,
      })
      .eq("id", planId);

    if (error) {
      toast.error("Erro ao remover integração Stripe");
    } else {
      toast.success("Integração Stripe removida com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white">Planos</h1>
            <div className="flex gap-4 items-center">
              <Select value={selectedProductFilter} onValueChange={setSelectedProductFilter}>
                <SelectTrigger className="w-[280px] bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Filtrar por produto" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-white">Todos os produtos</SelectItem>
                  <SelectItem value="no-product" className="text-white">Sem produto</SelectItem>
                  {products?.map((product: any) => (
                    <SelectItem key={product.id} value={product.id} className="text-white">
                      {product.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleNewPlan}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Plano
              </Button>
            </div>
          </div>

          <div className="space-y-8">
            {isLoading ? (
              <div className="text-center py-12 text-slate-400">Carregando planos...</div>
            ) : selectedProductFilter === "all" ? (
              // Group by period and then by product when "all" is selected
              <>
                {["monthly", "yearly", "daily"].map((period) => {
                  const periodPlans = plans?.filter((p: any) => p.billing_period === period) || [];
                  if (periodPlans.length === 0) return null;

                  const periodTitle = period === "monthly" ? "Mensal" : period === "yearly" ? "Anual" : "Diário";
                  
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
                    <div key={period} className="space-y-6">
                      <h2 className="text-2xl font-bold text-purple-400 border-b border-purple-600/30 pb-2">{periodTitle}</h2>
                      
                      {/* Plans grouped by product */}
                      {Object.entries(productGroups).map(([productId, productPlans]: [string, any]) => {
                        const product = (productPlans as any[])[0]?.products;
                        return (
                          <div key={productId} className="space-y-3">
                            <div className="flex items-center gap-2 pl-4">
                              {product?.icone_light && (
                                <img src={product.icone_light} alt={product.nome} className="w-6 h-6 dark:hidden" />
                              )}
                              {product?.icone_dark && (
                                <img src={product.icone_dark} alt={product.nome} className="w-6 h-6 hidden dark:block" />
                              )}
                              <h3 className="text-lg font-semibold text-white">{product?.nome || "Produto"}</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {(productPlans as any[]).map((plan: any) => {
                                const features = Array.isArray(plan.features) ? plan.features : [];
                                const couponId = features.find((f: string) => f.startsWith("coupon_id:"))?.replace("coupon_id:", "");
                                const coupon = coupons?.find((c: any) => c.id === couponId);

                                return (
                                  <Card key={plan.id} className="bg-slate-900 border-slate-700 hover:border-purple-600 transition-colors">
                                    <CardHeader>
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <CardTitle className="text-white flex items-center gap-2">
                                            {plan.name}
                                            {!plan.is_active && (
                                              <span className="text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded">Inativo</span>
                                            )}
                                          </CardTitle>
                                          {coupon && (
                                            <div className="flex items-center gap-1 mt-2 text-sm text-purple-400">
                                              <Tag className="h-3 w-3" />
                                              <span>{coupon.code} - {coupon.type === "percentage" ? `${coupon.value}%` : `${coupon.value} dias`}</span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEditPlan(plan)}
                                            className="text-slate-400 hover:text-white"
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => deletePlanMutation.mutate(plan.id)}
                                            className="text-red-400 hover:text-red-300"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                      <div className="space-y-1">
                                        {Number(plan.original_price) > 0 && (
                                          <span className="text-sm text-slate-500 line-through">
                                            R$ {Number(plan.original_price).toFixed(2)}
                                          </span>
                                        )}
                                        <span className="text-2xl font-bold text-white">
                                          R$ {parseFloat(plan.price).toFixed(2)}
                                        </span>
                                      </div>
                                      {plan.description && (
                                        <p className="text-sm text-slate-400 line-clamp-2">{plan.description}</p>
                                      )}
                                      <div className="pt-2 border-t border-slate-800 text-xs text-slate-500">
                                        Comissão: {plan.commission_percentage}%
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {/* Plans without product */}
                      {plansWithoutProduct.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-lg font-semibold text-slate-400 pl-4">Sem produto</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {plansWithoutProduct.map((plan: any) => {
                              const features = Array.isArray(plan.features) ? plan.features : [];
                              const couponId = features.find((f: string) => f.startsWith("coupon_id:"))?.replace("coupon_id:", "");
                              const coupon = coupons?.find((c: any) => c.id === couponId);

                              return (
                                <Card key={plan.id} className="bg-slate-900 border-slate-700 hover:border-purple-600 transition-colors">
                                  <CardHeader>
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <CardTitle className="text-white flex items-center gap-2">
                                          {plan.name}
                                          {!plan.is_active && (
                                            <span className="text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded">Inativo</span>
                                          )}
                                        </CardTitle>
                                        {coupon && (
                                          <div className="flex items-center gap-1 mt-2 text-sm text-purple-400">
                                            <Tag className="h-3 w-3" />
                                            <span>{coupon.code} - {coupon.type === "percentage" ? `${coupon.value}%` : `${coupon.value} dias`}</span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleEditPlan(plan)}
                                          className="text-slate-400 hover:text-white"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => deletePlanMutation.mutate(plan.id)}
                                          className="text-red-400 hover:text-red-300"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="space-y-3">
                                  <div className="space-y-1">
                                    {plan.original_price && plan.original_price > 0 && plan.original_price > plan.price && (
                                      <span className="text-sm text-slate-500 line-through">
                                        R$ {parseFloat(plan.original_price).toFixed(2)}
                                      </span>
                                    )}
                                    <span className="text-2xl font-bold text-white">
                                      R$ {parseFloat(plan.price).toFixed(2)}
                                    </span>
                                  </div>
                                    {plan.description && (
                                      <p className="text-sm text-slate-400 line-clamp-2">{plan.description}</p>
                                    )}
                                    <div className="pt-2 border-t border-slate-800 text-xs text-slate-500">
                                      Comissão: {plan.commission_percentage}%
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
              // Original single-level grouping when a specific filter is selected
              <>
                {["monthly", "yearly", "daily"].map((period) => {
                  const filteredPlans = plans?.filter((p: any) => {
                    if (p.billing_period !== period) return false;
                    if (selectedProductFilter === "no-product") return !p.product_id;
                    return p.product_id === selectedProductFilter;
                  }) || [];
                  
                  if (filteredPlans.length === 0) return null;

                  const periodTitle = period === "monthly" ? "Mensal" : period === "yearly" ? "Anual" : "Diário";

                  return (
                    <div key={period}>
                      <h2 className="text-xl font-semibold text-purple-400 mb-4">{periodTitle}</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredPlans.map((plan: any) => {
                          const features = Array.isArray(plan.features) ? plan.features : [];
                          const couponId = features.find((f: string) => f.startsWith("coupon_id:"))?.replace("coupon_id:", "");
                          const coupon = coupons?.find((c: any) => c.id === couponId);
                          const product = plan.products;

                          return (
                            <Card key={plan.id} className="bg-slate-900 border-slate-700 hover:border-purple-600 transition-colors">
                              <CardHeader>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <CardTitle className="text-white flex items-center gap-2">
                                      {plan.name}
                                      {!plan.is_active && (
                                        <span className="text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded">Inativo</span>
                                      )}
                                    </CardTitle>
                                    {product && (
                                      <div className="flex items-center gap-2 mt-2">
                                        {product.icone_light && (
                                          <img 
                                            src={product.icone_light} 
                                            alt={product.nome} 
                                            className="h-5 w-5 object-contain dark:hidden"
                                          />
                                        )}
                                        {product.icone_dark && (
                                          <img 
                                            src={product.icone_dark} 
                                            alt={product.nome} 
                                            className="h-5 w-5 object-contain hidden dark:block"
                                          />
                                        )}
                                        <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded">
                                          {product.nome}
                                        </span>
                                      </div>
                                    )}
                                    {coupon && (
                                      <div className="flex items-center gap-1 mt-2 text-sm text-purple-400">
                                        <Tag className="h-3 w-3" />
                                        <span>{coupon.code} - {coupon.type === "percentage" ? `${coupon.value}%` : `${coupon.value} dias`}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditPlan(plan)}
                                      className="text-slate-400 hover:text-white"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deletePlanMutation.mutate(plan.id)}
                                      className="text-red-400 hover:text-red-300"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="space-y-1">
                                  {plan.original_price && plan.original_price > 0 && plan.original_price > plan.price && (
                                    <span className="text-sm text-slate-500 line-through">
                                      R$ {parseFloat(plan.original_price).toFixed(2)}
                                    </span>
                                  )}
                                  <span className="text-2xl font-bold text-white">
                                    R$ {parseFloat(plan.price).toFixed(2)}
                                  </span>
                                </div>
                                {plan.description && (
                                  <p className="text-sm text-slate-400 line-clamp-2">{plan.description}</p>
                                )}
                                <div className="pt-2 border-t border-slate-800 text-xs text-slate-500">
                                  Comissão: {plan.commission_percentage}%
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingPlan ? "Editar Plano" : "Novo Plano"}
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="plano" className="space-y-6">
                <TabsList className="bg-slate-800 border-b border-slate-700 w-full">
                  <TabsTrigger 
                    value="plano"
                    className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:bg-purple-600/10 data-[state=active]:text-white text-slate-400"
                  >
                    Plano
                  </TabsTrigger>
                  <TabsTrigger 
                    value="assinaturas"
                    className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:bg-purple-600/10 data-[state=active]:text-white text-slate-400"
                  >
                    Assinaturas
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="plano" className="space-y-6">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="billing_period"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-200">Período do plano</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                    <SelectValue placeholder="Selecione o período" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                  <SelectItem value="monthly">Mensal</SelectItem>
                                  <SelectItem value="yearly">Anual</SelectItem>
                                  <SelectItem value="daily">Diário</SelectItem>
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
                              <FormLabel className="text-slate-200">Nome do Plano</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="Ex: Plano Mensal"
                                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
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
                              <FormLabel className="text-slate-200">Produto</FormLabel>
                              <Select 
                                onValueChange={(value) => field.onChange(value === "none" ? "" : value)} 
                                value={field.value || "none"}
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                    <SelectValue placeholder="Selecione um produto (opcional)" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                  <SelectItem value="none" className="text-white">Nenhum produto</SelectItem>
                                  {products?.map((product: any) => (
                                    <SelectItem key={product.id} value={product.id} className="text-white">
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
                              <FormLabel className="text-slate-200">Valor Assinatura/Recorrente</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
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
                              <FormLabel className="text-slate-200">Preço anterior</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel className="text-slate-200">Detalhes</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  placeholder="Será usada na Landing Page"
                                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                                  rows={3}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="obs_plan"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-slate-200">Observação do Plano</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="Ex: Mais contratado"
                                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
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
                              <FormLabel className="text-slate-200">Observação de Desconto</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="Ex: R$10,00 de desconto"
                                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
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
                              <FormLabel className="text-slate-200">Observação Cupom</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="Ex: Cupom de desconto 10%"
                                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
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
                              <FormLabel className="text-slate-200">Selecione o CUPOM</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                    <SelectValue placeholder="Selecione um cupom" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                  {coupons?.map((coupon: any) => (
                                    <SelectItem key={coupon.id} value={coupon.id}>
                                      {coupon.code} - {coupon.name} ({coupon.type === "percentage" ? `${coupon.value}%` : `${coupon.value} dias`})
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
                              <FormLabel className="text-slate-200">Tempo de teste (dias)</FormLabel>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => field.onChange(Math.max(0, field.value - 1))}
                                  className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number"
                                    className="bg-slate-800 border-slate-700 text-white text-center"
                                  />
                                </FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => field.onChange(field.value + 1)}
                                  className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              <FormDescription className="text-slate-500 text-xs">
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
                              <FormLabel className="text-slate-200">Percentual de Comissão (%)</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number"
                                  min="0"
                                  max="100"
                                  className="bg-slate-800 border-slate-700 text-white"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="is_active"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-4 bg-slate-800">
                              <div className="space-y-0.5">
                                <FormLabel className="text-slate-200">Ativo</FormLabel>
                                <FormDescription className="text-slate-500 text-xs">
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

                      <div className="flex gap-3 justify-end pt-6 border-t border-slate-800">
                        <Button
                          type="button"
                          onClick={handleCancelEdit}
                          variant="outline"
                          className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Salvar
                        </Button>
                      </div>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="assinaturas" className="space-y-6">
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white">Integração Stripe</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm text-slate-200">Banco</label>
                          <Select
                            value={stripeFormData.banco}
                            onValueChange={(value) => setStripeFormData({ ...stripeFormData, banco: value })}
                          >
                            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              <SelectItem value="STRIPE">STRIPE</SelectItem>
                              <SelectItem value="PAYPAL">PAYPAL</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm text-slate-200">Conta</label>
                          <Input
                            value={stripeFormData.conta}
                            onChange={(e) => setStripeFormData({ ...stripeFormData, conta: e.target.value })}
                            placeholder="APP Financeiro Teste"
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm text-slate-200">Nome da assinatura (No cadastro do Stripe)</label>
                          <Input
                            value={stripeFormData.nome}
                            onChange={(e) => setStripeFormData({ ...stripeFormData, nome: e.target.value })}
                            placeholder="Plano Mensal"
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm text-slate-200">ID Produto</label>
                          <Input
                            value={stripeFormData.produto_id}
                            onChange={(e) => setStripeFormData({ ...stripeFormData, produto_id: e.target.value })}
                            placeholder="prod_XXXXXXXXXXXXX"
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm text-slate-200">ID Preço</label>
                          <Input
                            value={stripeFormData.preco_id}
                            onChange={(e) => setStripeFormData({ ...stripeFormData, preco_id: e.target.value })}
                            placeholder="price_XXXXXXXXXXXXX"
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 justify-end pt-4 border-t border-slate-700">
                        <Button
                          onClick={() => setStripeFormData({ banco: "STRIPE", conta: "", nome: "", produto_id: "", preco_id: "", plan_id: null })}
                          variant="outline"
                          className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleSaveStripe}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Salvar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white">Assinaturas Cadastradas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-700 hover:bg-slate-700/50">
                            <TableHead className="text-slate-300">Banco</TableHead>
                            <TableHead className="text-slate-300">Conta</TableHead>
                            <TableHead className="text-slate-300">Nome</TableHead>
                            <TableHead className="text-slate-300">ID Produto</TableHead>
                            <TableHead className="text-slate-300">ID Preço</TableHead>
                            <TableHead className="text-slate-300">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {plans?.filter((p: any) => p.stripe_product_id || p.stripe_price_id).map((plan: any) => (
                            <TableRow key={plan.id} className="border-slate-700 hover:bg-slate-700/50">
                              <TableCell className="text-white">STRIPE</TableCell>
                              <TableCell className="text-white">-</TableCell>
                              <TableCell className="text-white">{plan.name}</TableCell>
                              <TableCell className="text-white font-mono text-xs">{plan.stripe_product_id || "-"}</TableCell>
                              <TableCell className="text-white font-mono text-xs">{plan.stripe_price_id || "-"}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditStripeIntegration(plan)}
                                    className="text-green-400 hover:text-green-300 hover:bg-green-400/10"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteStripeIntegration(plan.id)}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminPlans;
