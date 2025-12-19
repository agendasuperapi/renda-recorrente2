import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, Calendar, CreditCard, TrendingUp, Eye, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, FilterX, ChevronLeft, ChevronRight, X, Receipt, User, SlidersHorizontal, LayoutList, LayoutGrid, CloudUpload, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/useDebounce";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollAnimation } from "@/components/ScrollAnimation";
import { AnimatedTableRow } from "@/components/AnimatedTableRow";
import { useEnvironment } from "@/contexts/EnvironmentContext";

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
  sync_status: string | null;
  sync_response: string | null;
  synced_at: string | null;
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

export default function AdminPaymentsContent() {
  const isMobile = useIsMobile();
  const { environment: globalEnvironment } = useEnvironment();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [syncStatusFilter, setSyncStatusFilter] = useState<string>("all");
  const [affiliateFilter, setAffiliateFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [sortColumn, setSortColumn] = useState<SortColumn>("payment_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"compact" | "complete">("compact");

  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: payments, isLoading, refetch } = useQuery({
    queryKey: ["admin-payments", currentPage, itemsPerPage, debouncedSearch, statusFilter, globalEnvironment, syncStatusFilter, affiliateFilter, startDate, endDate, sortColumn, sortDirection],
    queryFn: async () => {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase.from("view_admin_payments" as any).select("*", { count: "exact" });

      if (debouncedSearch) {
        query = query.or(`stripe_invoice_id.ilike.%${debouncedSearch}%,user_email.ilike.%${debouncedSearch}%,user_name.ilike.%${debouncedSearch}%,plan_name.ilike.%${debouncedSearch}%`);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      query = query.eq("environment", globalEnvironment);
      if (syncStatusFilter !== "all") {
        query = query.eq("sync_status", syncStatusFilter);
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

      if (sortColumn) {
        query = query.order(sortColumn, { ascending: sortDirection === "asc" });
      }
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: (data || []) as unknown as Payment[], totalCount: count || 0 };
    }
  });

  const paginatedPayments = payments?.data;
  const totalCount = payments?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleRetrySync = async (paymentId: string) => {
    setRetryingId(paymentId);
    try {
      const { error } = await supabase
        .from("payments")
        .update({ sync_status: "pending", sync_response: null })
        .eq("id", paymentId);

      if (error) throw error;

      toast({
        title: "Sincronização reagendada",
        description: "O pagamento será sincronizado novamente.",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Erro ao reagendar",
        description: "Não foi possível reagendar a sincronização.",
        variant: "destructive",
      });
    } finally {
      setRetryingId(null);
    }
  };

  const { data: statsData } = useQuery({
    queryKey: ["admin-payments-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("view_admin_payments" as any).select("amount, environment, payment_date");
      if (error) throw error;
      type StatsRow = { amount: number; environment: string; payment_date: string };
      const all = data as unknown as StatsRow[] || [];
      const totalPaid = all.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalPaidProduction = all.filter(p => p.environment === "production").reduce((sum, p) => sum + Number(p.amount), 0);
      const totalPaidTest = all.filter(p => p.environment === "test").reduce((sum, p) => sum + Number(p.amount), 0);
      const paymentCount = all.length;
      const lastPayment = all[0];
      return { totalPaid, totalPaidProduction, totalPaidTest, paymentCount, lastPayment };
    }
  });

  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setDialogOpen(true);
  };

  const handleRefresh = () => refetch();

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSyncStatusFilter("all");
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
    if (sortColumn !== column) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-40" />;
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const renderPaymentDetails = () => {
    if (!selectedPayment) return null;
    return (
      <Tabs defaultValue="payment" className="w-full">
        <TabsList className="grid grid-cols-2 gap-2 bg-muted/50 p-1.5 rounded-xl mb-4">
          <TabsTrigger value="payment" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=inactive]:bg-background data-[state=inactive]:border data-[state=inactive]:border-border rounded-lg">
            <Receipt className="w-4 h-4 mr-2" />
            Pagamento
          </TabsTrigger>
          <TabsTrigger value="user" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=inactive]:bg-background data-[state=inactive]:border data-[state=inactive]:border-border rounded-lg">
            <User className="w-4 h-4 mr-2" />
            Usuário
          </TabsTrigger>
        </TabsList>
        <TabsContent value="payment" forceMount className="data-[state=inactive]:hidden">
          <ScrollArea className="max-h-[50vh]">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm font-medium text-muted-foreground">Invoice ID</p><p className="text-sm font-mono">{selectedPayment.stripe_invoice_id}</p></div>
              <div><p className="text-sm font-medium text-muted-foreground">Valor</p><p className="text-lg font-bold text-primary">{Number(selectedPayment.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></div>
              <div><p className="text-sm font-medium text-muted-foreground">Status</p><Badge variant={selectedPayment.status === "paid" ? "default" : "secondary"} className="mt-1">{selectedPayment.status}</Badge></div>
              <div><p className="text-sm font-medium text-muted-foreground">Ambiente</p><Badge variant={selectedPayment.environment === "production" ? "default" : "secondary"} className="mt-1">{selectedPayment.environment}</Badge></div>
              <div><p className="text-sm font-medium text-muted-foreground">Plano</p><p className="text-sm">{selectedPayment.plan_name || "-"}</p></div>
              <div><p className="text-sm font-medium text-muted-foreground">Motivo</p><p className="text-sm">{selectedPayment.billing_reason || "-"}</p></div>
              <div><p className="text-sm font-medium text-muted-foreground">Data Pagamento</p><p className="text-sm">{format(new Date(selectedPayment.payment_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p></div>
              <div><p className="text-sm font-medium text-muted-foreground">Criado em</p><p className="text-sm">{format(new Date(selectedPayment.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p></div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Sincronização</p>
                <div className="flex items-center gap-2 mt-1">
                  {selectedPayment.sync_status === 'synced' ? (
                    <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Sincronizado</Badge>
                  ) : selectedPayment.sync_status === 'error' ? (
                    <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Erro</Badge>
                  ) : (
                    <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>
                  )}
                  {selectedPayment.synced_at && <span className="text-xs text-muted-foreground">{format(new Date(selectedPayment.synced_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>}
                </div>
                {selectedPayment.sync_response && selectedPayment.sync_status === 'error' && (
                  <p className="text-xs text-destructive mt-1">{selectedPayment.sync_response}</p>
                )}
              </div>
              {selectedPayment.affiliate_name && <div className="col-span-2"><p className="text-sm font-medium text-muted-foreground">Afiliado</p><p className="text-sm">{selectedPayment.affiliate_name}</p></div>}
              {(selectedPayment.coupon_custom_code || selectedPayment.coupon_code) && <div className="col-span-2"><p className="text-sm font-medium text-muted-foreground">Cupom</p><p className="text-sm font-mono">{selectedPayment.coupon_custom_code || selectedPayment.coupon_code}</p></div>}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="user" forceMount className="data-[state=inactive]:hidden">
          <ScrollArea className="max-h-[50vh]">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm font-medium text-muted-foreground">Nome</p><p className="text-sm">{selectedPayment.user_name || "-"}</p></div>
              <div><p className="text-sm font-medium text-muted-foreground">Email</p><p className="text-sm">{selectedPayment.user_email || "-"}</p></div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <ScrollAnimation animation="fade-up" delay={0} threshold={0.05}>
          <Card className="transition-all duration-300 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Geral</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(statsData?.totalPaid || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
              <p className="text-xs text-muted-foreground">Em {statsData?.paymentCount || 0} pagamentos</p>
            </CardContent>
          </Card>
        </ScrollAnimation>

        <ScrollAnimation animation="fade-up" delay={50} threshold={0.05}>
          <Card className="transition-all duration-300 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produção</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(statsData?.totalPaidProduction || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
              <p className="text-xs text-muted-foreground">Pagamentos reais</p>
            </CardContent>
          </Card>
        </ScrollAnimation>

        <ScrollAnimation animation="fade-up" delay={100} threshold={0.05}>
          <Card className="transition-all duration-300 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Teste</CardTitle>
              <CreditCard className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(statsData?.totalPaidTest || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
              <p className="text-xs text-muted-foreground">Pagamentos teste</p>
            </CardContent>
          </Card>
        </ScrollAnimation>

        <ScrollAnimation animation="fade-up" delay={150} threshold={0.05}>
          <Card className="transition-all duration-300 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Último Pagamento</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData?.lastPayment ? Number(statsData.lastPayment.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "N/A"}</div>
              <p className="text-xs text-muted-foreground">{statsData?.lastPayment ? format(new Date(statsData.lastPayment.payment_date), "dd/MM/yyyy", { locale: ptBR }) : "Nenhum"}</p>
            </CardContent>
          </Card>
        </ScrollAnimation>
      </div>

      {/* Barra de controle mobile/tablet */}
      <div className="flex items-center justify-between lg:hidden">
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
        </Button>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button variant={viewMode === "complete" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("complete")}>
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "compact" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("compact")}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className={`${!showFilters && 'hidden lg:block'} bg-transparent border-0 shadow-none lg:bg-card lg:border lg:shadow-sm rounded-none lg:rounded-lg`}>
        <CardContent className="!p-0 lg:!p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:flex gap-4">
            <Input placeholder="Buscar por invoice, usuário ou plano..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full lg:max-w-sm" />
            <Input placeholder="Filtrar por afiliado/cupom..." value={affiliateFilter} onChange={e => setAffiliateFilter(e.target.value)} className="w-full lg:max-w-sm" />
            <Input type="date" placeholder="Data inicial" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full lg:w-[160px]" />
            <Input type="date" placeholder="Data final" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full lg:w-[160px]" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
              </SelectContent>
            </Select>
            <Select value={syncStatusFilter} onValueChange={setSyncStatusFilter}>
              <SelectTrigger className="w-full lg:w-[180px]"><SelectValue placeholder="Sincronização" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos sync status</SelectItem>
                <SelectItem value="synced">Sincronizado</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
              </SelectContent>
            </Select>
            <Select value={itemsPerPage.toString()} onValueChange={value => { setItemsPerPage(Number(value)); setCurrentPage(1); }}>
              <SelectTrigger className="w-full lg:w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 por página</SelectItem>
                <SelectItem value="20">20 por página</SelectItem>
                <SelectItem value="50">50 por página</SelectItem>
                <SelectItem value="100">100 por página</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="w-full lg:w-auto"><RefreshCw className="h-4 w-4 mr-2" />Atualizar</Button>
            <Button variant="outline" size="sm" onClick={handleResetFilters} className="w-full lg:w-auto"><FilterX className="h-4 w-4 mr-2" />Limpar filtros</Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="bg-transparent border-0 shadow-none lg:bg-card lg:border lg:shadow-sm rounded-none lg:rounded-lg">
        <CardContent className="!p-0 lg:!p-6">
          {isLoading ? (
            isMobile ? (
              <div className="space-y-3">
                {[...Array(10)].map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
              </div>
            ) : <TableSkeleton columns={8} rows={10} />
          ) : isMobile ? (
            <div className="space-y-3">
              {paginatedPayments && paginatedPayments.length > 0 ? paginatedPayments.map((payment, index) =>
                viewMode === "compact" ? (
                  <ScrollAnimation key={payment.id} animation="fade-up" delay={index * 50} threshold={0.05}>
                    <Card className="bg-card transition-all duration-300 hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{payment.user_name || "N/A"}</p>
                            <p className="text-xs text-muted-foreground truncate">{payment.plan_name || "N/A"}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-muted-foreground">{format(new Date(payment.payment_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                            <p className="font-bold text-sm text-primary">{Number(payment.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => handleViewDetails(payment)}><Eye className="w-4 h-4" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  </ScrollAnimation>
                ) : (
                  <ScrollAnimation key={payment.id} animation="fade-up" delay={index * 50} threshold={0.05}>
                    <Card className="bg-card transition-all duration-300 hover:shadow-md">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10"><AvatarFallback>{payment.user_name?.charAt(0).toUpperCase() || "?"}</AvatarFallback></Avatar>
                            <div><p className="font-medium text-sm">{payment.user_name || "N/A"}</p><p className="text-xs text-muted-foreground">{payment.user_email || "N/A"}</p></div>
                          </div>
                          <Badge variant={payment.status === "paid" ? "default" : "secondary"}>{payment.status}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><p className="text-xs text-muted-foreground">Plano</p><p className="truncate">{payment.plan_name || "N/A"}</p></div>
                          <div><p className="text-xs text-muted-foreground">Valor</p><p className="font-bold text-primary">{Number(payment.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></div>
                          <div><p className="text-xs text-muted-foreground">Data</p><p>{format(new Date(payment.payment_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p></div>
                          <div><p className="text-xs text-muted-foreground">Ambiente</p><Badge variant={payment.environment === "production" ? "default" : "secondary"}>{payment.environment}</Badge></div>
                        </div>
                        {(payment.affiliate_name || payment.coupon_custom_code || payment.coupon_code) && (
                          <div className="pt-2 border-t">
                            {payment.affiliate_name && <p className="text-xs"><span className="text-muted-foreground">Afiliado:</span> {payment.affiliate_name}</p>}
                            {(payment.coupon_custom_code || payment.coupon_code) && <p className="text-xs"><span className="text-muted-foreground">Cupom:</span> {payment.coupon_custom_code || payment.coupon_code}</p>}
                          </div>
                        )}
                        <Button variant="outline" size="sm" className="w-full" onClick={() => handleViewDetails(payment)}><Eye className="w-4 h-4 mr-2" />Ver detalhes</Button>
                      </CardContent>
                    </Card>
                  </ScrollAnimation>
                )
              ) : (
                <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum pagamento encontrado</CardContent></Card>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("user_name")}><div className="flex items-center">Usuário <SortIcon column="user_name" /></div></TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("plan_name")}><div className="flex items-center">Plano <SortIcon column="plan_name" /></div></TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("amount")}><div className="flex items-center">Valor <SortIcon column="amount" /></div></TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ambiente</TableHead>
                  <TableHead>Sincronização</TableHead>
                  <TableHead>Afiliado/Cupom</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("payment_date")}><div className="flex items-center">Data <SortIcon column="payment_date" /></div></TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPayments && paginatedPayments.length > 0 ? paginatedPayments.map((payment, index) => (
                  <AnimatedTableRow key={payment.id} delay={index * 30}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8"><AvatarFallback>{payment.user_name?.charAt(0).toUpperCase() || "?"}</AvatarFallback></Avatar>
                        <div><p className="font-medium text-sm">{payment.user_name || "N/A"}</p><p className="text-xs text-muted-foreground truncate max-w-[150px]">{payment.user_email || "N/A"}</p></div>
                      </div>
                    </TableCell>
                    <TableCell>{payment.plan_name || "-"}</TableCell>
                    <TableCell className="font-bold text-primary">{Number(payment.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                    <TableCell><Badge variant={payment.status === "paid" ? "default" : "secondary"}>{payment.status}</Badge></TableCell>
                    <TableCell><Badge variant={payment.environment === "production" ? "default" : "secondary"}>{payment.environment}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {payment.sync_status === 'synced' ? (
                          <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Synced</Badge>
                        ) : payment.sync_status === 'error' ? (
                          <>
                            <Badge variant="destructive" title={payment.sync_response || ''}><AlertTriangle className="w-3 h-3 mr-1" />Erro</Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRetrySync(payment.id);
                              }}
                              disabled={retryingId === payment.id}
                              title="Tentar novamente"
                            >
                              <RefreshCw className={`w-3 h-3 ${retryingId === payment.id ? 'animate-spin' : ''}`} />
                            </Button>
                          </>
                        ) : (
                          <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        {payment.affiliate_name && <p>{payment.affiliate_name}</p>}
                        {(payment.coupon_custom_code || payment.coupon_code) && <p className="font-mono text-muted-foreground">{payment.coupon_custom_code || payment.coupon_code}</p>}
                        {!payment.affiliate_name && !payment.coupon_custom_code && !payment.coupon_code && "-"}
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(payment.payment_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => handleViewDetails(payment)}><Eye className="w-4 h-4" /></Button></TableCell>
                  </AnimatedTableRow>
                )) : (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum pagamento encontrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm">{currentPage} / {totalPages}</span>
            <Button variant="outline" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {/* Dialog/Drawer para detalhes */}
      {isMobile ? (
        <Drawer open={dialogOpen} onOpenChange={setDialogOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader><DrawerTitle>Detalhes do Pagamento</DrawerTitle></DrawerHeader>
            <div className="px-4 pb-4">{renderPaymentDetails()}</div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Detalhes do Pagamento</DialogTitle></DialogHeader>
            {renderPaymentDetails()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
