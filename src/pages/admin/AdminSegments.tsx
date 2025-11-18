import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";

const AdminSegments = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Segmentos</h1>
            <p className="text-muted-foreground">
              Configure os segmentos/temas disponíveis para os aplicativos
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Segmento
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Segmentos Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Ícone</TableHead>
                  <TableHead>Aplicativos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Restaurante</TableCell>
                  <TableCell>Aplicativos para restaurantes e delivery</TableCell>
                  <TableCell>🍽️</TableCell>
                  <TableCell>0</TableCell>
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
                  <TableCell className="font-medium">Salão de Beleza</TableCell>
                  <TableCell>Aplicativos para salões e barbearias</TableCell>
                  <TableCell>💇</TableCell>
                  <TableCell>0</TableCell>
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
                  <TableCell className="font-medium">Academia</TableCell>
                  <TableCell>Aplicativos para academias e fitness</TableCell>
                  <TableCell>💪</TableCell>
                  <TableCell>0</TableCell>
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
                  <TableCell className="font-medium">Loja</TableCell>
                  <TableCell>Aplicativos para comércio em geral</TableCell>
                  <TableCell>🛍️</TableCell>
                  <TableCell>0</TableCell>
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

export default AdminSegments;
