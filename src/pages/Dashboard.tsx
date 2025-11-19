import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard de Afiliado</h1>
          <p className="text-muted-foreground">
            Tenha uma visão geral do seu desempenho
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Comissão do dia
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">R$0,00</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Comissão últimos 7 dias
              </CardTitle>
              <DollarSign className="h-4 w-4 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-info">R$0,00</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Comissão do mês
              </CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$0,00</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Comissão disponível para saque
              </CardTitle>
              <Wallet className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">R$0,00</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Comissão pendente
              </CardTitle>
              <DollarSign className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">R$0,00</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Seu dia de solicitar saque
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">
                SEGUNDA-FEIRA, 24 DE NOVEMBRO
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Quant. de Indicações</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">0</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Quant. de Sub-Afiliados</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">0</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cupons principais</CardTitle>
            <p className="text-sm text-muted-foreground">
              Veja aqui seus cupons principais para compartilhar
            </p>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Nenhum cupom disponível no momento
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Sub Afiliados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Nenhum registro encontrado...
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Atividades recentes</CardTitle>
              <p className="text-sm text-muted-foreground">
                Veja aqui as últimas atividades do seu painel de afiliado
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Nenhum registro encontrado...
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Comissões recentes</CardTitle>
            <p className="text-sm text-muted-foreground">
              Veja aqui suas últimas comissões
            </p>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Nenhum registro encontrado...
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comissões diárias</CardTitle>
            <p className="text-sm text-muted-foreground">
              Veja suas comissões diárias do mês atual
            </p>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Nenhum registro encontrado...
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-success/10 border-primary/20">
          <CardHeader>
            <CardTitle>Meta do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold">R$0,00</div>
              <div className="text-sm text-muted-foreground">0%</div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{ width: "0%" }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Projeção de comissão do mês: R$0,00
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
