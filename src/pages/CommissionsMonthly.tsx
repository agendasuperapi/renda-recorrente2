import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useUser } from "@/contexts/UserContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, DollarSign, TrendingUp, RefreshCw, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface MonthlyCommission {
  mes_referencia: string;
  produto: string;
  product_id: string;
  plano: string;
  plan_id: string;
  quantidade_comissoes: number;
  valor_total: number;
  percentual_medio: number;
  pendentes: number;
  disponiveis: number;
  sacadas: number;
  canceladas: number;
  tipo_predominante: string;
}

interface Stats {
  este_mes: number;
  ultimos_3_meses: number;
  este_ano: number;
  count_mes: number;
  count_3_meses: number;
  count_ano: number;
}

const CommissionsMonthly = () => {
  const isMobile = useIsMobile();
  const { userId } = useUser();
  const [commissions, setCommissions] = useState<MonthlyCommission[]>([]);
  const [stats, setStats] = useState<Stats>({ 
    este_mes: 0, 
    ultimos_3_meses: 0, 
    este_ano: 0,
    count_mes: 0,
    count_3_meses: 0,
    count_ano: 0
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  
  // Filtros
  const [filters, setFilters] = useState(() => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    return {
      product_id: "",
      plan_id: "",
      mes_inicio: currentMonth,
      mes_fim: currentMonth,
    };
  });
  const [totalFiltrado, setTotalFiltrado] = useState(0);
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadCommissions();
  }, [currentPage, itemsPerPage, filters.product_id, filters.plan_id, filters.mes_inicio, filters.mes_fim]);

  useEffect(() => {
    loadFiltersData();
    loadStats();
  }, []);

  useEffect(() => {
    if (userId) {
      loadStats();
    }
  }, [userId]);

  const loadFiltersData = async () => {
    try {
      const { data: productsData } = await supabase
        .from("products")
        .select("id, nome")
        .order("nome");
      
      setProducts(productsData || []);
    } catch (error) {
      console.error("Erro ao carregar dados dos filtros:", error);
    }
  };

  const loadPlansForProduct = async (productId: string) => {
    if (!productId || productId === " ") {
      setPlans([]);
      return;
    }
    
    try {
      const { data: plansData } = await supabase
        .from("plans")
        .select("id, name")
        .eq("product_id", productId)
        .order("name");
      
      setPlans(plansData || []);
    } catch (error) {
      console.error("Erro ao carregar planos:", error);
    }
  };

  const loadStats = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await (supabase as any)
        .from("view_commissions_monthly_stats")
        .select("*")
        .eq("affiliate_id", userId)
        .single();

      if (error) throw error;
      
      if (data) {
        setStats({
          este_mes: data.este_mes || 0,
          ultimos_3_meses: data.ultimos_3_meses || 0,
          este_ano: data.este_ano || 0,
          count_mes: data.count_mes || 0,
          count_3_meses: data.count_3_meses || 0,
          count_ano: data.count_ano || 0,
        });
      }
    } catch (error: any) {
      if (error.code !== 'PGRST116') {
        console.error("Erro ao carregar estatísticas:", error);
      }
    }
  };

  const loadCommissions = async () => {
    if (!userId) return;
    
    if (!hasLoadedOnce) {
      setInitialLoading(true);
    } else {
      setIsFiltering(true);
    }

    try {
      let query = (supabase as any)
        .from("view_commissions_monthly")
        .select("*", { count: "exact" })
        .eq("affiliate_id", userId);

      if (filters.product_id && filters.product_id.trim() && filters.product_id !== " ") {
        query = query.eq("product_id", filters.product_id);
      }
      if (filters.plan_id && filters.plan_id.trim() && filters.plan_id !== " ") {
        query = query.eq("plan_id", filters.plan_id);
      }
      if (filters.mes_inicio && filters.mes_inicio.trim()) {
        // Converte yyyy-MM para yyyy-MM-01 (primeiro dia do mês)
        query = query.gte("mes_referencia", `${filters.mes_inicio}-01`);
      }
      if (filters.mes_fim && filters.mes_fim.trim()) {
        // Converte yyyy-MM para yyyy-MM-01 e adiciona 1 mês, depois subtrai 1 dia para pegar o último dia
        const [year, month] = filters.mes_fim.split('-').map(Number);
        const lastDay = new Date(year, month, 0).getDate();
        query = query.lte("mes_referencia", `${filters.mes_fim}-${lastDay}`);
      }

      // Paginação
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      const { data, error, count } = await query
        .order("mes_referencia", { ascending: false })
        .range(from, to);

      if (error) throw error;

      setCommissions(data || []);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      
      // Calcular total filtrado usando função RPC
      const mesInicio = filters.mes_inicio && filters.mes_inicio.trim() ? `${filters.mes_inicio}-01` : null;
      let mesFim = null;
      if (filters.mes_fim && filters.mes_fim.trim()) {
        const [year, month] = filters.mes_fim.split('-').map(Number);
        const lastDay = new Date(year, month, 0).getDate();
        mesFim = `${filters.mes_fim}-${lastDay}`;
      }
      
      const { data: totalData } = await (supabase as any).rpc("get_commissions_monthly_total", {
        p_affiliate_id: userId,
        p_product_id: filters.product_id && filters.product_id.trim() && filters.product_id !== " " ? filters.product_id : null,
        p_plan_id: filters.plan_id && filters.plan_id.trim() && filters.plan_id !== " " ? filters.plan_id : null,
        p_mes_inicio: mesInicio,
        p_mes_fim: mesFim,
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
    const currentMonth = format(new Date(), 'yyyy-MM');
    setFilters({
      product_id: "",
      plan_id: "",
      mes_inicio: currentMonth,
      mes_fim: currentMonth,
    });
    setCurrentPage(1);
    setPlans([]);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatMonth = (dateString: string) => {
    if (!dateString) return "-";
    try {
      // Adiciona o dia e hora para evitar problemas de timezone
      const dateWithTime = dateString.length === 7 ? `${dateString}-01T12:00:00` : dateString;
      return format(new Date(dateWithTime), "MMMM/yyyy", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Comissões Mensais</h1>
          <p className="text-muted-foreground">
            Acompanhe suas comissões mensais recorrentes
          </p>
        </div>
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Comissões Mensais</h1>
        <p className="text-muted-foreground">
          Acompanhe suas comissões mensais recorrentes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Este Mês
            </CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.este_mes)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.count_mes} comissões
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Últimos 3 Meses
            </CardTitle>
            <DollarSign className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{formatCurrency(stats.ultimos_3_meses)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.count_3_meses} comissões
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Este Ano
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(stats.este_ano)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.count_ano} comissões
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4">
            <CardTitle>Histórico Mensal</CardTitle>
            
            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
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

              <input
                type="month"
                placeholder="Mês início"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={filters.mes_inicio}
                onChange={(e) => setFilters(f => ({ ...f, mes_inicio: e.target.value }))}
              />

              <input
                type="month"
                placeholder="Mês fim"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={filters.mes_fim}
                onChange={(e) => setFilters(f => ({ ...f, mes_fim: e.target.value }))}
              />


              <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 por página</SelectItem>
                  <SelectItem value="20">20 por página</SelectItem>
                  <SelectItem value="50">50 por página</SelectItem>
                  <SelectItem value="100">100 por página</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={clearFilters} className="h-10">
                <X className="h-4 w-4 mr-2" />
                Limpar filtros
              </Button>

              <Button variant="outline" onClick={() => { loadStats(); loadCommissions(); }} disabled={isFiltering} className="gap-2 h-10">
                <RefreshCw className={`h-4 w-4 ${isFiltering ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {isFiltering && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {isMobile ? (
              <div className="space-y-3">
                {commissions.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      Nenhuma comissão registrada
                    </CardContent>
                  </Card>
                ) : (
                  commissions.map((commission, index) => (
                    <Card key={`${commission.mes_referencia}-${commission.product_id}-${commission.plan_id}-${index}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <p className="font-semibold text-sm capitalize">{formatMonth(commission.mes_referencia)}</p>
                            <p className="text-xs text-muted-foreground">{commission.produto || "-"}</p>
                          </div>
                          <span className="text-lg font-bold text-success">{formatCurrency(commission.valor_total)}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Plano:</span>
                            <p className="font-medium truncate">{commission.plano || "-"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Quantidade:</span>
                            <p className="font-medium">{commission.quantidade_comissoes} comissões</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 text-xs">
                          {commission.pendentes > 0 && (
                            <Badge variant="secondary" className="text-xs bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
                              {commission.pendentes} pendentes
                            </Badge>
                          )}
                          {commission.disponiveis > 0 && (
                            <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400">
                              {commission.disponiveis} disponíveis
                            </Badge>
                          )}
                          {commission.sacadas > 0 && (
                            <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400">
                              {commission.sacadas} sacadas
                            </Badge>
                          )}
                          {commission.canceladas > 0 && (
                            <Badge variant="secondary" className="text-xs bg-red-500/10 text-red-700 dark:text-red-400">
                              {commission.canceladas} canceladas
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            ) : (
              <Table className={isFiltering ? "pointer-events-none" : ""}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês/Ano</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead className="text-center">Qtd. Comissões</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhuma comissão registrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    commissions.map((commission, index) => (
                      <TableRow key={`${commission.mes_referencia}-${commission.product_id}-${commission.plan_id}-${index}`}>
                        <TableCell className="font-medium capitalize">{formatMonth(commission.mes_referencia)}</TableCell>
                        <TableCell>{commission.produto || "-"}</TableCell>
                        <TableCell>{commission.plano || "-"}</TableCell>
                        <TableCell className="text-center">{commission.quantidade_comissoes}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(commission.valor_total)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {commission.pendentes > 0 && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
                                {commission.pendentes} pendentes
                              </span>
                            )}
                            {commission.disponiveis > 0 && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-700 dark:text-green-400">
                                {commission.disponiveis} disponíveis
                              </span>
                            )}
                            {commission.sacadas > 0 && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-700 dark:text-blue-400">
                                {commission.sacadas} sacadas
                              </span>
                            )}
                            {commission.canceladas > 0 && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-700 dark:text-red-400">
                                {commission.canceladas} canceladas
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>

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

export default CommissionsMonthly;
