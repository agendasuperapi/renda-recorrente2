import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AnimatedTableRow } from "@/components/AnimatedTableRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Clock, DollarSign, RefreshCw, X, Loader2, SlidersHorizontal, LayoutList, LayoutGrid, Eye, ChevronUp, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { DatePickerFilter } from "@/components/DatePickerFilter";
import { toast } from "sonner";
import { format, subDays, differenceInDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ScrollAnimation } from "@/components/ScrollAnimation";

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
  affiliate_id: string;
  affiliate_name: string;
  billing_reason: string | null;
  purchase_number: number | null;
}

export const AdminCommissionsTab = () => {
  const isMobile = useIsMobile();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);

  // Buscar dias para liberar comissão do app_settings
  const { data: daysToAvailable = 30 } = useQuery({
    queryKey: ['commission-days-to-available'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'commission_days_to_available')
        .maybeSingle();
      return data?.value ? parseInt(data.value) : 30;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

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
  const [affiliateSearch, setAffiliateSearch] = useState("");
  const debouncedCliente = useDebounce(clienteSearch, 500);
  const debouncedAffiliate = useDebounce(affiliateSearch, 500);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const [layoutMode, setLayoutMode] = useState<"compact" | "complete">("compact");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  useEffect(() => {
    loadCommissions();
  }, [currentPage, itemsPerPage, filters.product_id, filters.plan_id, filters.status, filters.data_inicio, filters.data_fim, debouncedCliente, debouncedAffiliate]);

  useEffect(() => {
    loadFiltersData();
  }, []);

  const loadFiltersData = async () => {
    const { data: productsData } = await supabase
      .from("products")
      .select("id, nome, icone_light, icone_dark")
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

  const loadCommissions = async () => {
    if (hasLoadedOnce) {
      setIsFiltering(true);
    } else {
      setInitialLoading(true);
    }
    try {
      let query = (supabase as any)
        .from("view_commissions_daily")
        .select("*, profiles!inner(name)", { count: "exact" });

      if (filters.product_id && filters.product_id.trim() && filters.product_id !== " ") {
        query = query.eq("product_id", filters.product_id);
      }
      if (filters.plan_id && filters.plan_id.trim() && filters.plan_id !== " ") {
        query = query.eq("plan_id", filters.plan_id);
      }
      if (debouncedCliente && debouncedCliente.trim()) {
        query = query.ilike("cliente", `%${debouncedCliente}%`);
      }
      if (debouncedAffiliate && debouncedAffiliate.trim()) {
        query = query.ilike("profiles.name", `%${debouncedAffiliate}%`);
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

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error, count } = await query
        .order("data", { ascending: false, nullsFirst: false })
        .range(from, to);

      if (error) throw error;

      const commissionsWithAffiliate = (data || []).map((c: any) => ({
        ...c,
        affiliate_name: c.profiles?.name || "-"
      }));

      setCommissions(commissionsWithAffiliate);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
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
    setAffiliateSearch("");
    setPlans([]);
    setCurrentPage(1);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };

  const getStatusBadge = (status: string, paymentDate?: string) => {
    // Calcular dias restantes para comissões pendentes
    let daysRemaining = 0;
    if (status === 'pending' && paymentDate) {
      const payment = new Date(paymentDate);
      const availableDate = addDays(payment, daysToAvailable);
      daysRemaining = differenceInDays(availableDate, new Date());
      if (daysRemaining < 0) daysRemaining = 0;
    }

    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { 
        label: daysRemaining > 0 ? `Libera em ${daysRemaining}d` : "Pendente", 
        className: "bg-yellow-500/10 text-yellow-500" 
      },
      available: { label: "Disponível", className: "bg-green-500/10 text-green-500" },
      withdrawn: { label: "Sacado", className: "bg-blue-500/10 text-blue-500" },
      cancelled: { label: "Cancelado", className: "bg-red-500/10 text-red-500" },
      requested: { label: "Solicitado", className: "bg-orange-500/10 text-orange-500" }
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
      5: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30"
    };
    const colorClass = levelColors[level] || "bg-muted text-muted-foreground border-border";
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-mono font-medium border ${colorClass}`}>
        N{level}
      </span>
    );
  };

  const getClientTypeBadge = (billingReason: string | null, purchaseNumber: number | null) => {
    if (billingReason === 'subscription_create' || billingReason === 'primeira_venda') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
          ✨ Novo
        </span>
      );
    }
    
    if (billingReason === 'subscription_cycle' || billingReason === 'renovacao') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/30">
          🔄 Renovação
        </span>
      );
    }
    
    if ((billingReason === 'one_time_purchase' || billingReason === 'venda_avulsa') && purchaseNumber) {
      if (purchaseNumber === 1) {
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
            ✨ 1ª compra
          </span>
        );
      }
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          {purchaseNumber}ª compra
        </span>
      );
    }
    
    return null;
  };

  if (initialLoading && !hasLoadedOnce) {
    return <TableSkeleton columns={10} rows={5} showSearch />;
  }

  return (
    <div className="space-y-6">
      {/* Botão de filtros mobile/tablet */}
      <div className="lg:hidden flex items-center justify-between">
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
        </Button>
        
        <ToggleGroup type="single" value={layoutMode} onValueChange={value => value && setLayoutMode(value as "compact" | "complete")}>
          <ToggleGroupItem value="compact" aria-label="Layout compacto" className="px-3">
            <LayoutList className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="complete" aria-label="Layout completo" className="px-3">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Filtros */}
      <div className={`bg-card rounded-lg border p-6 ${showFilters ? 'block' : 'hidden lg:block'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Filtros</h2>
          <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)} className="lg:hidden h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Input 
            placeholder="Afiliado" 
            value={affiliateSearch} 
            onChange={e => setAffiliateSearch(e.target.value)} 
          />

          <Select value={filters.product_id} onValueChange={value => {
            setFilters(f => ({ ...f, product_id: value, plan_id: "" }));
            loadPlansForProduct(value);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Produto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">Todos os produtos</SelectItem>
              {products.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filters.product_id && filters.product_id !== " " && (
            <Select value={filters.plan_id} onValueChange={value => setFilters(f => ({ ...f, plan_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">Todos os planos</SelectItem>
                {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          <DatePickerFilter 
            value={filters.data_inicio} 
            onChange={date => setFilters(f => ({ ...f, data_inicio: date }))} 
            placeholder="Data início" 
          />

          <DatePickerFilter 
            value={filters.data_fim} 
            onChange={date => setFilters(f => ({ ...f, data_fim: date }))} 
            placeholder="Data fim" 
          />

          <Input placeholder="Cliente" value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} />

          <Select value={filters.status} onValueChange={value => setFilters(f => ({ ...f, status: value }))}>
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
            Limpar
          </Button>

          <Button variant="outline" onClick={loadCommissions} disabled={isFiltering} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isFiltering ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <Card className={isMobile ? "bg-transparent border-0 shadow-none" : ""}>
        <CardHeader className={isMobile ? "hidden" : ""}>
          <CardTitle>Todas as Comissões ({totalCount})</CardTitle>
        </CardHeader>
        <CardContent className={isMobile ? "p-0" : ""}>
          <div className="relative">
            {isFiltering && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {isMobile ? (
              <div className="md:-mx-6 lg:mx-0">
                {commissions.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      Nenhuma comissão registrada
                    </CardContent>
                  </Card>
                ) : (() => {
                  const groupedByDate: Record<string, Commission[]> = {};
                  commissions.forEach(commission => {
                    const dateKey = format(new Date(commission.data), 'yyyy-MM-dd');
                    if (!groupedByDate[dateKey]) {
                      groupedByDate[dateKey] = [];
                    }
                    groupedByDate[dateKey].push(commission);
                  });
                  const dateEntries = Object.entries(groupedByDate);
                  return dateEntries.map(([dateKey, dayCommissions]) => (
                    <div key={dateKey} className="mb-4">
                      <div className="flex items-center gap-2.5 py-3 px-1">
                        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
                          <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                        </div>
                        <span className="text-sm font-semibold text-foreground/80">
                          {format(new Date(dateKey), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      
                      <div className="relative pl-7">
                        <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-primary/40" />
                        
                        <div className="space-y-3">
                          {dayCommissions.map((commission, idx) => {
                            const isLast = idx === dayCommissions.length - 1;
                            return (
                              <ScrollAnimation key={commission.id} animation="fade-up" delay={Math.min(idx * 50, 200)} threshold={0.05}>
                                <div className="relative">
                                  <div className="absolute left-[-22px] top-1/2 -translate-y-1/2 z-20 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                                  
                                  <Card className="transition-all duration-300 hover:scale-[1.01] hover:shadow-md">
                                    <CardContent className="p-4 space-y-3">
                                      {layoutMode === "compact" && expandedCardId !== commission.id ? (
                                        <div className="flex items-center justify-between gap-3">
                                          {commission.product_icon_light && (
                                            <img 
                                              src={commission.product_icon_light} 
                                              alt={commission.produto} 
                                              className="w-8 h-8 rounded-md object-contain flex-shrink-0 dark:hidden"
                                            />
                                          )}
                                          {commission.product_icon_dark && (
                                            <img 
                                              src={commission.product_icon_dark} 
                                              alt={commission.produto} 
                                              className="w-8 h-8 rounded-md object-contain flex-shrink-0 hidden dark:block"
                                            />
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-sm truncate">{commission.affiliate_name}</div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="text-xs text-muted-foreground truncate">{commission.cliente || "Sem nome"}</span>
                                              {getClientTypeBadge(commission.billing_reason, commission.purchase_number)}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <div className="text-right">
                                              <div className="text-[10px] text-muted-foreground">{format(new Date(commission.data), 'HH:mm')}</div>
                                              <div className="font-bold text-sm text-success">{formatCurrency(commission.valor)}</div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8" onClick={() => setExpandedCardId(commission.id)}>
                                              <Eye className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex justify-between items-start gap-2">
                                            {commission.product_icon_light && (
                                              <img 
                                                src={commission.product_icon_light} 
                                                alt={commission.produto} 
                                                className="w-10 h-10 rounded-md object-contain flex-shrink-0 dark:hidden"
                                              />
                                            )}
                                            {commission.product_icon_dark && (
                                              <img 
                                                src={commission.product_icon_dark} 
                                                alt={commission.produto} 
                                                className="w-10 h-10 rounded-md object-contain flex-shrink-0 hidden dark:block"
                                              />
                                            )}
                                            <div className="flex-1 min-w-0">
                                              <p className="font-medium text-sm truncate">{commission.affiliate_name}</p>
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-xs text-muted-foreground truncate">{commission.cliente || "Sem nome"}</p>
                                                {getClientTypeBadge(commission.billing_reason, commission.purchase_number)}
                                              </div>
                                            </div>
                                            {getStatusBadge(commission.status, commission.data)}
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
                                          </div>

                                          <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">Comissão: {commission.percentual}%</span>
                                            <span className="text-muted-foreground">{format(new Date(commission.data), 'HH:mm')}</span>
                                          </div>
                                          
                                          {layoutMode === "compact" && expandedCardId === commission.id && (
                                            <div className="flex justify-end pt-1">
                                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedCardId(null)}>
                                                <ChevronUp className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </CardContent>
                                  </Card>
                                </div>
                              </ScrollAnimation>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <Table className={isFiltering ? "pointer-events-none" : ""}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead>Afiliado</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Percentual</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        Nenhuma comissão registrada
                      </TableCell>
                    </TableRow>
                  ) : (() => {
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
                    return dateEntries.map(([dateKey, dayCommissions], dayIndex) => (
                      <>
                        <TableRow key={`header-${dateKey}`} className="bg-muted/30 hover:bg-muted/30 border-t border-border">
                          <TableCell colSpan={10} className="py-2.5 relative">
                            <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground/80 whitespace-nowrap">
                              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
                                <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                              </div>
                              <span>{format(new Date(dateKey), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                        {dayCommissions.map((commission, idx) => {
                          const currentIndex = rowIndex++;
                          const isFirstOfDay = idx === 0;
                          const isLastOfDay = idx === dayCommissions.length - 1;
                          const isLastDayGroup = dayIndex === dateEntries.length - 1;
                          return (
                            <AnimatedTableRow key={commission.id} className="hover:bg-muted/50 border-0" delay={Math.min(currentIndex * 30, 150)}>
                              <TableCell className="relative border-0">
                                <div className={cn(
                                  "absolute left-[21px] w-0.5 bg-primary/40",
                                  isFirstOfDay && isLastOfDay ? "top-1/2 h-0" : isFirstOfDay ? "top-1/2 -bottom-1" : isLastOfDay ? "-top-1 bottom-1/2" : "-top-1 -bottom-1"
                                )} />
                                <div className="flex items-center gap-2 relative">
                                  <div className="relative z-10 w-3 h-3 rounded-full bg-primary border-2 border-background flex-shrink-0" />
                                  <span>{format(new Date(commission.data), 'HH:mm')}</span>
                                </div>
                                <div className="absolute right-0 bottom-0 left-[40px] h-px bg-border" />
                              </TableCell>
                              <TableCell className="font-medium">{commission.affiliate_name}</TableCell>
                              <TableCell className="relative border-0">
                                <div className="flex items-center gap-2">
                                  {commission.product_icon_light && (
                                    <img src={commission.product_icon_light} alt={commission.produto} className="w-6 h-6 rounded object-contain dark:hidden" />
                                  )}
                                  {commission.product_icon_dark && (
                                    <img src={commission.product_icon_dark} alt={commission.produto} className="w-6 h-6 rounded object-contain hidden dark:block" />
                                  )}
                                  <span className="truncate max-w-[120px]">{commission.produto || "-"}</span>
                                </div>
                                <div className="absolute right-0 bottom-0 left-0 h-px bg-border" />
                              </TableCell>
                              <TableCell className="relative border-0">
                                <span>{commission.cliente || "-"}</span>
                                <div className="absolute right-0 bottom-0 left-0 h-px bg-border" />
                              </TableCell>
                              <TableCell className="relative border-0">
                                {getClientTypeBadge(commission.billing_reason, commission.purchase_number)}
                                <div className="absolute right-0 bottom-0 left-0 h-px bg-border" />
                              </TableCell>
                              <TableCell className="relative border-0">
                                {commission.plano || "-"}
                                <div className="absolute right-0 bottom-0 left-0 h-px bg-border" />
                              </TableCell>
                              <TableCell className="relative border-0">
                                {getLevelBadge(commission.level)}
                                <div className="absolute right-0 bottom-0 left-0 h-px bg-border" />
                              </TableCell>
                              <TableCell className="relative border-0">
                                {commission.percentual}%
                                <div className="absolute right-0 bottom-0 left-0 h-px bg-border" />
                              </TableCell>
                              <TableCell className="relative border-0 font-semibold text-success">
                                {formatCurrency(commission.valor)}
                                <div className="absolute right-0 bottom-0 left-0 h-px bg-border" />
                              </TableCell>
                              <TableCell className="relative border-0">
                                {getStatusBadge(commission.status, commission.data)}
                                <div className="absolute right-0 bottom-0 left-0 h-px bg-border" />
                              </TableCell>
                            </AnimatedTableRow>
                          );
                        })}
                      </>
                    ));
                  })()}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t mt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
