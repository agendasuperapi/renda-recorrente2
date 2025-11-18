import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";

const AdminPlans = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Planos e Preços</h1>
            <p className="text-muted-foreground">
              Configure os planos de afiliação disponíveis
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Plano
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Planos Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Comissão %</TableHead>
                  <TableHead>Stripe ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Afiliação FREE</TableCell>
                  <TableCell>Mensal</TableCell>
                  <TableCell>R$ 0,00</TableCell>
                  <TableCell>15%</TableCell>
                  <TableCell className="text-muted-foreground text-sm">-</TableCell>
                  <TableCell>
                    <Badge variant="secondary">Ativo</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Afiliação PRO</TableCell>
                  <TableCell>Mensal</TableCell>
                  <TableCell>R$ 97,00</TableCell>
                  <TableCell>25%</TableCell>
                  <TableCell className="text-muted-foreground text-sm">-</TableCell>
                  <TableCell>
                    <Badge variant="secondary">Ativo</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminPlans;
