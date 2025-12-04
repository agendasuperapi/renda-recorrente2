import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, TrendingUp, RefreshCw, X, ChevronLeft, ChevronRight, Eye, ArrowUpDown, ArrowUp, ArrowDown, LayoutGrid, LayoutList, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SubAffiliateCommissionsDialog } from "@/components/SubAffiliateCommissionsDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebounce } from "@/hooks/useDebounce";
import { DatePickerFilter } from "@/components/DatePickerFilter";

interface SubAffiliate {
  id: string;
  parent_affiliate_id: string;
  external_user_id: string;
  name: string;
  username: string | null;
  email: string;
  avatar_url: string | null;
  plan_name: string | null;
  plan_id: string | null;
  status: string;
  created_at: string;
  referrals_count: number;
  total_commission: number;
  my_commission_from_sub: number;
  level: number;
}

const SubAffiliates = () => {
  const [subAffiliates, setSubAffiliates] = useState<SubAffiliate[]>([]);
  const [filteredData, setFilteredData] = useState<SubAffiliate[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [stats, setStats] = useState({ total: 0, commissions: 0 });
  const { toast } = useToast();
  const [selectedSubAffiliate, setSelectedSubAffiliate] = useState<SubAffiliate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Filtros
  const [nameFilter, setNameFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState<Date | undefined>(undefined);
  const [endDateFilter, setEndDateFilter] = useState<Date | undefined>(undefined);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Ordenação
  const [sortColumn, setSortColumn] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Layout mode para mobile/tablet
  const [layoutMode, setLayoutMode] = useState<"compact" | "complete">("compact");

  // Mostrar/esconder filtros no mobile/tablet
  const [showFilters, setShowFilters] = useState(false);

  // Debounce do filtro de nome para evitar muitas requisições
  const debouncedNameFilter = useDebounce(nameFilter, 500);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      loadSubAffiliates();
      return;
    }
    loadSubAffiliates();
  }, [currentPage, itemsPerPage, debouncedNameFilter, planFilter, statusFilter, levelFilter, startDateFilter, endDateFilter]);

  const loadSubAffiliates = async () => {
    try {
      if (hasLoadedOnce) {
        setIsFiltering(true);
      } else {
        setInitialLoading(true);
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        return;
      }
      
      setCurrentUserId(user.id);

      // Construir query base
      let query = supabase
        .from('view_sub_affiliates' as any)
        .select('*', { count: 'exact' })
        .eq('parent_affiliate_id', user.id);

      // Aplicar filtros
      if (debouncedNameFilter) {
        query = query.or(`name.ilike.%${debouncedNameFilter}%,username.ilike.%${debouncedNameFilter}%,email.ilike.%${debouncedNameFilter}%`);
      }

      if (planFilter && planFilter !== "all") {
        query = query.eq('plan_name', planFilter);
      }

      if (statusFilter && statusFilter !== "all") {
        query = query.eq('status', statusFilter);
      }

      if (levelFilter && levelFilter !== "all") {
        query = query.eq('level', parseInt(levelFilter));
      }

      if (startDateFilter) {
        query = query.gte('created_at', format(startDateFilter, 'yyyy-MM-dd'));
      }

      if (endDateFilter) {
        query = query.lte('created_at', format(endDateFilter, 'yyyy-MM-dd') + "T23:59:59");
      }

      // Calcular range para paginação
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      // Buscar dados com paginação
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setSubAffiliates((data as any) || []);
      setFilteredData((data as any) || []);
      
      // Calcular estatísticas com base no total filtrado
      const { data: statsData, error: statsError } = await supabase
        .from('view_sub_affiliates_stats' as any)
        .select('total_sub_affiliates, total_commission')
        .eq('parent_affiliate_id', user.id)
        .maybeSingle();

      if (!statsError && statsData) {
        setStats({ 
          total: Number((statsData as any).total_sub_affiliates) || 0, 
          commissions: Number((statsData as any).total_commission) || 0 
        });
      } else {
        setStats({ total: count || 0, commissions: 0 });
      }

    } catch (error: any) {
      console.error('Erro ao carregar sub-afiliados:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setInitialLoading(false);
      setIsFiltering(false);
      setHasLoadedOnce(true);
    }
  };


  const clearFilters = () => {
    setNameFilter("");
    setPlanFilter("all");
    setStatusFilter("all");
    setLevelFilter("all");
    setStartDateFilter(undefined);
    setEndDateFilter(undefined);
  };

  const handleSort = (column: string) => {
    let newDirection: "asc" | "desc" = "asc";
    
    if (sortColumn === column) {
      newDirection = sortDirection === "asc" ? "desc" : "asc";
    }
    
    setSortColumn(column);
    setSortDirection(newDirection);

    // Ordenar localmente sem recarregar
    const sorted = [...filteredData].sort((a, b) => {
      const aValue = a[column as keyof SubAffiliate];
      const bValue = b[column as keyof SubAffiliate];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Compare based on type
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return newDirection === "asc" 
          ? aValue.localeCompare(bValue, 'pt-BR')
          : bValue.localeCompare(aValue, 'pt-BR');
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return newDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      // For dates
      if (column === 'created_at') {
        const dateA = new Date(aValue as string).getTime();
        const dateB = new Date(bValue as string).getTime();
        return newDirection === "asc" ? dateA - dateB : dateB - dateA;
      }

      return 0;
    });

    setFilteredData(sorted);
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: "Ativo", variant: "default" as const },
      trialing: { label: "Teste", variant: "secondary" as const },
      canceled: { label: "Cancelado", variant: "destructive" as const },
      past_due: { label: "Atrasado", variant: "destructive" as const },
      unpaid: { label: "Não Pago", variant: "destructive" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: "secondary" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
      <Badge variant="outline" className={`font-mono ${colorClass}`}>
        N{level}
      </Badge>
    );
  };

  // Paginação
  const totalPages = Math.ceil(stats.total / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, stats.total);

  // Obter planos, status e níveis únicos do banco de dados
  const [uniquePlans, setUniquePlans] = useState<string[]>([]);
  const [uniqueStatuses, setUniqueStatuses] = useState<string[]>([]);
  const [uniqueLevels, setUniqueLevels] = useState<number[]>([]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('view_sub_affiliates' as any)
      .select('plan_name, status, level')
      .eq('parent_affiliate_id', user.id);

    if (data) {
      const plans = Array.from(new Set(data.map((item: any) => item.plan_name).filter(Boolean)));
      const statuses = Array.from(new Set(data.map((item: any) => item.status)));
      const levels = Array.from(new Set(data.map((item: any) => item.level))).sort((a, b) => Number(a) - Number(b));
      setUniquePlans(plans as string[]);
      setUniqueStatuses(statuses as string[]);
      setUniqueLevels(levels as number[]);
    }
  };

  if (initialLoading && !hasLoadedOnce) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Sub Afiliados</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gerencie sua rede de sub-afiliados
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        </div>
        <TableSkeleton columns={7} rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Sub Afiliados</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Gerencie sua rede de sub-afiliados
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Sub-Afiliados
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Minhas Comissões (via Sub-Afiliados)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(stats.commissions)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botão de filtros mobile/tablet */}
      <div className="lg:hidden flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {(nameFilter || planFilter !== "all" || statusFilter !== "all" || levelFilter !== "all" || startDateFilter || endDateFilter) && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              !
            </Badge>
          )}
        </Button>
        
        {/* Layout mode selector - mobile/tablet */}
        <ToggleGroup type="single" value={layoutMode} onValueChange={(value) => value && setLayoutMode(value as "compact" | "complete")}>
          <ToggleGroupItem value="compact" aria-label="Layout compacto" className="px-3">
            <LayoutList className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="complete" aria-label="Layout completo" className="px-3">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Filtros - sempre visível no desktop, toggle no mobile/tablet */}
      <div className={`bg-transparent lg:bg-card rounded-none lg:rounded-lg border-0 lg:border shadow-none lg:shadow-sm p-0 lg:p-6 ${showFilters ? 'block' : 'hidden lg:block'}`}>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            placeholder="Nome/Username/Email"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
          />

          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os planos</SelectItem>
              {uniquePlans.map((plan) => (
                <SelectItem key={plan} value={plan || "no-plan"}>
                  {plan || "Sem plano"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {uniqueStatuses.map((status) => {
                const statusLabels: Record<string, string> = {
                  active: "Ativo",
                  trialing: "Teste",
                  canceled: "Cancelado",
                  past_due: "Atrasado",
                  unpaid: "Não Pago",
                };
                return (
                  <SelectItem key={status} value={status}>
                    {statusLabels[status] || status}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os níveis</SelectItem>
              {uniqueLevels.map((level) => (
                <SelectItem key={level} value={level.toString()}>
                  Nível {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DatePickerFilter
            value={startDateFilter}
            onChange={setStartDateFilter}
            placeholder="Data inicial"
          />

          <DatePickerFilter
            value={endDateFilter}
            onChange={setEndDateFilter}
            placeholder="Data final"
          />

          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 por página</SelectItem>
              <SelectItem value="10">10 por página</SelectItem>
              <SelectItem value="25">25 por página</SelectItem>
              <SelectItem value="50">50 por página</SelectItem>
              <SelectItem value="100">100 por página</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={clearFilters}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Limpar filtros
          </Button>

          <Button
            variant="outline"
            onClick={loadSubAffiliates}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-none bg-transparent lg:border lg:shadow-sm lg:bg-card rounded-none lg:rounded-lg">
        <CardContent className="!p-0 lg:!p-6 space-y-4">

          {/* Desktop - Tabela */}
          {!isMobile && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center">
                      Nome/Username
                      {getSortIcon("name")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("email")}
                  >
                    <div className="flex items-center">
                      Email
                      {getSortIcon("email")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("plan_name")}
                  >
                    <div className="flex items-center">
                      Plano
                      {getSortIcon("plan_name")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("level")}
                  >
                    <div className="flex items-center">
                      Nível
                      {getSortIcon("level")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center">
                      Status
                      {getSortIcon("status")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("created_at")}
                  >
                    <div className="flex items-center">
                      Data Cadastro
                      {getSortIcon("created_at")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("referrals_count")}
                  >
                    <div className="flex items-center justify-center">
                      Indicações
                      {getSortIcon("referrals_count")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("total_commission")}
                  >
                    <div className="flex items-center">
                      Comissão do Sub
                      {getSortIcon("total_commission")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("my_commission_from_sub")}
                  >
                    <div className="flex items-center">
                      Minha Comissão
                      {getSortIcon("my_commission_from_sub")}
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Nenhum sub-afiliado encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={sub.avatar_url || undefined} />
                            <AvatarFallback>
                              {sub.name?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{sub.name}</div>
                            {sub.username && (
                              <div className="text-xs text-muted-foreground">
                                @{sub.username}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{sub.email}</TableCell>
                      <TableCell>
                        {sub.plan_name || <span className="text-muted-foreground">Sem plano</span>}
                      </TableCell>
                      <TableCell>
                        {getLevelBadge(sub.level)}
                      </TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell>
                        {format(new Date(sub.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-center">{sub.referrals_count}</TableCell>
                      <TableCell className="text-left font-medium">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(Number(sub.total_commission) || 0)}
                      </TableCell>
                      <TableCell className="text-left font-semibold text-success">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(Number(sub.my_commission_from_sub) || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedSubAffiliate(sub);
                            setDialogOpen(true);
                          }}
                          title="Ver detalhes das comissões"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {/* Mobile/Tablet - Cards */}
          {isMobile && (
            <div className="space-y-3 md:space-y-2">
              {filteredData.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum sub-afiliado encontrado
                </div>
              ) : (
                filteredData.map((sub) => (
                  <Card key={sub.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      {/* Mobile Layout - Compact */}
                      {layoutMode === "compact" && (
                        <div className="md:hidden p-4 space-y-3">
                          {/* Linha 1: Avatar, Nome e Botão */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Avatar className="h-10 w-10 flex-shrink-0">
                                <AvatarImage src={sub.avatar_url || undefined} />
                                <AvatarFallback>
                                  {sub.name?.charAt(0).toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm">{sub.name}</div>
                                {sub.username && (
                                  <div className="text-xs text-muted-foreground">
                                    @{sub.username}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {sub.level && (
                                <Badge variant="outline" className="text-xs">
                                  N{sub.level}
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="flex-shrink-0 h-8 w-8"
                                onClick={() => {
                                  setSelectedSubAffiliate(sub);
                                  setDialogOpen(true);
                                }}
                                title="Ver detalhes"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Linha 2: Estatísticas */}
                          <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                            <div className="text-center flex-1">
                              <div className="text-[10px] text-muted-foreground uppercase">Indicações</div>
                              <div className="font-semibold text-sm">{sub.referrals_count}</div>
                            </div>
                            <div className="w-px h-6 bg-border" />
                            <div className="text-center flex-1">
                              <div className="text-[10px] text-muted-foreground uppercase">Minha Comissão</div>
                              <div className="font-bold text-sm text-success">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(sub.my_commission_from_sub) || 0)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Mobile Layout - Complete */}
                      {layoutMode === "complete" && (
                        <div className="md:hidden p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Avatar className="h-10 w-10 flex-shrink-0">
                                <AvatarImage src={sub.avatar_url || undefined} />
                                <AvatarFallback>
                                  {sub.name?.charAt(0).toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm truncate">{sub.name}</div>
                                {sub.username && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    @{sub.username}
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground truncate mt-0.5">
                                  {sub.email}
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="flex-shrink-0 h-8 w-8"
                              onClick={() => {
                                setSelectedSubAffiliate(sub);
                                setDialogOpen(true);
                              }}
                              title="Ver detalhes das comissões"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs mt-3">
                            <div>
                              <span className="text-muted-foreground">Plano</span>
                              <div className="font-medium truncate">{sub.plan_name || "-"}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Nível</span>
                              <div className="mt-0.5">{getLevelBadge(sub.level)}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Status</span>
                              <div className="mt-0.5">{getStatusBadge(sub.status)}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Cadastro</span>
                              <div className="font-medium">{format(new Date(sub.created_at), "dd/MM/yy", { locale: ptBR })}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Indicações</span>
                              <div className="font-medium">{sub.referrals_count}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Com. Sub</span>
                              <div className="font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(sub.total_commission) || 0)}</div>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Minha Comissão</span>
                            <div className="text-sm font-bold text-success">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(sub.my_commission_from_sub) || 0)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Tablet Layout - Compact */}
                      {layoutMode === "compact" && (
                        <div className="hidden md:flex md:items-center md:justify-between md:gap-4 md:p-4">
                          <div className="flex items-center gap-3 min-w-[180px]">
                            <Avatar className="h-9 w-9 flex-shrink-0">
                              <AvatarImage src={sub.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {sub.name?.charAt(0).toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">{sub.name}</div>
                              {sub.username && (
                                <div className="text-xs text-muted-foreground truncate">@{sub.username}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <div className="text-[10px] text-muted-foreground">Indicações</div>
                              <div className="font-semibold text-sm">{sub.referrals_count}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] text-muted-foreground">Minha Comissão</div>
                              <div className="text-sm font-bold text-success whitespace-nowrap">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(sub.my_commission_from_sub) || 0)}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0"
                              onClick={() => {
                                setSelectedSubAffiliate(sub);
                                setDialogOpen(true);
                              }}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Tablet Layout - Complete */}
                      {layoutMode === "complete" && (
                        <div className="hidden md:block md:p-4 space-y-3">
                          {/* Linha 1: Avatar, Nome, Status e Botão */}
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Avatar className="h-11 w-11 flex-shrink-0">
                                <AvatarImage src={sub.avatar_url || undefined} />
                                <AvatarFallback>
                                  {sub.name?.charAt(0).toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">{sub.name}</span>
                                  {getLevelBadge(sub.level)}
                                  {getStatusBadge(sub.status)}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {sub.username && <span>@{sub.username}</span>}
                                  {sub.username && sub.email && <span>•</span>}
                                  <span className="truncate">{sub.email}</span>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 flex-shrink-0"
                              onClick={() => {
                                setSelectedSubAffiliate(sub);
                                setDialogOpen(true);
                              }}
                              title="Ver detalhes das comissões"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Linha 2: Estatísticas em grid */}
                          <div className="grid grid-cols-5 gap-2 bg-muted/50 rounded-lg px-3 py-2 text-center">
                            <div>
                              <div className="text-[10px] text-muted-foreground uppercase">Plano</div>
                              <div className="text-xs font-medium truncate">{sub.plan_name || "-"}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-muted-foreground uppercase">Cadastro</div>
                              <div className="text-xs font-medium">{format(new Date(sub.created_at), "dd/MM/yy", { locale: ptBR })}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-muted-foreground uppercase">Indicações</div>
                              <div className="text-xs font-semibold">{sub.referrals_count}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-muted-foreground uppercase">Com. Sub</div>
                              <div className="text-xs font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(sub.total_commission) || 0)}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-muted-foreground uppercase">Minha Com.</div>
                              <div className="text-xs font-bold text-success">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(sub.my_commission_from_sub) || 0)}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Controles de paginação e informações */}
          <div className="flex flex-col items-center gap-3 mt-4">
            <div className="text-xs sm:text-sm text-muted-foreground text-center">
              Mostrando {startIndex + 1} a {endIndex} de {stats.total} resultados
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-2 sm:px-3"
                >
                  <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline ml-1">Anterior</span>
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNumber)}
                        className="w-7 h-7 sm:w-8 sm:h-8 p-0 text-xs sm:text-sm"
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 px-2 sm:px-3"
                >
                  <span className="hidden sm:inline mr-1">Próxima</span>
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedSubAffiliate && currentUserId && (
        <SubAffiliateCommissionsDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          subAffiliate={{
            id: selectedSubAffiliate.external_user_id,
            name: selectedSubAffiliate.name,
            username: selectedSubAffiliate.username,
            email: selectedSubAffiliate.email,
            avatar_url: selectedSubAffiliate.avatar_url,
            plan_name: selectedSubAffiliate.plan_name,
            level: selectedSubAffiliate.level,
            status: selectedSubAffiliate.status,
            created_at: selectedSubAffiliate.created_at,
            referrals_count: selectedSubAffiliate.referrals_count,
            total_commission: selectedSubAffiliate.total_commission,
            my_commission_from_sub: selectedSubAffiliate.my_commission_from_sub,
          }}
          parentAffiliateId={currentUserId}
        />
      )}
    </div>
  );
};

export default SubAffiliates;
