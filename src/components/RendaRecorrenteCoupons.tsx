import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Check, XCircle, Eye, LayoutGrid, LayoutList, Share2, AlertTriangle, X, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollAnimation } from "@/components/ScrollAnimation";
import { logActivity } from "@/lib/activityLogger";
interface AvailableCoupon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: string;
  value: number;
  is_active: boolean;
  valid_until: string | null;
  product_id: string;
  is_primary: boolean | null;
  max_uses: number | null;
  current_uses: number | null;
  created_at: string;
  products: {
    nome: string;
    icone_light: string | null;
    icone_dark: string | null;
    site_landingpage: string | null;
  } | null;
  activatedCoupon?: any;
}
interface CouponDetailsContentProps {
  coupon: AvailableCoupon;
  profile: {
    id: string;
    username: string | null;
  } | undefined;
  generateCustomCode: (username: string, baseCode: string, isPrimary: boolean) => string;
  getAffiliateLink: (coupon: AvailableCoupon) => string | null;
  handleCopy: (text: string) => void;
  handleActivateCoupon: (couponId: string, baseCode: string, isPrimary: boolean, productId: string) => void;
  handleDeactivateClick: (couponId: string) => void;
  reactivateCoupon: any;
  activateCoupon: any;
  setDetailsOpen: (open: boolean) => void;
  isPendingDeactivate: boolean;
}
const CouponDetailsContent = ({
  coupon,
  profile,
  generateCustomCode,
  getAffiliateLink,
  handleCopy,
  handleActivateCoupon,
  handleDeactivateClick,
  reactivateCoupon,
  activateCoupon,
  setDetailsOpen,
  isPendingDeactivate
}: CouponDetailsContentProps) => <div className="px-4 pb-6 space-y-4">
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 items-center">
        <h3 className="font-semibold text-lg">{coupon.name}</h3>
        {coupon.is_primary && <Badge className="bg-yellow-500 text-white">Principal</Badge>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">
          {coupon.type === "percentage" && `${coupon.value}%`}
          {coupon.type === "days" && `${coupon.value} dias`}
          {coupon.type === "free_trial" && `${coupon.value} dias grátis`}
        </Badge>
        {coupon.products && <Badge variant="secondary">{coupon.products.nome}</Badge>}
        {coupon.activatedCoupon?.is_active && <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 dark:border dark:border-green-500/50">Ativo</Badge>}
        {coupon.activatedCoupon && !coupon.activatedCoupon.is_active && <Badge className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 dark:border dark:border-red-500/50">Inativo</Badge>}
      </div>
    </div>

    <p className="text-sm text-muted-foreground">
      {coupon.description || "Sem descrição"}
    </p>

    <div className="space-y-3">
      <div>
        <span className="text-sm text-muted-foreground block mb-1">Seu cupom:</span>
        <code className="text-lg font-mono font-bold bg-primary/10 px-3 py-2 rounded block">
          {coupon.activatedCoupon?.custom_code || generateCustomCode(profile?.username || "", coupon.code, coupon.is_primary || false)}
        </code>
      </div>

      {getAffiliateLink(coupon) && coupon.activatedCoupon?.is_active && <div>
        <span className="text-sm text-muted-foreground block mb-1">Link de afiliado:</span>
        <code className="text-sm bg-muted px-3 py-2 rounded block break-all">
          {getAffiliateLink(coupon)}
        </code>
      </div>}
    </div>

    <div className="flex flex-wrap gap-2 pt-2">
      {coupon.activatedCoupon ? <>
        {coupon.activatedCoupon.is_active && <>
          <Button variant="outline" className="flex-1" onClick={() => handleCopy(coupon.activatedCoupon?.custom_code || "")}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar Cupom
          </Button>
          {getAffiliateLink(coupon) && <>
            <Button variant="outline" className="flex-1" onClick={() => handleCopy(getAffiliateLink(coupon) || "")}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar Link
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => window.open(getAffiliateLink(coupon) || "", '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir link
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => {
            const link = getAffiliateLink(coupon) || "";
            if (navigator.share) {
              navigator.share({
                title: `Cupom ${coupon.activatedCoupon?.custom_code}`,
                text: `Use meu cupom de desconto!`,
                url: link
              });
            } else {
              handleCopy(link);
            }
          }}>
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar
            </Button>
          </>}
        </>}
        {coupon.activatedCoupon.is_active ? <Button variant="outline" className="w-full bg-red-50 text-red-700 border-red-300 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/50 dark:hover:bg-red-500/30" onClick={() => {
        handleDeactivateClick(coupon.activatedCoupon?.id || "");
      }} disabled={isPendingDeactivate}>
          <XCircle className="h-4 w-4 mr-2" />
          Inativar Cupom
        </Button> : <Button variant="outline" className="w-full bg-green-50 text-green-700 border-green-300 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/50 dark:hover:bg-green-500/30" onClick={() => {
        reactivateCoupon.mutate(coupon.activatedCoupon?.id || "");
        setDetailsOpen(false);
      }} disabled={reactivateCoupon.isPending}>
          <Check className="h-4 w-4 mr-2" />
          Ativar Cupom
        </Button>}
      </> : <Button className="w-full" onClick={() => {
      handleActivateCoupon(coupon.id, coupon.code, coupon.is_primary || false, coupon.product_id);
      setDetailsOpen(false);
    }} disabled={activateCoupon.isPending || !profile?.username}>
        <Check className="h-4 w-4 mr-2" />
        Liberar Cupom
      </Button>}
    </div>
  </div>;
const RENDA_PRODUCT_ID = "bb582482-b006-47b8-b6ea-a6944d8cfdfd";
export const RendaRecorrenteCoupons = () => {
  const isMobile = useIsMobile();
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const [layoutMode, setLayoutMode] = useState<string>("compact");
  const [selectedCoupon, setSelectedCoupon] = useState<AvailableCoupon | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);
  const [couponToDeactivate, setCouponToDeactivate] = useState<string | null>(null);
  const {
    userId
  } = useAuth();

  // Fetch current user profile
  const {
    data: profile,
    isLoading: profileLoading
  } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) throw new Error("Usuário não autenticado");
      const {
        data,
        error
      } = await supabase.from("profiles").select("id, username").eq("id", userId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });

  // Fetch available admin coupons using RPC function - filtered to RENDA product
  const {
    data: availableCoupons,
    isLoading: couponsLoading
  } = useQuery<AvailableCoupon[]>({
    queryKey: ["available-coupons-renda", userId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.rpc("get_available_coupons_for_affiliates" as any);
      if (error) throw error;

      // Transform and filter to only RENDA product
      return (data as any[])?.filter((coupon: any) => coupon.product_id === RENDA_PRODUCT_ID).map((coupon: any) => ({
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        is_active: coupon.is_active,
        valid_until: coupon.valid_until,
        product_id: coupon.product_id,
        is_primary: coupon.is_primary,
        max_uses: coupon.max_uses,
        current_uses: coupon.current_uses,
        created_at: coupon.created_at,
        products: {
          nome: coupon.product_nome,
          icone_light: coupon.product_icone_light,
          icone_dark: coupon.product_icone_dark,
          site_landingpage: coupon.product_site_landingpage
        }
      })) || [];
    },
    enabled: !!userId
  });

  // Fetch affiliate's activated coupons - filtered to RENDA product
  const {
    data: activatedCoupons,
    isLoading: activatedLoading
  } = useQuery({
    queryKey: ["activated-coupons-renda", userId],
    queryFn: async () => {
      if (!userId) return [];
      const {
        data,
        error
      } = await supabase.from("affiliate_coupons").select(`
          *,
          coupons(*, products(nome))
        `).eq("affiliate_id", userId).eq("product_id", RENDA_PRODUCT_ID).filter("deleted_at", "is", null).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!userId
  });

  // Fetch affiliate's current subscription/plan
  const {
    data: affiliateSubscription
  } = useQuery({
    queryKey: ["affiliate-subscription", userId],
    queryFn: async () => {
      if (!userId) return null;
      const {
        data,
        error
      } = await supabase.from("subscriptions").select("plan_id, status, plans(name, is_free)").eq("user_id", userId).in("status", ["active", "trialing"]).order("created_at", {
        ascending: false
      }).limit(1).maybeSingle();
      if (error) {
        console.error("Error fetching subscription:", error);
        return null;
      }
      return data;
    },
    enabled: !!userId
  });

  // Check if plan name contains "PRO" (case insensitive)
  const planName = (affiliateSubscription?.plans as any)?.name || "";
  const isProPlan = planName.toUpperCase().includes("PRO");

  // Fetch minimum sales setting for Renda product
  const {
    data: minSalesSetting
  } = useQuery({
    queryKey: ["min-sales-renda-setting"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("app_settings").select("value").eq("key", "min_sales_for_renda_coupons").single();
      if (error) {
        console.log("No setting found, using default");
        return {
          value: "10"
        };
      }
      return data;
    }
  });

  // Count affiliate's sales from other products (commissions with status available or paid)
  const {
    data: otherProductsSalesCount
  } = useQuery({
    queryKey: ["other-products-sales", userId],
    queryFn: async () => {
      if (!userId) return 0;
      const {
        count,
        error
      } = await supabase.from("commissions").select("id", {
        count: "exact",
        head: true
      }).eq("affiliate_id", userId).neq("product_id", RENDA_PRODUCT_ID).in("status", ["available", "paid"]);
      if (error) {
        console.error("Error counting sales:", error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!userId
  });
  const minSalesRequired = parseInt(minSalesSetting?.value || "10", 10);
  const hasEnoughSales = (otherProductsSalesCount || 0) >= minSalesRequired;
  const salesNeeded = minSalesRequired - (otherProductsSalesCount || 0);
  const canUnlockRendaCoupons = isProPlan && hasEnoughSales;

  // Activate coupon mutation
  const activateCoupon = useMutation({
    mutationFn: async ({
      couponId,
      customCode,
      productId,
      couponCode
    }: {
      couponId: string;
      customCode: string;
      productId: string;
      couponCode: string;
    }) => {
      if (!profile?.id) throw new Error("Perfil não encontrado");
      const {
        data,
        error
      } = await supabase.from("affiliate_coupons").insert({
        affiliate_id: profile.id,
        coupon_id: couponId,
        custom_code: customCode,
        product_id: productId,
        is_active: true,
        username_at_creation: profile.username,
        coupon_code_at_creation: couponCode,
        custom_code_history: customCode
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["activated-coupons-renda", userId]
      });
      toast({
        title: "Cupom liberado!",
        description: "Seu cupom personalizado foi criado com sucesso"
      });
      if (userId) {
        logActivity({
          userId,
          activityType: 'coupon_activated',
          description: `Cupom ${variables.customCode} ativado`,
          category: 'coupon',
          metadata: {
            coupon_id: variables.couponId,
            custom_code: variables.customCode,
            product_id: variables.productId
          }
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao liberar cupom",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  });

  // Deactivate coupon mutation
  const deactivateCoupon = useMutation({
    mutationFn: async (affiliateCouponId: string) => {
      const {
        error
      } = await supabase.from("affiliate_coupons").update({
        is_active: false
      }).eq("id", affiliateCouponId);
      if (error) throw error;
    },
    onSuccess: (_, affiliateCouponId) => {
      queryClient.invalidateQueries({
        queryKey: ["activated-coupons-renda", userId]
      });
      toast({
        title: "Cupom inativado",
        description: "O cupom foi inativado com sucesso"
      });
      if (userId) {
        logActivity({
          userId,
          activityType: 'coupon_deactivated',
          description: 'Cupom inativado',
          category: 'coupon',
          metadata: {
            affiliate_coupon_id: affiliateCouponId
          }
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao inativar cupom",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  });

  // Reactivate coupon mutation
  const reactivateCoupon = useMutation({
    mutationFn: async (affiliateCouponId: string) => {
      const {
        error
      } = await supabase.from("affiliate_coupons").update({
        is_active: true
      }).eq("id", affiliateCouponId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["activated-coupons-renda", userId]
      });
      toast({
        title: "Cupom ativado",
        description: "O cupom foi ativado com sucesso"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao ativar cupom",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  });
  const generateCustomCode = (username: string, couponCode?: string, isPrimary?: boolean) => {
    const cleanUsername = username.toUpperCase().replace(/\s/g, "");
    if (isPrimary) return cleanUsername;
    return couponCode ? cleanUsername + couponCode.toUpperCase().replace(/\s/g, "") : cleanUsername;
  };
  const getAffiliateLink = (coupon: any) => {
    if (!coupon.products?.site_landingpage) return null;
    const customCode = coupon.activatedCoupon?.custom_code || generateCustomCode(profile?.username || "", coupon.code, coupon.is_primary || false);
    const baseUrl = coupon.products.site_landingpage.replace(/\/$/, "");
    return `${baseUrl}/${customCode}`;
  };
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copiado!",
        description: "Texto copiado para a área de transferência"
      });
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o texto",
        variant: "destructive"
      });
    }
  };
  const handleActivateCoupon = (couponId: string, baseCode: string, isPrimary: boolean, productId: string) => {
    if (!profile?.username) {
      toast({
        title: "Username necessário",
        description: "Configure seu username antes de ativar cupons",
        variant: "destructive"
      });
      return;
    }
    const customCode = generateCustomCode(profile.username, baseCode, isPrimary);
    activateCoupon.mutate({
      couponId,
      customCode,
      productId,
      couponCode: baseCode
    });
  };
  const handleDeactivateClick = (couponId: string) => {
    setCouponToDeactivate(couponId);
    setDeactivateConfirmOpen(true);
  };
  const handleConfirmDeactivate = () => {
    if (couponToDeactivate) {
      deactivateCoupon.mutate(couponToDeactivate);
      setDeactivateConfirmOpen(false);
      setCouponToDeactivate(null);
      setDetailsOpen(false);
    }
  };

  // Merge available coupons with activated coupons
  const couponsWithStatus = availableCoupons?.map(coupon => {
    const activated = activatedCoupons?.find(ac => ac.coupon_id === coupon.id);
    return {
      ...coupon,
      activatedCoupon: activated
    };
  }) || [];
  const isLoading = profileLoading || couponsLoading || activatedLoading;
  if (isLoading) {
    return <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>;
  }
  const productData = couponsWithStatus.length > 0 ? {
    name: couponsWithStatus[0].products?.nome || "APP Renda recorrente",
    iconLight: couponsWithStatus[0].products?.icone_light,
    iconDark: couponsWithStatus[0].products?.icone_dark,
    coupons: couponsWithStatus
  } : null;
  if (!productData || productData.coupons.length === 0) {
    return <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Nenhum cupom disponível para este produto.
        </CardContent>
      </Card>;
  }
  return <div className="space-y-4">
      <Card className="border-0 shadow-none bg-transparent lg:border lg:shadow-sm lg:bg-card">
        <CardContent className="p-0 md:p-0 lg:p-6">
          {/* Layout Toggle */}
          <div className="flex justify-end mb-4">
            <ToggleGroup type="single" value={layoutMode} onValueChange={value => value && setLayoutMode(value)}>
              <ToggleGroupItem value="full" aria-label="Layout completo">
                <LayoutList className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="cards" aria-label="Layout compacto">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex items-center gap-3 mb-4 pb-2 border-b">
            {(productData.iconLight || productData.iconDark) && <img src={productData.iconLight || productData.iconDark || ''} alt={productData.name} className="w-10 h-10 rounded-full object-cover border-2 border-border" />}
            <h3 className="text-lg font-semibold text-foreground">{productData.name}</h3>
            <Badge variant="outline" className="ml-auto">
              {productData.coupons.length} {productData.coupons.length === 1 ? 'cupom' : 'cupons'}
            </Badge>
          </div>

          {/* Coupons List */}
          {layoutMode === "cards" ? <div className="space-y-3">
              {productData.coupons.map((coupon, couponIndex) => {
            const isActivated = !!coupon.activatedCoupon;
            const isActive = coupon.activatedCoupon?.is_active;
            const customCode = profile?.username ? generateCustomCode(profile.username, coupon.code, coupon.is_primary || false) : "";
            return <ScrollAnimation key={coupon.id} animation="fade-up" delay={couponIndex * 50} threshold={0.05}>
                    <div className={`p-3 border rounded-lg bg-card transition-all duration-300 hover:shadow-md cursor-pointer flex items-center gap-3 ${isActivated && !isActive ? "border-red-300 bg-red-50 dark:border-red-500 dark:bg-transparent" : ""} ${!isActivated ? "border-orange-400 bg-orange-50 dark:border-orange-500 dark:bg-transparent" : ""}`} onClick={() => {
                setSelectedCoupon(coupon);
                setDetailsOpen(true);
              }}>
                      <div className="flex-1 space-y-2 min-w-0">
                        {/* Linha 1: Nome */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm">{coupon.name}</span>
                        </div>
                        
                        {/* Linha 2: Badges de status */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isActivated ? <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 dark:border dark:border-green-500/50 text-[10px]">Liberado</Badge> : <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 dark:border dark:border-orange-500/50 text-[10px]">Não Liberado</Badge>}
                          {isActivated && isActive && <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 dark:border dark:border-green-500/50 text-[10px]">Ativo</Badge>}
                          {isActivated && !isActive && <Badge className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 dark:border dark:border-red-500/50 text-[10px]">Inativo</Badge>}
                        </div>
                        
                        {/* Linha 3: Código */}
                        <code className="text-xs font-mono text-muted-foreground truncate block bg-muted/50 rounded px-2 py-1">
                          {isActivated ? coupon.activatedCoupon?.custom_code : customCode}
                        </code>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                        <Eye className="h-5 w-5" />
                        <span className="hidden md:inline text-sm">Ver detalhes</span>
                      </div>
                    </div>
                  </ScrollAnimation>;
          })}
            </div> : isMobile ? <div className="space-y-4">
              {productData.coupons.map((coupon, couponIndex) => {
            const isActivated = !!coupon.activatedCoupon;
            const isActive = coupon.activatedCoupon?.is_active;
            const customCode = profile?.username ? generateCustomCode(profile.username, coupon.code, coupon.is_primary || false) : "";
            const affiliateLink = getAffiliateLink(coupon);
            return <ScrollAnimation key={coupon.id} animation="fade-up" delay={couponIndex * 50} threshold={0.05}>
                    <div className={`p-4 border rounded-lg transition-all duration-300 ${isActivated && !isActive ? "bg-red-50 border-red-300 dark:border-red-500 dark:bg-transparent" : ""} ${!isActivated ? "bg-orange-50 border-orange-400 dark:border-orange-500 dark:bg-transparent" : ""}`}>
                      {/* Header: Nome + Badges */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-base">{coupon.name}</h3>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {coupon.is_primary && <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs">Principal</Badge>}
                          <Badge variant="outline" className="text-xs">
                            {coupon.type === "percentage" && `${coupon.value}%`}
                            {coupon.type === "days" && `${coupon.value}d`}
                            {coupon.type === "free_trial" && `${coupon.value}d`}
                          </Badge>
                          {isActivated ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 dark:border dark:border-green-500/50 text-xs">Liberado</Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 dark:border dark:border-orange-500/50 text-xs">Não Liberado</Badge>
                          )}
                          {isActivated && isActive && <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 dark:border dark:border-green-500/50 text-xs">Ativo</Badge>}
                          {isActivated && !isActive && <Badge className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 dark:border dark:border-red-500/50 text-xs">Inativo</Badge>}
                        </div>
                      </div>
                      
                      {/* Descrição */}
                      <p className="text-sm text-muted-foreground mb-3">
                        {coupon.description || "Sem descrição"}
                      </p>
                      
                      {/* Código */}
                      <div className="mb-2">
                        <code className="text-base font-mono font-bold bg-muted px-3 py-2 rounded block">
                          {isActivated ? coupon.activatedCoupon?.custom_code : customCode}
                        </code>
                      </div>
                      
                      {/* Link */}
                      {affiliateLink && isActive && (
                        <div className="text-sm text-muted-foreground mb-4">
                          <span className="font-medium">Link: </span>
                          <code className="bg-muted px-2 py-1 rounded text-xs break-all">{affiliateLink}</code>
                        </div>
                      )}
                      
                      {/* Botões 2x2 */}
                      {isActivated ? (
                        isActive ? (
                          <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" className="w-full" onClick={() => handleCopy(coupon.activatedCoupon?.custom_code || customCode)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Cupom
                            </Button>
                            {affiliateLink && (
                              <Button variant="outline" size="sm" className="w-full" onClick={() => handleCopy(affiliateLink)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Link
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="w-full" onClick={() => {
                              const link = affiliateLink || "";
                              const code = coupon.activatedCoupon?.custom_code || customCode;
                              const text = `Use meu cupom ${code} e aproveite o desconto! ${link}`;
                              if (navigator.share) {
                                navigator.share({ title: coupon.name, text, url: link });
                              } else {
                                handleCopy(text);
                              }
                            }}>
                              <Share2 className="h-4 w-4 mr-2" />
                              Compartilhar
                            </Button>
                            <Button variant="outline" size="sm" className="w-full" onClick={() => handleDeactivateClick(coupon.activatedCoupon?.id || "")} disabled={deactivateCoupon.isPending}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Inativar
                            </Button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" className="w-full bg-green-50 text-green-700 border-green-300 hover:bg-green-100 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/50 dark:hover:bg-green-500/30" onClick={() => reactivateCoupon.mutate(coupon.activatedCoupon?.id || "")} disabled={reactivateCoupon.isPending}>
                            <Check className="h-4 w-4 mr-2" />
                            Ativar
                          </Button>
                        )
                      ) : (
                        <Button className="w-full" onClick={() => handleActivateCoupon(coupon.id, coupon.code, coupon.is_primary || false, coupon.product_id)} disabled={activateCoupon.isPending || !profile?.username}>
                          <Check className="h-4 w-4 mr-2" />
                          Liberar Cupom
                        </Button>
                      )}
                    </div>
                  </ScrollAnimation>;
          })}
            </div> : <div className="space-y-4">
              {productData.coupons.map((coupon, couponIndex) => {
            const isActivated = !!coupon.activatedCoupon;
            const isActive = coupon.activatedCoupon?.is_active;
            const customCode = profile?.username ? generateCustomCode(profile.username, coupon.code, coupon.is_primary || false) : "";
            const affiliateLink = getAffiliateLink(coupon);
            return <ScrollAnimation key={coupon.id} animation="fade-up" delay={couponIndex * 50} threshold={0.05}>
                    <div className={`flex items-center justify-between p-4 border rounded-lg transition-all duration-300 hover:shadow-md ${isActivated && !isActive ? "bg-red-50 border-red-300 dark:border-red-500 dark:bg-transparent" : ""} ${!isActivated ? "bg-orange-50 border-orange-400 dark:border-orange-500 dark:bg-transparent" : "hover:bg-accent/50"}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{coupon.name}</h3>
                          {coupon.is_primary && <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
                              Principal
                            </Badge>}
                          <Badge variant="outline">
                            {coupon.type === "percentage" && `${coupon.value}% OFF`}
                            {coupon.type === "days" && `${coupon.value} dias`}
                            {coupon.type === "free_trial" && `${coupon.value} dias grátis`}
                          </Badge>
                          {isActivated ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 dark:border dark:border-green-500/50">Liberado</Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 dark:border dark:border-orange-500/50">Não Liberado</Badge>
                          )}
                          {isActivated && isActive && <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 dark:border dark:border-green-500/50">
                              Ativo
                            </Badge>}
                          {isActivated && !isActive && <Badge className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 dark:border dark:border-red-500/50">
                              Inativo
                            </Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {coupon.description || "Sem descrição"}
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {isActivated ? <code className="text-lg font-mono font-bold bg-primary/10 px-3 py-1.5 rounded">
                                {coupon.activatedCoupon?.custom_code}
                              </code> : <>
                                <span className="text-xs text-muted-foreground">
                                  Seu cupom será:
                                </span>
                                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                  {customCode}
                                </code>
                              </>}
                          </div>
                          {affiliateLink && isActive && <div className="text-xs text-muted-foreground">
                              <span className="font-semibold">Link: </span>
                              <code className="bg-muted px-2 py-1 rounded">
                                {affiliateLink}
                              </code>
                            </div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isActivated ? <>
                          {isActive && <div className="flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleCopy(coupon.activatedCoupon?.custom_code || generateCustomCode(profile?.username || "", coupon.code, coupon.is_primary))}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar Cupom
                              </Button>
                              {affiliateLink && <>
                                  <Button variant="outline" size="sm" onClick={() => handleCopy(affiliateLink)} disabled={!coupon.activatedCoupon}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copiar Link
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => window.open(affiliateLink, '_blank')} disabled={!coupon.activatedCoupon}>
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Abrir Link
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => {
                                    const link = affiliateLink;
                                    const code = coupon.activatedCoupon?.custom_code || generateCustomCode(profile?.username || "", coupon.code, coupon.is_primary);
                                    const text = `Use meu cupom ${code} e aproveite o desconto! ${link}`;
                                    if (navigator.share) {
                                      navigator.share({ title: coupon.name, text, url: link });
                                    } else {
                                      handleCopy(text);
                                    }
                                  }} disabled={!coupon.activatedCoupon}>
                                    <Share2 className="h-4 w-4 mr-2" />
                                    Compartilhar
                                  </Button>
                                </>}
                            </div>}
                            {isActive ? <Button variant="outline" size="sm" onClick={() => handleDeactivateClick(coupon.activatedCoupon?.id || "")} disabled={deactivateCoupon.isPending}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Inativar
                              </Button> : <Button variant="outline" size="sm" className="bg-green-50 text-green-700 border-green-300 hover:bg-green-100 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/50 dark:hover:bg-green-500/30" onClick={() => reactivateCoupon.mutate(coupon.activatedCoupon?.id || "")} disabled={reactivateCoupon.isPending}>
                                <Check className="h-4 w-4 mr-2" />
                                Ativar
                              </Button>}
                          </> : <Button onClick={() => handleActivateCoupon(coupon.id, coupon.code, coupon.is_primary || false, coupon.product_id)} disabled={activateCoupon.isPending || !profile?.username}>
                            <Check className="h-4 w-4 mr-2" />
                            Liberar Cupom
                          </Button>}
                      </div>
                    </div>
                  </ScrollAnimation>;
          })}
            </div>}
        </CardContent>
      </Card>

      {/* Coupon Details Dialog/Drawer */}
      {isMobile ? <Drawer open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Detalhes do Cupom</DrawerTitle>
            </DrawerHeader>
            {selectedCoupon && <CouponDetailsContent coupon={selectedCoupon} profile={profile} generateCustomCode={generateCustomCode} getAffiliateLink={getAffiliateLink} handleCopy={handleCopy} handleActivateCoupon={handleActivateCoupon} handleDeactivateClick={handleDeactivateClick} reactivateCoupon={reactivateCoupon} activateCoupon={activateCoupon} setDetailsOpen={setDetailsOpen} isPendingDeactivate={deactivateCoupon.isPending} />}
          </DrawerContent>
        </Drawer> : <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes do Cupom</DialogTitle>
            </DialogHeader>
            {selectedCoupon && <CouponDetailsContent coupon={selectedCoupon} profile={profile} generateCustomCode={generateCustomCode} getAffiliateLink={getAffiliateLink} handleCopy={handleCopy} handleActivateCoupon={handleActivateCoupon} handleDeactivateClick={handleDeactivateClick} reactivateCoupon={reactivateCoupon} activateCoupon={activateCoupon} setDetailsOpen={setDetailsOpen} isPendingDeactivate={deactivateCoupon.isPending} />}
          </DialogContent>
        </Dialog>}

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={deactivateConfirmOpen} onOpenChange={setDeactivateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar Cupom</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja inativar este cupom? Você poderá reativá-lo depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeactivate}>Inativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};