import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ticket, Copy, ExternalLink, Check, XCircle, Eye, LayoutGrid, LayoutList, Share2, AlertTriangle, Pencil, X } from "lucide-react";
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
import { UsernameEditDialog } from "@/components/UsernameEditDialog";
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
interface GroupedProduct {
  name: string;
  iconLight?: string | null;
  iconDark?: string | null;
  coupons: AvailableCoupon[];
}

interface CouponDetailsContentProps {
  coupon: AvailableCoupon;
  profile: { id: string; username: string | null } | undefined;
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
  isPendingDeactivate,
}: CouponDetailsContentProps) => (
  <div className="px-4 pb-6 space-y-4">
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
  </div>
);

const Coupons = () => {
  const isMobile = useIsMobile();
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const [productFilter, setProductFilter] = useState<string>("all");
  const [layoutMode, setLayoutMode] = useState<string>("compact");
  const [selectedCoupon, setSelectedCoupon] = useState<AvailableCoupon | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [usernameDialogOpen, setUsernameDialogOpen] = useState(false);
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

  // Fetch products for filter (excluding RENDA product which is shown in SubAffiliates page)
  const {
    data: products
  } = useQuery({
    queryKey: ["products-coupons", userId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("products").select("id, nome, icone_light, icone_dark").neq("id", RENDA_PRODUCT_ID).order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });

  // Fetch available admin coupons using RPC function
  const {
    data: availableCoupons,
    isLoading: couponsLoading
  } = useQuery<AvailableCoupon[]>({
    queryKey: ["available-coupons", userId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.rpc("get_available_coupons_for_affiliates" as any);
      if (error) throw error;

      // Transform to expected format with nested products object
      return (data as any[])?.map((coupon: any) => ({
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

  // Fetch affiliate's activated coupons
  const {
    data: activatedCoupons,
    isLoading: activatedLoading
  } = useQuery({
    queryKey: ["activated-coupons", userId],
    queryFn: async () => {
      if (!userId) return [];
      const {
        data,
        error
      } = await supabase.from("affiliate_coupons").select(`
          *,
          coupons(*, products(nome))
        `)
        .eq("affiliate_id", userId)
        .filter("deleted_at", "is", null) // Filtrar apenas cupons não excluídos (soft delete)
        .order("created_at", {
          ascending: false
        });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!userId
  });

  // ID do produto App Renda Recorrente
  const RENDA_PRODUCT_ID = "bb582482-b006-47b8-b6ea-a6944d8cfdfd";

  // Fetch affiliate's current subscription/plan
  const { data: affiliateSubscription } = useQuery({
    queryKey: ["affiliate-subscription", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan_id, status, plans(name, is_free)")
        .eq("user_id", userId)
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
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
  const { data: minSalesSetting } = useQuery({
    queryKey: ["min-sales-renda-setting"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "min_sales_for_renda_coupons")
        .single();
      if (error) {
        console.log("No setting found, using default");
        return { value: "10" };
      }
      return data;
    }
  });

  // Count affiliate's sales from other products (commissions with status available or paid)
  const { data: otherProductsSalesCount } = useQuery({
    queryKey: ["other-products-sales", userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from("commissions")
        .select("id", { count: "exact", head: true })
        .eq("affiliate_id", userId)
        .neq("product_id", RENDA_PRODUCT_ID)
        .in("status", ["available", "paid"]);
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
        queryKey: ["activated-coupons", userId]
      });
      toast({
        title: "Cupom liberado!",
        description: "Seu cupom personalizado foi criado com sucesso"
      });
      // Log activity
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
        queryKey: ["activated-coupons", userId]
      });
      toast({
        title: "Cupom inativado",
        description: "O cupom foi inativado com sucesso"
      });
      // Log activity
      if (userId) {
        logActivity({
          userId,
          activityType: 'coupon_deactivated',
          description: 'Cupom inativado',
          category: 'coupon',
          metadata: { affiliate_coupon_id: affiliateCouponId }
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

  // Activate coupon mutation
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
        queryKey: ["activated-coupons", userId]
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
  const handleActivateCoupon = (couponId: string, couponCode: string, isPrimary: boolean, productId: string) => {
    console.log('handleActivateCoupon called with:', { couponId, couponCode, isPrimary, productId });
    
    // Verificar se é o produto Renda e se o afiliado tem os requisitos
    if (productId === RENDA_PRODUCT_ID && !canUnlockRendaCoupons) {
      const requirements: string[] = [];
      if (!isProPlan) requirements.push("ter o plano PRO");
      if (!hasEnoughSales) requirements.push(`ter no mínimo ${minSalesRequired} vendas de outros produtos (faltam ${salesNeeded})`);
      
      toast({
        title: "Cupons bloqueados",
        description: `Para liberar cupons do App Renda Recorrente você precisa: ${requirements.join(" e ")}.`,
        variant: "destructive"
      });
      return;
    }
    
    if (!profile?.username) {
      toast({
        title: "Erro",
        description: "Username não encontrado. Por favor, complete seu perfil.",
        variant: "destructive"
      });
      return;
    }
    const customCode = generateCustomCode(profile.username, couponCode, isPrimary);
    console.log('Saving to DB:', { couponCode, customCode, username: profile.username });
    activateCoupon.mutate({
      couponId,
      customCode,
      productId,
      couponCode
    });
  };
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "O código foi copiado para a área de transferência"
    });
  };
  
  const handleDeactivateClick = (couponId: string) => {
    setCouponToDeactivate(couponId);
    setDeactivateConfirmOpen(true);
  };

  const confirmDeactivate = () => {
    if (couponToDeactivate) {
      deactivateCoupon.mutate(couponToDeactivate);
      setDetailsOpen(false);
    }
    setDeactivateConfirmOpen(false);
    setCouponToDeactivate(null);
  };

  const isLoading = profileLoading || couponsLoading || activatedLoading;

  // Create a map of activated coupons by coupon_id for quick lookup
  const activatedCouponsMap = new Map(activatedCoupons?.map(ac => [ac.coupon_id, ac]) || []);

  // All coupons with activation status - exclude RENDA product (shown in SubAffiliates page)
  const allCoupons = availableCoupons?.filter(coupon => 
    coupon.product_id !== RENDA_PRODUCT_ID && 
    (productFilter === "all" || coupon.product_id === productFilter)
  )?.map(coupon => {
    const activatedCoupon = activatedCouponsMap.get(coupon.id);
    return {
      ...coupon,
      activatedCoupon
    };
  })?.sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return 0;
  }) || [];

  // Group coupons by product when "all" is selected
  const groupedByProduct = productFilter === "all" ? allCoupons.reduce((acc, coupon) => {
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
  }, {} as Record<string, GroupedProduct>) : null;
  if (isLoading) {
    return <div className="space-y-6 p-4 sm:p-6">
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
      </div>;
  }
  // Check if username looks auto-generated (ends with _XXXXXX pattern from user id)
  const isUsernameAutoGenerated = (username: string | null, odUid: string | null): boolean => {
    if (!username || !odUid) return false;
    const idPrefix = odUid.substring(0, 6).toLowerCase();
    return username.endsWith(`_${idPrefix}`);
  };

  const usernameIsAutoGenerated = profile?.username && userId ? isUsernameAutoGenerated(profile.username, userId) : false;

  return <div className="space-y-6 p-4 sm:p-6">
      <ScrollAnimation animation="fade-up">
        <div>
          <h1 className="text-3xl font-bold mb-2">Cupons e Links</h1>
          <p className="text-muted-foreground">
            Gerencie seus cupons de desconto e links de afiliado
          </p>
        </div>
      </ScrollAnimation>

      {/* Username Alert Card */}
      {profile?.username && (
        <Alert className={usernameIsAutoGenerated ? "border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-950/20" : "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/20"}>
          <AlertTriangle className={`h-4 w-4 ${usernameIsAutoGenerated ? "text-orange-600 dark:text-orange-400" : "text-blue-600 dark:text-blue-400"}`} />
          <AlertTitle className={usernameIsAutoGenerated ? "text-orange-800 dark:text-orange-300" : "text-blue-800 dark:text-blue-300"}>
            {usernameIsAutoGenerated ? "Username gerado automaticamente" : "Seu username"}
          </AlertTitle>
          <AlertDescription className={`${usernameIsAutoGenerated ? "text-orange-700 dark:text-orange-400" : "text-blue-700 dark:text-blue-400"} space-y-3`}>
            <p>
              Seu username atual é: <strong className="font-semibold">{profile.username}</strong>
            </p>
            {usernameIsAutoGenerated ? (
              <p className="text-sm">
                Este username foi gerado automaticamente pelo sistema. Recomendamos escolher um username amigável e fácil de lembrar antes de liberar seus cupons, pois ele será usado nos links e códigos dos cupons.
              </p>
            ) : (
              <p className="text-sm">
                Caso queira alterá-lo, recomendamos fazer isso antes de liberar os cupons, pois o username é usado nos links e códigos dos cupons.
              </p>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setUsernameDialogOpen(true)}
              className={usernameIsAutoGenerated ? "border-orange-400 text-orange-700 hover:bg-orange-100 dark:border-orange-600 dark:text-orange-300 dark:hover:bg-orange-900/30" : "border-blue-400 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900/30"}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Editar Username
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Username Edit Dialog */}
      {profile?.username && userId && (
        <UsernameEditDialog
          open={usernameDialogOpen}
          onOpenChange={setUsernameDialogOpen}
          currentUsername={profile.username}
          userId={userId}
          onSuccess={async () => {
            await queryClient.refetchQueries({ queryKey: ["profile", userId] });
            await queryClient.refetchQueries({ queryKey: ["available-coupons", userId] });
            await queryClient.refetchQueries({ queryKey: ["activated-coupons", userId] });
          }}
        />
      )}

      {/* Filters Card */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Filtrar por produto">
                {productFilter === "all" ? (
                  "Todos os produtos"
                ) : (
                  (() => {
                    const selectedProduct = products?.find(p => p.id === productFilter);
                    if (selectedProduct) {
                      const iconUrl = selectedProduct.icone_light || selectedProduct.icone_dark;
                      return (
                        <div className="flex items-center gap-2">
                          {iconUrl && <img src={iconUrl} alt={selectedProduct.nome} className="w-5 h-5 rounded-full object-cover" />}
                          <span>{selectedProduct.nome}</span>
                        </div>
                      );
                    }
                    return "Filtrar por produto";
                  })()
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os produtos</SelectItem>
              {products?.map(product => {
                const iconUrl = product.icone_light || product.icone_dark;
                return (
                  <SelectItem key={product.id} value={product.id}>
                    <div className="flex items-center gap-2">
                      {iconUrl && <img src={iconUrl} alt={product.nome} className="w-5 h-5 rounded-full object-cover" />}
                      <span>{product.nome}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <ToggleGroup type="single" value={layoutMode} onValueChange={v => v && setLayoutMode(v)} className="border rounded-lg">
            <ToggleGroupItem value="compact" aria-label="Layout compacto" className="px-3">
              <LayoutList className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="complete" aria-label="Layout completo" className="px-3">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </Card>

      {/* All Coupons */}
      {allCoupons.length === 0 ? <Card>
        <CardContent className="p-6">
          <div className="text-center py-12 text-muted-foreground">
            <Ticket className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Nenhum cupom disponível</p>
          </div>
        </CardContent>
      </Card> : productFilter === "all" && groupedByProduct ? isMobile ? <div className="space-y-6">
                {Object.entries(groupedByProduct).map(([productKey, productData]) => <div key={productKey}>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                      {(productData.iconLight || productData.iconDark) && <img src={productData.iconLight || productData.iconDark || ''} alt={productData.name} className="w-8 h-8 rounded-full object-cover" />}
                      <h3 className="text-base font-semibold">{productData.name}</h3>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {productData.coupons.length}
                      </Badge>
                    </div>
                    {/* Aviso para App Renda Recorrente */}
                    {productData.coupons[0]?.product_id === RENDA_PRODUCT_ID && !canUnlockRendaCoupons && (
                      <ScrollAnimation animation="fade-up" delay={50} threshold={0.05}>
                        <Alert className="mb-3 border-[#ff5963] bg-[#ff5963] dark:border-[#ff5963] dark:bg-[#ff5963] [&>svg]:text-white">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle className="text-white text-sm font-semibold">Cupons bloqueados</AlertTitle>
                          <AlertDescription className="text-white/90 text-sm">
                            <p className="mb-3">Para liberar cupons deste produto e ter sub-afiliados, você precisa:</p>
                            <div className="space-y-2">
                              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${isProPlan ? 'border-green-500/40' : 'border-white/10'}`}>
                                <span className={`flex items-center justify-center w-5 h-5 rounded-full ${isProPlan ? 'bg-green-500 text-white' : 'bg-white/20 text-white'}`}>
                                  {isProPlan ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                </span>
                                <span className="flex-1">Ter o plano PRO</span>
                                {isProPlan && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-medium">Concluído</span>}
                              </div>
                              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${hasEnoughSales ? 'border-green-500/40' : 'border-white/10'}`}>
                                <span className={`flex items-center justify-center w-5 h-5 rounded-full ${hasEnoughSales ? 'bg-green-500 text-white' : 'bg-white/20 text-white'}`}>
                                  {hasEnoughSales ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                </span>
                                <span className="flex-1">Ter no mínimo {minSalesRequired} vendas de outros produtos</span>
                                {hasEnoughSales 
                                  ? <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-medium">Concluído</span>
                                  : <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">Faltam {salesNeeded}</span>
                                }
                              </div>
                            </div>
                          </AlertDescription>
                        </Alert>
                      </ScrollAnimation>
                    )}
                    <div className="space-y-3">
                      {productData.coupons.map((coupon, couponIndex) => {
                const isActivated = !!coupon.activatedCoupon;
                const isActive = coupon.activatedCoupon?.is_active;
                const customCode = profile?.username ? generateCustomCode(profile.username, coupon.code, coupon.is_primary || false) : "";
                if (layoutMode === "compact") {
                  return <ScrollAnimation key={coupon.id} animation="fade-up" delay={couponIndex * 50} threshold={0.05}>
                    <div className={`p-3 border rounded-lg bg-card space-y-2 transition-all duration-300 hover:shadow-md ${isActivated && !isActive ? "border-red-300 bg-red-50 dark:border-red-500 dark:bg-transparent" : ""} ${!isActivated ? "border-orange-400 bg-orange-50 dark:border-orange-500 dark:bg-transparent" : ""}`}>
                    {/* Linha 1: Nome e botão de detalhes */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm">{coupon.name}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => {
                        setSelectedCoupon(coupon);
                        setDetailsOpen(true);
                      }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Linha 2: Badges de status */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isActivated ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 dark:border dark:border-green-500/50 text-[10px]">Liberado</Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 dark:border dark:border-orange-500/50 text-[10px]">Não Liberado</Badge>
                      )}
                      {isActivated && isActive && <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 dark:border dark:border-green-500/50 text-[10px]">Ativo</Badge>}
                      {isActivated && !isActive && <Badge className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 dark:border dark:border-red-500/50 text-[10px]">Inativo</Badge>}
                    </div>
                    {/* Linha 4: Link com ícone de copiar */}
                    {getAffiliateLink(coupon) && isActive && <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="font-semibold hidden sm:inline">Link: </span>
                        <code className="bg-muted px-2 py-1 rounded truncate flex-1">
                          {getAffiliateLink(coupon)}
                        </code>
                        <button
                          onClick={() => handleCopy(getAffiliateLink(coupon) || "")}
                          className="p-1 hover:bg-muted rounded transition-colors shrink-0"
                          title="Copiar link"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>}
                    </div>
                  </ScrollAnimation>;
                }
                return <ScrollAnimation key={coupon.id} animation="fade-up" delay={couponIndex * 50} threshold={0.05}>
                  <Card className={`transition-all duration-300 hover:shadow-md ${isActivated && !isActive ? "border-red-300 bg-red-50 dark:border-red-500 dark:bg-transparent" : ""} ${!isActivated ? "border-orange-400 bg-orange-50 dark:border-orange-500 dark:bg-transparent" : ""}`}>
                            <CardContent className="p-4 space-y-3">
                              <div className="flex flex-wrap gap-1.5 items-start">
                                <h3 className="font-semibold text-sm flex-1">{coupon.name}</h3>
                                {coupon.is_primary && <Badge className="bg-yellow-500 text-white text-xs">Principal</Badge>}
                                <Badge variant="outline" className="text-xs">
                                  {coupon.type === "percentage" && `${coupon.value}%`}
                                  {coupon.type === "days" && `${coupon.value}d`}
                                  {coupon.type === "free_trial" && `${coupon.value}d grátis`}
                                </Badge>
                                {isActivated ? (
                                  <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 dark:border dark:border-green-500/50 text-xs">Liberado</Badge>
                                ) : (
                                  <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 dark:border dark:border-orange-500/50 text-xs">Não Liberado</Badge>
                                )}
                                {isActivated && isActive && <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 dark:border dark:border-green-500/50 text-xs">Ativo</Badge>}
                                {isActivated && !isActive && <Badge className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 dark:border dark:border-red-500/50 text-xs">Inativo</Badge>}
                              </div>
                              
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {coupon.description || "Sem descrição"}
                              </p>
                              
                              <div className="space-y-2">
                                {isActivated ? <div className="flex items-center gap-1">
                                    <code className="text-sm font-mono font-bold bg-primary/10 px-2 py-1.5 rounded flex-1">
                                      {coupon.activatedCoupon?.custom_code}
                                    </code>
                                    <button
                                      onClick={() => handleCopy(coupon.activatedCoupon?.custom_code || "")}
                                      className="p-1 hover:bg-muted rounded transition-colors shrink-0"
                                      title="Copiar cupom"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </button>
                                  </div> : <div className="text-xs">
                                    <span className="text-muted-foreground">Seu cupom: </span>
                                    <code className="font-mono bg-muted px-2 py-1 rounded">{customCode}</code>
                                  </div>}
                                
                                {getAffiliateLink(coupon) && isActive && <div className="text-xs flex items-center gap-1">
                                    <span className="text-muted-foreground font-semibold hidden sm:inline">Link: </span>
                                    <code className="bg-muted px-2 py-1 rounded text-xs break-all flex-1">
                                      {getAffiliateLink(coupon)}
                                    </code>
                                    <button
                                      onClick={() => handleCopy(getAffiliateLink(coupon) || "")}
                                      className="p-1 hover:bg-muted rounded transition-colors shrink-0"
                                      title="Copiar link"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </button>
                                  </div>}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2">
                                {isActivated ? <>
                                    {isActive && <>
                                        {getAffiliateLink(coupon) && <Button variant="outline" size="sm" className="w-full" onClick={() => window.open(getAffiliateLink(coupon) || "", '_blank')}>
                                              <ExternalLink className="h-3 w-3 mr-1" />
                                              Compartilhar
                                            </Button>}
                                      </>}
                                    {isActive ? <Button variant="outline" size="sm" className="w-full" onClick={() => handleDeactivateClick(coupon.activatedCoupon?.id || "")} disabled={deactivateCoupon.isPending}>
                                        <XCircle className="h-3 w-3 mr-1" />
                                        Inativar
                                      </Button> : <Button variant="outline" size="sm" className="w-full col-span-2 bg-green-50 text-green-700 border-green-300 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/50 dark:hover:bg-green-500/30" onClick={() => reactivateCoupon.mutate(coupon.activatedCoupon?.id || "")} disabled={reactivateCoupon.isPending}>
                                        <Check className="h-3 w-3 mr-1" />
                                        Ativar
                                      </Button>}
                                  </> : <Button size="sm" className="w-full col-span-2" onClick={() => handleActivateCoupon(coupon.id, coupon.code, coupon.is_primary || false, coupon.product_id)} disabled={activateCoupon.isPending || !profile?.username}>
                                    <Check className="h-3 w-3 mr-1" />
                                    Liberar Cupom
                                  </Button>}
                              </div>
                            </CardContent>
                          </Card>
                        </ScrollAnimation>;
              })}
                    </div>
                  </div>)}
      </div> : <div className="space-y-6">
                {Object.entries(groupedByProduct).map(([productKey, productData]) => <Card key={productKey}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4 pb-2 border-b">
                        {(productData.iconLight || productData.iconDark) && <img src={productData.iconLight || productData.iconDark || ''} alt={productData.name} className="w-10 h-10 rounded-full object-cover border-2 border-border" />}
                        <h3 className="text-lg font-semibold text-foreground">
                          {productData.name}
                        </h3>
                        <Badge variant="outline" className="ml-auto">
                          {productData.coupons.length} {productData.coupons.length === 1 ? 'cupom' : 'cupons'}
                        </Badge>
                      </div>
                      {/* Aviso para App Renda Recorrente */}
                      {productData.coupons[0]?.product_id === RENDA_PRODUCT_ID && !canUnlockRendaCoupons && (
                        <ScrollAnimation animation="fade-up" delay={50} threshold={0.05}>
                          <Alert className="mb-4 border-[#ff5963] bg-[#ff5963] dark:border-[#ff5963] dark:bg-[#ff5963] [&>svg]:text-white">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle className="text-white font-semibold">Cupons bloqueados</AlertTitle>
                            <AlertDescription className="text-white/90">
                              <p className="mb-3">Para liberar cupons deste produto e ter sub-afiliados, você precisa:</p>
                              <div className="space-y-2">
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${isProPlan ? 'border-green-500/40' : 'border-white/10'}`}>
                                  <span className={`flex items-center justify-center w-5 h-5 rounded-full ${isProPlan ? 'bg-green-500 text-white' : 'bg-white/20 text-white'}`}>
                                    {isProPlan ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                  </span>
                                  <span className="flex-1">Ter o plano PRO</span>
                                  {isProPlan && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-medium">Concluído</span>}
                                </div>
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${hasEnoughSales ? 'border-green-500/40' : 'border-white/10'}`}>
                                  <span className={`flex items-center justify-center w-5 h-5 rounded-full ${hasEnoughSales ? 'bg-green-500 text-white' : 'bg-white/20 text-white'}`}>
                                    {hasEnoughSales ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                  </span>
                                  <span className="flex-1">Ter no mínimo {minSalesRequired} vendas de outros produtos</span>
                                  {hasEnoughSales 
                                    ? <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-medium">Concluído</span>
                                    : <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">Faltam {salesNeeded}</span>
                                  }
                                </div>
                              </div>
                            </AlertDescription>
                          </Alert>
                        </ScrollAnimation>
                      )}
                      <div className="space-y-4">
                      {productData.coupons.map((coupon, couponIndex) => {
                const isActivated = !!coupon.activatedCoupon;
                const isActive = coupon.activatedCoupon?.is_active;
                const customCode = profile?.username ? generateCustomCode(profile.username, coupon.code, coupon.is_primary || false) : "";
                
                if (layoutMode === "compact") {
                  return <ScrollAnimation key={coupon.id} animation="fade-up" delay={couponIndex * 50} threshold={0.05}>
                    <div className={`flex items-center gap-4 p-4 border rounded-lg bg-card transition-all duration-300 hover:shadow-md ${isActivated && !isActive ? "border-red-300 bg-red-50 dark:border-red-500 dark:bg-transparent" : ""} ${!isActivated ? "border-orange-400 bg-orange-50 dark:border-orange-500 dark:bg-transparent" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">{coupon.name}</span>
                        {coupon.is_primary && <Badge className="bg-yellow-500 text-white text-xs">Principal</Badge>}
                        <Badge variant="outline" className="text-xs">
                          {coupon.type === "percentage" && `${coupon.value}%`}
                          {coupon.type === "days" && `${coupon.value} dias`}
                          {coupon.type === "free_trial" && `${coupon.value} dias`}
                        </Badge>
                        {isActivated ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 dark:border dark:border-green-500/50 text-xs">Liberado</Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 dark:border dark:border-orange-500/50 text-xs">Não Liberado</Badge>
                        )}
                        {isActivated && isActive && <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 dark:border dark:border-green-500/50 text-xs">Ativo</Badge>}
                        {isActivated && !isActive && <Badge className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 dark:border dark:border-red-500/50 text-xs">Inativo</Badge>}
                      </div>
                      {getAffiliateLink(coupon) && isActive && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <span className="font-semibold">Link: </span>
                        <code className="bg-muted px-2 py-1 rounded truncate">
                          {getAffiliateLink(coupon)}
                        </code>
                        <button
                          onClick={() => handleCopy(getAffiliateLink(coupon) || "")}
                          className="p-1 hover:bg-muted rounded transition-colors shrink-0"
                          title="Copiar link"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => {
                        setSelectedCoupon(coupon);
                        setDetailsOpen(true);
                      }}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                </ScrollAnimation>;
                }
                
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
                                  {isActivated ? <div className="flex items-center gap-2">
                                      <code className="text-lg font-mono font-bold bg-primary/10 px-3 py-1.5 rounded">
                                        {coupon.activatedCoupon?.custom_code}
                                      </code>
                                      <button
                                        onClick={() => handleCopy(coupon.activatedCoupon?.custom_code || "")}
                                        className="p-1.5 hover:bg-muted rounded-md transition-colors"
                                        title="Copiar cupom"
                                      >
                                        <Copy className="h-4 w-4 text-muted-foreground" />
                                      </button>
                                    </div> : <>
                                      <span className="text-xs text-muted-foreground">
                                        Seu cupom será:
                                      </span>
                                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                        {customCode}
                                      </code>
                                    </>}
                                </div>
                                {getAffiliateLink(coupon) && isActive && <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <span className="font-semibold">Link: </span>
                                    <code className="bg-muted px-2 py-1 rounded">
                                      {getAffiliateLink(coupon)}
                                    </code>
                                    <button
                                      onClick={() => handleCopy(getAffiliateLink(coupon) || "")}
                                      className="p-1 hover:bg-muted rounded transition-colors"
                                      title="Copiar link"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </button>
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
                                    {getAffiliateLink(coupon) && <>
                                        <Button variant="outline" size="sm" onClick={() => handleCopy(getAffiliateLink(coupon) || "")} disabled={!coupon.activatedCoupon}>
                                          <Copy className="h-4 w-4 mr-2" />
                                          Copiar Link
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => window.open(getAffiliateLink(coupon) || "", '_blank')} disabled={!coupon.activatedCoupon}>
                                          <ExternalLink className="h-4 w-4 mr-2" />
                                          Abrir Link
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => {
                                          const link = getAffiliateLink(coupon) || "";
                                          const customCode = coupon.activatedCoupon?.custom_code || generateCustomCode(profile?.username || "", coupon.code, coupon.is_primary);
                                          const text = `Use meu cupom ${customCode} e aproveite o desconto! ${link}`;
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
                      </div>
                    </CardContent>
                  </Card>)}
              </div> : isMobile ? <div className="space-y-3">
                {allCoupons.map((coupon, couponIndex) => {
            const isActivated = !!coupon.activatedCoupon;
            const isActive = coupon.activatedCoupon?.is_active;
            const customCode = profile?.username ? generateCustomCode(profile.username, coupon.code, coupon.is_primary || false) : "";
            if (layoutMode === "compact") {
              return <ScrollAnimation key={coupon.id} animation="fade-up" delay={couponIndex * 50} threshold={0.05}>
                <div className={`p-3 border rounded-lg bg-card space-y-2 transition-all duration-300 hover:shadow-md ${isActivated && !isActive ? "border-red-300 bg-red-50 dark:border-red-500 dark:bg-transparent" : ""} ${!isActivated ? "border-orange-400 bg-orange-50 dark:border-orange-500 dark:bg-transparent" : ""}`}>
                {/* Linha 1: Nome e botão de detalhes */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm">{coupon.name}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => {
                    setSelectedCoupon(coupon);
                    setDetailsOpen(true);
                  }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Linha 2: Badges de status */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {isActivated ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 dark:border dark:border-green-500/50 text-[10px]">Liberado</Badge>
                  ) : (
                    <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 dark:border dark:border-orange-500/50 text-[10px]">Não Liberado</Badge>
                  )}
                  {isActivated && isActive && <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 dark:border dark:border-green-500/50 text-[10px]">Ativo</Badge>}
                  {isActivated && !isActive && <Badge className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 dark:border dark:border-red-500/50 text-[10px]">Inativo</Badge>}
                  {coupon.products && <Badge variant="secondary" className="text-[10px]">{coupon.products.nome}</Badge>}
                </div>
                
                {/* Linha 3: Código e ações */}
                <div className="flex items-center justify-between gap-2 bg-muted/50 rounded px-2 py-1.5">
                  <code className="text-xs font-mono text-muted-foreground truncate flex-1">
                    {isActivated ? coupon.activatedCoupon?.custom_code : customCode}
                  </code>
                  <div className="flex items-center gap-1 shrink-0">
                    {isActivated && isActive && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(coupon.activatedCoupon?.custom_code || "")}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>}
                    {isActivated ? isActive ? <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => handleDeactivateClick(coupon.activatedCoupon?.id || "")} disabled={deactivateCoupon.isPending}>
                          <XCircle className="h-3.5 w-3.5" />
                        </Button> : <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => reactivateCoupon.mutate(coupon.activatedCoupon?.id || "")} disabled={reactivateCoupon.isPending}>
                          <Check className="h-3.5 w-3.5" />
                        </Button> : <Button size="sm" className="h-7 text-xs" onClick={() => handleActivateCoupon(coupon.id, coupon.code, coupon.is_primary || false, coupon.product_id)} disabled={activateCoupon.isPending || !profile?.username}>
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Liberar
                      </Button>}
                  </div>
                </div>
              </div>
            </ScrollAnimation>;
            }
            return <ScrollAnimation key={coupon.id} animation="fade-up" delay={couponIndex * 50} threshold={0.05}>
              <Card className={`transition-all duration-300 hover:shadow-md ${isActivated && !isActive ? "border-red-300 dark:border-red-500 bg-red-50 dark:bg-transparent" : ""}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex flex-wrap gap-1.5 items-start">
                          <h3 className="font-semibold text-sm flex-1">{coupon.name}</h3>
                          {coupon.is_primary && <Badge className="bg-yellow-500 text-white text-xs">Principal</Badge>}
                          <Badge variant="outline" className="text-xs">
                            {coupon.type === "percentage" && `${coupon.value}%`}
                            {coupon.type === "days" && `${coupon.value}d`}
                            {coupon.type === "free_trial" && `${coupon.value}d grátis`}
                          </Badge>
                          {coupon.products && <Badge variant="secondary" className="text-xs">{coupon.products.nome}</Badge>}
                          {isActivated && isActive && <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 dark:border dark:border-green-500/50 text-xs">Ativo</Badge>}
                          {isActivated && !isActive && <Badge className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 dark:border dark:border-red-500/50 text-xs">Inativo</Badge>}
                        </div>
                        
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {coupon.description || "Sem descrição"}
                        </p>
                        
                        <div className="space-y-2">
                          {isActivated ? <code className="text-sm font-mono font-bold bg-primary/10 px-2 py-1.5 rounded block">
                              {coupon.activatedCoupon?.custom_code}
                            </code> : <div className="text-xs">
                              <span className="text-muted-foreground">Seu cupom: </span>
                              <code className="font-mono bg-muted px-2 py-1 rounded">{customCode}</code>
                            </div>}
                          
                          {getAffiliateLink(coupon) && isActive && <div className="text-xs">
                              <span className="text-muted-foreground font-semibold">Link: </span>
                              <code className="bg-muted px-2 py-1 rounded text-xs break-all">
                                {getAffiliateLink(coupon)}
                              </code>
                            </div>}
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {isActivated ? <>
                              {isActive && <>
                                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleCopy(coupon.activatedCoupon?.custom_code || "")}>
                                    <Copy className="h-3 w-3 mr-1" />
                                    Cupom
                                  </Button>
                                  {getAffiliateLink(coupon) && <>
                                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleCopy(getAffiliateLink(coupon) || "")}>
                                        <Copy className="h-3 w-3 mr-1" />
                                        Link
                                      </Button>
                                      <Button variant="outline" size="sm" onClick={() => window.open(getAffiliateLink(coupon) || "", '_blank')}>
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
                                    </>}
                                </>}
                              {isActive ? <Button variant="outline" size="sm" className="w-full" onClick={() => handleDeactivateClick(coupon.activatedCoupon?.id || "")} disabled={deactivateCoupon.isPending}>
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Inativar
                                </Button> : <Button variant="outline" size="sm" className="w-full bg-green-50 text-green-700 border-green-300 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/50 dark:hover:bg-green-500/30" onClick={() => reactivateCoupon.mutate(coupon.activatedCoupon?.id || "")} disabled={reactivateCoupon.isPending}>
                                  <Check className="h-3 w-3 mr-1" />
                                  Ativar
                                </Button>}
                            </> : <Button size="sm" className="w-full" onClick={() => handleActivateCoupon(coupon.id, coupon.code, coupon.is_primary || false, coupon.product_id)} disabled={activateCoupon.isPending || !profile?.username}>
                              <Check className="h-3 w-3 mr-1" />
                              Liberar Cupom
                            </Button>}
                        </div>
                      </CardContent>
                    </Card>
                  </ScrollAnimation>;
          })}
              </div> : <div className="space-y-4">
                {allCoupons.map((coupon, couponIndex) => {
            const isActivated = !!coupon.activatedCoupon;
            const isActive = coupon.activatedCoupon?.is_active;
            const customCode = profile?.username ? generateCustomCode(profile.username, coupon.code, coupon.is_primary || false) : "";
            
            if (layoutMode === "compact") {
              return <ScrollAnimation key={coupon.id} animation="fade-up" delay={couponIndex * 50} threshold={0.05}>
                <div className={`flex items-center gap-4 p-4 border rounded-lg bg-card transition-all duration-300 hover:shadow-md ${isActivated && !isActive ? "border-red-300 bg-red-50 dark:border-red-500 dark:bg-transparent" : ""} ${!isActivated ? "border-orange-400 bg-orange-50 dark:border-orange-500 dark:bg-transparent" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate">{coupon.name}</span>
                    {coupon.is_primary && <Badge className="bg-yellow-500 text-white text-xs">Principal</Badge>}
                    <Badge variant="outline" className="text-xs">
                      {coupon.type === "percentage" && `${coupon.value}%`}
                      {coupon.type === "days" && `${coupon.value} dias`}
                      {coupon.type === "free_trial" && `${coupon.value} dias`}
                    </Badge>
                    {coupon.products && <Badge variant="secondary" className="text-xs">{coupon.products.nome}</Badge>}
                    {isActivated ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 dark:border dark:border-green-500/50 text-xs">Liberado</Badge>
                    ) : (
                      <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 dark:border dark:border-orange-500/50 text-xs">Não Liberado</Badge>
                    )}
                    {isActivated && isActive && <Badge className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 dark:border dark:border-green-500/50 text-xs">Ativo</Badge>}
                    {isActivated && !isActive && <Badge className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 dark:border dark:border-red-500/50 text-xs">Inativo</Badge>}
                  </div>
                  <code className="text-sm font-mono text-muted-foreground">
                    {isActivated ? coupon.activatedCoupon?.custom_code : customCode}
                  </code>
                  {getAffiliateLink(coupon) && isActive && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <span className="font-semibold">Link: </span>
                    <code className="bg-muted px-2 py-1 rounded truncate">
                      {getAffiliateLink(coupon)}
                    </code>
                    <button
                      onClick={() => handleCopy(getAffiliateLink(coupon) || "")}
                      className="p-1 hover:bg-muted rounded transition-colors shrink-0"
                      title="Copiar link"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => {
                    setSelectedCoupon(coupon);
                    setDetailsOpen(true);
                  }}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </Button>
                  {isActivated && !isActive && <Button variant="outline" size="sm" className="bg-green-50 text-green-700 border-green-300 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/50 dark:hover:bg-green-500/30" onClick={() => reactivateCoupon.mutate(coupon.activatedCoupon?.id || "")} disabled={reactivateCoupon.isPending}>
                    <Check className="h-4 w-4 mr-2" />
                    Ativar
                  </Button>}
                  {!isActivated && <Button size="sm" onClick={() => handleActivateCoupon(coupon.id, coupon.code, coupon.is_primary || false, coupon.product_id)} disabled={activateCoupon.isPending || !profile?.username}>
                    <Check className="h-4 w-4 mr-2" />
                    Liberar
                  </Button>}
                </div>
              </div>
            </ScrollAnimation>;
            }
            
            return <ScrollAnimation key={coupon.id} animation="fade-up" delay={couponIndex * 50} threshold={0.05}>
              <div className={`flex items-center justify-between p-4 border rounded-lg transition-all duration-300 hover:shadow-md bg-background ${isActivated && !isActive ? "border-red-300 dark:border-red-500" : ""} ${!isActivated ? "border-orange-400 dark:border-orange-500" : "border-border hover:bg-accent/50"}`}>
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
                          {coupon.products && <Badge variant="secondary">{coupon.products.nome}</Badge>}
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
                           {getAffiliateLink(coupon) && isActive && <div className="text-xs text-muted-foreground flex items-center gap-1">
                               <span className="font-semibold">Link: </span>
                               <code className="bg-muted px-2 py-1 rounded">
                                 {getAffiliateLink(coupon)}
                               </code>
                               <button
                                 onClick={() => handleCopy(getAffiliateLink(coupon) || "")}
                                 className="p-1 hover:bg-muted rounded transition-colors"
                                 title="Copiar link"
                               >
                                 <Copy className="h-3 w-3" />
                               </button>
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
                               {getAffiliateLink(coupon) && <>
                                   <Button variant="outline" size="sm" onClick={() => handleCopy(getAffiliateLink(coupon) || "")} disabled={!coupon.activatedCoupon}>
                                     <Copy className="h-4 w-4 mr-2" />
                                     Copiar Link
                                   </Button>
                                   <Button variant="outline" size="sm" onClick={() => window.open(getAffiliateLink(coupon) || "", '_blank')} disabled={!coupon.activatedCoupon}>
                                     <ExternalLink className="h-4 w-4 mr-2" />
                                     Abrir Link
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

      {/* Coupon Details - Dialog for Desktop, Drawer for Mobile */}
      {isMobile ? (
        <Drawer open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="pb-2 relative">
              <DrawerTitle className="text-center">Detalhes do Cupom</DrawerTitle>
            </DrawerHeader>
            {selectedCoupon && <CouponDetailsContent 
              coupon={selectedCoupon} 
              profile={profile}
              generateCustomCode={generateCustomCode}
              getAffiliateLink={getAffiliateLink}
              handleCopy={handleCopy}
              handleActivateCoupon={handleActivateCoupon}
              handleDeactivateClick={handleDeactivateClick}
              reactivateCoupon={reactivateCoupon}
              activateCoupon={activateCoupon}
              setDetailsOpen={setDetailsOpen}
              isPendingDeactivate={deactivateCoupon.isPending}
            />}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">Detalhes do Cupom</DialogTitle>
            </DialogHeader>
            {selectedCoupon && <CouponDetailsContent 
              coupon={selectedCoupon} 
              profile={profile}
              generateCustomCode={generateCustomCode}
              getAffiliateLink={getAffiliateLink}
              handleCopy={handleCopy}
              handleActivateCoupon={handleActivateCoupon}
              handleDeactivateClick={handleDeactivateClick}
              reactivateCoupon={reactivateCoupon}
              activateCoupon={activateCoupon}
              setDetailsOpen={setDetailsOpen}
              isPendingDeactivate={deactivateCoupon.isPending}
            />}
          </DialogContent>
        </Dialog>
      )}
      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={deactivateConfirmOpen} onOpenChange={setDeactivateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Inativação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja inativar este cupom? Você poderá ativá-lo novamente depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate} className="bg-red-600 hover:bg-red-700">
              Inativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>;
};
export default Coupons;