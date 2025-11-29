import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, TrendingUp, RefreshCw, X, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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
  my_commission_from_sub: number;
  level: number;
}

const SubAffiliates = () => {
  const [subAffiliates, setSubAffiliates] = useState<SubAffiliate[]>([]);
  const [filteredData, setFilteredData] = useState<SubAffiliate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, commissions: 0 });
  const { toast } = useToast();

  // Filtros
  const [nameFilter, setNameFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadSubAffiliates();
  }, [currentPage, itemsPerPage, nameFilter, emailFilter, planFilter, statusFilter, levelFilter, startDateFilter, endDateFilter]);

  const loadSubAffiliates = async () => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        return;
      }

      // Construir query base
      let query = supabase
        .from('view_sub_affiliates' as any)
        .select('*', { count: 'exact' })
        .eq('parent_affiliate_id', user.id);

      // Aplicar filtros
      if (nameFilter) {
        query = query.or(`name.ilike.%${nameFilter}%,username.ilike.%${nameFilter}%`);
      }

      if (emailFilter) {
        query = query.ilike('email', `%${emailFilter}%`);
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
        query = query.gte('created_at', startDateFilter);
      }

      if (endDateFilter) {
        query = query.lte('created_at', endDateFilter + "T23:59:59");
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
      setIsLoading(false);
    }
  };


  const clearFilters = () => {
    setNameFilter("");
    setEmailFilter("");
    setPlanFilter("all");
    setStatusFilter("all");
    setLevelFilter("all");
    setStartDateFilter("");
    setEndDateFilter("");
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Sub Afiliados</h1>
          <p className="text-muted-foreground">
            Gerencie sua rede de sub-afiliados
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Sub Afiliados</h1>
        <p className="text-muted-foreground">
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

      <Card>
        <CardHeader>
          <CardTitle>Lista de Sub-Afiliados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap items-end gap-3 pb-4 border-b">
            <div className="flex-1 min-w-[150px]">
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
            </div>

            <div className="flex-1 min-w-[150px]">
              <Input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
              />
            </div>

            <div className="flex-1 min-w-[150px]">
              <Input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
              />
            </div>

            <div className="flex-1 min-w-[150px]">
              <Input
                placeholder="Nome/Username"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
              />
            </div>

            <div className="flex-1 min-w-[150px]">
              <Input
                placeholder="Email"
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
              />
            </div>

            <div className="flex-1 min-w-[150px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {uniqueStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[150px]">
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
            </div>

            <div className="flex-1 min-w-[120px]">
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
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={clearFilters}
              title="Limpar filtros"
            >
              <X className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={loadSubAffiliates}
              title="Atualizar"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome/Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Cadastro</TableHead>
                <TableHead className="text-center">Indicações</TableHead>
                <TableHead className="text-left">Minha Comissão</TableHead>
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
                      }).format(Number(sub.my_commission_from_sub) || 0)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Controles de paginação e informações */}
          <div className="grid grid-cols-3 items-center mt-4">
            <div className="text-sm text-muted-foreground">
              Mostrando {startIndex + 1} a {endIndex} de {stats.total} resultados
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
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
                        className="w-8 h-8 p-0"
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
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <div></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubAffiliates;
