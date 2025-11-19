import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, Edit, Trash2, Tag, Minus, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const planFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Preço deve ser maior ou igual a 0"),
  original_price: z.coerce.number().optional().nullable(),
  billing_period: z.enum(["monthly", "yearly", "daily"]),
  commission_percentage: z.coerce.number().min(0).max(100),
  is_active: z.boolean(),
  stripe_product_id: z.string().optional().nullable(),
  stripe_price_id: z.string().optional().nullable(),
  obs_plan: z.string().optional(),
  obs_discount: z.string().optional(),
  obs_coupon: z.string().optional(),
  trial_days: z.coerce.number().min(0).default(0),
  coupon_id: z.string().optional().nullable(),
});

type PlanFormData = z.infer<typeof planFormSchema>;

const AdminPlans = () => {
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [trialDays, setTrialDays] = useState(0);
  const [editingStripeId, setEditingStripeId] = useState<string | null>(null);
  const [stripeFormData, setStripeFormData] = useState({
    banco: "STRIPE",
    conta: "",
    nome: "",
    produto_id: "",
    preco_id: "",
  });
  const queryClient = useQueryClient();

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      original_price: null,
      billing_period: "monthly",
      commission_percentage: 25,
      is_active: true,
      trial_days: 0,
      obs_plan: "",
      obs_discount: "",
      obs_coupon: "",
      coupon_id: null,
    },
  });

  const { data: plans, isLoading } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
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

  const createPlanMutation = useMutation({
    mutationFn: async (data: PlanFormData) => {
      const { error } = await supabase.from("plans").insert({
        name: data.name,
        description: data.description || null,
        price: data.price,
        original_price: data.original_price,
        billing_period: data.billing_period,
        commission_percentage: data.commission_percentage,
        is_active: data.is_active,
        stripe_product_id: data.stripe_product_id,
        stripe_price_id: data.stripe_price_id,
        features: [
          data.obs_plan,
          data.obs_discount,
          data.obs_coupon,
          `trial_days:${data.trial_days}`,
          data.coupon_id ? `coupon:${data.coupon_id}` : null,
        ].filter(Boolean),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      toast({ title: "Plano criado com sucesso!" });
      form.reset();
      setTrialDays(0);
    },
    onError: (error) => {
      toast({ title: "Erro ao criar plano", description: error.message, variant: "destructive" });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PlanFormData }) => {
      const { error } = await supabase.from("plans").update({
        name: data.name,
        description: data.description || null,
        price: data.price,
        original_price: data.original_price,
        billing_period: data.billing_period,
        commission_percentage: data.commission_percentage,
        is_active: data.is_active,
        stripe_product_id: data.stripe_product_id,
        stripe_price_id: data.stripe_price_id,
        features: [
          data.obs_plan,
          data.obs_discount,
          data.obs_coupon,
          `trial_days:${data.trial_days}`,
          data.coupon_id ? `coupon:${data.coupon_id}` : null,
        ].filter(Boolean),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      toast({ title: "Plano atualizado com sucesso!" });
      form.reset();
      setEditingPlanId(null);
      setTrialDays(0);
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar plano", description: error.message, variant: "destructive" });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      toast({ title: "Plano excluído com sucesso!" });
    },
  });

  const onSubmit = (data: PlanFormData) => {
    if (editingPlanId) {
      updatePlanMutation.mutate({ id: editingPlanId, data });
    } else {
      createPlanMutation.mutate(data);
    }
  };

  const handleEditPlan = (plan: any) => {
    setEditingPlanId(plan.id);
    const features = plan.features || [];
    const trialDaysFeature = features.find((f: string) => f?.startsWith("trial_days:"));
    const couponFeature = features.find((f: string) => f?.startsWith("coupon:"));
    
    form.reset({
      name: plan.name,
      description: plan.description || "",
      price: plan.price,
      original_price: plan.original_price,
      billing_period: plan.billing_period,
      commission_percentage: plan.commission_percentage,
      is_active: plan.is_active,
      stripe_product_id: plan.stripe_product_id,
      stripe_price_id: plan.stripe_price_id,
      obs_plan: features[0] || "",
      obs_discount: features[1] || "",
      obs_coupon: features[2] || "",
      trial_days: trialDaysFeature ? parseInt(trialDaysFeature.split(":")[1]) : 0,
      coupon_id: couponFeature ? couponFeature.split(":")[1] : null,
    });
    setTrialDays(trialDaysFeature ? parseInt(trialDaysFeature.split(":")[1]) : 0);
  };

  const handleCancelEdit = () => {
    form.reset();
    setEditingPlanId(null);
    setTrialDays(0);
  };

  const groupedPlans = {
    monthly: plans?.filter((p) => p.billing_period === "monthly") || [],
    yearly: plans?.filter((p) => p.billing_period === "yearly") || [],
    daily: plans?.filter((p) => p.billing_period === "daily") || [],
  };

  const handleSaveStripe = () => {
    if (editingStripeId) {
      updatePlanMutation.mutate({
        id: editingStripeId,
        data: {
          ...form.getValues(),
          stripe_product_id: stripeFormData.produto_id,
          stripe_price_id: stripeFormData.preco_id,
        },
      });
      setEditingStripeId(null);
      setStripeFormData({ banco: "STRIPE", conta: "", nome: "", produto_id: "", preco_id: "" });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-slate-100">Cadastro de Planos</h1>
          <p className="text-slate-400">Gerencie planos de assinatura e integrações</p>
        </div>

        <Tabs defaultValue="plano" className="w-full">
          <TabsList className="bg-slate-900 border-b border-slate-700 rounded-none w-full justify-start h-auto p-0">
            <TabsTrigger 
              value="plano" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:bg-purple-600/10 data-[state=active]:text-white text-slate-400 rounded-none px-6 py-3"
            >
              Plano
            </TabsTrigger>
            <TabsTrigger 
              value="assinaturas"
              className="data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:bg-purple-600/10 data-[state=active]:text-white text-slate-400 rounded-none px-6 py-3"
            >
              Assinaturas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plano" className="mt-6 space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100">
                  {editingPlanId ? "Editar Plano" : "Novo Plano"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="billing_period"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200">Período do Plano</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 focus:border-purple-500">
                                <SelectValue placeholder="Selecione o período" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              <SelectItem value="daily" className="text-slate-100">Diário</SelectItem>
                              <SelectItem value="monthly" className="text-slate-100">Mensal</SelectItem>
                              <SelectItem value="yearly" className="text-slate-100">Anual</SelectItem>
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
                              className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-purple-500"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                placeholder="0,00" 
                                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-purple-500"
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
                            <FormLabel className="text-slate-200">Preço Anterior</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                value={field.value || ""}
                                type="number" 
                                step="0.01"
                                placeholder="0,00" 
                                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-purple-500"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200">Detalhes</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Será usada na Landing Page" 
                              className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-purple-500 min-h-[80px]"
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
                              className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-purple-500"
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
                              placeholder="Ex: R$ 10,00 de desconto" 
                              className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-purple-500"
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
                              className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-purple-500"
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
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 focus:border-purple-500">
                                <SelectValue placeholder="Selecione um cupom" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              {coupons?.map((coupon) => (
                                <SelectItem key={coupon.id} value={coupon.id} className="text-slate-100">
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
                          <FormLabel className="text-slate-200">Tempo de Teste (dias)</FormLabel>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                const newValue = Math.max(0, trialDays - 1);
                                setTrialDays(newValue);
                                field.onChange(newValue);
                              }}
                              className="bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input 
                              {...field}
                              value={trialDays}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setTrialDays(val);
                                field.onChange(val);
                              }}
                              type="number" 
                              className="bg-slate-800 border-slate-700 text-slate-100 text-center focus:border-purple-500"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                const newValue = trialDays + 1;
                                setTrialDays(newValue);
                                field.onChange(newValue);
                              }}
                              className="bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-amber-400 mt-1">
                            Será ignorado quando o cliente digitar cupom de dias/mês/ano grátis
                          </p>
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
                              className="bg-slate-800 border-slate-700 text-slate-100 focus:border-purple-500"
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
                        <FormItem className="flex items-center justify-between rounded-lg border border-slate-700 p-4 bg-slate-800/50">
                          <div className="space-y-0.5">
                            <FormLabel className="text-slate-200">Ativo</FormLabel>
                            <p className="text-sm text-slate-400">
                              Plano disponível para contratação
                            </p>
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

                    <div className="flex gap-3 pt-4">
                      <Button 
                        type="submit" 
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-100 border-slate-600"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {["monthly", "yearly", "daily"].map((period) => {
                const periodLabel = period === "monthly" ? "Mensal" : period === "yearly" ? "Anual" : "Diário";
                const periodPlans = groupedPlans[period as keyof typeof groupedPlans];
                
                if (periodPlans.length === 0) return null;

                return (
                  <div key={period}>
                    <h3 className="text-xl font-semibold mb-4 text-purple-400">{periodLabel}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {periodPlans.map((plan) => {
                        const features = Array.isArray(plan.features) ? plan.features : [];
                        const couponFeature = features.find((f: any) => typeof f === 'string' && f?.startsWith("coupon:"));
                        const couponId = typeof couponFeature === 'string' ? couponFeature.split(":")[1] : null;
                        const coupon = coupons?.find((c) => c.id === couponId);

                        return (
                          <Card 
                            key={plan.id} 
                            className="bg-slate-800/50 border-slate-700 hover:border-purple-600 transition-colors cursor-pointer"
                            onClick={() => handleEditPlan(plan)}
                          >
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-3">
                                <h4 className="font-semibold text-slate-100">{plan.name}</h4>
                                {coupon && (
                                  <Tag className="h-4 w-4 text-purple-400" />
                                )}
                              </div>
                              
                              <div className="space-y-2">
                                <div>
                                  {plan.original_price && (
                                    <p className="text-sm text-slate-500 line-through">
                                      R$ {Number(plan.original_price).toFixed(2)}
                                    </p>
                                  )}
                                  <p className="text-lg font-bold text-slate-100">
                                    Preço assinatura: R$ {Number(plan.price).toFixed(2)}
                                  </p>
                                </div>

                                {coupon && (
                                  <p className="text-sm text-purple-400">
                                    Cupom: {coupon.code} - {coupon.type === "percentage" ? `${coupon.value.toString()}% desconto` : `${coupon.value.toString()} dias`}
                                  </p>
                                )}

                                {features[0] && typeof features[0] === 'string' && (
                                  <p className="text-sm text-slate-400">{features[0]}</p>
                                )}
                              </div>

                              <div className="flex gap-2 mt-4">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditPlan(plan);
                                  }}
                                  className="text-green-400 hover:text-green-300 hover:bg-green-400/10"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm("Deseja realmente excluir este plano?")) {
                                      deletePlanMutation.mutate(plan.id);
                                    }
                                  }}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="assinaturas" className="mt-6 space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100">
                  {editingStripeId ? "Editar Integração Stripe" : "Nova Integração Stripe"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-200">Banco</Label>
                    <Select value={stripeFormData.banco} onValueChange={(v) => setStripeFormData({ ...stripeFormData, banco: v })}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 focus:border-purple-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="STRIPE" className="text-slate-100">STRIPE</SelectItem>
                        <SelectItem value="PAYPAL" className="text-slate-100">PAYPAL (Em breve)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-slate-200">Conta</Label>
                    <Input
                      value={stripeFormData.conta}
                      onChange={(e) => setStripeFormData({ ...stripeFormData, conta: e.target.value })}
                      placeholder="Ex: APP Financeiro Teste"
                      className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-200">Nome da assinatura (No cadastro do Stripe)</Label>
                    <Input
                      value={stripeFormData.nome}
                      onChange={(e) => setStripeFormData({ ...stripeFormData, nome: e.target.value })}
                      placeholder="Plano Mensal"
                      className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-200">ID Produto</Label>
                    <Input
                      value={stripeFormData.produto_id}
                      onChange={(e) => setStripeFormData({ ...stripeFormData, produto_id: e.target.value })}
                      placeholder="prod_XXXXXXXXXXXXX"
                      className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-200">ID Preço</Label>
                    <Input
                      value={stripeFormData.preco_id}
                      onChange={(e) => setStripeFormData({ ...stripeFormData, preco_id: e.target.value })}
                      placeholder="price_XXXXXXXXXXXXX"
                      className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-purple-500"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={handleSaveStripe}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Salvar
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setEditingStripeId(null);
                        setStripeFormData({ banco: "STRIPE", conta: "", nome: "", produto_id: "", preco_id: "" });
                      }}
                      className="bg-red-700 hover:bg-red-600 text-white border-red-600"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100">Assinaturas Cadastradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700 hover:bg-slate-800/50">
                        <TableHead className="text-slate-300">Banco</TableHead>
                        <TableHead className="text-slate-300">Conta</TableHead>
                        <TableHead className="text-slate-300">Nome</TableHead>
                        <TableHead className="text-slate-300">ID Produto</TableHead>
                        <TableHead className="text-slate-300">ID Preço</TableHead>
                        <TableHead className="text-slate-300">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-slate-400">
                            Carregando...
                          </TableCell>
                        </TableRow>
                      ) : plans?.filter(p => p.stripe_product_id || p.stripe_price_id).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-slate-400">
                            Nenhuma integração configurada
                          </TableCell>
                        </TableRow>
                      ) : (
                        plans?.filter(p => p.stripe_product_id || p.stripe_price_id).map((plan) => (
                          <TableRow key={plan.id} className="border-slate-700 hover:bg-slate-800/50">
                            <TableCell className="text-slate-100">STRIPE</TableCell>
                            <TableCell className="text-slate-100">-</TableCell>
                            <TableCell className="text-slate-100">{plan.name}</TableCell>
                            <TableCell className="text-slate-300 font-mono text-xs">
                              {plan.stripe_product_id || "-"}
                            </TableCell>
                            <TableCell className="text-slate-300 font-mono text-xs">
                              {plan.stripe_price_id || "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingStripeId(plan.id);
                                    setStripeFormData({
                                      banco: "STRIPE",
                                      conta: "",
                                      nome: plan.name,
                                      produto_id: plan.stripe_product_id || "",
                                      preco_id: plan.stripe_price_id || "",
                                    });
                                  }}
                                  className="text-green-400 hover:text-green-300 hover:bg-green-400/10"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm("Deseja remover a integração Stripe deste plano?")) {
                                      updatePlanMutation.mutate({
                                        id: plan.id,
                                        data: {
                                          ...form.getValues(),
                                          stripe_product_id: null,
                                          stripe_price_id: null,
                                        },
                                      });
                                    }
                                  }}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminPlans;
