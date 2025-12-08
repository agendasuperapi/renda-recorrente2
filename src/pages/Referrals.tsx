import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Users, TrendingUp, RefreshCw, SlidersHorizontal, X, LayoutList, LayoutGrid, Eye, ChevronUp, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useDebounce } from "@/hooks/useDebounce";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollAnimation } from "@/components/ScrollAnimation";
import { AnimatedTableRow } from "@/components/AnimatedTableRow";

interface Referral {
  id: string;
  created_at: string;
  name: string | null;
  email: string;
  phone: string | null;
  product_name: string | null;
  product_id: string | null;
  plan_name: string | null;
  plan_id: string | null;
  cancel_at_period_end: boolean | null;
  trial_end: string | null;
  status: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  environment: string | null;
}

interface Stats {
  total: number;
  active: number;
  conversionRate: number;
}

interface Product {
  id: string;
  nome: string;
}

interface Plan {
  id: string;
  name: string;
}

const Referrals = () => {
  const isMobile = useIsMobile();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, conversionRate: 0 });
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [selectedPlan, setSelectedPlan] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);

  // Layout mode para mobile/tablet
  const [layoutMode, setLayoutMode] = useState<"compact" | "complete">("compact");

  // Mostrar/esconder filtros no mobile/tablet
  const [showFilters, setShowFilters] = useState(false);

  // Card expandido no modo compacto
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    loadFiltersData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  useEffect(() => {
    loadReferrals();
    loadStats();
  }, [currentPage, debouncedSearch, selectedProduct, selectedPlan, selectedStatus, itemsPerPage]);

  useEffect(() => {
    if (selectedProduct !== "all") {
      loadPlansForProduct(selectedProduct);
    } else {
      setPlans([]);
      setSelectedPlan("all");
    }
  }, [selectedProduct]);

  const loadFiltersData = async () => {
    const { data: productsData } = await supabase
      .from("products")
      .select("id, nome")
      .order("nome");
    
    if (productsData) setProducts(productsData);
  };

  const loadPlansForProduct = async (productId: string) => {
    const { data: plansData } = await supabase
      .from("plans")
      .select("id, name")
      .eq("product_id", productId)
      .eq("is_active", true)
      .order("name");
    
    if (plansData) setPlans(plansData);
  };

  const loadReferrals = async () => {
    if (hasLoadedOnce) {
      setIsFiltering(true);
    } else {
      setInitialLoading(true);
    }
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        setInitialLoading(false);
        setIsFiltering(false);
        return;
      }

      let query = supabase
        .from("view_referrals" as any)
        .select("*", { count: "exact" })
        .eq("affiliate_id", session.session.user.id);

      // Apply filters
      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
      }

      if (selectedProduct !== "all") {
        query = query.eq("product_id", selectedProduct);
      }

      if (selectedPlan !== "all") {
        query = query.eq("plan_id", selectedPlan);
      }

      if (selectedStatus !== "all") {
        query = query.eq("status", selectedStatus);
      }

      // Pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setReferrals((data as any) || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (error) {
      console.error("Error loading referrals:", error);
    } finally {
      setInitialLoading(false);
      setIsFiltering(false);
      setHasLoadedOnce(true);
    }
  };

  const loadStats = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) return;

      let query = supabase
        .from("view_referrals_stats" as any)
        .select("*")
        .eq("affiliate_id", session.session.user.id);

      if (selectedProduct !== "all") {
        query = query.eq("product_id", selectedProduct);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Agregar resultados se houver múltiplos produtos
      const aggregated = (data || []).reduce((acc: any, curr: any) => ({
        total: acc.total + (curr.total_referrals || 0),
        active: acc.active + (curr.active_subscriptions || 0),
        conversionRate: 0 // Será recalculado abaixo
      }), { total: 0, active: 0, conversionRate: 0 });

      // Recalcular taxa de conversão agregada
      aggregated.conversionRate = aggregated.total > 0 
        ? Math.round((aggregated.active / aggregated.total) * 100)
        : 0;

      setStats(aggregated);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedProduct("all");
    setSelectedPlan("all");
    setSelectedStatus("all");
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    loadReferrals();
    loadStats();
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="secondary">-</Badge>;
    
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      trialing: "secondary",
      canceled: "destructive",
      past_due: "destructive",
      incomplete: "outline"
    };

    const labels: Record<string, string> = {
      active: "Ativo",
      trialing: "Teste",
      canceled: "Cancelado",
      past_due: "Atrasado",
      incomplete: "Incompleto"
    };

    return <Badge variant={variants[status] || "secondary"}>{labels[status] || status}</Badge>;
  };

  if (initialLoading && !hasLoadedOnce) {
    return <TableSkeleton columns={9} rows={10} showSearch />;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <ScrollAnimation animation="fade-up">
        <div>
          <h1 className="text-3xl font-bold mb-2">Indicações</h1>
          <p className="text-muted-foreground">
            Acompanhe todas as suas indicações e conversões
          </p>
        </div>
      </ScrollAnimation>

      <ScrollAnimation animation="fade-up" delay={100}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="relative overflow-hidden hover:scale-[1.02] transition-transform duration-300">
            <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-purple-200/60 dark:bg-purple-800/40 flex items-end justify-start pl-4 pb-4">
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Indicações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden hover:scale-[1.02] transition-transform duration-300">
            <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-emerald-200/60 dark:bg-emerald-800/40 flex items-end justify-start pl-4 pb-4">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Assinaturas Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active}</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden hover:scale-[1.02] transition-transform duration-300">
            <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-sky-200/60 dark:bg-sky-800/40 flex items-end justify-start pl-4 pb-4">
              <TrendingUp className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Taxa de Conversão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">{stats.conversionRate}%</div>
            </CardContent>
          </Card>
        </div>
      </ScrollAnimation>

      {/* Botão de filtros mobile/tablet */}
      <div className="lg:hidden flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {(searchTerm || selectedProduct !== "all" || selectedPlan !== "all" || selectedStatus !== "all") && (
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
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger>
              <SelectValue placeholder="Produto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os produtos</SelectItem>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedProduct !== "all" && (
            <Select 
              value={selectedPlan} 
              onValueChange={setSelectedPlan}
            >
              <SelectTrigger>
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os planos</SelectItem>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="trialing">Trial</SelectItem>
              <SelectItem value="canceled">Cancelado</SelectItem>
              <SelectItem value="past_due">Atrasado</SelectItem>
              <SelectItem value="incomplete">Incompleto</SelectItem>
            </SelectContent>
          </Select>

          <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 por página</SelectItem>
              <SelectItem value="25">25 por página</SelectItem>
              <SelectItem value="50">50 por página</SelectItem>
              <SelectItem value="100">100 por página</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={clearFilters} className="gap-2">
            <span className="text-lg">×</span>
            Limpar filtros
          </Button>

          <Button variant="outline" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      {isMobile ? (
        <div className="space-y-3">
          {referrals.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma indicação encontrada
              </CardContent>
            </Card>
          ) : (
            referrals.map((referral, index) => (
              <ScrollAnimation key={referral.id} animation="fade-up" delay={index * 50} threshold={0.05}>
                <Card className="transition-all duration-300 hover:shadow-lg">
                <CardContent className="p-4 space-y-3">
                  {layoutMode === "compact" && expandedCardId !== referral.id ? (
                    // Layout Compacto: Nome, Produto, Plano, Status, Data de Cadastro
                    <>
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-medium text-sm truncate flex-1">{referral.name || "Sem nome"}</p>
                        {getStatusBadge(referral.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Produto:</span>
                          <p className="font-medium truncate">{referral.product_name || "-"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Plano:</span>
                          <p className="font-medium truncate">{referral.plan_name || "-"}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div>
                          <span className="text-muted-foreground">
                            {formatDate(referral.created_at)}
                          </span>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedCardId(referral.id)}
                            className="h-7 gap-1 text-xs"
                          >
                            <Eye className="h-3 w-3" />
                            Ver mais
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    // Layout Completo: Todas as informações
                    <>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{referral.name || "Sem nome"}</p>
                          <p className="text-xs text-muted-foreground truncate">{referral.email}</p>
                        </div>
                        {getStatusBadge(referral.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Produto:</span>
                          <p className="font-medium truncate">{referral.product_name || "-"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Plano:</span>
                          <p className="font-medium truncate">{referral.plan_name || "-"}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 items-center text-xs">
                        <span className="text-muted-foreground">Cancelamento:</span>
                        {referral.cancel_at_period_end ? (
                          <Badge variant="destructive" className="text-xs">Sim</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Não</Badge>
                        )}
                      </div>

                      {referral.trial_end && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Trial até: </span>
                          <span className="font-medium">{formatDate(referral.trial_end)}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-1">
                        <p className="text-xs text-muted-foreground">
                          Cadastrado em {formatDate(referral.created_at)}
                        </p>
                        {layoutMode === "compact" && expandedCardId === referral.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedCardId(null)}
                            className="h-7 gap-1 text-xs"
                          >
                            <ChevronUp className="h-3 w-3" />
                            Ver menos
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
                </Card>
              </ScrollAnimation>
            ))
          )}

          {totalPages > 1 && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground text-center">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, stats.total)} de {stats.total}
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
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
        </div>
      ) : (
        (() => {
          // Group referrals by date for desktop view
          const groupedByDate = referrals.reduce((acc, referral) => {
            const dateKey = referral.created_at 
              ? format(new Date(referral.created_at), "yyyy-MM-dd", { locale: ptBR })
              : "sem-data";
            if (!acc[dateKey]) {
              acc[dateKey] = [];
            }
            acc[dateKey].push(referral);
            return acc;
          }, {} as Record<string, Referral[]>);

          const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

          return (
            <Card className="rounded-none lg:rounded-lg">
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hora</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cancelamento</TableHead>
                      <TableHead>Período Atual</TableHead>
                      <TableHead>Trial</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          Nenhuma indicação encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedDates.map((dateKey) => {
                        const dateReferrals = groupedByDate[dateKey];
                        const formattedDate = dateKey !== "sem-data"
                          ? format(new Date(dateKey), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
                          : "Sem data";

                        return (
                          <>
                            {/* Date Header Row */}
                            <TableRow key={`date-${dateKey}`} className="bg-muted/30 hover:bg-muted/40 border-t border-border">
                              <TableCell colSpan={9} className="py-2.5">
                                <div className="flex items-center gap-2 font-semibold text-foreground/80">
                                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                                    <Calendar className="h-4 w-4 text-primary" />
                                  </div>
                                  <span className="capitalize">{formattedDate}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                            {/* Referrals for this date */}
                            {dateReferrals.map((referral, index) => (
                              <AnimatedTableRow key={referral.id} delay={index * 50}>
                                <TableCell>
                                  {referral.created_at 
                                    ? format(new Date(referral.created_at), "HH:mm", { locale: ptBR })
                                    : "-"}
                                </TableCell>
                                <TableCell>{referral.name || "-"}</TableCell>
                                <TableCell>{referral.email}</TableCell>
                                <TableCell>{referral.product_name || "-"}</TableCell>
                                <TableCell>{referral.plan_name || "-"}</TableCell>
                                <TableCell>{getStatusBadge(referral.status)}</TableCell>
                                <TableCell>
                                  {referral.cancel_at_period_end ? (
                                    <Badge variant="destructive">Sim</Badge>
                                  ) : (
                                    <Badge variant="secondary">Não</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {referral.current_period_start && referral.current_period_end ? (
                                    <div className="text-xs">
                                      <div>{formatDate(referral.current_period_start)}</div>
                                      <div>{formatDate(referral.current_period_end)}</div>
                                    </div>
                                  ) : "-"}
                                </TableCell>
                                <TableCell>{formatDate(referral.trial_end)}</TableCell>
                              </AnimatedTableRow>
                            ))}
                          </>
                        );
                      })
                    )}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground whitespace-nowrap">
                      Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, stats.total)} de {stats.total} indicações
                    </p>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}

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
              </CardContent>
            </Card>
          );
        })()
      )}
    </div>
  );
};

export default Referrals;
