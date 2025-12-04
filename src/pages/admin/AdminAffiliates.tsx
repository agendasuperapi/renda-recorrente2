import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Eye, SlidersHorizontal, LayoutList, LayoutGrid } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDebounce } from "@/hooks/useDebounce";
import { useIsMobile } from "@/hooks/use-mobile";
import { AffiliateDetailsDialog } from "@/components/AffiliateDetailsDialog";
import { AffiliatesFilterCard } from "@/components/admin/AffiliatesFilterCard";

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
  withdrawal_day: number | null;
}
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";

type SortColumn = "name" | "email" | "created_at" | "referrals_count" | null;
type SortDirection = "asc" | "desc";

const AdminAffiliates = () => {
  const isMobile = useIsMobile();
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
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"compact" | "complete">("compact");
  const [showFilters, setShowFilters] = useState(false);

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

  const getWeekdayLabel = (day: number | null) => {
    if (day === null || day === undefined) return "-";
    const weekdays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    return weekdays[day] || "-";
  };

  const handleViewDetails = (affiliateId: string) => {
    setSelectedAffiliateId(affiliateId);
    setDetailsDialogOpen(true);
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

      {/* Botão de filtros e toggle de layout - mobile/tablet */}
      <div className="lg:hidden flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {(searchTerm || planFilter !== "all" || periodFilter !== "all" || statusFilter !== "all" || startDate || endDate) && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              !
            </Badge>
          )}
        </Button>
        
        <ToggleGroup type="single" value={layoutMode} onValueChange={(value) => value && setLayoutMode(value as "compact" | "complete")}>
          <ToggleGroupItem value="compact" aria-label="Layout compacto" className="px-3">
            <LayoutList className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="complete" aria-label="Layout completo" className="px-3">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <AffiliatesFilterCard
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        planFilter={planFilter}
        onPlanFilterChange={handleFilterChange(setPlanFilter)}
        periodFilter={periodFilter}
        onPeriodFilterChange={handleFilterChange(setPeriodFilter)}
        statusFilter={statusFilter}
        onStatusFilterChange={handleFilterChange(setStatusFilter)}
        startDate={startDate}
        onStartDateChange={(value) => {
          setStartDate(value);
          setCurrentPage(1);
        }}
        endDate={endDate}
        onEndDateChange={(value) => {
          setEndDate(value);
          setCurrentPage(1);
        }}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={(value) => {
          setItemsPerPage(value);
          setCurrentPage(1);
        }}
        plansData={plansData}
        onRefresh={handleRefresh}
        onResetFilters={handleResetFilters}
        showFilters={showFilters}
        onCloseFilters={() => setShowFilters(false)}
      />

      <Card className="lg:bg-card bg-transparent border-0 lg:border shadow-none lg:shadow-sm">
        <CardContent className="lg:pt-6 p-0 lg:p-6">
          {isMobile ? (
            <div className="space-y-2">
              {isLoading ? (
                <>
                  {[...Array(10)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : paginatedAffiliates && paginatedAffiliates.length > 0 ? (
                paginatedAffiliates.map((affiliate) => (
                  <Card key={affiliate.id}>
                    <CardContent className="p-0">
                      {/* Modo Compacto */}
                      {layoutMode === "compact" && (
                        <div className="p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Avatar className="h-10 w-10 flex-shrink-0">
                                {affiliate.avatar_url && (
                                  <AvatarImage src={affiliate.avatar_url} alt={affiliate.name} />
                                )}
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                  {getInitials(affiliate.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{affiliate.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {affiliate.created_at ? format(new Date(affiliate.created_at), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground truncate max-w-[80px]">{affiliate.plan_name}</p>
                                <Badge variant={getStatusBadge(affiliate.plan_status)} className="text-[10px] h-5">
                                  {affiliate.plan_status === "active" 
                                    ? "Ativo" 
                                    : affiliate.plan_status === "trialing" 
                                      ? "Teste" 
                                      : "Inativo"}
                                </Badge>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 flex-shrink-0"
                                onClick={() => handleViewDetails(affiliate.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Modo Completo */}
                      {layoutMode === "complete" && (
                        <div className="p-4 space-y-3">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Avatar className="h-10 w-10 flex-shrink-0">
                                {affiliate.avatar_url && (
                                  <AvatarImage src={affiliate.avatar_url} alt={affiliate.name} />
                                )}
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                  {getInitials(affiliate.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{affiliate.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{affiliate.email || "-"}</p>
                                <p className="text-xs text-muted-foreground truncate">@{affiliate.username || "-"}</p>
                              </div>
                            </div>
                            <Badge variant={getStatusBadge(affiliate.plan_status)} className="flex-shrink-0">
                              {affiliate.plan_status === "active" 
                                ? "Ativo" 
                                : affiliate.plan_status === "trialing" 
                                  ? "Em teste" 
                                  : "Inativo"}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Plano:</span>
                              <p className="font-medium truncate">{affiliate.plan_name}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Período:</span>
                              <p className="font-medium truncate">
                                {affiliate.plan_period === "daily" ? "Diário" : affiliate.plan_period === "monthly" ? "Mensal" : affiliate.plan_period === "annual" ? "Anual" : affiliate.plan_period}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Cadastro:</span>
                              <p className="font-medium">{affiliate.created_at ? format(new Date(affiliate.created_at), "dd/MM/yyyy", { locale: ptBR }) : "-"}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Dia de Saque:</span>
                              <p className="font-medium">{getWeekdayLabel(affiliate.withdrawal_day)}</p>
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t">
                            <div className="text-xs">
                              <span className="text-muted-foreground">Indicações: </span>
                              <span className="font-bold">{affiliate.referrals_count}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(affiliate.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhum afiliado encontrado
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
          <div className="overflow-x-auto">
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
                <TableHead>Dia de Saque</TableHead>
                <TableHead className="text-center">
                  <button 
                    onClick={() => handleSort("referrals_count")}
                    className="flex items-center justify-center hover:text-foreground transition-colors font-medium w-full"
                  >
                    Indicações
                    <SortIcon column="referrals_count" />
                  </button>
                </TableHead>
                <TableHead>Ações</TableHead>
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
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20" /></TableCell>
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
                    <TableCell className="font-medium">
                      {getWeekdayLabel(affiliate.withdrawal_day)}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {affiliate.referrals_count}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(affiliate.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    Nenhum afiliado encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
          )}

          {totalCount > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-3">
              <p className="text-sm text-muted-foreground order-2 sm:order-1">
                Mostrando {startIndex + 1} a {Math.min(endIndex, totalCount)} de {totalCount} afiliados
              </p>
              <Pagination className="order-1 sm:order-2">
                <PaginationContent className="gap-1">
                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="h-8 px-2 lg:px-3"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">Anterior</span>
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
                      <PaginationItem key={page} className="hidden sm:block">
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className="h-8 w-8 p-0"
                        >
                          {page}
                        </Button>
                      </PaginationItem>
                    );
                  })}

                  <PaginationItem className="sm:hidden">
                    <span className="text-sm px-2">
                      {currentPage} / {totalPages}
                    </span>
                  </PaginationItem>

                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="h-8 px-2 lg:px-3"
                    >
                      <span className="hidden sm:inline mr-1">Próxima</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
      
      <AffiliateDetailsDialog
        affiliateId={selectedAffiliateId}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />
    </div>
  );
};

export default AdminAffiliates;
