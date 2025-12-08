import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useUser } from "@/contexts/UserContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, DollarSign, RefreshCw, X, Loader2, SlidersHorizontal, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { DatePickerFilter } from "@/components/DatePickerFilter";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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

const CommissionsDaily = ({ embedded = false, showValues = true }: CommissionsDailyProps) => {
  const isMobile = useIsMobile();
  const { userId } = useUser();
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
    data_fim: new Date(),
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

  // Mostrar/esconder filtros no mobile/tablet
  const [showFilters, setShowFilters] = useState(false);

  // Card expandido
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Agrupar comissões por data
  const groupedCommissions = commissions.reduce((groups, commission) => {
    const date = format(new Date(commission.data), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(commission);
    return groups;
  }, {} as Record<string, Commission[]>);

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
    const { data: productsData } = await supabase
      .from("products")
      .select("id, nome")
      .order("nome");
    
    setProducts(productsData || []);
  };

  const loadPlansForProduct = async (productId: string) => {
    if (!productId || productId === " ") {
      setPlans([]);
      return;
    }

    const { data: plansData } = await supabase
      .from("plans")
      .select("id, name")
      .eq("product_id", productId)
      .order("name");
    
    setPlans(plansData || []);
  };

  const loadStats = async () => {
    if (!userId) return;
    
    try {
      const { data: statsData } = await (supabase as any)
        .from("view_commissions_stats")
        .select("*")
        .eq("affiliate_id", userId)
        .single();

      if (statsData) {
        setStats({
          hoje: statsData.hoje || 0,
          ultimos_7_dias: statsData.ultimos_7_dias || 0,
          este_mes: statsData.este_mes || 0,
          count_hoje: statsData.count_hoje || 0,
          count_7_dias: statsData.count_7_dias || 0,
          count_mes: statsData.count_mes || 0,
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
      let query = (supabase as any)
        .from("view_commissions_daily")
        .select("*", { count: "exact" })
        .eq("affiliate_id", userId);

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
      
      const { data, error, count } = await query
        .order("data", { ascending: false, nullsFirst: false })
        .range(from, to);

      if (error) throw error;

      setCommissions(data || []);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      
      // Calcular total filtrado usando função RPC
      const { data: totalData } = await (supabase as any).rpc("get_commissions_total", {
        p_affiliate_id: userId,
        p_product_id: filters.product_id && filters.product_id.trim() && filters.product_id !== " " ? filters.product_id : null,
        p_plan_id: filters.plan_id && filters.plan_id.trim() && filters.plan_id !== " " ? filters.plan_id : null,
        p_cliente: debouncedCliente && debouncedCliente.trim() ? debouncedCliente : null,
        p_status: filters.status && filters.status.trim() && filters.status !== " " ? filters.status : null,
        p_data_inicio: filters.data_inicio ? format(filters.data_inicio, "yyyy-MM-dd") : null,
        p_data_fim: filters.data_fim ? format(filters.data_fim, "yyyy-MM-dd") : null,
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
      data_fim: new Date(),
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
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      // Garantir que a data/hora seja interpretada corretamente
      // Se vier do banco com timezone, usar diretamente
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: "Pendente", className: "bg-yellow-500/10 text-yellow-500" },
      available: { label: "Disponível", className: "bg-green-500/10 text-green-500" },
      withdrawn: { label: "Sacado", className: "bg-blue-500/10 text-blue-500" },
      cancelled: { label: "Cancelado", className: "bg-red-500/10 text-red-500" },
      requested: { label: "Solicitado", className: "bg-orange-500/10 text-orange-500" },
    };
    
    const config = statusMap[status] || { label: status, className: "bg-muted text-muted-foreground" };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getLevelBadge = (level: number) => {
    const levelColors: Record<number, string> = {
      1: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
      2: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
      3: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
      4: "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/30",
      5: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30",
    };

    const colorClass = levelColors[level] || "bg-muted text-muted-foreground border-border";

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-mono font-medium border ${colorClass}`}>
        N{level}
      </span>
    );
  };

  if (initialLoading && !hasLoadedOnce) {
    return <TableSkeleton title={embedded ? undefined : "Comissões Diárias"} columns={7} rows={5} showSearch />;
  }

  return (
    <div className={embedded ? "space-y-6" : "space-y-6 p-4 sm:p-6"}>
      {!embedded && (
        <div>
          <h1 className="text-3xl font-bold mb-2">Comissões Diárias</h1>
          <p className="text-muted-foreground">
            Acompanhe suas comissões dia a dia
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

      {showTimezoneWarning && (
        <div className="flex justify-end">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Horário de Brasília (GMT-3)
          </p>
        </div>
      )}

      {/* Botão de filtros mobile/tablet */}
      <div className="lg:hidden">
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {(filters.product_id || filters.plan_id || filters.status || clienteSearch) && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              !
            </Badge>
          )}
        </Button>
      </div>

      {/* Filtros - sempre visível no desktop, toggle no mobile/tablet */}
      <div className={`bg-card rounded-lg border p-6 ${showFilters ? 'block' : 'hidden lg:block'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Filtros</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFilters(false)}
            className="lg:hidden h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-9 gap-4">
          <Select 
            value={filters.product_id} 
            onValueChange={(value) => {
              setFilters(f => ({ ...f, product_id: value, plan_id: "" }));
              loadPlansForProduct(value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Produto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">Todos os produtos</SelectItem>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filters.product_id && filters.product_id !== " " && (
            <Select value={filters.plan_id} onValueChange={(value) => setFilters(f => ({ ...f, plan_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">Todos os planos</SelectItem>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <DatePickerFilter
            value={filters.data_inicio}
            onChange={(date) => setFilters(f => ({ ...f, data_inicio: date }))}
            placeholder="Data início"
          />

          <DatePickerFilter
            value={filters.data_fim}
            onChange={(date) => setFilters(f => ({ ...f, data_fim: date }))}
            placeholder="Data fim"
          />

          <Input
            placeholder="Cliente"
            value={clienteSearch}
            onChange={(e) => setClienteSearch(e.target.value)}
          />

          <Select value={filters.status} onValueChange={(value) => setFilters(f => ({ ...f, status: value }))}>
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

          <Select value={itemsPerPage.toString()} onValueChange={(value) => {
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

          <Button variant="outline" onClick={() => { loadStats(); loadCommissions(); }} disabled={isFiltering} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isFiltering ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Timeline de Comissões */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Histórico de Comissões
            {commissions.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {totalCount} registros
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 relative">
          {isFiltering && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          
          {commissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma comissão encontrada</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-480px)] pr-4">
              <div className="space-y-4">
                {Object.entries(groupedCommissions).map(([date, dayCommissions]) => (
                  <div key={date}>
                    {/* Data Header */}
                    <div className="sticky top-0 bg-background/95 backdrop-blur z-10 py-1.5 mb-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </div>
                    </div>

                    {/* Comissões do dia */}
                    <div className="relative pl-4 border-l-2 border-muted space-y-1">
                      {dayCommissions.map((commission) => (
                        <Collapsible
                          key={commission.id}
                          open={expandedIds.has(commission.id)}
                          onOpenChange={() => toggleExpanded(commission.id)}
                        >
                          <div className="relative">
                            {/* Dot na timeline */}
                            <div className="absolute -left-[17px] top-2.5 w-2 h-2 rounded-full bg-primary border-2 border-background" />
                            
                            <div className="py-1.5 px-3 rounded-md hover:bg-muted/40 transition-colors">
                              <div className="flex items-center gap-2">
                                {/* Ícone do produto */}
                                {(commission.product_icon_light || commission.product_icon_dark) && (
                                  <>
                                    <img 
                                      src={commission.product_icon_light || commission.product_icon_dark || ''} 
                                      alt={commission.produto} 
                                      className="w-6 h-6 object-contain rounded-full dark:hidden flex-shrink-0"
                                    />
                                    <img 
                                      src={commission.product_icon_dark || commission.product_icon_light || ''} 
                                      alt={commission.produto} 
                                      className="w-6 h-6 object-contain rounded-full hidden dark:block flex-shrink-0"
                                    />
                                  </>
                                )}
                                
                                {/* Cliente e descrição */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-sm truncate">{commission.cliente || "Sem nome"}</span>
                                    {commission.cliente_email && (
                                      <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                                        {commission.cliente_email}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-primary truncate">
                                    {commission.produto} • {commission.plano} • {formatCurrency(commission.valor)}
                                  </p>
                                </div>

                                {/* Status badge */}
                                {getStatusBadge(commission.status)}

                                {/* Nível */}
                                {getLevelBadge(commission.level)}

                                {/* Hora */}
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {format(new Date(commission.data), 'HH:mm')}
                                </span>

                                {/* Botão expandir */}
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    {expandedIds.has(commission.id) ? (
                                      <ChevronUp className="h-3.5 w-3.5" />
                                    ) : (
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                              </div>

                              <CollapsibleContent>
                                <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                  <div>
                                    <span className="text-muted-foreground">Produto:</span>
                                    <p className="font-medium">{commission.produto || "-"}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Plano:</span>
                                    <p className="font-medium">{commission.plano || "-"}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Percentual:</span>
                                    <p className="font-medium">{commission.percentual}%</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Valor:</span>
                                    <p className="font-medium text-primary">{formatCurrency(commission.valor)}</p>
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </div>
                          </div>
                        </Collapsible>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Total Filtrado */}
          {commissions.length > 0 && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total das comissões filtradas:</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(totalFiltrado)}</span>
              </div>
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount}
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {isMobile ? (
                    // Versão mobile - mostra apenas 3 páginas
                    Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
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
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })
                  ) : (
                    // Versão desktop - mostra mais páginas
                    [...Array(totalPages)].map((_, i) => {
                      const page = i + 1;
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      return null;
                    })
                  )}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
          {totalPages <= 1 && commissions.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground text-center">
                {commissions.length} registro(s) encontrado(s)
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CommissionsDaily;
