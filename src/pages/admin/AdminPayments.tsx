import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, Calendar, CreditCard, TrendingUp, Eye, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

type Payment = {
  id: string;
  stripe_invoice_id: string;
  amount: number;
  billing_reason: string | null;
  status: string;
  payment_date: string;
  environment: string;
  currency: string | null;
  metadata: any;
  plans: { name: string; price: number } | null;
  profiles: { name: string; email: string } | null;
  subscriptions: { stripe_subscription_id: string | null } | null;
  affiliate_profiles: { name: string } | null;
  affiliate_coupons: { custom_code: string | null; coupons: { code: string } | null } | null;
};

export default function AdminPayments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [environmentFilter, setEnvironmentFilter] = useState<string>("all");
  const [affiliateFilter, setAffiliateFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const { data: payments, isLoading, refetch } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payments")
        .select(`
          *,
          plans:plan_id (name, price),
          profiles:user_id (name, email),
          subscriptions:subscription_id (stripe_subscription_id),
          affiliate_profiles:affiliate_id (name),
          affiliate_coupons:affiliate_coupon_id (custom_code, coupons:coupon_id (code))
        `)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      return data as unknown as Payment[];
    },
  });

  const filteredPayments = payments?.filter(payment => {
    const matchesSearch = 
      payment.stripe_invoice_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.plans?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    const matchesEnvironment = environmentFilter === "all" || payment.environment === environmentFilter;
    
    const matchesAffiliate = !affiliateFilter || 
      payment.affiliate_profiles?.name?.toLowerCase().includes(affiliateFilter.toLowerCase()) ||
      payment.affiliate_coupons?.custom_code?.toLowerCase().includes(affiliateFilter.toLowerCase()) ||
      payment.affiliate_coupons?.coupons?.code?.toLowerCase().includes(affiliateFilter.toLowerCase());
    
    const matchesDateRange = (!startDate || new Date(payment.payment_date) >= new Date(startDate)) &&
                             (!endDate || new Date(payment.payment_date) <= new Date(endDate));
    
    return matchesSearch && matchesStatus && matchesEnvironment && matchesAffiliate && matchesDateRange;
  });

  const totalPages = Math.ceil((filteredPayments?.length || 0) / itemsPerPage);
  const paginatedPayments = filteredPayments?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const totalPaidProduction = payments?.filter(p => p.environment === "production").reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const totalPaidTest = payments?.filter(p => p.environment === "test").reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const paymentCount = payments?.length || 0;
  const lastPayment = payments?.[0];

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

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Pagamentos</h1>
        <p className="text-muted-foreground">Gerenciamento de todos os pagamentos do sistema</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Geral</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalPaid.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
            <p className="text-xs text-muted-foreground">
              Em {paymentCount} pagamentos
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
              {totalPaidProduction.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
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
              {totalPaidTest.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
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
              {lastPayment ? Number(lastPayment.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastPayment 
                ? format(new Date(lastPayment.payment_date), "dd/MM/yyyy", { locale: ptBR })
                : "Nenhum"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Todos os Pagamentos</CardTitle>
          <div className="flex gap-4 mt-4 flex-wrap">
            <Input
              placeholder="Buscar por invoice, usuário ou plano..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Input
              placeholder="Filtrar por afiliado/cupom..."
              value={affiliateFilter}
              onChange={(e) => setAffiliateFilter(e.target.value)}
              className="max-w-sm"
            />
            <Input
              type="date"
              placeholder="Data inicial"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[160px]"
            />
            <Input
              type="date"
              placeholder="Data final"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[160px]"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
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
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Ambiente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos ambientes</SelectItem>
                <SelectItem value="production">Produção</SelectItem>
                <SelectItem value="test">Teste</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              Limpar filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton columns={8} rows={10} />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Usuário / Email</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Afiliado / Cupom</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Valor</TableHead>
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
                            <span className="font-medium">{payment.profiles?.name || "N/A"}</span>
                            <span className="text-xs text-muted-foreground">{payment.profiles?.email || "N/A"}</span>
                          </div>
                        </TableCell>
                        <TableCell>{payment.plans?.name || "N/A"}</TableCell>
                        <TableCell>
                          {payment.affiliate_profiles || payment.affiliate_coupons ? (
                            <div className="flex flex-col">
                              {payment.affiliate_profiles?.name && (
                                <span className="font-medium text-xs">{payment.affiliate_profiles.name}</span>
                              )}
                              {(payment.affiliate_coupons?.custom_code || payment.affiliate_coupons?.coupons?.code) && (
                                <span className="text-xs text-muted-foreground">
                                  {payment.affiliate_coupons?.custom_code || payment.affiliate_coupons?.coupons?.code}
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
          
          {filteredPayments && filteredPayments.length > 0 && (
            <div className="flex justify-center mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
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
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Detalhes do Pagamento</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <Tabs defaultValue="payment" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="payment">Detalhes do Pagamento</TabsTrigger>
                <TabsTrigger value="metadata">Metadata Json</TabsTrigger>
                <TabsTrigger value="client" disabled={!selectedPayment.profiles}>Cliente</TabsTrigger>
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
                    {selectedPayment.plans && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Plano</p>
                        <p className="text-sm font-semibold">{selectedPayment.plans.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {Number(selectedPayment.plans.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                      </div>
                    )}
                    {selectedPayment.profiles && (
                      <>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Nome do Cliente</p>
                          <p className="text-sm">{selectedPayment.profiles.name}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Email do Cliente</p>
                          <p className="text-sm">{selectedPayment.profiles.email}</p>
                        </div>
                      </>
                    )}
                    {selectedPayment.subscriptions?.stripe_subscription_id && (
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-muted-foreground">Stripe Subscription ID</p>
                        <p className="text-sm font-mono break-all">{selectedPayment.subscriptions.stripe_subscription_id}</p>
                      </div>
                    )}
                    {(selectedPayment.affiliate_profiles || selectedPayment.affiliate_coupons) && (
                      <>
                        {selectedPayment.affiliate_profiles && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Afiliado</p>
                            <p className="text-sm font-semibold">{selectedPayment.affiliate_profiles.name}</p>
                          </div>
                        )}
                        {selectedPayment.affiliate_coupons && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Cupom Utilizado</p>
                            <Badge variant="outline">
                              {selectedPayment.affiliate_coupons.custom_code || selectedPayment.affiliate_coupons.coupons?.code}
                            </Badge>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="metadata" className="space-y-4 mt-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Metadata JSON
                  </p>
                  <div className="max-h-[500px] w-full overflow-y-auto overflow-x-hidden rounded-md border bg-muted/50 p-4">
                    <pre className="text-xs whitespace-pre-wrap break-all w-full">
                      {JSON.stringify(selectedPayment.metadata || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="client" className="space-y-4 mt-4">
                {selectedPayment.profiles ? (
                  <ScrollArea className="max-h-[50vh]">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Nome</p>
                        <p className="text-sm">{selectedPayment.profiles.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Email</p>
                        <p className="text-sm">{selectedPayment.profiles.email}</p>
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
    </div>
  );
}
