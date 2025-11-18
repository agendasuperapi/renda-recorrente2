import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

const AdminStripeEvents = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Eventos Stripe</h1>
          <p className="text-muted-foreground">
            Monitore todos os eventos recebidos do Stripe
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por evento, ID ou tipo..."
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event ID</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Processado</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum evento registrado
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-info/5 border-info/20">
          <CardHeader>
            <CardTitle className="text-sm">Sobre os Eventos Stripe</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Os eventos são recebidos via webhooks do Stripe</p>
            <p>• Configure a URL do webhook nas configurações do Stripe</p>
            <p>• Eventos importantes: customer.subscription.created, customer.subscription.updated, invoice.paid</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminStripeEvents;
