import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, Calendar, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";

type Payment = {
  id: string;
  stripe_invoice_id: string;
  amount: number;
  billing_reason: string | null;
  status: string;
  payment_date: string;
  plans: { name: string; price: number } | null;
  subscriptions: { stripe_subscription_id: string | null } | null;
};

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: payments, isLoading } = useQuery({
    queryKey: ["user-payments"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await (supabase as any)
        .from("payments")
        .select(`
          *,
          plans:plan_id (name, price),
          subscriptions:subscription_id (stripe_subscription_id)
        `)
        .eq("user_id", user.id)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      return data as unknown as Payment[];
    },
  });

  const filteredPayments = payments?.filter(payment => 
    payment.stripe_invoice_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.plans?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const lastPayment = payments?.[0];
  const paymentCount = payments?.length || 0;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Meus Pagamentos</h1>
        <p className="text-muted-foreground">Histórico completo dos seus pagamentos</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalPaid.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
            <p className="text-xs text-muted-foreground">
              Em {paymentCount} {paymentCount === 1 ? "pagamento" : "pagamentos"}
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
                ? format(new Date(lastPayment.payment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                : "Nenhum pagamento"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pagamentos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentCount}</div>
            <p className="text-xs text-muted-foreground">
              Pagamentos registrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Pagamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pagamentos</CardTitle>
          <Input
            placeholder="Buscar por invoice ou plano..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mt-2"
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton columns={6} rows={5} />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments && filteredPayments.length > 0 ? (
                    filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.payment_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {payment.stripe_invoice_id.substring(0, 16)}...
                        </TableCell>
                        <TableCell>{payment.plans?.name || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {payment.billing_reason === "subscription_create" ? "Nova Assinatura" :
                             payment.billing_reason === "subscription_cycle" ? "Renovação" :
                             payment.billing_reason === "subscription_update" ? "Atualização" :
                             payment.billing_reason || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {Number(payment.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={payment.status === "paid" ? "default" : "secondary"}>
                            {payment.status === "paid" ? "Pago" : payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhum pagamento registrado
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
