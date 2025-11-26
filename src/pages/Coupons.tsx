import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ticket, Copy, ExternalLink, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const Coupons = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
  });

  // Fetch available admin coupons
  const { data: availableCoupons, isLoading: couponsLoading } = useQuery({
    queryKey: ["available-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*, products(nome)")
        .eq("is_visible_to_affiliates", true)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
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

      const { data, error } = await supabase
        .from("affiliate_coupons")
        .insert({
          affiliate_id: profile.id,
          coupon_id: couponId,
          custom_code: customCode,
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

  const generateCustomCode = (username: string, couponCode: string) => {
    return `${username.toUpperCase().replace(/\s/g, "")}${couponCode.toUpperCase().replace(/\s/g, "")}`;
  };

  const handleActivateCoupon = (couponId: string, couponCode: string) => {
    if (!profile?.username) {
      toast({
        title: "Erro",
        description: "Username não encontrado. Por favor, complete seu perfil.",
        variant: "destructive",
      });
      return;
    }

    const customCode = generateCustomCode(profile.username, couponCode);
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

  // Filter out coupons that are already activated
  const activatedCouponIds = activatedCoupons?.map(ac => ac.coupon_id) || [];
  const nonActivatedCoupons = availableCoupons?.filter(
    coupon => !activatedCouponIds.includes(coupon.id)
  ) || [];

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

      {/* Available Coupons to Activate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Cupons Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nonActivatedCoupons.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Ticket className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Todos os cupons disponíveis já foram liberados</p>
            </div>
          ) : (
            <div className="space-y-4">
              {nonActivatedCoupons.map((coupon) => {
                const customCode = profile?.username 
                  ? generateCustomCode(profile.username, coupon.code)
                  : "";

                return (
                  <div
                    key={coupon.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{coupon.name}</h3>
                        <Badge variant="outline">
                          {coupon.type === "percentage" && `${coupon.value}% OFF`}
                          {coupon.type === "days" && `${coupon.value} dias`}
                          {coupon.type === "free_trial" && `${coupon.value} dias grátis`}
                        </Badge>
                        {coupon.products && (
                          <Badge variant="secondary">{coupon.products.nome}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {coupon.description || "Sem descrição"}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Seu cupom será:
                        </span>
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {customCode}
                        </code>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleActivateCoupon(coupon.id, coupon.code)}
                      disabled={activateCoupon.isPending || !profile?.username}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Liberar Cupom
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activated Coupons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Seus Cupons Liberados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!activatedCoupons || activatedCoupons.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Ticket className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Você ainda não liberou nenhum cupom</p>
              <p className="text-sm mt-2">
                Libere cupons acima para começar a divulgar
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activatedCoupons.map((affiliateCoupon) => {
                const coupon = affiliateCoupon.coupons;
                if (!coupon) return null;

                return (
                  <div
                    key={affiliateCoupon.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{coupon.name}</h3>
                        <Badge variant="outline">
                          {coupon.type === "percentage" && `${coupon.value}% OFF`}
                          {coupon.type === "days" && `${coupon.value} dias`}
                          {coupon.type === "free_trial" && `${coupon.value} dias grátis`}
                        </Badge>
                        {coupon.products && (
                          <Badge variant="secondary">{coupon.products.nome}</Badge>
                        )}
                        {affiliateCoupon.is_active && (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                            Ativo
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {coupon.description || "Sem descrição"}
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="text-lg font-mono font-bold bg-primary/10 px-3 py-1.5 rounded">
                          {affiliateCoupon.custom_code}
                        </code>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(affiliateCoupon.custom_code)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Affiliate Links Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Links de Afiliado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <ExternalLink className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Seus links de afiliado aparecerão aqui</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Coupons;
