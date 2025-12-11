import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, CheckCircle2, Clock, AlertCircle, Package, ChevronLeft, ChevronRight, Eye, RefreshCw, Filter, X } from "lucide-react";
import { DatePickerFilter } from "@/components/DatePickerFilter";

type ProcessingStatus = "all" | "processed" | "pending" | "error";

interface PaymentProcessing {
  id: string;
  external_payment_id: string;
  product_id: string;
  product_name: string;
  plan_id: string;
  plan_name: string;
  affiliate_id: string;
  affiliate_name: string;
  amount: number;
  currency: string;
  billing_reason: string;
  payment_status: string;
  payment_date: string;
  commission_processed: boolean;
  commission_processed_at: string | null;
  commission_error: string | null;
  commissions_generated: number;
  created_at: string;
  customer_name: string;
  customer_email: string;
}

export const AdminCommissionProcessingTab = () => {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProcessingStatus>("all");
  const [productId, setProductId] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [selectedPayment, setSelectedPayment] = useState<PaymentProcessing | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [search, status, productId, startDate, endDate, perPage]);

  const { data: products } = useQuery({
    queryKey: ["products-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["commission-processing-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unified_payments")
        .select("commission_processed, commission_error", { count: "exact" });
      
      if (error) throw error;

      const total = data?.length || 0;
      const processed = data?.filter(p => p.commission_processed === true && !p.commission_error).length || 0;
      const pending = data?.filter(p => p.commission_processed === false && !p.commission_error).length || 0;
      const withError = data?.filter(p => p.commission_error !== null).length || 0;

      return { total, processed, pending, withError };
    },
  });

  const { data: paymentsData, isLoading, refetch } = useQuery({
    queryKey: ["commission-processing", page, perPage, search, status, productId, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from("view_admin_commission_processing")
        .select("*", { count: "exact" });

      if (search) {
        query = query.or(`external_payment_id.ilike.%${search}%,affiliate_name.ilike.%${search}%,customer_name.ilike.%${search}%`);
      }

      if (status === "processed") {
        query = query.eq("commission_processed", true).is("commission_error", null);
      } else if (status === "pending") {
        query = query.eq("commission_processed", false).is("commission_error", null);
      } else if (status === "error") {
        query = query.not("commission_error", "is", null);
      }

      if (productId !== "all") {
        query = query.eq("product_id", productId);
      }

      if (startDate) {
        query = query.gte("created_at", startDate.toISOString());
      }

      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }

      const from = (page - 1) * perPage;
      const to = from + perPage - 1;

      query = query.order("created_at", { ascending: false }).range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        payments: data as PaymentProcessing[],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / perPage),
      };
    },
  });

  const getStatusBadge = (payment: PaymentProcessing) => {
    if (payment.commission_error) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Erro
        </Badge>
      );
    }
    if (payment.commission_processed) {
      return (
        <Badge className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3" />
          Processado
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
        <Clock className="h-3 w-3" />
        Pendente
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value / 100);
  };

  const truncateId = (id: string, length = 12) => {
    if (id.length <= length) return id;
    return id.substring(0, length) + "...";
  };

  const DetailContent = ({ payment }: { payment: PaymentProcessing }) => (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">External ID</p>
          <p className="text-sm font-mono break-all">{payment.external_payment_id}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          {getStatusBadge(payment)}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Produto</p>
          <p className="text-sm">{payment.product_name || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Plano</p>
          <p className="text-sm">{payment.plan_name || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Cliente</p>
          <p className="text-sm">{payment.customer_name || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="text-sm break-all">{payment.customer_email || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Afiliado</p>
          <p className="text-sm">{payment.affiliate_name || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Valor</p>
          <p className="text-sm font-medium">{formatCurrency(payment.amount)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Billing Reason</p>
          <p className="text-sm">{payment.billing_reason || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Comissões Geradas</p>
          <p className="text-sm font-medium">{payment.commissions_generated || 0}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Data do Pagamento</p>
          <p className="text-sm">
            {payment.payment_date 
              ? format(new Date(payment.payment_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
              : "-"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Processado em</p>
          <p className="text-sm">
            {payment.commission_processed_at 
              ? format(new Date(payment.commission_processed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
              : "-"}
          </p>
        </div>
      </div>
      
      {payment.commission_error && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-xs text-destructive font-medium mb-1">Erro de Processamento:</p>
          <p className="text-sm text-destructive/80 font-mono break-all">{payment.commission_error}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{stats?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Processados</p>
                <p className="text-xl font-bold text-emerald-600">{stats?.processed || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="text-xl font-bold text-amber-600">{stats?.pending || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Com Erro</p>
                <p className="text-xl font-bold text-destructive">{stats?.withError || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID, afiliado ou cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={status} onValueChange={(v) => setStatus(v as ProcessingStatus)}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="processed">Processados</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="error">Com Erro</SelectItem>
              </SelectContent>
            </Select>

            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="w-full lg:w-[200px]">
                <SelectValue placeholder="Produto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Produtos</SelectItem>
                {products?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="hidden lg:flex gap-2">
              <DatePickerFilter
                value={startDate}
                onChange={setStartDate}
                placeholder="Data início"
              />
              <DatePickerFilter
                value={endDate}
                onChange={setEndDate}
                placeholder="Data fim"
              />
            </div>

            <Button 
              variant="outline" 
              className="lg:hidden gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              Datas
            </Button>

            <Select value={perPage.toString()} onValueChange={(v) => setPerPage(parseInt(v))}>
              <SelectTrigger className="w-full lg:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / página</SelectItem>
                <SelectItem value="20">20 / página</SelectItem>
                <SelectItem value="50">50 / página</SelectItem>
                <SelectItem value="100">100 / página</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {showFilters && (
            <div className="flex gap-2 mt-4 lg:hidden">
              <DatePickerFilter
                value={startDate}
                onChange={setStartDate}
                placeholder="Data início"
              />
              <DatePickerFilter
                value={endDate}
                onChange={setEndDate}
                placeholder="Data fim"
              />
              {(startDate || endDate) && (
                <Button variant="ghost" size="icon" onClick={() => { setStartDate(undefined); setEndDate(undefined); }}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table / Cards */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !paymentsData?.payments?.length ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhum pagamento encontrado</p>
            </div>
          ) : isMobile ? (
            <div className="divide-y">
              {paymentsData.payments.map((payment) => (
                <div 
                  key={payment.id} 
                  className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedPayment(payment)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-muted-foreground truncate">
                        {truncateId(payment.external_payment_id, 20)}
                      </p>
                      <p className="font-medium truncate">{payment.product_name || "-"}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {payment.affiliate_name || payment.customer_name || "-"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(payment)}
                      <p className="text-sm font-medium">{formatCurrency(payment.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payment.created_at), "dd/MM HH:mm")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>External ID</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Afiliado</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Comissões</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsData.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-xs">
                      {truncateId(payment.external_payment_id)}
                    </TableCell>
                    <TableCell>{payment.product_name || "-"}</TableCell>
                    <TableCell>{payment.affiliate_name || "-"}</TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{getStatusBadge(payment)}</TableCell>
                    <TableCell>{payment.commissions_generated || 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(payment.created_at), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setSelectedPayment(payment)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {paymentsData && paymentsData.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {((page - 1) * perPage) + 1} - {Math.min(page * perPage, paymentsData.total)} de {paymentsData.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {page} / {paymentsData.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(p => Math.min(paymentsData.totalPages, p + 1))}
                  disabled={page === paymentsData.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {isMobile ? (
        <Drawer open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle>Detalhes do Pagamento</DrawerTitle>
            </DrawerHeader>
            {selectedPayment && <DetailContent payment={selectedPayment} />}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Pagamento</DialogTitle>
            </DialogHeader>
            {selectedPayment && <DetailContent payment={selectedPayment} />}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
