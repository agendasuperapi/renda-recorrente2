import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Search, Edit, Trash2, CalendarIcon, Minus } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const couponTypeLabels = {
  percentage: "% de desconto",
  days: "Dias grátis",
  free_trial: "Mês grátis"
};

const couponFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  code: z.string()
    .min(1, "Código é obrigatório")
    .regex(/^\S+$/, "Código não pode conter espaços")
    .transform(val => val.toUpperCase().replace(/\s/g, "")),
  description: z.string().optional(),
  type: z.enum(["percentage", "days", "free_trial"]),
  value: z.number().min(1, "Valor deve ser maior que 0"),
  valid_until: z.date().optional(),
  is_active: z.boolean().default(true),
  is_visible_to_affiliates: z.boolean().default(true),
  is_primary: z.boolean().default(false),
  max_uses: z.preprocess(
    (val) => val === null || val === "" || val === undefined ? undefined : val,
    z.number().optional()
  ),
  product_id: z.string().min(1, "Produto é obrigatório"),
});

type CouponFormValues = z.infer<typeof couponFormSchema>;

const AdminCoupons = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [dateInputValue, setDateInputValue] = useState("");
  const queryClient = useQueryClient();

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      type: "percentage",
      value: 10,
      is_active: true,
      is_visible_to_affiliates: true,
      is_primary: false,
    },
  });

  // Sync dateInputValue with form field value
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'valid_until') {
        const dateValue = value.valid_until;
        if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
          setDateInputValue(format(dateValue, "dd/MM/yyyy"));
        } else if (dateValue === undefined || dateValue === null) {
          setDateInputValue("");
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, nome")
        .order("nome");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select(`
          *,
          products!coupons_product_id_fkey(nome)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as any[];
    },
  });

  const couponsList = coupons || [];

  const createCouponMutation = useMutation({
    mutationFn: async (values: CouponFormValues) => {
      // If setting as primary, first remove primary from other coupons with same product
      if (values.is_primary) {
        const productId = values.product_id || null;
        const { error: updateError } = await supabase
          .from("coupons")
          .update({ is_primary: false } as any)
          .match({ product_id: productId, is_primary: true });
        
        if (updateError) console.error("Error updating previous primary:", updateError);
      }

      const { data, error } = await supabase
        .from("coupons")
        .insert({
          name: values.name,
          code: values.code.toUpperCase(),
          description: values.description,
          type: values.type,
          value: values.value,
          valid_until: values.valid_until?.toISOString(),
          is_active: values.is_active,
          is_visible_to_affiliates: values.is_visible_to_affiliates,
          is_primary: values.is_primary,
          max_uses: values.max_uses,
          product_id: values.product_id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Cupom criado com sucesso!");
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast.error("Erro ao criar cupom: " + error.message);
    },
  });

  const updateCouponMutation = useMutation({
    mutationFn: async (values: CouponFormValues & { id: string }) => {
      // If setting as primary, first remove primary from other coupons with same product
      if (values.is_primary) {
        const productId = values.product_id || null;
        
        // First get current primary coupons for this product
        const { data: primaryCoupons } = await supabase
          .from("coupons")
          .select("id")
          .match({ product_id: productId, is_primary: true })
          .neq("id", values.id);
        
        // Update them to not be primary
        if (primaryCoupons && primaryCoupons.length > 0) {
          const { error: updateError } = await supabase
            .from("coupons")
            .update({ is_primary: false } as any)
            .in("id", primaryCoupons.map(c => c.id));
          
          if (updateError) console.error("Error updating previous primary:", updateError);
        }
      }

      const { data, error } = await supabase
        .from("coupons")
        .update({
          name: values.name,
          code: values.code.toUpperCase(),
          description: values.description,
          type: values.type,
          value: values.value,
          valid_until: values.valid_until?.toISOString(),
          is_active: values.is_active,
          is_visible_to_affiliates: values.is_visible_to_affiliates,
          is_primary: values.is_primary,
          max_uses: values.max_uses,
          product_id: values.product_id,
        } as any)
        .eq("id", values.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Cupom atualizado com sucesso!");
      setIsDialogOpen(false);
      setEditingCoupon(null);
      form.reset();
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar cupom: " + error.message);
    },
  });

  const deleteCouponMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("coupons")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Cupom excluído com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir cupom: " + error.message);
    },
  });

  const onSubmit = (values: CouponFormValues) => {
    if (editingCoupon) {
      updateCouponMutation.mutate({ ...values, id: editingCoupon.id });
    } else {
      createCouponMutation.mutate(values);
    }
  };

  const handleEdit = (coupon: any) => {
    setEditingCoupon(coupon);
    form.reset({
      name: coupon.name,
      code: coupon.code,
      description: coupon.description || "",
      type: coupon.type,
      value: coupon.value,
      valid_until: coupon.valid_until ? new Date(coupon.valid_until) : undefined,
      is_active: coupon.is_active,
      is_visible_to_affiliates: coupon.is_visible_to_affiliates ?? true,
      is_primary: coupon.is_primary ?? false,
      max_uses: coupon.max_uses,
      product_id: coupon.product_id || undefined,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este cupom?")) {
      deleteCouponMutation.mutate(id);
    }
  };

  const filteredCoupons = couponsList.filter(
    (coupon: any) => {
      const matchesSearch = 
        coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        coupon.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesProduct = 
        selectedProduct === "all" || 
        coupon.product_id === selectedProduct;
      
      return matchesSearch && matchesProduct;
    }
  );

  const totalCoupons = couponsList.length;
  const activeCoupons = couponsList.filter((c) => c.is_active).length;
  const totalUses = couponsList.reduce((sum, c) => sum + (c.current_uses || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestão de Cupons</h1>
          <p className="text-muted-foreground">
            Crie e gerencie cupons de desconto para afiliados
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingCoupon(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Cupom
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCoupon ? "Editar Cupom" : "Cadastro de Cupom"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Cupom</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Black Friday 2024" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: BLACKFRIDAY" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value.toUpperCase().replace(/\s/g, ""))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="product_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Produto</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um produto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products.map((product) => (
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descrição do cupom (opcional)" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo Cupom</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">% de desconto</SelectItem>
                            <SelectItem value="days">Dias grátis</SelectItem>
                            <SelectItem value="free_trial">Mês grátis</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantidade/Valor</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => field.onChange(Math.max(1, field.value - 1))}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              className="text-center"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => field.onChange(field.value + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="valid_until"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data de Validade</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="DD/MM/AAAA"
                              value={dateInputValue}
                              onChange={(e) => {
                                const rawValue = e.target.value.replace(/\D/g, '');
                                let formatted = rawValue;
                                
                                // Format with slashes as user types
                                if (rawValue.length >= 2) {
                                  formatted = rawValue.slice(0, 2) + '/' + rawValue.slice(2);
                                }
                                if (rawValue.length >= 4) {
                                  formatted = rawValue.slice(0, 2) + '/' + rawValue.slice(2, 4) + '/' + rawValue.slice(4, 8);
                                }
                                
                                // Update local state immediately for free typing
                                setDateInputValue(formatted);
                                
                                // Try to parse and update form only when complete
                                if (rawValue.length === 8) {
                                  const day = parseInt(rawValue.slice(0, 2));
                                  const month = parseInt(rawValue.slice(2, 4));
                                  const year = parseInt(rawValue.slice(4, 8));
                                  const date = new Date(year, month - 1, day);
                                  
                                  if (!isNaN(date.getTime()) && 
                                      date.getDate() === day && 
                                      date.getMonth() === month - 1 && 
                                      date.getFullYear() === year) {
                                    field.onChange(date);
                                  }
                                }
                              }}
                              onBlur={() => {
                                const rawValue = dateInputValue.replace(/\D/g, '');
                                if (rawValue.length === 8) {
                                  const day = parseInt(rawValue.slice(0, 2));
                                  const month = parseInt(rawValue.slice(2, 4));
                                  const year = parseInt(rawValue.slice(4, 8));
                                  const date = new Date(year, month - 1, day);
                                  
                                  if (!isNaN(date.getTime()) && 
                                      date.getDate() === day && 
                                      date.getMonth() === month - 1 && 
                                      date.getFullYear() === year) {
                                    field.onChange(date);
                                  } else {
                                    // Invalid date, clear it
                                    setDateInputValue("");
                                    field.onChange(undefined);
                                  }
                                } else if (rawValue.length === 0) {
                                  field.onChange(undefined);
                                }
                              }}
                              maxLength={10}
                              className="flex-1"
                            />
                          </FormControl>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                              >
                                <CalendarIcon className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date()}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="max_uses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usos Máximos (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ilimitado"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Cadastro ativo</FormLabel>
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

                <FormField
                  control={form.control}
                  name="is_visible_to_affiliates"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Cupom para todos os afiliados</FormLabel>
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

                <FormField
                  control={form.control}
                  name="is_primary"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Cupom principal</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Apenas um cupom pode ser principal por produto
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

                <div className="flex justify-end">
                  <Button type="submit" disabled={createCouponMutation.isPending || updateCouponMutation.isPending}>
                    {editingCoupon ? "Atualizar" : "Salvar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cupom por código ou nome..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por produto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os produtos</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredCoupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    Nenhum cupom cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredCoupons.map((coupon: any) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-mono font-semibold">{coupon.code}</TableCell>
                    <TableCell>{coupon.name}</TableCell>
                    <TableCell>
                      {coupon.products?.nome || (
                        <span className="text-muted-foreground">Todos</span>
                      )}
                    </TableCell>
                    <TableCell>{couponTypeLabels[coupon.type as keyof typeof couponTypeLabels]}</TableCell>
                    <TableCell>{coupon.value}</TableCell>
                    <TableCell>
                      {coupon.current_uses || 0}
                      {coupon.max_uses ? ` / ${coupon.max_uses}` : ""}
                    </TableCell>
                    <TableCell>
                      {coupon.valid_until ? format(new Date(coupon.valid_until), "dd/MM/yyyy") : "Sem limite"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={coupon.is_active ? "default" : "secondary"}>
                        {coupon.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {coupon.is_primary && (
                        <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                          Principal
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(coupon)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(coupon.id)}
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
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Cupons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCoupons}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cupons Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{activeCoupons}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Usos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{totalUses}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminCoupons;
