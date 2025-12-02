import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, Calendar, CreditCard, TrendingUp, Eye, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, FilterX, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useDebounce } from "@/hooks/useDebounce";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";

type Payment = {
  id: string;
  stripe_invoice_id: string;
  amount: number;
  billing_reason: string | null;
  status: string;
  payment_date: string;
  environment: string;
  currency: string | null;
  created_at: string;
  plan_name: string | null;
  plan_price: number | null;
  user_name: string | null;
  user_email: string | null;
  stripe_subscription_id: string | null;
  affiliate_name: string | null;
  coupon_custom_code: string | null;
  coupon_code: string | null;
};

type SortColumn = "payment_date" | "amount" | "user_name" | "plan_name" | null;
type SortDirection = "asc" | "desc";

export default function AdminPayments() {
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [environmentFilter, setEnvironmentFilter] = useState<string>("all");
  const [affiliateFilter, setAffiliateFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [sortColumn, setSortColumn] = useState<SortColumn>("payment_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: payments, isLoading, refetch } = useQuery({
    queryKey: ["admin-payments", currentPage, itemsPerPage, debouncedSearch, statusFilter, environmentFilter, affiliateFilter, startDate, endDate, sortColumn, sortDirection],
    queryFn: async () => {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from("view_admin_payments" as any)
        .select("*", { count: "exact" });

      // Filtros aplicados no banco de dados
      if (debouncedSearch) {
        query = query.or(`stripe_invoice_id.ilike.%${debouncedSearch}%,user_email.ilike.%${debouncedSearch}%,user_name.ilike.%${debouncedSearch}%,plan_name.ilike.%${debouncedSearch}%`);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (environmentFilter !== "all") {
        query = query.eq("environment", environmentFilter);
      }
      if (affiliateFilter) {
        query = query.or(`affiliate_name.ilike.%${affiliateFilter}%,coupon_custom_code.ilike.%${affiliateFilter}%,coupon_code.ilike.%${affiliateFilter}%`);
      }
      if (startDate) {
        query = query.gte("payment_date", startDate);
      }
      if (endDate) {
        query = query.lte("payment_date", endDate + "T23:59:59");
      }

      // Ordenação e paginação no banco
      if (sortColumn) {
        query = query.order(sortColumn, { ascending: sortDirection === "asc" });
      }
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      
      return { 
        data: (data || []) as unknown as Payment[], 
        totalCount: count || 0 
      };
    },
  });

  const paginatedPayments = payments?.data;
  const totalCount = payments?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // Query separada para estatísticas
  const { data: statsData } = useQuery({
    queryKey: ["admin-payments-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("view_admin_payments" as any)
        .select("amount, environment, payment_date");

      if (error) throw error;
      
      type StatsRow = { amount: number; environment: string; payment_date: string };
      const all = (data as unknown as StatsRow[]) || [];
      const totalPaid = all.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalPaidProduction = all.filter(p => p.environment === "production").reduce((sum, p) => sum + Number(p.amount), 0);
      const totalPaidTest = all.filter(p => p.environment === "test").reduce((sum, p) => sum + Number(p.amount), 0);
      const paymentCount = all.length;
      const lastPayment = all[0];

      return {
        totalPaid,
        totalPaidProduction,
        totalPaidTest,
        paymentCount,
        lastPayment
      };
    },
  });

  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setDialogOpen(true);
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setEnvironmentFilter("all");
    setAffiliateFilter("");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-40" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  return (
    <div className="space-y-6 sm:p-6">
      <div>
        <h1 className="text-3xl font-bold">Pagamentos</h1>
        <p className="text-muted-foreground">Gerenciamento de todos os pagamentos do sistema</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Geral</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(statsData?.totalPaid || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
            <p className="text-xs text-muted-foreground">
              Em {statsData?.paymentCount || 0} pagamentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produção</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(statsData?.totalPaidProduction || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
            <p className="text-xs text-muted-foreground">
              Pagamentos reais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teste</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(statsData?.totalPaidTest || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
            <p className="text-xs text-muted-foreground">
              Pagamentos teste
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Último Pagamento</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsData?.lastPayment ? Number(statsData.lastPayment.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {statsData?.lastPayment 
                ? format(new Date(statsData.lastPayment.payment_date), "dd/MM/yyyy", { locale: ptBR })
                : "Nenhum"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Todos os Pagamentos</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:flex gap-4 mt-4">
            <Input
              placeholder="Buscar por invoice, usuário ou plano..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full lg:max-w-sm"
            />
            <Input
              placeholder="Filtrar por afiliado/cupom..."
              value={affiliateFilter}
              onChange={(e) => setAffiliateFilter(e.target.value)}
              className="w-full lg:max-w-sm"
            />
            <Input
              type="date"
              placeholder="Data inicial"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full lg:w-[160px]"
            />
            <Input
              type="date"
              placeholder="Data final"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full lg:w-[160px]"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
              </SelectContent>
            </Select>
            <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Ambiente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos ambientes</SelectItem>
                <SelectItem value="production">Produção</SelectItem>
                <SelectItem value="test">Teste</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={itemsPerPage.toString()} 
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 por página</SelectItem>
                <SelectItem value="20">20 por página</SelectItem>
                <SelectItem value="50">50 por página</SelectItem>
                <SelectItem value="100">100 por página</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="w-full lg:w-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetFilters} className="w-full lg:w-auto">
              <FilterX className="h-4 w-4 mr-2" />
              Limpar filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            isMobile ? (
              <div className="space-y-3">
                {[...Array(10)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-24 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <TableSkeleton columns={8} rows={10} />
            )
          ) : isMobile ? (
            <div className="space-y-3">
              {paginatedPayments && paginatedPayments.length > 0 ? (
                paginatedPayments.map((payment) => (
                  <Card key={payment.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{payment.user_name || "N/A"}</p>
                          <p className="text-xs text-muted-foreground truncate">{payment.user_email || "N/A"}</p>
                        </div>
                        <Badge variant={payment.status === "paid" ? "default" : "destructive"} className="flex-shrink-0">
                          {payment.status === "paid" ? "Pago" : payment.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Plano:</span>
                          <p className="font-medium truncate">{payment.plan_name || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Valor:</span>
                          <p className="font-bold text-sm">{Number(payment.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Data:</span>
                          <p className="font-medium">{format(new Date(payment.payment_date), "dd/MM/yy HH:mm", { locale: ptBR })}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Ambiente:</span>
                          <Badge variant={payment.environment === "production" ? "default" : "secondary"} className="text-xs">
                            {payment.environment === "production" ? "Prod" : "Test"}
                          </Badge>
                        </div>
                      </div>

                      {(payment.affiliate_name || payment.coupon_custom_code || payment.coupon_code) && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Afiliado/Cupom: </span>
                          <span className="font-medium">{payment.affiliate_name || payment.coupon_custom_code || payment.coupon_code}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2 border-t">
                        <Badge variant="outline" className="text-xs">
                          {payment.billing_reason === "subscription_create" ? "Nova" :
                           payment.billing_reason === "subscription_cycle" ? "Renovação" :
                           payment.billing_reason === "subscription_update" ? "Atualização" :
                           payment.billing_reason || "N/A"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(payment)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhum pagamento encontrado
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button 
                        onClick={() => handleSort("payment_date")}
                        className="flex items-center hover:text-foreground transition-colors font-medium"
                      >
                        Data
                        <SortIcon column="payment_date" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button 
                        onClick={() => handleSort("user_name")}
                        className="flex items-center hover:text-foreground transition-colors font-medium"
                      >
                        Usuário / Email
                        <SortIcon column="user_name" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button 
                        onClick={() => handleSort("plan_name")}
                        className="flex items-center hover:text-foreground transition-colors font-medium"
                      >
                        Plano
                        <SortIcon column="plan_name" />
                      </button>
                    </TableHead>
                    <TableHead>Afiliado / Cupom</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>
                      <button 
                        onClick={() => handleSort("amount")}
                        className="flex items-center hover:text-foreground transition-colors font-medium"
                      >
                        Valor
                        <SortIcon column="amount" />
                      </button>
                    </TableHead>
                    <TableHead>Ambiente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPayments && paginatedPayments.length > 0 ? (
                    paginatedPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="text-xs">
                          {format(new Date(payment.payment_date), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{payment.user_name || "N/A"}</span>
                            <span className="text-xs text-muted-foreground">{payment.user_email || "N/A"}</span>
                          </div>
                        </TableCell>
                        <TableCell>{payment.plan_name || "N/A"}</TableCell>
                        <TableCell>
                          {payment.affiliate_name || payment.coupon_custom_code || payment.coupon_code ? (
                            <div className="flex flex-col">
                              {payment.affiliate_name && (
                                <span className="font-medium text-xs">{payment.affiliate_name}</span>
                              )}
                              {(payment.coupon_custom_code || payment.coupon_code) && (
                                <span className="text-xs text-muted-foreground">
                                  {payment.coupon_custom_code || payment.coupon_code}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {payment.billing_reason === "subscription_create" ? "Nova" :
                             payment.billing_reason === "subscription_cycle" ? "Renovação" :
                             payment.billing_reason === "subscription_update" ? "Atualização" :
                             payment.billing_reason || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {Number(payment.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={payment.environment === "production" ? "default" : "secondary"}>
                            {payment.environment === "production" ? "Prod" : "Test"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={payment.status === "paid" ? "default" : "destructive"}>
                            {payment.status === "paid" ? "Pago" : payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(payment)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        Nenhum pagamento encontrado
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
                Mostrando {startIndex + 1} a {Math.min(endIndex, totalCount)} de {totalCount} pagamentos
              </p>
              <Pagination className="order-1 sm:order-2">
                <PaginationContent className="gap-1">
                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
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
                          onClick={() => setCurrentPage(page)}
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
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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

      {isMobile ? (
        <Drawer open={dialogOpen} onOpenChange={setDialogOpen}>
          <DrawerContent className="max-h-[90vh]">
            {/* Handle bar para indicar que é um drawer */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
            </div>
            
            <DrawerHeader className="relative">
              <DrawerTitle>Detalhes do Pagamento</DrawerTitle>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2"
                onClick={() => setDialogOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DrawerHeader>
            {selectedPayment && (
              <Tabs defaultValue="payment" className="w-full px-4 pb-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="payment">Detalhes do Pagamento</TabsTrigger>
                  <TabsTrigger value="client" disabled={!selectedPayment.user_name}>Cliente</TabsTrigger>
                </TabsList>
                
                <TabsContent value="payment" className="space-y-4 mt-4">
                  <ScrollArea className="max-h-[60vh]">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Invoice ID</p>
                        <p className="text-sm font-mono break-all">{selectedPayment.stripe_invoice_id}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                        <Badge variant={selectedPayment.status === "paid" ? "default" : "destructive"}>
                          {selectedPayment.status === "paid" ? "Pago" : selectedPayment.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Valor</p>
                        <p className="text-lg font-semibold">
                          {Number(selectedPayment.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Moeda</p>
                        <p className="text-sm uppercase">{selectedPayment.currency || "BRL"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Data do Pagamento</p>
                        <p className="text-sm">
                          {format(new Date(selectedPayment.payment_date), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Ambiente</p>
                        <Badge variant={selectedPayment.environment === "production" ? "default" : "secondary"}>
                          {selectedPayment.environment === "production" ? "Produção" : "Teste"}
                        </Badge>
                      </div>
                      {selectedPayment.billing_reason && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Motivo da Cobrança</p>
                          <Badge variant="outline">
                            {selectedPayment.billing_reason === "subscription_create" ? "Nova Assinatura" :
                             selectedPayment.billing_reason === "subscription_cycle" ? "Renovação" :
                             selectedPayment.billing_reason === "subscription_update" ? "Atualização" :
                             selectedPayment.billing_reason}
                          </Badge>
                        </div>
                      )}
                      {selectedPayment.plan_name && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Plano</p>
                          <p className="text-sm font-semibold">{selectedPayment.plan_name}</p>
                          {selectedPayment.plan_price && (
                            <p className="text-xs text-muted-foreground">
                              {Number(selectedPayment.plan_price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </p>
                          )}
                        </div>
                      )}
                      {selectedPayment.user_name && (
                        <>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Nome do Cliente</p>
                            <p className="text-sm">{selectedPayment.user_name}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Email do Cliente</p>
                            <p className="text-sm">{selectedPayment.user_email || "-"}</p>
                          </div>
                        </>
                      )}
                      {selectedPayment.stripe_subscription_id && (
                        <div className="col-span-2">
                          <p className="text-sm font-medium text-muted-foreground">Stripe Subscription ID</p>
                          <p className="text-sm font-mono break-all">{selectedPayment.stripe_subscription_id}</p>
                        </div>
                      )}
                      {(selectedPayment.affiliate_name || selectedPayment.coupon_custom_code || selectedPayment.coupon_code) && (
                        <>
                          {selectedPayment.affiliate_name && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Afiliado</p>
                              <p className="text-sm font-semibold">{selectedPayment.affiliate_name}</p>
                            </div>
                          )}
                          {(selectedPayment.coupon_custom_code || selectedPayment.coupon_code) && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Cupom Utilizado</p>
                              <Badge variant="outline">
                                {selectedPayment.coupon_custom_code || selectedPayment.coupon_code}
                              </Badge>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="client" className="space-y-4 mt-4">
                  {selectedPayment.user_name ? (
                    <ScrollArea className="max-h-[60vh]">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Nome</p>
                          <p className="text-sm">{selectedPayment.user_name}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Email</p>
                          <p className="text-sm">{selectedPayment.user_email || "-"}</p>
                        </div>
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                      Nenhum dado de cliente disponível
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>Detalhes do Pagamento</DialogTitle>
            </DialogHeader>
            {selectedPayment && (
              <Tabs defaultValue="payment" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="payment">Detalhes do Pagamento</TabsTrigger>
                  <TabsTrigger value="client" disabled={!selectedPayment.user_name}>Cliente</TabsTrigger>
                </TabsList>
                
                <TabsContent value="payment" className="space-y-4 mt-4">
                  <ScrollArea className="max-h-[50vh]">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Invoice ID</p>
                        <p className="text-sm font-mono break-all">{selectedPayment.stripe_invoice_id}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                        <Badge variant={selectedPayment.status === "paid" ? "default" : "destructive"}>
                          {selectedPayment.status === "paid" ? "Pago" : selectedPayment.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Valor</p>
                        <p className="text-lg font-semibold">
                          {Number(selectedPayment.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Moeda</p>
                        <p className="text-sm uppercase">{selectedPayment.currency || "BRL"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Data do Pagamento</p>
                        <p className="text-sm">
                          {format(new Date(selectedPayment.payment_date), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Ambiente</p>
                        <Badge variant={selectedPayment.environment === "production" ? "default" : "secondary"}>
                          {selectedPayment.environment === "production" ? "Produção" : "Teste"}
                        </Badge>
                      </div>
                      {selectedPayment.billing_reason && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Motivo da Cobrança</p>
                          <Badge variant="outline">
                            {selectedPayment.billing_reason === "subscription_create" ? "Nova Assinatura" :
                             selectedPayment.billing_reason === "subscription_cycle" ? "Renovação" :
                             selectedPayment.billing_reason === "subscription_update" ? "Atualização" :
                             selectedPayment.billing_reason}
                          </Badge>
                        </div>
                      )}
                      {selectedPayment.plan_name && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Plano</p>
                          <p className="text-sm font-semibold">{selectedPayment.plan_name}</p>
                          {selectedPayment.plan_price && (
                            <p className="text-xs text-muted-foreground">
                              {Number(selectedPayment.plan_price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </p>
                          )}
                        </div>
                      )}
                      {selectedPayment.user_name && (
                        <>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Nome do Cliente</p>
                            <p className="text-sm">{selectedPayment.user_name}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Email do Cliente</p>
                            <p className="text-sm">{selectedPayment.user_email || "-"}</p>
                          </div>
                        </>
                      )}
                      {selectedPayment.stripe_subscription_id && (
                        <div className="col-span-2">
                          <p className="text-sm font-medium text-muted-foreground">Stripe Subscription ID</p>
                          <p className="text-sm font-mono break-all">{selectedPayment.stripe_subscription_id}</p>
                        </div>
                      )}
                      {(selectedPayment.affiliate_name || selectedPayment.coupon_custom_code || selectedPayment.coupon_code) && (
                        <>
                          {selectedPayment.affiliate_name && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Afiliado</p>
                              <p className="text-sm font-semibold">{selectedPayment.affiliate_name}</p>
                            </div>
                          )}
                          {(selectedPayment.coupon_custom_code || selectedPayment.coupon_code) && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Cupom Utilizado</p>
                              <Badge variant="outline">
                                {selectedPayment.coupon_custom_code || selectedPayment.coupon_code}
                              </Badge>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="client" className="space-y-4 mt-4">
                  {selectedPayment.user_name ? (
                    <ScrollArea className="max-h-[50vh]">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Nome</p>
                          <p className="text-sm">{selectedPayment.user_name}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Email</p>
                          <p className="text-sm">{selectedPayment.user_email || "-"}</p>
                        </div>
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                      Nenhum dado de cliente disponível
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
