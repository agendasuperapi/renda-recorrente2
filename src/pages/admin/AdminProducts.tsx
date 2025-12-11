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
import { Plus, Pencil, Trash2, Upload, X, Copy } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollAnimation } from "@/components/ScrollAnimation";

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
});

type ProductFormData = z.infer<typeof productSchema>;

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
        .update(data)
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

      // Upload images if files are selected
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
            {products?.map((product, index) => (
              <ScrollAnimation key={product.id} animation="fade-up" delay={index * 50}>
              <Card className="bg-card hover:shadow-md transition-shadow">
                <CardHeader>
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
                <CardContent>
                  <div className="space-y-3">
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
                    {(product.logo_dark || product.logo_light) && (
                      <div className="flex justify-center py-2 bg-muted/30 rounded">
                        {product.logo_dark && (
                          <img src={product.logo_dark} alt={`${product.nome} logo`} className="h-12 object-contain dark:block hidden" />
                        )}
                        {product.logo_light && (
                          <img src={product.logo_light} alt={`${product.nome} logo`} className="h-12 object-contain dark:hidden block" />
                        )}
                      </div>
                    )}
                    {product.descricao && (
                      <p className="text-muted-foreground line-clamp-2 text-sm">{product.descricao}</p>
                    )}
                    <div className="space-y-1 text-sm">
                      {product.telefone && (
                        <p><span className="font-medium">Telefone:</span> {product.telefone}</p>
                      )}
                      {product.email && (
                        <p><span className="font-medium">Email:</span> {product.email}</p>
                      )}
                      {product.site && (
                        <p><span className="font-medium">Site:</span> {product.site}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
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
            ))}
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
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                      <FormField
                        control={form.control}
                        name="nome"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Nome *</FormLabel>
                            <FormControl>
                              <Input {...field} className="text-xs" />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="descricao"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Descrição</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={3} className="text-xs" />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name="telefone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Telefone</FormLabel>
                              <FormControl>
                                <Input {...field} className="text-xs" />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Email</FormLabel>
                              <FormControl>
                                <Input type="email" {...field} className="text-xs" />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="texto_telefone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Texto Telefone</FormLabel>
                            <FormControl>
                              <Input {...field} className="text-xs" />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="site"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Site</FormLabel>
                            <FormControl>
                              <Input {...field} className="text-xs" />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="site_landingpage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Site Landing Page</FormLabel>
                            <FormControl>
                              <Input {...field} className="text-xs" />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="nome_apk"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Nome APK</FormLabel>
                            <FormControl>
                              <Input {...field} className="text-xs" />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="show_on_landing"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-xs font-medium">
                                Exibir na Landing Page
                              </FormLabel>
                              <FormDescription className="text-xs">
                                Marque para aparecer na landing page de afiliados
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

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Ícone Dark</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileChange(e.target.files?.[0] || null, setIconDarkFile, setIconDarkPreview)}
                              className="flex-1 text-xs"
                            />
                            <Upload className="w-3 h-3 text-muted-foreground" />
                          </div>
                          {(iconDarkPreview || editingProduct?.icone_dark) && (
                            <div className="relative w-16 h-16 bg-muted rounded border">
                              <img 
                                src={iconDarkPreview || editingProduct.icone_dark} 
                                alt="Preview" 
                                className="w-full h-full object-contain p-1" 
                              />
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Ícone Light</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileChange(e.target.files?.[0] || null, setIconLightFile, setIconLightPreview)}
                              className="flex-1 text-xs"
                            />
                            <Upload className="w-3 h-3 text-muted-foreground" />
                          </div>
                          {(iconLightPreview || editingProduct?.icone_light) && (
                            <div className="relative w-16 h-16 bg-muted rounded border">
                              <img 
                                src={iconLightPreview || editingProduct.icone_light} 
                                alt="Preview" 
                                className="w-full h-full object-contain p-1" 
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Logo Dark</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileChange(e.target.files?.[0] || null, setLogoDarkFile, setLogoDarkPreview)}
                              className="flex-1 text-xs"
                            />
                            <Upload className="w-3 h-3 text-muted-foreground" />
                          </div>
                          {(logoDarkPreview || editingProduct?.logo_dark) && (
                            <div className="relative w-28 h-16 bg-muted rounded border">
                              <img 
                                src={logoDarkPreview || editingProduct.logo_dark} 
                                alt="Preview" 
                                className="w-full h-full object-contain p-1" 
                              />
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Logo Light</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileChange(e.target.files?.[0] || null, setLogoLightFile, setLogoLightPreview)}
                              className="flex-1 text-xs"
                            />
                            <Upload className="w-3 h-3 text-muted-foreground" />
                          </div>
                          {(logoLightPreview || editingProduct?.logo_light) && (
                            <div className="relative w-28 h-16 bg-muted rounded border">
                              <img 
                                src={logoLightPreview || editingProduct.logo_light} 
                                alt="Preview" 
                                className="w-full h-full object-contain p-1" 
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-3">
                        <Button type="button" variant="outline" onClick={handleCloseDialog} className="text-xs">
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={uploading} className="text-xs">
                          {uploading ? "Enviando..." : editingProduct ? "Atualizar" : "Criar"}
                        </Button>
                      </div>
                    </form>
                  </Form>
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
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="telefone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="texto_telefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Texto Telefone</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="site"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Site</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="site_landingpage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Site Landing Page</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nome_apk"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome APK</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="show_on_landing"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Exibir na Landing Page
                          </FormLabel>
                          <FormDescription>
                            Marque esta opção para que o produto apareça na seção de produtos da landing page de afiliados
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ícone Dark</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e.target.files?.[0] || null, setIconDarkFile, setIconDarkPreview)}
                          className="flex-1"
                        />
                        <Upload className="w-4 h-4 text-muted-foreground" />
                      </div>
                      {(iconDarkPreview || editingProduct?.icone_dark) && (
                        <div className="relative w-20 h-20 bg-muted rounded border">
                          <img 
                            src={iconDarkPreview || editingProduct.icone_dark} 
                            alt="Preview" 
                            className="w-full h-full object-contain p-1" 
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Ícone Light</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e.target.files?.[0] || null, setIconLightFile, setIconLightPreview)}
                          className="flex-1"
                        />
                        <Upload className="w-4 h-4 text-muted-foreground" />
                      </div>
                      {(iconLightPreview || editingProduct?.icone_light) && (
                        <div className="relative w-20 h-20 bg-muted rounded border">
                          <img 
                            src={iconLightPreview || editingProduct.icone_light} 
                            alt="Preview" 
                            className="w-full h-full object-contain p-1" 
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Logo Dark</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e.target.files?.[0] || null, setLogoDarkFile, setLogoDarkPreview)}
                          className="flex-1"
                        />
                        <Upload className="w-4 h-4 text-muted-foreground" />
                      </div>
                      {(logoDarkPreview || editingProduct?.logo_dark) && (
                        <div className="relative w-32 h-20 bg-muted rounded border">
                          <img 
                            src={logoDarkPreview || editingProduct.logo_dark} 
                            alt="Preview" 
                            className="w-full h-full object-contain p-1" 
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Logo Light</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e.target.files?.[0] || null, setLogoLightFile, setLogoLightPreview)}
                          className="flex-1"
                        />
                        <Upload className="w-4 h-4 text-muted-foreground" />
                      </div>
                      {(logoLightPreview || editingProduct?.logo_light) && (
                        <div className="relative w-32 h-20 bg-muted rounded border">
                          <img 
                            src={logoLightPreview || editingProduct.logo_light} 
                            alt="Preview" 
                            className="w-full h-full object-contain p-1" 
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-4">
                    <Button type="button" variant="outline" onClick={handleCloseDialog}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={uploading}>
                      {uploading ? "Enviando..." : editingProduct ? "Atualizar" : "Criar"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>
  );
};

export default AdminProducts;
