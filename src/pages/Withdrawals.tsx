import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Wallet, Plus } from "lucide-react";

const Withdrawals = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Saques</h1>
            <p className="text-muted-foreground">
              Gerencie suas solicitações de saque
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Solicitar Saque
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Disponível para Saque
              </CardTitle>
              <Wallet className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">R$ 0,00</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Em Análise
              </CardTitle>
              <Wallet className="h-4 w-4 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-info">R$ 0,00</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Sacado
              </CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ 0,00</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Saques</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Solicitação</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Chave PIX</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum saque solicitado
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-info/5 border-info/20">
          <CardHeader>
            <CardTitle className="text-sm">Informações Importantes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• O valor mínimo para saque é R$ 50,00</p>
            <p>• Saques são processados toda segunda-feira</p>
            <p>• Certifique-se de que seus dados PIX estão corretos no seu perfil</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Withdrawals;
