import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useUser } from "@/contexts/UserContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AnimatedTableRow } from "@/components/AnimatedTableRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Clock, DollarSign, RefreshCw, X, Loader2, SlidersHorizontal, LayoutList, LayoutGrid, Eye, ChevronUp, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { DatePickerFilter } from "@/components/DatePickerFilter";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ScrollAnimation } from "@/components/ScrollAnimation";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
interface Commission {
  id: string;
  data: string;
  produto: string;
  product_id: string;
  product_icon_light: string | null;
  product_icon_dark: string | null;
  cliente: string;
  cliente_email: string;
  plano: string;
  plan_id: string;
  percentual: number;
  valor: number;
  status: string;
  level: number;
  coupon_code: string | null;
  coupon_name: string | null;
}
interface Stats {
  hoje: number;
  ultimos_7_dias: number;
  este_mes: number;
  count_hoje: number;
  count_7_dias: number;
  count_mes: number;
}
interface CommissionsDailyProps {
  embedded?: boolean;
  showValues?: boolean;
}
const CommissionsDaily = ({
  embedded = false,
  showValues = true
}: CommissionsDailyProps) => {
  const isMobile = useIsMobile();
  const {
    userId
  } = useUser();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [stats, setStats] = useState<Stats>({
    hoje: 0,
    ultimos_7_dias: 0,
    este_mes: 0,
    count_hoje: 0,
    count_7_dias: 0,
    count_mes: 0
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);

  // Filtros - com datas padrão (últimos 7 dias)
  const [filters, setFilters] = useState<{
    product_id: string;
    plan_id: string;
    status: string;
    data_inicio: Date | undefined;
    data_fim: Date | undefined;
  }>({
    product_id: "",
    plan_id: "",
    status: "",
    data_inicio: subDays(new Date(), 7),
    data_fim: new Date()
  });
  const [clienteSearch, setClienteSearch] = useState("");
  const debouncedCliente = useDebounce(clienteSearch, 500);
  const [totalFiltrado, setTotalFiltrado] = useState(0);

  // Detectar se o usuário está fora do fuso horário GMT-3
  const [showTimezoneWarning, setShowTimezoneWarning] = useState(false);
  useEffect(() => {
    const userTimezoneOffset = new Date().getTimezoneOffset();
    const brazilTimezoneOffset = 180; // GMT-3 = +180 minutos
    setShowTimezoneWarning(userTimezoneOffset !== brazilTimezoneOffset);
  }, []);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Layout mode para mobile/tablet
  const [layoutMode, setLayoutMode] = useState<"compact" | "complete">("compact");

  // Mostrar/esconder filtros no mobile/tablet
  const [showFilters, setShowFilters] = useState(false);

  // Card expandido no modo compacto
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Carregar dados apenas quando filtros relevantes mudarem
  useEffect(() => {
    loadCommissions();
  }, [currentPage, itemsPerPage, filters.product_id, filters.plan_id, filters.status, filters.data_inicio, filters.data_fim, debouncedCliente]);

  // Carregar estatísticas apenas uma vez
  useEffect(() => {
    loadFiltersData();
    loadStats();
  }, []);
  const loadFiltersData = async () => {
    const {
      data: productsData
    } = await supabase.from("products").select("id, nome").order("nome");
    setProducts(productsData || []);
  };
  const loadPlansForProduct = async (productId: string) => {
    if (!productId || productId === " ") {
      setPlans([]);
      return;
    }
    const {
      data: plansData
    } = await supabase.from("plans").select("id, name").eq("product_id", productId).order("name");
    setPlans(plansData || []);
  };
  const loadStats = async () => {
    if (!userId) return;
    try {
      const {
        data: statsData
      } = await (supabase as any).from("view_commissions_stats").select("*").eq("affiliate_id", userId).single();
      if (statsData) {
        setStats({
          hoje: statsData.hoje || 0,
          ultimos_7_dias: statsData.ultimos_7_dias || 0,
          este_mes: statsData.este_mes || 0,
          count_hoje: statsData.count_hoje || 0,
          count_7_dias: statsData.count_7_dias || 0,
          count_mes: statsData.count_mes || 0
        });
      }
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };
  const loadCommissions = async () => {
    if (!userId) return;

    // Usar hasLoadedOnce em vez de commissions.length
    if (hasLoadedOnce) {
      setIsFiltering(true);
    } else {
      setInitialLoading(true);
    }
    try {
      // Construir query com filtros
      let query = (supabase as any).from("view_commissions_daily").select("*", {
        count: "exact"
      }).eq("affiliate_id", userId);
      if (filters.product_id && filters.product_id.trim() && filters.product_id !== " ") {
        query = query.eq("product_id", filters.product_id);
      }
      if (filters.plan_id && filters.plan_id.trim() && filters.plan_id !== " ") {
        query = query.eq("plan_id", filters.plan_id);
      }
      if (debouncedCliente && debouncedCliente.trim()) {
        query = query.ilike("cliente", `%${debouncedCliente}%`);
      }
      if (filters.status && filters.status.trim() && filters.status !== " ") {
        query = query.eq("status", filters.status);
      }
      if (filters.data_inicio) {
        query = query.gte("data_filtro", format(filters.data_inicio, "yyyy-MM-dd"));
      }
      if (filters.data_fim) {
        query = query.lte("data_filtro", format(filters.data_fim, "yyyy-MM-dd"));
      }

      // Paginação
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      const {
        data,
        error,
        count
      } = await query.order("data", {
        ascending: false,
        nullsFirst: false
      }).range(from, to);
      if (error) throw error;
      setCommissions(data || []);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));

      // Calcular total filtrado usando função RPC
      const {
        data: totalData
      } = await (supabase as any).rpc("get_commissions_total", {
        p_affiliate_id: userId,
        p_product_id: filters.product_id && filters.product_id.trim() && filters.product_id !== " " ? filters.product_id : null,
        p_plan_id: filters.plan_id && filters.plan_id.trim() && filters.plan_id !== " " ? filters.plan_id : null,
        p_cliente: debouncedCliente && debouncedCliente.trim() ? debouncedCliente : null,
        p_status: filters.status && filters.status.trim() && filters.status !== " " ? filters.status : null,
        p_data_inicio: filters.data_inicio ? format(filters.data_inicio, "yyyy-MM-dd") : null,
        p_data_fim: filters.data_fim ? format(filters.data_fim, "yyyy-MM-dd") : null
      });
      const total = Number(totalData) || 0;
      setTotalFiltrado(total);
    } catch (error) {
      console.error("Erro ao carregar comissões:", error);
      toast.error("Erro ao carregar comissões");
    } finally {
      setInitialLoading(false);
      setIsFiltering(false);
      setHasLoadedOnce(true);
    }
  };
  const clearFilters = () => {
    setFilters({
      product_id: "",
      plan_id: "",
      status: "",
      data_inicio: subDays(new Date(), 7),
      data_fim: new Date()
    });
    setClienteSearch("");
    setPlans([]);
    setCurrentPage(1);
  };
  const formatCurrency = (value: number, hideValue: boolean = false) => {
    if (hideValue || !showValues) {
      return "R$ •••••";
    }
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      // Garantir que a data/hora seja interpretada corretamente
      // Se vier do banco com timezone, usar diretamente
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy HH:mm", {
        locale: ptBR
      });
    } catch {
      return "-";
    }
  };
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, {
      label: string;
      className: string;
    }> = {
      pending: {
        label: "Pendente",
        className: "bg-yellow-500/10 text-yellow-500"
      },
      available: {
        label: "Disponível",
        className: "bg-green-500/10 text-green-500"
      },
      withdrawn: {
        label: "Sacado",
        className: "bg-blue-500/10 text-blue-500"
      },
      cancelled: {
        label: "Cancelado",
        className: "bg-red-500/10 text-red-500"
      },
      requested: {
        label: "Solicitado",
        className: "bg-orange-500/10 text-orange-500"
      }
    };
    const config = statusMap[status] || {
      label: status,
      className: "bg-muted text-muted-foreground"
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>;
  };
  const getLevelBadge = (level: number) => {
    const levelColors: Record<number, string> = {
      1: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
      2: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
      3: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
      4: "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/30",
      5: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30"
    };
    const colorClass = levelColors[level] || "bg-muted text-muted-foreground border-border";
    return <span className={`px-2 py-1 rounded-full text-xs font-mono font-medium border ${colorClass}`}>
        N{level}
      </span>;
  };
  if (initialLoading && !hasLoadedOnce) {
    return <TableSkeleton title={embedded ? undefined : "Comissões Diárias"} columns={7} rows={5} showSearch />;
  }
  return <div className={embedded ? "space-y-6" : "space-y-6 p-4 sm:p-6"}>
      {!embedded && <div>
          <h1 className="text-3xl font-bold mb-2">Comissões Diárias</h1>
          <p className="text-muted-foreground">
            Acompanhe suas comissões dia a dia
          </p>
        </div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ScrollAnimation animation="fade-up" delay={0}>
          <Card className="relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
            <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-emerald-200/60 dark:bg-emerald-800/40 flex items-end justify-start pl-4 pb-4">
              <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.hoje)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.count_hoje} {stats.count_hoje === 1 ? 'comissão' : 'comissões'}
              </p>
            </CardContent>
          </Card>
        </ScrollAnimation>

        <ScrollAnimation animation="fade-up" delay={100}>
          <Card className="relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
            <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-sky-200/60 dark:bg-sky-800/40 flex items-end justify-start pl-4 pb-4">
              <Calendar className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Últimos 7 dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">{formatCurrency(stats.ultimos_7_dias)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.count_7_dias} {stats.count_7_dias === 1 ? 'comissão' : 'comissões'}
              </p>
            </CardContent>
          </Card>
        </ScrollAnimation>

        <ScrollAnimation animation="fade-up" delay={200}>
          <Card className="relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
            <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-violet-200/60 dark:bg-violet-800/40 flex items-end justify-start pl-4 pb-4">
              <DollarSign className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Este Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">{formatCurrency(stats.este_mes)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.count_mes} {stats.count_mes === 1 ? 'comissão' : 'comissões'}
              </p>
            </CardContent>
          </Card>
        </ScrollAnimation>
      </div>

      {showTimezoneWarning && <div className="flex justify-end">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Horário de Brasília (GMT-3)
          </p>
        </div>}

      {/* Botão de filtros mobile/tablet */}
      <div className="lg:hidden flex items-center justify-between">
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {(filters.product_id || filters.plan_id || filters.status || clienteSearch) && <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              !
            </Badge>}
        </Button>
        
        {/* Layout mode selector - mobile/tablet */}
        <ToggleGroup type="single" value={layoutMode} onValueChange={value => value && setLayoutMode(value as "compact" | "complete")}>
          <ToggleGroupItem value="compact" aria-label="Layout compacto" className="px-3">
            <LayoutList className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="complete" aria-label="Layout completo" className="px-3">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Filtros - sempre visível no desktop, toggle no mobile/tablet */}
      <div className={`bg-card rounded-lg border p-6 ${showFilters ? 'block' : 'hidden lg:block'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Filtros</h2>
          <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)} className="lg:hidden h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-9 gap-4">
          <Select value={filters.product_id} onValueChange={value => {
          setFilters(f => ({
            ...f,
            product_id: value,
            plan_id: ""
          }));
          loadPlansForProduct(value);
        }}>
            <SelectTrigger>
              <SelectValue placeholder="Produto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">Todos os produtos</SelectItem>
              {products.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>

          {filters.product_id && filters.product_id !== " " && <Select value={filters.plan_id} onValueChange={value => setFilters(f => ({
          ...f,
          plan_id: value
        }))}>
              <SelectTrigger>
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">Todos os planos</SelectItem>
                {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>}

          <DatePickerFilter value={filters.data_inicio} onChange={date => setFilters(f => ({
          ...f,
          data_inicio: date
        }))} placeholder="Data início" />

          <DatePickerFilter value={filters.data_fim} onChange={date => setFilters(f => ({
          ...f,
          data_fim: date
        }))} placeholder="Data fim" />

          <Input placeholder="Cliente" value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} />

          <Select value={filters.status} onValueChange={value => setFilters(f => ({
          ...f,
          status: value
        }))}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">Todos os status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="available">Disponível</SelectItem>
              <SelectItem value="withdrawn">Sacado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={itemsPerPage.toString()} onValueChange={value => {
          setItemsPerPage(Number(value));
          setCurrentPage(1);
        }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 por página</SelectItem>
              <SelectItem value="20">20 por página</SelectItem>
              <SelectItem value="50">50 por página</SelectItem>
              <SelectItem value="100">100 por página</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={clearFilters} className="gap-2">
            <X className="h-4 w-4" />
            Limpar filtros
          </Button>

          <Button variant="outline" onClick={() => {
          loadStats();
          loadCommissions();
        }} disabled={isFiltering} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isFiltering ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <Card className={isMobile ? "bg-transparent border-0 shadow-none" : ""}>
        <CardHeader className={isMobile ? "hidden" : ""}>
          <CardTitle>Histórico Diário</CardTitle>
        </CardHeader>
        <CardContent className={isMobile ? "p-0" : ""}>
          <div className="relative">
            {isFiltering && <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>}
            {isMobile ? <div className="md:-mx-6 lg:mx-0">
                {commissions.length === 0 ? <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      Nenhuma comissão registrada
                    </CardContent>
                  </Card> : (() => {
              // Agrupar por data para mobile
              const groupedByDate: Record<string, Commission[]> = {};
              commissions.forEach(commission => {
                const dateKey = format(new Date(commission.data), 'yyyy-MM-dd');
                if (!groupedByDate[dateKey]) {
                  groupedByDate[dateKey] = [];
                }
                groupedByDate[dateKey].push(commission);
              });
              const dateEntries = Object.entries(groupedByDate);
              return dateEntries.map(([dateKey, dayCommissions], dayIndex) => <div key={dateKey} className="mb-4">
                        {/* Header da data */}
                        <div className="flex items-center gap-2.5 py-3 px-1">
                          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
                            <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                          </div>
                          <span className="text-sm font-semibold text-foreground/80">
                            {format(new Date(dateKey), "EEEE, d 'de' MMMM 'de' yyyy", {
                      locale: ptBR
                    })}
                          </span>
                        </div>
                        
                        {/* Comissões do dia com timeline */}
                        <div className="relative pl-7">
                          {/* Linha vertical contínua */}
                          <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-primary/40" />
                          
                          <div className="space-y-3">
                            {dayCommissions.map((commission, idx) => {
                      const isLast = idx === dayCommissions.length - 1;
                      return <ScrollAnimation key={commission.id} animation="fade-up" delay={Math.min(idx * 50, 200)} threshold={0.05}>
                                  <div className="relative">
                                    {/* Ponto verde - centralizado verticalmente com o card */}
                                    <div className="absolute left-[-22px] top-1/2 -translate-y-1/2 z-20 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                                    
                                    {/* Cortar linha após último item */}
                                    {isLast}
                                    
                                    <Card className="transition-all duration-300 hover:scale-[1.01] hover:shadow-md">
                                      <CardContent className="p-4 space-y-3">
                                        {layoutMode === "compact" && expandedCardId !== commission.id ?
                              // Layout Compacto
                              <div className="flex items-center justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                              <div className="font-semibold text-sm truncate">{commission.cliente || "Sem nome"}</div>
                                              <div className="text-xs text-muted-foreground truncate">{commission.produto || "-"}</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                              <div className="text-right">
                                                <div className="text-[10px] text-muted-foreground">{format(new Date(commission.data), 'HH:mm')}</div>
                                                <div className="font-bold text-sm text-success">{formatCurrency(commission.valor)}</div>
                                              </div>
                                              <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8" onClick={() => setExpandedCardId(commission.id)} title="Ver detalhes">
                                                <Eye className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div> :
                              // Layout Completo
                              <>
                                            <div className="flex justify-between items-start gap-2">
                                              <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{commission.cliente || "Sem nome"}</p>
                                                <p className="text-xs text-muted-foreground truncate">{commission.cliente_email || "-"}</p>
                                              </div>
                                              {getStatusBadge(commission.status)}
                                            </div>
                                            
                                            <div className="flex justify-between items-center">
                                              <span className="text-lg font-bold text-success">{formatCurrency(commission.valor)}</span>
                                              {getLevelBadge(commission.level)}
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                              <div>
                                                <span className="text-muted-foreground">Produto:</span>
                                                <p className="font-medium truncate">{commission.produto || "-"}</p>
                                              </div>
                                              <div>
                                                <span className="text-muted-foreground">Plano:</span>
                                                <p className="font-medium truncate">{commission.plano || "-"}</p>
                                              </div>
                                              {commission.coupon_code && (
                                                <div className="col-span-2">
                                                  <span className="text-muted-foreground">Cupom:</span>
                                                  <p className="font-medium">{commission.coupon_code} {commission.coupon_name && <span className="text-muted-foreground font-normal">• {commission.coupon_name}</span>}</p>
                                                </div>
                                              )}
                                            </div>

                                            <div className="flex items-center justify-between text-xs">
                                              <span className="text-muted-foreground">Comissão: {commission.percentual}%</span>
                                              <span className="text-muted-foreground">{format(new Date(commission.data), 'HH:mm')}</span>
                                            </div>
                                            
                                            {layoutMode === "compact" && expandedCardId === commission.id && <div className="flex justify-end pt-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedCardId(null)} title="Fechar">
                                                  <ChevronUp className="h-4 w-4" />
                                                </Button>
                                              </div>}
                                          </>}
                                      </CardContent>
                                    </Card>
                                  </div>
                                </ScrollAnimation>;
                    })}
                          </div>
                        </div>
                      </div>);
            })()}
              </div> : <Table className={isFiltering ? "pointer-events-none" : ""}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Cupom</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Percentual</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.length === 0 ? <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        Nenhuma comissão registrada
                      </TableCell>
                    </TableRow> : (() => {
                // Agrupar por data
                const groupedByDate: Record<string, Commission[]> = {};
                commissions.forEach(commission => {
                  const dateKey = format(new Date(commission.data), 'yyyy-MM-dd');
                  if (!groupedByDate[dateKey]) {
                    groupedByDate[dateKey] = [];
                  }
                  groupedByDate[dateKey].push(commission);
                });
                let rowIndex = 0;
                const dateEntries = Object.entries(groupedByDate);
                return dateEntries.map(([dateKey, dayCommissions], dayIndex) => <>
                          {/* Header da data */}
                          <TableRow key={`header-${dateKey}`} className="bg-muted/30 hover:bg-muted/30 border-t border-border">
                            <TableCell colSpan={9} className="py-2.5 relative">
                              <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground/80 whitespace-nowrap">
                                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
                                  <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                                </div>
                                <span>{format(new Date(dateKey), "EEEE, d 'de' MMMM 'de' yyyy", {
                            locale: ptBR
                          })}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                          {/* Comissões do dia */}
                          {dayCommissions.map((commission, idx) => {
                    const currentIndex = rowIndex++;
                    const isFirstOfDay = idx === 0;
                    const isLastOfDay = idx === dayCommissions.length - 1;
                    const isLastDayGroup = dayIndex === dateEntries.length - 1;
                    const isVeryLast = isLastOfDay && isLastDayGroup;
                    return <AnimatedTableRow key={commission.id} className="hover:bg-muted/50 border-0" delay={Math.min(currentIndex * 30, 150)}>
                                <TableCell className="relative border-0">
                                  {/* Linha vertical - contínua, posicionada no nível da célula */}
                                  <div className={cn("absolute left-[21px] w-0.5 bg-primary/40", isFirstOfDay && isLastOfDay ? "top-1/2 h-0" : isFirstOfDay ? "top-1/2 -bottom-1" : isLastOfDay ? "-top-1 bottom-1/2" : "-top-1 -bottom-1")} />
                                  <div className="flex items-center gap-2 relative">
                                    {/* Ponto verde */}
                                    <div className="relative z-10 w-3 h-3 rounded-full bg-primary border-2 border-background flex-shrink-0" />
                                    <span>{format(new Date(commission.data), 'HH:mm')}</span>
                                  </div>
                                  {/* Linha horizontal que começa após a timeline */}
                                  <div className="absolute right-0 bottom-0 left-[40px] h-px bg-border" />
                                </TableCell>
                                <TableCell className="border-0 relative">
                                  <div className="flex items-center gap-2">
                                    {(commission.product_icon_light || commission.product_icon_dark) && <>
                                        <img src={commission.product_icon_light || commission.product_icon_dark || ''} alt={commission.produto} className="w-5 h-5 object-contain rounded-full dark:hidden" />
                                        <img src={commission.product_icon_dark || commission.product_icon_light || ''} alt={commission.produto} className="w-5 h-5 object-contain rounded-full hidden dark:block" />
                                      </>}
                                    <span>{commission.produto || "-"}</span>
                                  </div>
                                  <div className="absolute right-0 bottom-0 left-0 h-px bg-border" />
                                </TableCell>
                                <TableCell className="border-0 relative">
                                  <div>
                                    <div className="font-medium">{commission.cliente || "-"}</div>
                                    <div className="text-xs text-muted-foreground">{commission.cliente_email || "-"}</div>
                                  </div>
                                  <div className="absolute right-0 bottom-0 left-0 h-px bg-border" />
                                </TableCell>
                                <TableCell className="border-0 relative">
                                  {commission.plano || "-"}
                                  <div className="absolute right-0 bottom-0 left-0 h-px bg-border" />
                                </TableCell>
                                <TableCell className="border-0 relative">
                                  {commission.coupon_code ? (
                                    <div className="flex flex-col">
                                      <span className="font-medium text-xs">{commission.coupon_code}</span>
                                      {commission.coupon_name && (
                                        <span className="text-xs text-muted-foreground">{commission.coupon_name}</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                  <div className="absolute right-0 bottom-0 left-0 h-px bg-border" />
                                </TableCell>
                                <TableCell className="border-0 relative">
                                  {getLevelBadge(commission.level)}
                                  <div className="absolute right-0 bottom-0 left-0 h-px bg-border" />
                                </TableCell>
                                <TableCell className="border-0 relative">
                                  {commission.percentual}%
                                  <div className="absolute right-0 bottom-0 left-0 h-px bg-border" />
                                </TableCell>
                                <TableCell className="border-0 relative font-medium">
                                  {formatCurrency(commission.valor)}
                                  <div className="absolute right-0 bottom-0 left-0 h-px bg-border" />
                                </TableCell>
                                <TableCell className="border-0 relative">
                                  {getStatusBadge(commission.status)}
                                  <div className="absolute right-0 bottom-0 left-0 h-px bg-border" />
                                </TableCell>
                              </AnimatedTableRow>;
                  })}
                        </>);
              })()}
                </TableBody>
              </Table>}
          </div>

          {/* Total Filtrado */}
          {commissions.length > 0 && <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total das comissões filtradas:</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(totalFiltrado)}</span>
              </div>
            </div>}

          {/* Paginação */}
          {totalPages > 1 && <div className="mt-4 flex flex-col lg:flex-row items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount}
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                  </PaginationItem>
                  
                  {isMobile ?
              // Versão mobile - mostra apenas 3 páginas
              Array.from({
                length: Math.min(3, totalPages)
              }, (_, i) => {
                let page;
                if (totalPages <= 3) {
                  page = i + 1;
                } else if (currentPage <= 2) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 1) {
                  page = totalPages - 2 + i;
                } else {
                  page = currentPage - 1 + i;
                }
                return <PaginationItem key={page}>
                          <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page} className="cursor-pointer">
                            {page}
                          </PaginationLink>
                        </PaginationItem>;
              }) :
              // Versão desktop - mostra mais páginas
              [...Array(totalPages)].map((_, i) => {
                const page = i + 1;
                if (page === 1 || page === totalPages || page >= currentPage - 1 && page <= currentPage + 1) {
                  return <PaginationItem key={page}>
                            <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page} className="cursor-pointer">
                              {page}
                            </PaginationLink>
                          </PaginationItem>;
                }
                return null;
              })}
                  
                  <PaginationItem>
                    <PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>}
          {totalPages <= 1 && commissions.length > 0 && <div className="mt-4">
              <p className="text-sm text-muted-foreground text-center">
                {commissions.length} registro(s) encontrado(s)
              </p>
            </div>}
        </CardContent>
      </Card>
    </div>;
};
export default CommissionsDaily;