import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Upload, X, Copy, Download, Package, CreditCard, Loader2, Check, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollAnimation } from "@/components/ScrollAnimation";
import { Badge } from "@/components/ui/badge";

const productSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  texto_telefone: z.string().optional(),
  site: z.string().optional(),
  icone_dark: z.string().optional(),
  icone_light: z.string().optional(),
  logo_dark: z.string().optional(),
  logo_light: z.string().optional(),
  site_landingpage: z.string().optional(),
  nome_apk: z.string().optional(),
  show_on_landing: z.boolean().optional(),
  api_url: z.string().optional(),
  api_key: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ExternalPlan {
  id: string;
  name: string;
  credits?: number;
  price_cents: number;
  stripe_price_id?: string;
  active?: boolean;
  competitor_price_cents?: number;
  plan_type?: string;
}

const AdminProducts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [iconDarkFile, setIconDarkFile] = useState<File | null>(null);
  const [iconLightFile, setIconLightFile] = useState<File | null>(null);
  const [logoDarkFile, setLogoDarkFile] = useState<File | null>(null);
  const [logoLightFile, setLogoLightFile] = useState<File | null>(null);
  const [iconDarkPreview, setIconDarkPreview] = useState<string | null>(null);
  const [iconLightPreview, setIconLightPreview] = useState<string | null>(null);
  const [logoDarkPreview, setLogoDarkPreview] = useState<string | null>(null);
  const [logoLightPreview, setLogoLightPreview] = useState<string | null>(null);
  const [importingProductId, setImportingProductId] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [dialogTab, setDialogTab] = useState<string>("produto");

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      telefone: "",
      email: "",
      texto_telefone: "",
      site: "",
      icone_dark: "",
      icone_light: "",
      logo_dark: "",
      logo_light: "",
      site_landingpage: "",
      nome_apk: "",
      show_on_landing: true,
      api_url: "",
      api_key: "",
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: allPlans } = useQuery({
    queryKey: ["plans-by-product"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("price", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const getPlansForProduct = (productId: string) => {
    return allPlans?.filter(plan => plan.product_id === productId) || [];
  };

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const { error } = await supabase.from("products").insert([{
        nome: data.nome!,
        descricao: data.descricao,
        telefone: data.telefone,
        email: data.email,
        texto_telefone: data.texto_telefone,
        site: data.site,
        icone_dark: data.icone_dark,
        icone_light: data.icone_light,
        logo_dark: data.logo_dark,
        logo_light: data.logo_light,
        site_landingpage: data.site_landingpage,
        nome_apk: data.nome_apk,
        show_on_landing: data.show_on_landing ?? true,
        api_url: data.api_url || null,
        api_key: data.api_key || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Produto criado",
        description: "Produto cadastrado com sucesso!",
      });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductFormData }) => {
      const { error } = await supabase
        .from("products")
        .update({
          ...data,
          api_url: data.api_url || null,
          api_key: data.api_key || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Produto atualizado",
        description: "Produto editado com sucesso!",
      });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Produto excluído",
        description: "Produto removido com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const importPlansMutation = useMutation({
    mutationFn: async ({ productId, apiUrl, apiKey }: { productId: string; apiUrl: string; apiKey: string }) => {
      // Fetch plans from external API
      const response = await fetch(apiUrl, {
        headers: {
          'apikey': apiKey,
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar planos: ${response.status} ${response.statusText}`);
      }

      const externalPlans: ExternalPlan[] = await response.json();

      // Upsert plans into local database
      let imported = 0;
      let updated = 0;

      for (const plan of externalPlans) {
        const { data: existing } = await supabase
          .from("plans")
          .select("id")
          .eq("id", plan.id)
          .maybeSingle();

        const planData = {
          id: plan.id,
          name: plan.name,
          price: plan.price_cents / 100, // Convert cents to currency
          original_price: plan.price_cents, // Keep original in cents
          billing_period: "one_time",
          product_id: productId,
          is_active: plan.active ?? true,
          test_stripe_price_id: plan.stripe_price_id || null,
          features: plan.credits ? { credits: plan.credits, plan_type: plan.plan_type } : null,
        };

        if (existing) {
          const { error } = await supabase
            .from("plans")
            .update(planData)
            .eq("id", plan.id);
          if (error) throw error;
          updated++;
        } else {
          const { error } = await supabase
            .from("plans")
            .insert([planData]);
          if (error) throw error;
          imported++;
        }
      }

      return { imported, updated, total: externalPlans.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["plans-by-product"] });
      toast({
        title: "Planos importados",
        description: `${data.imported} novos, ${data.updated} atualizados de ${data.total} planos.`,
      });
      setImportingProductId(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao importar planos",
        description: error.message,
        variant: "destructive",
      });
      setImportingProductId(null);
    },
  });

  const handleImportPlans = (product: any) => {
    if (!product.api_url || !product.api_key) {
      toast({
        title: "Configuração incompleta",
        description: "Configure a URL e chave da API nas configurações do produto.",
        variant: "destructive",
      });
      return;
    }

    setImportingProductId(product.id);
    importPlansMutation.mutate({
      productId: product.id,
      apiUrl: product.api_url,
      apiKey: product.api_key,
    });
  };

  const handleNewProduct = () => {
    setEditingProduct(null);
    form.reset({
      nome: "",
      descricao: "",
      telefone: "",
      email: "",
      texto_telefone: "",
      site: "",
      icone_dark: "",
      icone_light: "",
      logo_dark: "",
      logo_light: "",
      site_landingpage: "",
      nome_apk: "",
      show_on_landing: true,
      api_url: "",
      api_key: "",
    });
    setIsDialogOpen(true);
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    form.reset({
      nome: product.nome || "",
      descricao: product.descricao || "",
      telefone: product.telefone || "",
      email: product.email || "",
      texto_telefone: product.texto_telefone || "",
      site: product.site || "",
      icone_dark: product.icone_dark || "",
      icone_light: product.icone_light || "",
      logo_dark: product.logo_dark || "",
      logo_light: product.logo_light || "",
      site_landingpage: product.site_landingpage || "",
      nome_apk: product.nome_apk || "",
      show_on_landing: product.show_on_landing ?? true,
      api_url: product.api_url || "",
      api_key: product.api_key || "",
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
    setIconDarkFile(null);
    setIconLightFile(null);
    setLogoDarkFile(null);
    setLogoLightFile(null);
    setIconDarkPreview(null);
    setIconLightPreview(null);
    setLogoDarkPreview(null);
    setLogoLightPreview(null);
    setShowApiKey(false);
    setDialogTab("produto");
    form.reset();
  };

  const handleFileChange = (file: File | null, setter: (file: File | null) => void, previewSetter: (preview: string | null) => void) => {
    setter(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        previewSetter(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      previewSetter(null);
    }
  };

  const uploadImage = async (file: File, path: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const onSubmit = async (data: ProductFormData) => {
    setUploading(true);
    try {
      const formData = { ...data };

      if (iconDarkFile) {
        formData.icone_dark = await uploadImage(iconDarkFile, 'icons');
      }
      if (iconLightFile) {
        formData.icone_light = await uploadImage(iconLightFile, 'icons');
      }
      if (logoDarkFile) {
        formData.logo_dark = await uploadImage(logoDarkFile, 'logos');
      }
      if (logoLightFile) {
        formData.logo_light = await uploadImage(logoLightFile, 'logos');
      }

      if (editingProduct) {
        updateProductMutation.mutate({ id: editingProduct.id, data: formData });
      } else {
        createProductMutation.mutate(formData);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao fazer upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const ProductFormFields = ({ isMobileView = false }: { isMobileView?: boolean }) => (
    <>
      <FormField
        control={form.control}
        name="nome"
        render={({ field }) => (
          <FormItem>
            <FormLabel className={isMobileView ? "text-xs" : ""}>Nome *</FormLabel>
            <FormControl>
              <Input {...field} className={isMobileView ? "text-xs" : ""} />
            </FormControl>
            <FormMessage className={isMobileView ? "text-xs" : ""} />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="descricao"
        render={({ field }) => (
          <FormItem>
            <FormLabel className={isMobileView ? "text-xs" : ""}>Descrição</FormLabel>
            <FormControl>
              <Textarea {...field} rows={3} className={isMobileView ? "text-xs" : ""} />
            </FormControl>
            <FormMessage className={isMobileView ? "text-xs" : ""} />
          </FormItem>
        )}
      />

      <div className={`grid grid-cols-2 ${isMobileView ? "gap-3" : "gap-4"}`}>
        <FormField
          control={form.control}
          name="telefone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={isMobileView ? "text-xs" : ""}>Telefone</FormLabel>
              <FormControl>
                <Input {...field} className={isMobileView ? "text-xs" : ""} />
              </FormControl>
              <FormMessage className={isMobileView ? "text-xs" : ""} />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={isMobileView ? "text-xs" : ""}>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} className={isMobileView ? "text-xs" : ""} />
              </FormControl>
              <FormMessage className={isMobileView ? "text-xs" : ""} />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="texto_telefone"
        render={({ field }) => (
          <FormItem>
            <FormLabel className={isMobileView ? "text-xs" : ""}>Texto Telefone</FormLabel>
            <FormControl>
              <Input {...field} className={isMobileView ? "text-xs" : ""} />
            </FormControl>
            <FormMessage className={isMobileView ? "text-xs" : ""} />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="site"
        render={({ field }) => (
          <FormItem>
            <FormLabel className={isMobileView ? "text-xs" : ""}>Site</FormLabel>
            <FormControl>
              <Input {...field} className={isMobileView ? "text-xs" : ""} />
            </FormControl>
            <FormMessage className={isMobileView ? "text-xs" : ""} />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="site_landingpage"
        render={({ field }) => (
          <FormItem>
            <FormLabel className={isMobileView ? "text-xs" : ""}>Site Landing Page</FormLabel>
            <FormControl>
              <Input {...field} className={isMobileView ? "text-xs" : ""} />
            </FormControl>
            <FormMessage className={isMobileView ? "text-xs" : ""} />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="nome_apk"
        render={({ field }) => (
          <FormItem>
            <FormLabel className={isMobileView ? "text-xs" : ""}>Nome APK</FormLabel>
            <FormControl>
              <Input {...field} className={isMobileView ? "text-xs" : ""} />
            </FormControl>
            <FormMessage className={isMobileView ? "text-xs" : ""} />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="show_on_landing"
        render={({ field }) => (
          <FormItem className={`flex flex-row items-center justify-between rounded-lg border ${isMobileView ? "p-3" : "p-4"}`}>
            <div className="space-y-0.5">
              <FormLabel className={isMobileView ? "text-xs font-medium" : "text-base"}>
                Exibir na Landing Page
              </FormLabel>
              <FormDescription className={isMobileView ? "text-xs" : ""}>
                {isMobileView ? "Marque para aparecer na landing page" : "Marque esta opção para que o produto apareça na seção de produtos da landing page de afiliados"}
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

      {/* API Configuration */}
      <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
        <h4 className={`font-medium ${isMobileView ? "text-xs" : "text-sm"}`}>Configuração de API Externa</h4>
        
        <FormField
          control={form.control}
          name="api_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={isMobileView ? "text-xs" : ""}>URL da API</FormLabel>
              <FormControl>
                <Input {...field} placeholder="https://..." className={isMobileView ? "text-xs" : ""} />
              </FormControl>
              <FormMessage className={isMobileView ? "text-xs" : ""} />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="api_key"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={isMobileView ? "text-xs" : ""}>Chave da API</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    {...field} 
                    type={showApiKey ? "text" : "password"} 
                    placeholder="eyJhbG..." 
                    className={isMobileView ? "text-xs pr-10" : "pr-10"} 
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </FormControl>
              <FormMessage className={isMobileView ? "text-xs" : ""} />
            </FormItem>
          )}
        />
      </div>

      {/* Image uploads */}
      <div className={`grid grid-cols-2 ${isMobileView ? "gap-3" : "gap-4"}`}>
        <div className="space-y-2">
          <Label className={isMobileView ? "text-xs" : ""}>Ícone Dark</Label>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null, setIconDarkFile, setIconDarkPreview)}
              className={`flex-1 ${isMobileView ? "text-xs" : ""}`}
            />
            <Upload className={`${isMobileView ? "w-3 h-3" : "w-4 h-4"} text-muted-foreground`} />
          </div>
          {(iconDarkPreview || editingProduct?.icone_dark) && (
            <div className={`relative ${isMobileView ? "w-16 h-16" : "w-20 h-20"} bg-muted rounded border`}>
              <img 
                src={iconDarkPreview || editingProduct.icone_dark} 
                alt="Preview" 
                className="w-full h-full object-contain p-1" 
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className={isMobileView ? "text-xs" : ""}>Ícone Light</Label>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null, setIconLightFile, setIconLightPreview)}
              className={`flex-1 ${isMobileView ? "text-xs" : ""}`}
            />
            <Upload className={`${isMobileView ? "w-3 h-3" : "w-4 h-4"} text-muted-foreground`} />
          </div>
          {(iconLightPreview || editingProduct?.icone_light) && (
            <div className={`relative ${isMobileView ? "w-16 h-16" : "w-20 h-20"} bg-muted rounded border`}>
              <img 
                src={iconLightPreview || editingProduct.icone_light} 
                alt="Preview" 
                className="w-full h-full object-contain p-1" 
              />
            </div>
          )}
        </div>
      </div>

      <div className={`grid grid-cols-2 ${isMobileView ? "gap-3" : "gap-4"}`}>
        <div className="space-y-2">
          <Label className={isMobileView ? "text-xs" : ""}>Logo Dark</Label>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null, setLogoDarkFile, setLogoDarkPreview)}
              className={`flex-1 ${isMobileView ? "text-xs" : ""}`}
            />
            <Upload className={`${isMobileView ? "w-3 h-3" : "w-4 h-4"} text-muted-foreground`} />
          </div>
          {(logoDarkPreview || editingProduct?.logo_dark) && (
            <div className={`relative ${isMobileView ? "w-28 h-16" : "w-32 h-20"} bg-muted rounded border`}>
              <img 
                src={logoDarkPreview || editingProduct.logo_dark} 
                alt="Preview" 
                className="w-full h-full object-contain p-1" 
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className={isMobileView ? "text-xs" : ""}>Logo Light</Label>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null, setLogoLightFile, setLogoLightPreview)}
              className={`flex-1 ${isMobileView ? "text-xs" : ""}`}
            />
            <Upload className={`${isMobileView ? "w-3 h-3" : "w-4 h-4"} text-muted-foreground`} />
          </div>
          {(logoLightPreview || editingProduct?.logo_light) && (
            <div className={`relative ${isMobileView ? "w-28 h-16" : "w-32 h-20"} bg-muted rounded border`}>
              <img 
                src={logoLightPreview || editingProduct.logo_light} 
                alt="Preview" 
                className="w-full h-full object-contain p-1" 
              />
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Produtos</h1>
        <Button onClick={handleNewProduct} className="gap-2 border border-white">
          <Plus className="w-4 h-4" />
          Novo Produto
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products?.map((product, index) => {
            const productPlans = getPlansForProduct(product.id);

            return (
              <ScrollAnimation key={product.id} animation="fade-up" delay={index * 50}>
                <Card className="bg-card hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      {product.icone_dark && (
                        <img src={product.icone_dark} alt={product.nome} className="w-10 h-10 object-contain dark:block hidden" />
                      )}
                      {product.icone_light && (
                        <img src={product.icone_light} alt={product.nome} className="w-10 h-10 object-contain dark:hidden block" />
                      )}
                      <CardTitle className="text-lg">{product.nome}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {product.descricao && (
                      <p className="text-muted-foreground line-clamp-2 text-sm">{product.descricao}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
                      <span className="font-medium">ID:</span>
                      <code className="flex-1 truncate font-mono">{product.id}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(product.id);
                          toast({ title: "ID copiado!", description: product.id });
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    
                    {/* Status indicators */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {product.api_url && (
                        <div className="flex items-center gap-1.5 text-xs text-primary">
                          <Check className="w-3.5 h-3.5" />
                          <span>API configurada</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{productPlans.length} plano{productPlans.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditProduct(product)}
                        className="gap-2"
                      >
                        <Pencil className="w-4 h-4" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteProductMutation.mutate(product.id)}
                        className="gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Excluir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </ScrollAnimation>
            );
          })}
        </div>
      )}

      {isMobile ? (
        <Drawer open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DrawerContent className="max-h-[95vh]">
            <DrawerHeader className="text-left border-b pb-4">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/30 mb-4" />
              <div className="flex items-center justify-between">
                <DrawerTitle className="text-base">
                  {editingProduct ? "Editar Produto" : "Novo Produto"}
                </DrawerTitle>
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <X className="h-4 w-4" />
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>
            <ScrollArea className="h-[calc(95vh-140px)]">
              <div className="px-4 pb-4">
                {editingProduct ? (
                  <Tabs value={dialogTab} onValueChange={setDialogTab} className="w-full">
                    <TabsList className="grid grid-cols-2 mb-4 bg-muted/50 p-1.5 rounded-xl">
                      <TabsTrigger value="produto" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">
                        <Package className="w-3.5 h-3.5" />
                        Produto
                      </TabsTrigger>
                      <TabsTrigger value="planos" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">
                        <CreditCard className="w-3.5 h-3.5" />
                        Planos
                        {getPlansForProduct(editingProduct.id).length > 0 && (
                          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                            {getPlansForProduct(editingProduct.id).length}
                          </Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="produto" className="mt-0 data-[state=inactive]:hidden" forceMount>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                          <ProductFormFields isMobileView />
                          <div className="flex gap-2 justify-end pt-3">
                            <Button type="button" variant="outline" onClick={handleCloseDialog} className="text-xs">
                              Cancelar
                            </Button>
                            <Button type="submit" disabled={uploading} className="text-xs">
                              {uploading ? "Enviando..." : "Atualizar"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </TabsContent>

                    <TabsContent value="planos" className="mt-0 space-y-3 data-[state=inactive]:hidden" forceMount>
                      {getPlansForProduct(editingProduct.id).length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          Nenhum plano cadastrado
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {getPlansForProduct(editingProduct.id).map((plan) => (
                            <div 
                              key={plan.id} 
                              className="p-3 bg-muted/30 rounded-lg text-sm border space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <p className="font-medium truncate flex-1">{plan.name}</p>
                                <Badge variant={plan.is_active ? "default" : "secondary"} className="text-[10px]">
                                  {plan.is_active ? "Ativo" : "Inativo"}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(plan.price)}
                                {plan.features && typeof plan.features === 'object' && 'credits' in plan.features && (
                                  <span className="ml-2">• {(plan.features as any).credits} créditos</span>
                                )}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1">
                                <span className="font-medium">ID:</span>
                                <code className="flex-1 truncate font-mono">{plan.id}</code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 shrink-0"
                                  onClick={() => {
                                    navigator.clipboard.writeText(plan.id);
                                    toast({ title: "ID copiado!", description: plan.id });
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {editingProduct.api_url ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleImportPlans(editingProduct)}
                          disabled={importingProductId === editingProduct.id}
                          className="w-full gap-2"
                        >
                          {importingProductId === editingProduct.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                          {importingProductId === editingProduct.id ? "Importando..." : "Importar Planos"}
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          Configure a API na aba "Produto" para importar planos
                        </p>
                      )}
                    </TabsContent>
                  </Tabs>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                      <ProductFormFields isMobileView />
                      <div className="flex gap-2 justify-end pt-3">
                        <Button type="button" variant="outline" onClick={handleCloseDialog} className="text-xs">
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={uploading} className="text-xs">
                          {uploading ? "Enviando..." : "Criar"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </div>
            </ScrollArea>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Editar Produto" : "Novo Produto"}
              </DialogTitle>
            </DialogHeader>
            
            {editingProduct ? (
              <Tabs value={dialogTab} onValueChange={setDialogTab} className="w-full">
                <TabsList className="grid grid-cols-2 mb-4 bg-muted/50 p-1.5 rounded-xl">
                  <TabsTrigger value="produto" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">
                    <Package className="w-4 h-4" />
                    Produto
                  </TabsTrigger>
                  <TabsTrigger value="planos" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">
                    <CreditCard className="w-4 h-4" />
                    Planos
                    {getPlansForProduct(editingProduct.id).length > 0 && (
                      <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                        {getPlansForProduct(editingProduct.id).length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="produto" className="mt-0 data-[state=inactive]:hidden" forceMount>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <ProductFormFields />
                      <div className="flex gap-2 justify-end pt-4">
                        <Button type="button" variant="outline" onClick={handleCloseDialog}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={uploading}>
                          {uploading ? "Enviando..." : "Atualizar"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="planos" className="mt-0 space-y-4 data-[state=inactive]:hidden" forceMount>
                  {getPlansForProduct(editingProduct.id).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      Nenhum plano cadastrado
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {getPlansForProduct(editingProduct.id).map((plan) => (
                        <div 
                          key={plan.id} 
                          className="p-3 bg-muted/30 rounded-lg border space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate flex-1">{plan.name}</p>
                            <Badge variant={plan.is_active ? "default" : "secondary"}>
                              {plan.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(plan.price)}
                            {plan.features && typeof plan.features === 'object' && 'credits' in plan.features && (
                              <span className="ml-2">• {(plan.features as any).credits} créditos</span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
                            <span className="font-medium">ID:</span>
                            <code className="flex-1 truncate font-mono">{plan.id}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() => {
                                navigator.clipboard.writeText(plan.id);
                                toast({ title: "ID copiado!", description: plan.id });
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {editingProduct.api_url ? (
                    <Button
                      variant="outline"
                      onClick={() => handleImportPlans(editingProduct)}
                      disabled={importingProductId === editingProduct.id}
                      className="w-full gap-2"
                    >
                      {importingProductId === editingProduct.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {importingProductId === editingProduct.id ? "Importando..." : "Importar Planos"}
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Configure a API na aba "Produto" para importar planos
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <ProductFormFields />
                  <div className="flex gap-2 justify-end pt-4">
                    <Button type="button" variant="outline" onClick={handleCloseDialog}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={uploading}>
                      {uploading ? "Enviando..." : "Criar"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminProducts;
