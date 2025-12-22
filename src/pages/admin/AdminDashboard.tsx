import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollAnimation } from "@/components/ScrollAnimation";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEnvironment } from "@/contexts/EnvironmentContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, DollarSign, TrendingUp, CreditCard, ArrowUpCircle, ArrowDownCircle, 
  MinusCircle, Clock, ShoppingCart, UserPlus, Package
} from "lucide-react";
import { eachDayOfInterval, format, startOfDay, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from "recharts";

// Types
interface DashboardStats {
  environment: string;
  total_affiliates: number;
  affiliates_this_month: number;
  affiliates_last_month: number;
  affiliates_7_days: number;
  affiliates_prev_7_days: number;
  active_subscriptions: number;
  subscriptions_this_month: number;
  subscriptions_last_month: number;
  total_revenue: number;
  revenue_this_month: number;
  revenue_last_month: number;
  revenue_today: number;
  revenue_yesterday: number;
  revenue_7_days: number;
  revenue_prev_7_days: number;
  revenue_this_year: number;
  revenue_last_year: number;
  commissions_paid_total: number;
  commissions_paid_this_month: number;
  commissions_paid_last_month: number;
  commissions_paid_today: number;
  commissions_paid_yesterday: number;
  pending_withdrawals_amount: number;
  pending_withdrawals_count: number;
}

interface ProductStats {
  product_id: string;
  product_name: string;
  icone_light: string | null;
  icone_dark: string | null;
  environment: string;
  active_subscriptions: number;
  total_revenue: number;
  revenue_this_month: number;
  revenue_last_month: number;
  revenue_7_days: number;
  revenue_30_days: number;
  revenue_this_year: number;
  revenue_last_year: number;
}

interface RevenueDaily {
  day: string;
  product_id: string;
  product_name: string;
  environment: string;
  revenue: number;
  payment_count: number;
}

interface AffiliatesDaily {
  day: string;
  environment: string;
  new_affiliates: number;
}

interface RecentAffiliate {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  environment: string;
}

interface RecentSale {
  id: string;
  amount: number;
  payment_date: string;
  product_name: string;
  product_icon_light: string | null;
  product_icon_dark: string | null;
  user_name: string;
  environment: string;
}

// Period options for product stats filter
const periodOptions = [
  { value: "total", label: "Total Geral" },
  { value: "30_days", label: "Últimos 30 dias" },
  { value: "7_days", label: "Últimos 7 dias" },
  { value: "this_month", label: "Mês atual" },
  { value: "last_month", label: "Mês anterior" },
  { value: "this_year", label: "Ano atual" },
  { value: "last_year", label: "Ano anterior" },
];

// Helper function to format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

// Helper function to get variation indicator
const VariationIndicator = ({ current, previous, label }: { current: number; previous: number; label: string }) => {
  const diff = current - previous;
  const percentage = previous > 0 ? ((diff / previous) * 100).toFixed(1) : 0;
  
  if (diff > 0) {
    return (
      <div className="flex items-center gap-1 text-xs text-success">
        <ArrowUpCircle className="h-3 w-3" />
        <span>+{typeof percentage === 'number' ? percentage : percentage}% {label}</span>
      </div>
    );
  } else if (diff < 0) {
    return (
      <div className="flex items-center gap-1 text-xs text-destructive">
        <ArrowDownCircle className="h-3 w-3" />
        <span>{percentage}% {label}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <MinusCircle className="h-3 w-3" />
      <span>= {label}</span>
    </div>
  );
};

// Chart colors - fixed HSL strings for SVG compatibility
const chartColors = [
  "hsl(160 84% 39%)", // green (success)
  "hsl(217 91% 60%)", // blue (info)
  "hsl(38 92% 50%)", // amber (warning)
  "hsl(0 84% 60%)", // red (destructive)
  "hsl(262 83% 58%)", // purple
  "hsl(189 94% 43%)", // cyan
];

// Product-specific colors override
const productColorOverrides: Record<string, string> = {
  "Créditos Lovable": "hsl(25 95% 53%)", // Orange
  "APP Financeiro": "hsl(217 91% 60%)", // Blue
};

// Get chart color for product
const getProductColor = (productName: string, index: number): string => {
  return productColorOverrides[productName] || chartColors[index % chartColors.length];
};

const AdminDashboard = () => {
  const { environment } = useEnvironment();
  const [productPeriod, setProductPeriod] = useState("this_month");

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-dashboard-stats", environment],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("view_admin_dashboard_stats")
        .select("*")
        .eq("environment", environment)
        .single();
      
      if (error) throw error;
      return data as DashboardStats;
    },
  });

  // Fetch product stats
  const { data: productStats, isLoading: productStatsLoading } = useQuery({
    queryKey: ["admin-product-stats", environment],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("view_admin_product_stats")
        .select("*")
        .eq("environment", environment);
      
      if (error) throw error;
      return data as ProductStats[];
    },
  });

  // Fetch daily revenue for charts
  const { data: revenueDaily } = useQuery({
    queryKey: ["admin-revenue-daily", environment],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("view_admin_revenue_daily")
        .select("*")
        .eq("environment", environment)
        .order("day", { ascending: true });
      
      if (error) throw error;
      return data as RevenueDaily[];
    },
  });

  // Fetch daily affiliates for charts
  const { data: affiliatesDaily } = useQuery({
    queryKey: ["admin-affiliates-daily", environment],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("view_admin_affiliates_daily")
        .select("*")
        .eq("environment", environment)
        .order("day", { ascending: true });
      
      if (error) throw error;
      return data as AffiliatesDaily[];
    },
  });

  // Fetch recent affiliates
  const { data: recentAffiliates } = useQuery({
    queryKey: ["admin-recent-affiliates", environment],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, avatar_url, created_at, environment")
        .eq("environment", environment)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as RecentAffiliate[];
    },
  });

  // Fetch recent sales
  const { data: recentSales } = useQuery({
    queryKey: ["admin-recent-sales", environment],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unified_payments")
        .select(`
          id,
          amount,
          payment_date,
          environment,
          unified_user_id,
          product_id,
          products:product_id (nome, icone_light, icone_dark),
          unified_users:unified_user_id (name)
        `)
        .eq("environment", environment)
        .eq("status", "paid")
        .order("payment_date", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data?.map((sale: any) => ({
        id: sale.id,
        amount: sale.amount,
        payment_date: sale.payment_date,
        product_name: sale.products?.nome || "Produto",
        product_icon_light: sale.products?.icone_light || null,
        product_icon_dark: sale.products?.icone_dark || null,
        user_name: sale.unified_users?.name || "Usuário",
        environment: sale.environment,
      })) as RecentSale[];
    },
  });

  const endDay = startOfDay(new Date());
  const startDay = subDays(endDay, 29);
  const days30 = eachDayOfInterval({ start: startDay, end: endDay });

  // Get unique product names for chart
  const productNames = [...new Set(revenueDaily?.map(d => d.product_name || 'Produto') || [])];

  // Process revenue chart data (always fill last 30 days so sparse data still renders)
  const revenueByDay = new Map<string, Record<string, number>>();
  revenueDaily?.forEach((item) => {
    const dayKey = item.day;
    const productKey = item.product_name || "Produto";
    const existing = revenueByDay.get(dayKey) || {};
    existing[productKey] = Number(item.revenue);
    revenueByDay.set(dayKey, existing);
  });

  const revenueChartData = days30.map((day) => {
    const dayKey = format(day, "yyyy-MM-dd");
    const row: Record<string, any> = {
      day: dayKey,
      dayFormatted: format(day, "dd/MM", { locale: ptBR }),
    };

    const revenueForDay = revenueByDay.get(dayKey) || {};
    productNames.forEach((name) => {
      row[name] = revenueForDay[name] ?? 0;
    });

    return row;
  });

  // Process affiliates chart data (always fill last 30 days)
  const affiliatesByDay = new Map<string, number>();
  affiliatesDaily?.forEach((item) => {
    affiliatesByDay.set(item.day, Number(item.new_affiliates) || 0);
  });

  const affiliatesChartData = days30.map((day) => {
    const dayKey = format(day, "yyyy-MM-dd");
    return {
      day: dayKey,
      dayFormatted: format(day, "dd/MM", { locale: ptBR }),
      novos: affiliatesByDay.get(dayKey) ?? 0,
    };
  });

  // Get revenue value based on selected period
  const getProductRevenueByPeriod = (product: ProductStats) => {
    switch (productPeriod) {
      case "total": return Number(product.total_revenue);
      case "30_days": return Number(product.revenue_30_days);
      case "7_days": return Number(product.revenue_7_days);
      case "this_month": return Number(product.revenue_this_month);
      case "last_month": return Number(product.revenue_last_month);
      case "this_year": return Number(product.revenue_this_year);
      case "last_year": return Number(product.revenue_last_year);
      default: return Number(product.total_revenue);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <ScrollAnimation animation="fade-up">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard Administrativo</h1>
          <p className="text-muted-foreground">
            Visão geral de todas as métricas do sistema
          </p>
        </div>
      </ScrollAnimation>

      {/* Stats Cards - Row 1 */}
      <ScrollAnimation animation="fade-up" delay={100}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Affiliates */}
          <Card className="relative overflow-hidden hover:scale-[1.02] transition-transform duration-300">
            <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-primary/20 flex items-end justify-start pl-3 pb-3">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Afiliados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-primary">{stats?.total_affiliates || 0}</div>
                  <VariationIndicator 
                    current={stats?.affiliates_this_month || 0}
                    previous={stats?.affiliates_last_month || 0}
                    label="vs mês anterior"
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Active Subscriptions */}
          <Card className="relative overflow-hidden hover:scale-[1.02] transition-transform duration-300">
            <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-emerald-200/60 dark:bg-emerald-800/40 flex items-end justify-start pl-3 pb-3">
              <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Assinaturas Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats?.active_subscriptions || 0}</div>
                  <VariationIndicator 
                    current={stats?.subscriptions_this_month || 0}
                    previous={stats?.subscriptions_last_month || 0}
                    label="vs mês anterior"
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Revenue */}
          <Card className="relative overflow-hidden hover:scale-[1.02] transition-transform duration-300">
            <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-sky-200/60 dark:bg-sky-800/40 flex items-end justify-start pl-3 pb-3">
              <DollarSign className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receitas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">{formatCurrency(Number(stats?.total_revenue) || 0)}</div>
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    <div>Mês: {formatCurrency(Number(stats?.revenue_this_month) || 0)}</div>
                    <div>Hoje: {formatCurrency(Number(stats?.revenue_today) || 0)}</div>
                  </div>
                  <VariationIndicator 
                    current={Number(stats?.revenue_this_month) || 0}
                    previous={Number(stats?.revenue_last_month) || 0}
                    label="vs mês anterior"
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Commissions Paid */}
          <Card className="relative overflow-hidden hover:scale-[1.02] transition-transform duration-300">
            <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-violet-200/60 dark:bg-violet-800/40 flex items-end justify-start pl-3 pb-3">
              <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Comissões Pagas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">{formatCurrency(Number(stats?.commissions_paid_total) || 0)}</div>
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    <div>Mês: {formatCurrency(Number(stats?.commissions_paid_this_month) || 0)}</div>
                    <div>Hoje: {formatCurrency(Number(stats?.commissions_paid_today) || 0)}</div>
                  </div>
                  <VariationIndicator 
                    current={Number(stats?.commissions_paid_this_month) || 0}
                    previous={Number(stats?.commissions_paid_last_month) || 0}
                    label="vs mês anterior"
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollAnimation>

      {/* Pending Withdrawals Card */}
      <ScrollAnimation animation="fade-up" delay={150}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="relative overflow-hidden hover:scale-[1.02] transition-transform duration-300">
            <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-amber-200/60 dark:bg-amber-800/40 flex items-end justify-start pl-3 pb-3">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saques Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(Number(stats?.pending_withdrawals_amount) || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats?.pending_withdrawals_count || 0} saque(s) aguardando
                  </div>
                </>
              )}
            </CardContent>
          </Card>

        </div>
      </ScrollAnimation>

      {/* Recent Lists */}
      <ScrollAnimation animation="fade-up" delay={200}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recent Affiliates */}
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Novos Afiliados (Últimos 10)</CardTitle>
            </CardHeader>
            <CardContent>
              {!recentAffiliates ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : recentAffiliates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum afiliado recente
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {recentAffiliates.map(affiliate => (
                    <div key={affiliate.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={affiliate.avatar_url || undefined} alt={affiliate.name} />
                        <AvatarFallback className="text-xs">
                          {affiliate.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{affiliate.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{affiliate.email}</div>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {format(new Date(affiliate.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Sales */}
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-success" />
              <CardTitle className="text-base">Novas Vendas (Últimas 10)</CardTitle>
            </CardHeader>
            <CardContent>
              {!recentSales ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : recentSales.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma venda recente
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {recentSales.map(sale => (
                    <div key={sale.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      {(sale.product_icon_light || sale.product_icon_dark) && (
                        <img 
                          src={sale.product_icon_light || sale.product_icon_dark || ''} 
                          alt={sale.product_name}
                          className="h-8 w-8 rounded-md object-contain dark:hidden"
                        />
                      )}
                      {(sale.product_icon_dark || sale.product_icon_light) && (
                        <img 
                          src={sale.product_icon_dark || sale.product_icon_light || ''} 
                          alt={sale.product_name}
                          className="h-8 w-8 rounded-md object-contain hidden dark:block"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-success">{formatCurrency(sale.amount)}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {sale.product_name} - {sale.user_name}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {format(new Date(sale.payment_date), "dd/MM HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollAnimation>

      {/* Product Stats Card with Period Filter */}
      <ScrollAnimation animation="fade-up" delay={225}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Estatísticas por Produto
            </CardTitle>
            <Select value={productPeriod} onValueChange={setProductPeriod}>
              <SelectTrigger className="w-[160px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {productStatsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                {productStats?.map(product => (
                  <div key={product.product_id} className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate max-w-[200px]">{product.product_name}</span>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="text-xs">
                        {product.active_subscriptions} ativas
                      </Badge>
                      <span className="text-success font-medium min-w-[100px] text-right">
                        {formatCurrency(getProductRevenueByPeriod(product))}
                      </span>
                    </div>
                  </div>
                ))}
                {(!productStats || productStats.length === 0) && (
                  <div className="text-center text-muted-foreground py-2">
                    Nenhum produto encontrado
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </ScrollAnimation>

      {/* Charts */}
      <ScrollAnimation animation="fade-up" delay={250}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4 text-info" />
                Receitas Diárias por Produto (30 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {productNames.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Sem dados para exibir
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="dayFormatted" 
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => `R$${value}`}
                      className="text-muted-foreground"
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    {productNames.map((name, index) => (
                      <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={getProductColor(name, index)}
                        strokeWidth={2}
                        dot={{ r: 3, fill: getProductColor(name, index) }}
                        activeDot={{ r: 5 }}
                        connectNulls={true}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Affiliates Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-primary" />
                Novos Afiliados por Dia (30 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!affiliatesDaily || affiliatesDaily.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Sem dados para exibir
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={affiliatesChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="dayFormatted" 
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar 
                      dataKey="novos" 
                      fill="hsl(160 84% 39%)" 
                      radius={[4, 4, 0, 0]}
                      name="Novos Afiliados"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollAnimation>
    </div>
  );
};

export default AdminDashboard;
