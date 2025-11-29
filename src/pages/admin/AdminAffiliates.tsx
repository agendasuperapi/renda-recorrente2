import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, ChevronLeft, ChevronRight, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDebounce } from "@/hooks/useDebounce";

// Interface para tipagem da view
interface AdminAffiliate {
  id: string;
  name: string;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  is_blocked: boolean | null;
  plan_name: string;
  plan_period: string;
  plan_status: string;
  referrals_count: number;
}
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortColumn = "name" | "email" | "created_at" | "referrals_count" | null;
type SortDirection = "asc" | "desc";

const AdminAffiliates = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: affiliates, isLoading, refetch } = useQuery({
    queryKey: ["admin-affiliates", currentPage, itemsPerPage, debouncedSearch, planFilter, periodFilter, statusFilter, startDate, endDate, sortColumn, sortDirection],
    queryFn: async () => {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from("view_admin_affiliates" as any)
        .select("*", { count: "exact" });

      // Filtros aplicados no banco de dados
      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,username.ilike.%${debouncedSearch}%`);
      }
      if (planFilter !== "all") {
        query = query.eq("plan_name", planFilter);
      }
      if (periodFilter !== "all") {
        query = query.eq("plan_period", periodFilter);
      }
      if (statusFilter !== "all") {
        query = query.eq("plan_status", statusFilter);
      }
      if (startDate) {
        query = query.gte("created_at", startDate);
      }
      if (endDate) {
        query = query.lte("created_at", endDate + "T23:59:59");
      }

      // Ordenação e paginação no banco
      if (sortColumn) {
        query = query.order(sortColumn, { ascending: sortDirection === "asc" });
      }
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      
      return { 
        data: (data || []) as unknown as AdminAffiliate[], 
        totalCount: count || 0 
      };
    },
  });

  // Query separada para lista de planos (para o filtro dropdown)
  const { data: plansData } = useQuery({
    queryKey: ["plans-for-filter"],
    queryFn: async () => {
      const { data } = await supabase
        .from("plans")
        .select("name")
        .eq("is_active", true);
      return data?.map(p => p.name) || [];
    },
  });

  const paginatedAffiliates = affiliates?.data;
  const totalCount = affiliates?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "trial"> = {
      active: "default",
      trialing: "trial",
      inactive: "secondary",
      cancelled: "destructive"
    };
    return variants[status] || "secondary";
  };

  const getInitials = (name: string) => {
    return name?.substring(0, 2).toUpperCase() || "AF";
  };

  // Resetar para página 1 quando filtros mudam
  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  // Função para ordenação de colunas
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Se já está ordenando por essa coluna, inverte a direção
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Se é uma nova coluna, começa com ASC
      setSortColumn(column);
      setSortDirection("asc");
    }
    setCurrentPage(1); // Resetar para primeira página ao mudar ordenação
  };

  // Componente para renderizar ícone de ordenação
  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-40" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setPlanFilter("all");
    setPeriodFilter("all");
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Afiliados</h1>
        <p className="text-muted-foreground">
          Gerencie todos os afiliados cadastrados
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou username..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Select value={planFilter} onValueChange={handleFilterChange(setPlanFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os planos</SelectItem>
                  {plansData?.map(plan => (
                    <SelectItem key={plan} value={plan}>{plan}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={periodFilter} onValueChange={handleFilterChange(setPeriodFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os períodos</SelectItem>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="trialing">Em teste</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                placeholder="Data início"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
              />

              <Input
                type="date"
                placeholder="Data fim"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="flex gap-2">
              <Select 
                value={itemsPerPage.toString()} 
                onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Itens por página" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 por página</SelectItem>
                  <SelectItem value="20">20 por página</SelectItem>
                  <SelectItem value="50">50 por página</SelectItem>
                  <SelectItem value="100">100 por página</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                Limpar filtros
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button 
                    onClick={() => handleSort("name")}
                    className="flex items-center hover:text-foreground transition-colors font-medium"
                  >
                    Afiliado
                    <SortIcon column="name" />
                  </button>
                </TableHead>
                <TableHead>
                  <button 
                    onClick={() => handleSort("email")}
                    className="flex items-center hover:text-foreground transition-colors font-medium"
                  >
                    Email
                    <SortIcon column="email" />
                  </button>
                </TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <button 
                    onClick={() => handleSort("created_at")}
                    className="flex items-center hover:text-foreground transition-colors font-medium"
                  >
                    Data Cadastro
                    <SortIcon column="created_at" />
                  </button>
                </TableHead>
                <TableHead>
                  <button 
                    onClick={() => handleSort("referrals_count")}
                    className="flex items-center hover:text-foreground transition-colors font-medium"
                  >
                    Indicações
                    <SortIcon column="referrals_count" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <>
                  {[...Array(10)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    </TableRow>
                  ))}
                </>
              ) : paginatedAffiliates && paginatedAffiliates.length > 0 ? (
                paginatedAffiliates.map((affiliate) => (
                  <TableRow key={affiliate.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          {affiliate.avatar_url && (
                            <AvatarImage src={affiliate.avatar_url} alt={affiliate.name} />
                          )}
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(affiliate.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{affiliate.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{affiliate.email || "-"}</TableCell>
                    <TableCell>{affiliate.username || "-"}</TableCell>
                    <TableCell>{affiliate.plan_name}</TableCell>
                    <TableCell className="capitalize">
                      {affiliate.plan_period === "daily" ? "Diário" : affiliate.plan_period === "monthly" ? "Mensal" : affiliate.plan_period === "annual" ? "Anual" : affiliate.plan_period}
                    </TableCell>
                    <TableCell>
                        <Badge variant={getStatusBadge(affiliate.plan_status)}>
                          {affiliate.plan_status === "active" 
                            ? "Ativo" 
                            : affiliate.plan_status === "trialing" 
                              ? "Em teste" 
                              : "Inativo"}
                        </Badge>
                    </TableCell>
                    <TableCell>
                      {affiliate.created_at ? format(new Date(affiliate.created_at), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {affiliate.referrals_count}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhum afiliado encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalCount > 0 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground whitespace-nowrap">
                Mostrando {startIndex + 1} a {Math.min(endIndex, totalCount)} de {totalCount} afiliados
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <PaginationItem key={page}>
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </Button>
                      </PaginationItem>
                    );
                  })}

                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAffiliates;
