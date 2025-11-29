import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useUser } from "@/contexts/UserContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, DollarSign, RefreshCw, X, Loader2 } from "lucide-react";
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

interface Commission {
  id: string;
  data: string;
  produto: string;
  product_id: string;
  cliente: string;
  cliente_email: string;
  plano: string;
  plan_id: string;
  percentual: number;
  valor: number;
  status: string;
}

interface Stats {
  hoje: number;
  ultimos_7_dias: number;
  este_mes: number;
}

const CommissionsDaily = () => {
  const { userId } = useUser();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [stats, setStats] = useState<Stats>({ hoje: 0, ultimos_7_dias: 0, este_mes: 0 });
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  
  // Filtros
  const [filters, setFilters] = useState({
    product_id: "",
    plan_id: "",
    status: "",
  });
  const [clienteSearch, setClienteSearch] = useState("");
  const debouncedCliente = useDebounce(clienteSearch, 500);
  
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

  // Carregar dados apenas quando filtros relevantes mudarem
  useEffect(() => {
    loadCommissions();
  }, [currentPage, itemsPerPage, filters.product_id, filters.plan_id, filters.status, debouncedCliente]);

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

      // Paginação
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      const { data, error, count } = await query
        .order("data", { ascending: false, nullsFirst: false })
        .range(from, to);

      if (error) throw error;

      setCommissions(data || []);
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
    });
    setClienteSearch("");
    setPlans([]);
    setCurrentPage(1);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: "Pendente", className: "bg-yellow-500/10 text-yellow-500" },
      approved: { label: "Aprovado", className: "bg-green-500/10 text-green-500" },
      paid: { label: "Pago", className: "bg-blue-500/10 text-blue-500" },
      cancelled: { label: "Cancelado", className: "bg-red-500/10 text-red-500" },
    };
    
    const config = statusMap[status] || { label: status, className: "bg-muted text-muted-foreground" };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  if (initialLoading && !hasLoadedOnce) {
    return <TableSkeleton title="Comissões Diárias" columns={7} rows={5} showSearch />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Comissões Diárias</h1>
        <p className="text-muted-foreground">
          Acompanhe suas comissões dia a dia
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hoje
            </CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(stats.hoje)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Últimos 7 dias
            </CardTitle>
            <Calendar className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{formatCurrency(stats.ultimos_7_dias)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Este Mês
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.este_mes)}</div>
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

      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4">
            <CardTitle>Histórico Diário</CardTitle>
            
            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 por página</SelectItem>
                    <SelectItem value="20">20 por página</SelectItem>
                    <SelectItem value="50">50 por página</SelectItem>
                    <SelectItem value="100">100 por página</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Limpar filtros
                </Button>
                <Button variant="outline" size="icon" onClick={() => { loadStats(); loadCommissions(); }} disabled={isFiltering}>
                  <RefreshCw className={`h-4 w-4 ${isFiltering ? "animate-spin" : ""}`} />
                </Button>
              </div>
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
            <Table className={isFiltering ? "pointer-events-none" : ""}>
              <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Percentual</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma comissão registrada
                  </TableCell>
                </TableRow>
              ) : (
                commissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell>{formatDate(commission.data)}</TableCell>
                    <TableCell>{commission.produto || "-"}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{commission.cliente || "-"}</div>
                        <div className="text-xs text-muted-foreground">{commission.cliente_email || "-"}</div>
                      </div>
                    </TableCell>
                    <TableCell>{commission.plano || "-"}</TableCell>
                    <TableCell>{commission.percentual}%</TableCell>
                    <TableCell className="font-medium">{formatCurrency(commission.valor)}</TableCell>
                    <TableCell>{getStatusBadge(commission.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            </Table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {[...Array(totalPages)].map((_, i) => {
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
                  })}
                  
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
