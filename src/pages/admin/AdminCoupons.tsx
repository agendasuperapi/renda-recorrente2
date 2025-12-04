import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter } from "@/components/ui/drawer";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, Edit, Trash2, CalendarIcon, Minus, X, SlidersHorizontal, LayoutList, LayoutGrid } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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
  value: z.number().min(0, "Valor não pode ser negativo"),
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateInputValue, setDateInputValue] = useState("");
  const [showZeroConfirmation, setShowZeroConfirmation] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState<CouponFormValues | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"compact" | "complete">("complete");
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

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
          products!coupons_product_id_fkey(nome, icone_light, icone_dark)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Ordenar para que cupons principais apareçam primeiro
      const sortedData = (data as any[]).sort((a, b) => {
        // Primeiro por is_primary (true primeiro)
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        // Depois por data de criação (mais recente primeiro)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      return sortedData;
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
          valid_until: values.valid_until ? values.valid_until.toISOString() : null,
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
          valid_until: values.valid_until ? values.valid_until.toISOString() : null,
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
    // Se o valor for zero, mostrar confirmação
    if (values.value === 0) {
      setPendingFormValues(values);
      setShowZeroConfirmation(true);
      return;
    }
    
    // Continuar normalmente se não for zero
    executeSubmit(values);
  };

  const executeSubmit = (values: CouponFormValues) => {
    if (editingCoupon) {
      updateCouponMutation.mutate({ ...values, id: editingCoupon.id });
    } else {
      createCouponMutation.mutate(values);
    }
  };

  const handleConfirmZeroValue = () => {
    if (pendingFormValues) {
      executeSubmit(pendingFormValues);
    }
    setShowZeroConfirmation(false);
    setPendingFormValues(null);
  };

  const handleCancelZeroValue = () => {
    setShowZeroConfirmation(false);
    setPendingFormValues(null);
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
      
      const matchesStatus = 
        statusFilter === "all" || 
        (statusFilter === "active" && coupon.is_active) ||
        (statusFilter === "inactive" && !coupon.is_active);
      
      return matchesSearch && matchesProduct && matchesStatus;
    }
  );

  // Group coupons by product when "all" is selected
  const groupedByProduct = selectedProduct === "all"
    ? filteredCoupons.reduce((acc, coupon) => {
        const productName = coupon.products?.nome || "Sem produto";
        const productId = coupon.product_id || "no-product";
        if (!acc[productId]) {
          acc[productId] = {
            name: productName,
            iconLight: coupon.products?.icone_light,
            iconDark: coupon.products?.icone_dark,
            coupons: []
          };
        }
        acc[productId].coupons.push(coupon);
        return acc;
      }, {} as Record<string, { name: string; iconLight?: string; iconDark?: string; coupons: typeof filteredCoupons }>)
    : null;

  const totalCoupons = couponsList.length;
  const activeCoupons = couponsList.filter((c) => c.is_active).length;
  const totalUses = couponsList.reduce((sum, c) => sum + (c.current_uses || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Gestão de Cupons</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Crie e gerencie cupons de desconto para afiliados
          </p>
        </div>
        {isMobile ? (
          <Drawer open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingCoupon(null);
              form.reset();
            }
          }}>
            <DrawerTrigger asChild>
              <Button 
                className="gap-2 w-full sm:w-auto"
                onClick={() => {
                  setEditingCoupon(null);
                  form.reset({
                    name: "",
                    code: "",
                    description: "",
                    type: "percentage",
                    value: 10,
                    is_active: true,
                    is_visible_to_affiliates: true,
                    is_primary: false,
                  });
                  setDateInputValue("");
                }}
              >
                <Plus className="h-4 w-4" />
                Criar Cupom
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[95vh]">
              <DrawerHeader className="relative pb-3">
                {/* Drag Handle */}
                <div className="mx-auto w-12 h-1.5 rounded-full bg-muted-foreground/40 mb-3" />
                
                {/* Close Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8"
                  onClick={() => setIsDialogOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
                
                <DrawerTitle>
                  {editingCoupon ? "Editar Cupom" : "Cadastro de Cupom"}
                </DrawerTitle>
              </DrawerHeader>
              
              <ScrollArea className="h-[calc(95vh-140px)] px-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 pb-4">
                    <div className="grid grid-cols-1 gap-3">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Nome do Cupom</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Black Friday 2024" {...field} className="text-sm" />
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
                            <FormLabel className="text-xs">Código</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Ex: BLACKFRIDAY" 
                                {...field} 
                                onChange={(e) => field.onChange(e.target.value.toUpperCase().replace(/\s/g, ""))}
                                className="text-sm"
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
                          <FormLabel className="text-xs">Produto</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="text-sm">
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
                          <FormLabel className="text-xs">Descrição</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Descrição do cupom (opcional)" 
                              {...field} 
                              className="min-h-[60px] text-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Tipo Cupom</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="text-sm">
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
                            <FormLabel className="text-xs">Quantidade/Valor</FormLabel>
                            <FormControl>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => field.onChange(Math.max(0, field.value - 1))}
                                  className="h-8 w-8"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  className="text-center text-sm"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => field.onChange(field.value + 1)}
                                  className="h-8 w-8"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="valid_until"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-xs">Data de Validade</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder="DD/MM/AAAA"
                                  value={dateInputValue}
                                  onChange={(e) => {
                                    const rawValue = e.target.value.replace(/\D/g, '');
                                    let formatted = rawValue;
                                    
                                    if (rawValue.length >= 2) {
                                      formatted = rawValue.slice(0, 2) + '/' + rawValue.slice(2);
                                    }
                                    if (rawValue.length >= 4) {
                                      formatted = rawValue.slice(0, 2) + '/' + rawValue.slice(2, 4) + '/' + rawValue.slice(4, 8);
                                    }
                                    
                                    setDateInputValue(formatted);
                                    
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
                                        setDateInputValue("");
                                        field.onChange(undefined);
                                      }
                                    } else if (rawValue.length === 0) {
                                      field.onChange(undefined);
                                    }
                                  }}
                                  maxLength={10}
                                  className="flex-1 text-sm"
                                />
                              </FormControl>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <CalendarIcon className="h-3 w-3" />
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
                            <FormLabel className="text-xs">Usos Máximos</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Ilimitado"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                className="text-sm"
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
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Cadastro ativo</FormLabel>
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
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Cupom para todos os afiliados</FormLabel>
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
                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Cupom principal</FormLabel>
                            <p className="text-xs text-muted-foreground">
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
                  </form>
                </Form>
              </ScrollArea>
              
              <DrawerFooter className="pt-3">
                <Button 
                  onClick={form.handleSubmit(onSubmit)} 
                  disabled={createCouponMutation.isPending || updateCouponMutation.isPending}
                  className="w-full"
                >
                  {editingCoupon ? "Atualizar" : "Salvar"}
                </Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingCoupon(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                className="gap-2 w-full sm:w-auto"
                onClick={() => {
                  setEditingCoupon(null);
                  form.reset({
                    name: "",
                    code: "",
                    description: "",
                    type: "percentage",
                    value: 10,
                    is_active: true,
                    is_visible_to_affiliates: true,
                    is_primary: false,
                  });
                  setDateInputValue("");
                }}
              >
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
                                onClick={() => field.onChange(Math.max(0, field.value - 1))}
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
                                  
                                  if (rawValue.length >= 2) {
                                    formatted = rawValue.slice(0, 2) + '/' + rawValue.slice(2);
                                  }
                                  if (rawValue.length >= 4) {
                                    formatted = rawValue.slice(0, 2) + '/' + rawValue.slice(2, 4) + '/' + rawValue.slice(4, 8);
                                  }
                                  
                                  setDateInputValue(formatted);
                                  
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
        )}
      </div>

      {/* Mobile Control Bar */}
      <div className="flex items-center justify-between lg:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
        </Button>
        <ToggleGroup
          type="single"
          value={layoutMode}
          onValueChange={(value) => value && setLayoutMode(value as "compact" | "complete")}
          className="border rounded-lg"
        >
          <ToggleGroupItem value="compact" aria-label="Modo compacto" className="px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <LayoutList className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="complete" aria-label="Modo completo" className="px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Filtros */}
      <Card className={`${!showFilters ? 'hidden lg:block' : ''} bg-transparent border-0 shadow-none lg:bg-card lg:border lg:shadow-sm rounded-none lg:rounded-lg`}>
        <CardContent className="!p-0 lg:!p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cupom..."
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="bg-transparent border-0 shadow-none lg:bg-card lg:border lg:shadow-sm rounded-none lg:rounded-lg">
        <CardContent className="!p-0 lg:!p-6">
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : filteredCoupons.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Nenhum cupom cadastrado
            </div>
          ) : selectedProduct === "all" && groupedByProduct ? (
            <div className="space-y-8">
              {Object.entries(groupedByProduct).map(([productId, productData]: [string, { name: string; iconLight?: string; iconDark?: string; coupons: any[] }]) => (
                <div key={productId}>
                  <div className="flex items-center gap-3 mb-4 pb-2 border-b">
                    {(productData.iconLight || productData.iconDark) && (
                      <img
                        src={productData.iconLight || productData.iconDark || ''}
                        alt={productData.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-border"
                      />
                    )}
                    <h3 className="text-lg font-semibold text-foreground">
                      {productData.name}
                    </h3>
                    <Badge variant="outline" className="ml-auto">
                      {productData.coupons.length} {productData.coupons.length === 1 ? 'cupom' : 'cupons'}
                    </Badge>
                  </div>
                   {/* Desktop Table */}
                   <div className="hidden lg:block overflow-x-auto">
                     <Table>
                       <TableHeader>
                         <TableRow>
                           <TableHead>Código</TableHead>
                           <TableHead>Nome</TableHead>
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
                         {productData.coupons.map((coupon: any) => (
                           <TableRow key={coupon.id} className={!coupon.is_active ? "bg-red-50/50 dark:bg-red-950/20" : ""}>
                             <TableCell className="font-mono font-semibold">{coupon.code}</TableCell>
                             <TableCell>
                               <div>
                                 <div className="font-medium">{coupon.name}</div>
                                 {coupon.description && (
                                   <div className="text-sm text-muted-foreground mt-1">
                                     {coupon.description}
                                   </div>
                                 )}
                               </div>
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
                               <Badge 
                                 variant={coupon.is_active ? "default" : "secondary"}
                                 className={!coupon.is_active ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900" : ""}
                               >
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
                         ))}
                       </TableBody>
                     </Table>
                   </div>

                   {/* Mobile/Tablet Cards */}
                   <div className="lg:hidden space-y-3">
                     {productData.coupons.map((coupon: any) => (
                       layoutMode === "compact" ? (
                         <Card key={coupon.id} className={`overflow-hidden ${!coupon.is_active ? "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900" : ""}`}>
                           <CardContent className="p-3">
                             <div className="space-y-2">
                               <div className="flex items-start justify-between gap-2">
                                 <div className="min-w-0 flex-1">
                                   <p className="font-mono font-bold text-sm truncate">{coupon.code}</p>
                                   <p className="text-xs text-muted-foreground truncate">{coupon.name}</p>
                                 </div>
                                 <div className="text-right text-xs">
                                   <p className="text-muted-foreground">{couponTypeLabels[coupon.type as keyof typeof couponTypeLabels]}</p>
                                   <p className="font-semibold text-primary">{coupon.value}</p>
                                 </div>
                               </div>
                               <div className="flex items-center justify-between">
                                 <div className="flex gap-1 flex-wrap">
                                   {coupon.is_primary && (
                                     <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 text-xs">
                                       Principal
                                     </Badge>
                                   )}
                                   <Badge 
                                     variant={coupon.is_active ? "default" : "secondary"}
                                     className={`text-xs ${!coupon.is_active ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" : ""}`}
                                   >
                                     {coupon.is_active ? "Ativo" : "Inativo"}
                                   </Badge>
                                 </div>
                                 <div className="flex gap-1">
                                   <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(coupon)}>
                                     <Edit className="h-4 w-4" />
                                   </Button>
                                   <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(coupon.id)}>
                                     <Trash2 className="h-4 w-4" />
                                   </Button>
                                 </div>
                               </div>
                             </div>
                           </CardContent>
                         </Card>
                       ) : (
                         <Card key={coupon.id} className={!coupon.is_active ? "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900" : ""}>
                           <CardContent className="pt-6">
                             <div className="space-y-3">
                               <div className="flex items-start justify-between gap-3">
                                 <div className="flex-1 min-w-0">
                                   <div className="font-mono font-bold text-lg mb-1 truncate">{coupon.code}</div>
                                   <div className="font-medium text-sm">{coupon.name}</div>
                                   {coupon.description && (
                                     <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                       {coupon.description}
                                     </div>
                                   )}
                                 </div>
                                 <div className="flex gap-2 flex-shrink-0">
                                   <Button variant="ghost" size="icon" onClick={() => handleEdit(coupon)} className="h-8 w-8">
                                     <Edit className="h-4 w-4" />
                                   </Button>
                                   <Button variant="ghost" size="icon" onClick={() => handleDelete(coupon.id)} className="h-8 w-8">
                                     <Trash2 className="h-4 w-4" />
                                   </Button>
                                 </div>
                               </div>
                               
                               <div className="grid grid-cols-2 gap-2 text-sm">
                                 <div>
                                   <span className="text-muted-foreground">Tipo:</span>
                                   <div className="font-medium">{couponTypeLabels[coupon.type as keyof typeof couponTypeLabels]}</div>
                                 </div>
                                 <div>
                                   <span className="text-muted-foreground">Valor:</span>
                                   <div className="font-medium">{coupon.value}</div>
                                 </div>
                                 <div>
                                   <span className="text-muted-foreground">Usos:</span>
                                   <div className="font-medium">
                                     {coupon.current_uses || 0}
                                     {coupon.max_uses ? ` / ${coupon.max_uses}` : ""}
                                   </div>
                                 </div>
                                 <div>
                                   <span className="text-muted-foreground">Validade:</span>
                                   <div className="font-medium text-xs">
                                     {coupon.valid_until ? format(new Date(coupon.valid_until), "dd/MM/yyyy") : "Sem limite"}
                                   </div>
                                 </div>
                               </div>
                               
                               <div className="flex gap-2 flex-wrap">
                                 <Badge 
                                   variant={coupon.is_active ? "default" : "secondary"}
                                   className={!coupon.is_active ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" : ""}
                                 >
                                   {coupon.is_active ? "Ativo" : "Inativo"}
                                 </Badge>
                                 {coupon.is_primary && (
                                   <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                                     Principal
                                   </Badge>
                                 )}
                               </div>
                             </div>
                           </CardContent>
                         </Card>
                       )
                     ))}
                   </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
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
                    {filteredCoupons.map((coupon: any) => (
                      <TableRow key={coupon.id} className={!coupon.is_active ? "bg-red-50/50 dark:bg-red-950/20" : ""}>
                        <TableCell className="font-mono font-semibold">{coupon.code}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{coupon.name}</div>
                            {coupon.description && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {coupon.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
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
                          <Badge 
                            variant={coupon.is_active ? "default" : "secondary"}
                            className={!coupon.is_active ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900" : ""}
                          >
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
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile/Tablet Cards */}
              <div className="lg:hidden space-y-3">
                {filteredCoupons.map((coupon: any) => (
                  layoutMode === "compact" ? (
                    <Card key={coupon.id} className={`overflow-hidden ${!coupon.is_active ? "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900" : ""}`}>
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-mono font-bold text-sm truncate">{coupon.code}</p>
                              <p className="text-xs text-muted-foreground truncate">{coupon.name}</p>
                            </div>
                            <div className="text-right text-xs">
                              <p className="text-muted-foreground">{couponTypeLabels[coupon.type as keyof typeof couponTypeLabels]}</p>
                              <p className="font-semibold text-primary">{coupon.value}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1 flex-wrap">
                              {coupon.is_primary && (
                                <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 text-xs">
                                  Principal
                                </Badge>
                              )}
                              <Badge 
                                variant={coupon.is_active ? "default" : "secondary"}
                                className={`text-xs ${!coupon.is_active ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" : ""}`}
                              >
                                {coupon.is_active ? "Ativo" : "Inativo"}
                              </Badge>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(coupon)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(coupon.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card key={coupon.id} className={!coupon.is_active ? "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900" : ""}>
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-mono font-bold text-lg mb-1 truncate">{coupon.code}</div>
                              <div className="font-medium text-sm">{coupon.name}</div>
                              {coupon.description && (
                                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {coupon.description}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(coupon)} className="h-8 w-8">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(coupon.id)} className="h-8 w-8">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Produto:</span>
                              <div className="font-medium text-xs truncate">
                                {coupon.products?.nome || <span className="text-muted-foreground">Todos</span>}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Tipo:</span>
                              <div className="font-medium text-xs">{couponTypeLabels[coupon.type as keyof typeof couponTypeLabels]}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Valor:</span>
                              <div className="font-medium">{coupon.value}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Usos:</span>
                              <div className="font-medium">
                                {coupon.current_uses || 0}
                                {coupon.max_uses ? ` / ${coupon.max_uses}` : ""}
                              </div>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Validade:</span>
                              <div className="font-medium text-xs">
                                {coupon.valid_until ? format(new Date(coupon.valid_until), "dd/MM/yyyy") : "Sem limite"}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 flex-wrap">
                            <Badge 
                              variant={coupon.is_active ? "default" : "secondary"}
                              className={!coupon.is_active ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" : ""}
                            >
                              {coupon.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                            {coupon.is_primary && (
                              <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                                Principal
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

        <Card className="sm:col-span-2 lg:col-span-1">
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

      <AlertDialog open={showZeroConfirmation} onOpenChange={setShowZeroConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar valor zero</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a criar um cupom com valor zero. Isso significa que o cupom não oferecerá nenhum desconto ou benefício adicional. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelZeroValue}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmZeroValue}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCoupons;
