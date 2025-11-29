import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useDebounce } from "@/hooks/useDebounce";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

const ITEMS_PER_PAGE = 10;

const Referrals = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, conversionRate: 0 });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [selectedPlan, setSelectedPlan] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);

  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    loadFiltersData();
  }, []);

  useEffect(() => {
    loadReferrals();
    loadStats();
  }, [currentPage, debouncedSearch, selectedProduct, selectedPlan, selectedStatus]);

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
    setLoading(true);
    try {
      let query = supabase
        .from("view_referrals" as any)
        .select("*", { count: "exact" });

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
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setReferrals((data as any) || []);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
    } catch (error) {
      console.error("Error loading referrals:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      let query = supabase.from("view_referrals" as any).select("status", { count: "exact" });

      if (selectedProduct !== "all") {
        query = query.eq("product_id", selectedProduct);
      }

      const { count: total } = await query;

      const { count: active } = await query.eq("status", "active");

      const conversionRate = total && total > 0 ? ((active || 0) / total) * 100 : 0;

      setStats({
        total: total || 0,
        active: active || 0,
        conversionRate: Math.round(conversionRate)
      });
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

    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  if (loading && referrals.length === 0) {
    return <TableSkeleton columns={9} rows={10} showSearch />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Indicações</h1>
        <p className="text-muted-foreground">
          Acompanhe todas as suas indicações e conversões
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Indicações
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
              Assinaturas Ativas
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Conversão
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{stats.conversionRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
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

            <Select 
              value={selectedPlan} 
              onValueChange={setSelectedPlan}
              disabled={selectedProduct === "all"}
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

            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data Cadastro</TableHead>
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
                referrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell>{formatDate(referral.created_at)}</TableCell>
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, stats.total)} de {stats.total} indicações
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
    </div>
  );
};

export default Referrals;
