import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ticket, Copy, ExternalLink, Check, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const Coupons = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [productFilter, setProductFilter] = useState<string>("all");

  // Fetch current user and session
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  // Fetch current user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

  // Fetch products for filter
  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

  // Fetch available admin coupons
  const { data: availableCoupons, isLoading: couponsLoading } = useQuery({
    queryKey: ["available-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*, products(nome, icone_light, icone_dark, site_landingpage)")
        .eq("is_visible_to_affiliates", true)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

  // Fetch affiliate's activated coupons
  const { data: activatedCoupons, isLoading: activatedLoading } = useQuery({
    queryKey: ["activated-coupons", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from("affiliate_coupons")
        .select(`
          *,
          coupons(*, products(nome))
        `)
        .eq("affiliate_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!profile?.id,
  });

  // Activate coupon mutation
  const activateCoupon = useMutation({
    mutationFn: async ({ couponId, customCode }: { couponId: string; customCode: string }) => {
      if (!profile?.id) throw new Error("Perfil não encontrado");

      // Get the coupon's product_id
      const { data: couponData, error: couponError } = await supabase
        .from("coupons")
        .select("product_id")
        .eq("id", couponId)
        .single();

      if (couponError) throw couponError;

      const { data, error } = await supabase
        .from("affiliate_coupons")
        .insert({
          affiliate_id: profile.id,
          coupon_id: couponId,
          custom_code: customCode,
          product_id: couponData.product_id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activated-coupons"] });
      toast({
        title: "Cupom liberado!",
        description: "Seu cupom personalizado foi criado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao liberar cupom",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    },
  });

  // Deactivate coupon mutation
  const deactivateCoupon = useMutation({
    mutationFn: async (affiliateCouponId: string) => {
      const { error } = await supabase
        .from("affiliate_coupons")
        .update({ is_active: false })
        .eq("id", affiliateCouponId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activated-coupons"] });
      toast({
        title: "Cupom inativado",
        description: "O cupom foi inativado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao inativar cupom",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    },
  });

  // Activate coupon mutation
  const reactivateCoupon = useMutation({
    mutationFn: async (affiliateCouponId: string) => {
      const { error } = await supabase
        .from("affiliate_coupons")
        .update({ is_active: true })
        .eq("id", affiliateCouponId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activated-coupons"] });
      toast({
        title: "Cupom ativado",
        description: "O cupom foi ativado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao ativar cupom",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    },
  });

  const generateCustomCode = (username: string, couponCode?: string, isPrimary?: boolean) => {
    const cleanUsername = username.toUpperCase().replace(/\s/g, "");
    // Se for cupom principal, retorna apenas o username
    if (isPrimary) {
      return cleanUsername;
    }
    // Se não for principal, concatena username + código do cupom
    return couponCode ? cleanUsername + couponCode.toUpperCase().replace(/\s/g, "") : cleanUsername;
  };

  const getAffiliateLink = (coupon: any) => {
    if (!coupon.products?.site_landingpage) return null;
    
    // Se o cupom está ativado, usa o custom_code real
    if (coupon.activatedCoupon?.custom_code) {
      return `${coupon.products.site_landingpage}/${coupon.activatedCoupon.custom_code}`;
    }
    
    // Se não está ativado mas tem username, mostra preview
    if (profile?.username) {
      const previewCode = generateCustomCode(profile.username, coupon.code, coupon.is_primary);
      return `${coupon.products.site_landingpage}/${previewCode}`;
    }
    
    return null;
  };

  const handleActivateCoupon = (couponId: string, couponCode: string, isPrimary: boolean) => {
    if (!profile?.username) {
      toast({
        title: "Erro",
        description: "Username não encontrado. Por favor, complete seu perfil.",
        variant: "destructive",
      });
      return;
    }

    const customCode = generateCustomCode(profile.username, couponCode, isPrimary);
    activateCoupon.mutate({ couponId, customCode });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "O código foi copiado para a área de transferência",
    });
  };

  const isLoading = profileLoading || couponsLoading || activatedLoading;

  // Create a map of activated coupons by coupon_id for quick lookup
  const activatedCouponsMap = new Map(
    activatedCoupons?.map(ac => [ac.coupon_id, ac]) || []
  );

  // All coupons with activation status
  const allCoupons = availableCoupons
    ?.filter(coupon => productFilter === "all" || coupon.product_id === productFilter)
    ?.map(coupon => {
      const activatedCoupon = activatedCouponsMap.get(coupon.id);
      return {
        ...coupon,
        activatedCoupon,
      };
    })
    ?.sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return 0;
    }) || [];

  // Group coupons by product when "all" is selected
  const groupedByProduct = productFilter === "all" 
    ? allCoupons.reduce((acc, coupon) => {
        const productName = coupon.products?.nome || "Sem produto";
        const productKey = `${productName}|${coupon.products?.icone_light || ''}|${coupon.products?.icone_dark || ''}`;
        if (!acc[productKey]) {
          acc[productKey] = {
            name: productName,
            iconLight: coupon.products?.icone_light,
            iconDark: coupon.products?.icone_dark,
            coupons: []
          };
        }
        acc[productKey].coupons.push(coupon);
        return acc;
      }, {} as Record<string, { name: string; iconLight?: string; iconDark?: string; coupons: typeof allCoupons }>)
    : null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Cupons e Links</h1>
          <p className="text-muted-foreground">
            Gerencie seus cupons de desconto e links de afiliado
          </p>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Cupons e Links</h1>
        <p className="text-muted-foreground">
          Gerencie seus cupons de desconto e links de afiliado
        </p>
      </div>

      {/* All Coupons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Cupons e Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filtrar por produto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os produtos</SelectItem>
                {products?.map(product => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {allCoupons.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Ticket className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum cupom disponível</p>
            </div>
          ) : productFilter === "all" && groupedByProduct ? (
            <div className="space-y-8">
              {Object.entries(groupedByProduct).map(([productKey, productData]) => (
                <div key={productKey}>
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
                  <div className="space-y-4">
                    {productData.coupons.map((coupon) => {
                      const isActivated = !!coupon.activatedCoupon;
                      const isActive = coupon.activatedCoupon?.is_active;
                      const customCode = profile?.username 
                        ? generateCustomCode(profile.username, coupon.code, coupon.is_primary || false)
                        : "";

                      return (
                        <div
                          key={coupon.id}
                          className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                            isActivated && !isActive 
                              ? "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800" 
                              : "hover:bg-accent/50"
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{coupon.name}</h3>
                              {coupon.is_primary && (
                                <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
                                  Principal
                                </Badge>
                              )}
                              <Badge variant="outline">
                              {coupon.type === "percentage" && `${coupon.value}% OFF`}
                              {coupon.type === "days" && `${coupon.value} dias`}
                              {coupon.type === "free_trial" && `${coupon.value} dias grátis`}
                            </Badge>
                            {isActivated && isActive && (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                                Ativo
                              </Badge>
                            )}
                            {isActivated && !isActive && (
                              <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">
                                Inativo
                              </Badge>
                            )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {coupon.description || "Sem descrição"}
                            </p>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                {isActivated ? (
                                  <code className="text-lg font-mono font-bold bg-primary/10 px-3 py-1.5 rounded">
                                    {coupon.activatedCoupon?.custom_code}
                                  </code>
                                ) : (
                                  <>
                                    <span className="text-xs text-muted-foreground">
                                      Seu cupom será:
                                    </span>
                                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                      {customCode}
                                    </code>
                                  </>
                                )}
                              </div>
                              {getAffiliateLink(coupon) && isActive && (
                                <div className="text-xs text-muted-foreground">
                                  <span className="font-semibold">Link: </span>
                                  <code className="bg-muted px-2 py-1 rounded">
                                    {getAffiliateLink(coupon)}
                                  </code>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isActivated ? (
                              <>
                              {isActive && (
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCopy(coupon.activatedCoupon?.custom_code || generateCustomCode(profile?.username || "", coupon.code, coupon.is_primary))}
                                  >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copiar Cupom
                                  </Button>
                                  {getAffiliateLink(coupon) && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCopy(getAffiliateLink(coupon) || "")}
                                        disabled={!coupon.activatedCoupon}
                                      >
                                        <Copy className="h-4 w-4 mr-2" />
                                        Copiar Link
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(getAffiliateLink(coupon) || "", '_blank')}
                                        disabled={!coupon.activatedCoupon}
                                      >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Abrir Link
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}
                                {isActive ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deactivateCoupon.mutate(coupon.activatedCoupon?.id || "")}
                                    disabled={deactivateCoupon.isPending}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Inativar
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-green-50 text-green-700 border-green-300 hover:bg-green-100 dark:bg-green-950 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900"
                                    onClick={() => reactivateCoupon.mutate(coupon.activatedCoupon?.id || "")}
                                    disabled={reactivateCoupon.isPending}
                                  >
                                    <Check className="h-4 w-4 mr-2" />
                                    Ativar
                                  </Button>
                                )}
                              </>
                            ) : (
                              <Button
                                onClick={() => handleActivateCoupon(coupon.id, coupon.code, coupon.is_primary || false)}
                                disabled={activateCoupon.isPending || !profile?.username}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Liberar Cupom
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {allCoupons.map((coupon) => {
                const isActivated = !!coupon.activatedCoupon;
                const isActive = coupon.activatedCoupon?.is_active;
                const customCode = profile?.username 
                  ? generateCustomCode(profile.username, coupon.code, coupon.is_primary || false)
                  : "";

                return (
                  <div
                    key={coupon.id}
                    className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                      isActivated && !isActive 
                        ? "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800" 
                        : "hover:bg-accent/50"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{coupon.name}</h3>
                        {coupon.is_primary && (
                          <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
                            Principal
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {coupon.type === "percentage" && `${coupon.value}% OFF`}
                          {coupon.type === "days" && `${coupon.value} dias`}
                          {coupon.type === "free_trial" && `${coupon.value} dias grátis`}
                        </Badge>
                        {coupon.products && (
                          <Badge variant="secondary">{coupon.products.nome}</Badge>
                        )}
                        {isActivated && isActive && (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                            Ativo
                          </Badge>
                        )}
                        {isActivated && !isActive && (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">
                            Inativo
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {coupon.description || "Sem descrição"}
                      </p>
                       <div className="space-y-2">
                         <div className="flex items-center gap-2">
                           {isActivated ? (
                             <code className="text-lg font-mono font-bold bg-primary/10 px-3 py-1.5 rounded">
                               {coupon.activatedCoupon?.custom_code}
                             </code>
                           ) : (
                             <>
                               <span className="text-xs text-muted-foreground">
                                 Seu cupom será:
                               </span>
                               <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                 {customCode}
                               </code>
                             </>
                           )}
                         </div>
                         {getAffiliateLink(coupon) && isActive && (
                           <div className="text-xs text-muted-foreground">
                             <span className="font-semibold">Link: </span>
                             <code className="bg-muted px-2 py-1 rounded">
                               {getAffiliateLink(coupon)}
                             </code>
                           </div>
                         )}
                       </div>
                    </div>
                     <div className="flex items-center gap-2">
                       {isActivated ? (
                         <>
                         {isActive && (
                           <div className="flex flex-wrap gap-2">
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => handleCopy(coupon.activatedCoupon?.custom_code || generateCustomCode(profile?.username || "", coupon.code, coupon.is_primary))}
                             >
                               <Copy className="h-4 w-4 mr-2" />
                               Copiar Cupom
                             </Button>
                             {getAffiliateLink(coupon) && (
                               <>
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   onClick={() => handleCopy(getAffiliateLink(coupon) || "")}
                                   disabled={!coupon.activatedCoupon}
                                 >
                                   <Copy className="h-4 w-4 mr-2" />
                                   Copiar Link
                                 </Button>
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   onClick={() => window.open(getAffiliateLink(coupon) || "", '_blank')}
                                   disabled={!coupon.activatedCoupon}
                                 >
                                   <ExternalLink className="h-4 w-4 mr-2" />
                                   Abrir Link
                                 </Button>
                                </>
                              )}
                            </div>
                         )}
                           {isActive ? (
                             <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deactivateCoupon.mutate(coupon.activatedCoupon?.id || "")}
                              disabled={deactivateCoupon.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Inativar
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-green-50 text-green-700 border-green-300 hover:bg-green-100 dark:bg-green-950 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900"
                              onClick={() => reactivateCoupon.mutate(coupon.activatedCoupon?.id || "")}
                              disabled={reactivateCoupon.isPending}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Ativar
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          onClick={() => handleActivateCoupon(coupon.id, coupon.code, coupon.is_primary || false)}
                          disabled={activateCoupon.isPending || !profile?.username}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Liberar Cupom
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default Coupons;
