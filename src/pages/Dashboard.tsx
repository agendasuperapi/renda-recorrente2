import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { TrendingUp, DollarSign, Users, Wallet, CheckCircle2, ArrowRight, BookOpen, Trophy, Coins, Copy, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
interface DashboardStats {
  affiliate_id: string;
  comissao_hoje: number;
  comissao_7_dias: number;
  comissao_mes: number;
  comissao_disponivel: number;
  comissao_pendente: number;
  total_indicacoes: number;
  total_sub_afiliados: number;
  total_sacado: number;
}
interface PrimaryCoupon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  product_id: string;
  product_nome: string;
  product_icone_light: string | null;
  product_icone_dark: string | null;
  product_site_landingpage: string | null;
  custom_code: string | null;
  affiliate_coupon_id: string | null;
}

interface RecentCommission {
  id: string;
  amount: number;
  status: string;
  commission_type: string;
  created_at: string;
  product_nome?: string;
  client_name?: string;
  client_email?: string;
  plan_name?: string;
  level?: number;
  percentage?: number;
}

interface DailyChartData {
  date: string;
  comissoes: number;
}
const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showWelcome, setShowWelcome] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [primaryCoupons, setPrimaryCoupons] = useState<PrimaryCoupon[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [recentCommissions, setRecentCommissions] = useState<RecentCommission[]>([]);
  const [dailyChartData, setDailyChartData] = useState<DailyChartData[]>([]);
  const navigate = useNavigate();
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      console.log("[Dashboard] Sessão atual:", session);
      if (session) {
        // Buscar perfil do usuário
        const {
          data: profile,
          error: profileError
        } = (await supabase.from("profiles").select("name, has_seen_welcome_dashboard").eq("id", session.user.id).single()) as any;
        console.log("[Dashboard] Resultado perfil:", {
          profile,
          profileError
        });

        // Buscar estatísticas do dashboard
        const {
          data: dashboardStats,
          error: statsError
        } = await supabase.from("view_affiliate_dashboard_stats" as any).select("*").eq("affiliate_id", session.user.id).maybeSingle();
        console.log("[Dashboard] Estatísticas:", {
          dashboardStats,
          statsError
        });
        if (dashboardStats) {
          setStats(dashboardStats as unknown as DashboardStats);
        }

        // Buscar cupons principais com códigos customizados do afiliado
        const {
          data: coupons
        } = await supabase.rpc('get_available_coupons_for_affiliates' as any);
        console.log("[Dashboard] Cupons principais:", coupons);
        if (coupons && Array.isArray(coupons)) {
          // Filtrar apenas cupons marcados como principais
          const mainCoupons = coupons.filter((c: any) => c.is_primary === true);

          // Buscar códigos customizados do afiliado para esses cupons
          const {
            data: affiliateCoupons
          } = await supabase.from('affiliate_coupons').select('id, coupon_id, custom_code, product_id').eq('affiliate_id', session.user.id).eq('is_active', true);
          console.log("[Dashboard] Cupons do afiliado:", affiliateCoupons);

          // Combinar cupons principais com códigos customizados
          const couponsWithCustomCode = mainCoupons.map((coupon: any) => {
            const affiliateCoupon = affiliateCoupons?.find((ac: any) => ac.coupon_id === coupon.id && ac.product_id === coupon.product_id);
            return {
              ...coupon,
              custom_code: affiliateCoupon?.custom_code || null,
              affiliate_coupon_id: affiliateCoupon?.id || null
            };
          });
          setPrimaryCoupons(couponsWithCustomCode as PrimaryCoupon[]);
        }

        // Buscar últimas 10 comissões
        const { data: commissions } = await supabase
          .from('commissions')
          .select(`
            id,
            amount,
            status,
            commission_type,
            created_at,
            level,
            percentage,
            product_id,
            products (nome),
            unified_users (name, email),
            subscriptions (
              plan_id,
              plans (name)
            )
          `)
          .eq('affiliate_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (commissions) {
          const formattedCommissions = commissions.map((c: any) => ({
            id: c.id,
            amount: c.amount,
            status: c.status,
            commission_type: c.commission_type,
            created_at: c.created_at,
            product_nome: c.products?.nome,
            client_name: c.unified_users?.name,
            client_email: c.unified_users?.email,
            plan_name: c.subscriptions?.plans?.name,
            level: c.level,
            percentage: c.percentage
          }));
          setRecentCommissions(formattedCommissions);
        }

        // Buscar dados para o gráfico diário (últimos 30 dias)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: dailyData, error: dailyError } = await supabase
          .from('view_commissions_daily')
          .select('data, valor')
          .eq('affiliate_id', session.user.id)
          .gte('data', thirtyDaysAgo.toISOString().split('T')[0])
          .order('data', { ascending: true });

        console.log('[Dashboard] Dados diários:', { dailyData, dailyError });

        if (dailyData && dailyData.length > 0) {
          // Agregar por dia: valor total das comissões
          const aggregateByDate = new Map<string, number>();

          dailyData.forEach((d: any) => {
            const dateObj = new Date(d.data);
            if (isNaN(dateObj.getTime())) return;
            const dateKey = dateObj.toISOString().split('T')[0];
            const existing = aggregateByDate.get(dateKey) || 0;
            aggregateByDate.set(dateKey, existing + (Number(d.valor) || 0));
          });

          const chartData: DailyChartData[] = Array.from(aggregateByDate.entries())
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([dateKey, value]) => ({
              date: new Date(dateKey).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
              comissoes: value,
            }));

          console.log('[Dashboard] Chart data formatado:', chartData);
          setDailyChartData(chartData);
        } else {
          console.log('[Dashboard] Nenhum dado diário encontrado ou erro na query');
          // Se não houver dados, criar dados de exemplo para visualização
          const exampleData = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return {
              date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
              comissoes: 0
            };
          });
          setDailyChartData(exampleData);
        }

        setLoading(false);
        if (profile) {
          setUserName(profile.name);

          // Se ainda não viu o modal de boas-vindas
          console.log("[Dashboard] has_seen_welcome_dashboard:", profile.has_seen_welcome_dashboard);
          if (!profile.has_seen_welcome_dashboard) {
            // PRIMEIRO: Verificar se existe QUALQUER assinatura (para debug)
            const {
              data: allSubscriptions
            } = await supabase.from("subscriptions").select("*").eq("user_id", session.user.id);
            console.log("[Dashboard] TODAS assinaturas do usuário:", allSubscriptions);

            // Verificar se tem assinatura ativa
            const {
              data: subscription,
              error: subscriptionError
            } = await supabase.from("subscriptions").select("created_at, status").eq("user_id", session.user.id).in("status", ["active", "trialing"]).maybeSingle();
            console.log("[Dashboard] Assinatura encontrada:", {
              subscription,
              subscriptionError
            });

            // Mostrar modal se tiver assinatura ativa
            if (subscription) {
              console.log("[Dashboard] Exibindo modal de boas-vindas");
              setShowWelcome(true);
            } else {
              console.log("[Dashboard] Nenhuma assinatura ativa/trialing encontrada");
            }
          } else {
            console.log("[Dashboard] Usuário já viu o modal anteriormente");
          }
        } else {
          console.log("[Dashboard] Nenhum perfil encontrado para o usuário logado");
        }
      } else {
        console.log("[Dashboard] Nenhuma sessão encontrada");
      }

      // Remover parâmetro success da URL se existir
      const successParam = searchParams.get("success");
      console.log("[Dashboard] success param na URL:", successParam);
      if (successParam === "true") {
        searchParams.delete("success");
        setSearchParams(searchParams, {
          replace: true
        });
        console.log("[Dashboard] Parâmetro success removido da URL");
      }
    };
    loadDashboardData();
  }, [searchParams, setSearchParams]);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  const handleCopyCoupon = async (coupon: PrimaryCoupon) => {
    const linkToCopy = coupon.product_site_landingpage && (coupon.custom_code || coupon.code) ? `${coupon.product_site_landingpage}/${coupon.custom_code || coupon.code}` : coupon.custom_code || coupon.code;
    try {
      await navigator.clipboard.writeText(linkToCopy);
      setCopiedCode(coupon.id);
      toast.success("Link copiado!");
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast.error("Erro ao copiar link");
    }
  };
  const handleShareCoupon = async (coupon: PrimaryCoupon) => {
    const couponLink = coupon.product_site_landingpage && (coupon.custom_code || coupon.code) ? `${coupon.product_site_landingpage}/${coupon.custom_code || coupon.code}` : coupon.custom_code || coupon.code;
    const text = `🎁 ${coupon.product_nome} - ${coupon.name}\n${coupon.description || ''}\n\n${couponLink}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${coupon.product_nome} - ${coupon.name}`,
          text: text
        });
      } catch (error) {
        console.log("Compartilhamento cancelado");
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Texto copiado para compartilhar!");
    }
  };
  const handleCloseWelcome = async () => {
    console.log("[Dashboard] Fechando modal de boas-vindas");
    setShowWelcome(false);

    // Atualizar no banco de dados que o usuário já viu o modal
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    console.log("[Dashboard] Sessão ao fechar modal:", session);
    if (session) {
      const {
        error
      } = await supabase.from("profiles").update({
        has_seen_welcome_dashboard: true
      } as any).eq("id", session.user.id);
      console.log("[Dashboard] Resultado update has_seen_welcome_dashboard:", error);
    }
  };
  return <div className="space-y-4 sm:space-y-6">
      {/* Modal de Boas-vindas */}
      <Dialog open={showWelcome} onOpenChange={handleCloseWelcome}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto">
          <VisuallyHidden>
            <DialogTitle>Bem-vindo ao sistema</DialogTitle>
          </VisuallyHidden>
          <div className="p-4 sm:p-8 text-center space-y-3 sm:space-y-4">
            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-primary animate-in zoom-in duration-500" />
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Bem-vindo{userName ? `, ${userName}` : ""}!
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              Sua assinatura foi ativada com sucesso. Agora você tem acesso a todos os recursos da plataforma!
            </p>
          </div>

          <div className="px-4 sm:px-8 pb-4 sm:pb-8 space-y-4 sm:space-y-6">
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-lg sm:text-xl font-semibold text-foreground">Próximos Passos:</h3>
              
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm sm:text-base text-foreground mb-1">1. Complete seu perfil</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Adicione suas informações pessoais e configure suas preferências
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm sm:text-base text-foreground mb-1">2. Explore o Dashboard</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Conheça todas as ferramentas e recursos disponíveis para você
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm sm:text-base text-foreground mb-1">3. Comece a ganhar</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Utilize suas ferramentas de afiliado e comece a gerar comissões
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <Button onClick={handleCloseWelcome} className="w-full h-10 sm:h-12 text-sm sm:text-base font-semibold group" size="lg">
                Começar agora
                <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button onClick={() => {
              handleCloseWelcome();
              navigate("/profile");
            }} variant="outline" className="w-full h-10 sm:h-12 text-sm sm:text-base" size="lg">
                Completar Perfil
              </Button>
            </div>

            <p className="text-center text-xs sm:text-sm text-muted-foreground">
              Precisa de ajuda? Entre em contato com nosso suporte a qualquer momento.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dashboard Content */}
      {loading ? <DashboardSkeleton /> : <>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Dashboard de Afiliado</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Tenha uma visão geral do seu desempenho
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Comissão do dia
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-success">
                  {formatCurrency(stats?.comissao_hoje || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Comissão últimos 7 dias
                </CardTitle>
                <DollarSign className="h-4 w-4 text-info" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-info">
                  {formatCurrency(stats?.comissao_7_dias || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Comissão do mês
                </CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats?.comissao_mes || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Comissão disponível para saque
                </CardTitle>
                <Wallet className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {formatCurrency(stats?.comissao_disponivel || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Comissão pendente
                </CardTitle>
                <DollarSign className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {formatCurrency(stats?.comissao_pendente || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total já sacado
                </CardTitle>
                <Coins className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats?.total_sacado || 0)}
                </div>
              </CardContent>
            </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Seu dia de solicitar saque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              SEGUNDA-FEIRA, 24 DE NOVEMBRO
            </div>
          </CardContent>
        </Card>
      </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Quant. de Indicações</CardTitle>
                <Users className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{stats?.total_indicacoes || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Quant. de Sub-Afiliados</CardTitle>
                <Users className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{stats?.total_sub_afiliados || 0}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Comissões Diárias (Últimos 30 dias)</CardTitle>
              <p className="text-sm text-muted-foreground">
                Acompanhe suas comissões diárias
              </p>
            </CardHeader>
            <CardContent>
              {dailyChartData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum dado disponível
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      label={{ value: 'Comissões (R$)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: any) => [formatCurrency(value), 'Comissões']}
                    />
                    <Legend />
                    <Bar 
                      dataKey="comissoes" 
                      fill="hsl(var(--success))" 
                      name="Comissões"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cupons principais</CardTitle>
              <p className="text-sm text-muted-foreground">
                Veja aqui seus cupons principais para compartilhar
              </p>
            </CardHeader>
            <CardContent>
              {primaryCoupons.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                  Nenhum cupom disponível no momento
                </div> : <div className="space-y-3">
                  {primaryCoupons.map(coupon => <div key={coupon.id} className="flex flex-col gap-3 p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                      {/* Header com ícone e nome */}
                      <div className="flex items-center gap-3">
                        {/* Ícone do App */}
                        {coupon.product_icone_light ? <img src={coupon.product_icone_light} alt={coupon.product_nome} className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover dark:hidden" /> : null}
                        {coupon.product_icone_dark ? <img src={coupon.product_icone_dark} alt={coupon.product_nome} className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover hidden dark:block" /> : null}
                        {!coupon.product_icone_light && !coupon.product_icone_dark && <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm sm:text-base">
                            {coupon.product_nome.charAt(0)}
                          </div>}
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm sm:text-base text-foreground">
                            {coupon.product_nome}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {coupon.name}
                          </div>
                        </div>
                      </div>

                      {/* URL do Cupom */}
                      <div className="px-2.5 py-2 bg-primary/10 text-primary rounded text-xs font-mono overflow-x-auto whitespace-nowrap scrollbar-thin">
                        {coupon.product_site_landingpage && (coupon.custom_code || coupon.code) ? `${coupon.product_site_landingpage}/${coupon.custom_code || coupon.code}` : coupon.custom_code || coupon.code}
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleCopyCoupon(coupon)} className="flex-1 gap-2 text-xs sm:text-sm">
                          {copiedCode === coupon.id ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                          Copiar
                        </Button>
                        <Button size="sm" variant="default" onClick={() => handleShareCoupon(coupon)} className="flex-1 gap-2 text-xs sm:text-sm">
                          <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          Compartilhar
                        </Button>
                      </div>
                    </div>)}
                </div>}
            </CardContent>
          </Card>

      

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Comissões recentes</CardTitle>
            <p className="text-sm text-muted-foreground">
              Veja aqui suas últimas comissões
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/commissions-daily')}
            className="gap-2"
          >
            Ver todas
            <ArrowRight className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {recentCommissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum registro encontrado...
            </div>
          ) : (
            <div className="space-y-3">
              {recentCommissions.map((commission) => (
                <div 
                  key={commission.id} 
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="font-semibold text-sm">
                      {commission.product_nome || 'Produto'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {commission.client_name || 'Cliente'} • {commission.client_email}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{commission.plan_name || 'Plano'}</span>
                      <span>•</span>
                      <span>Nível {commission.level || 1}</span>
                      <span>•</span>
                      <span>{commission.percentage || 0}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(commission.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-base">
                      {formatCurrency(commission.amount)}
                    </div>
                    <div className={`text-xs mt-1 ${
                      commission.status === 'available' ? 'text-success' :
                      commission.status === 'pending' ? 'text-destructive' :
                      commission.status === 'paid' ? 'text-primary' :
                      'text-muted-foreground'
                    }`}>
                      {commission.status === 'available' ? 'Disponível' :
                       commission.status === 'pending' ? 'Pendente' :
                       commission.status === 'paid' ? 'Pago' :
                       commission.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comissões diárias</CardTitle>
          <p className="text-sm text-muted-foreground">
            Veja suas comissões diárias do mês atual
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Nenhum registro encontrado...
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-primary/10 to-success/10 border-primary/20">
        <CardHeader>
          <CardTitle>Meta do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-3xl font-bold">R$0,00</div>
            <div className="text-sm text-muted-foreground">0%</div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{
                width: "0%"
              }} />
            </div>
            <p className="text-xs text-muted-foreground">
              Projeção de comissão do mês: R$0,00
            </p>
          </div>
        </CardContent>
      </Card>
        </>}
    </div>;
};
export default Dashboard;