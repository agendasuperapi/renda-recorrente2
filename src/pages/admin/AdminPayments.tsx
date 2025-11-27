import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, Calendar, CreditCard, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Payment = {
  id: string;
  stripe_invoice_id: string;
  amount: number;
  billing_reason: string | null;
  status: string;
  payment_date: string;
  environment: string;
  plans: { name: string; price: number } | null;
  profiles: { name: string; email: string } | null;
  subscriptions: { stripe_subscription_id: string | null } | null;
};

export default function AdminPayments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [environmentFilter, setEnvironmentFilter] = useState<string>("all");

  const { data: payments, isLoading } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payments")
        .select(`
          *,
          plans:plan_id (name, price),
          profiles:user_id (name, email),
          subscriptions:subscription_id (stripe_subscription_id)
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
    
    return matchesSearch && matchesStatus && matchesEnvironment;
  });

  const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const totalPaidProduction = payments?.filter(p => p.environment === "production").reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const totalPaidTest = payments?.filter(p => p.environment === "test").reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const paymentCount = payments?.length || 0;
  const lastPayment = payments?.[0];

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
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Ambiente</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments && filteredPayments.length > 0 ? (
                    filteredPayments.map((payment) => (
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
                        <TableCell className="font-mono text-xs">
                          {payment.stripe_invoice_id.substring(0, 14)}...
                        </TableCell>
                        <TableCell>{payment.plans?.name || "N/A"}</TableCell>
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
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Nenhum pagamento encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
