import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TrendingUp, DollarSign, Users, Wallet, CheckCircle2, ArrowRight, BookOpen, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showWelcome, setShowWelcome] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    const checkFirstAccess = async () => {
      const isSuccess = searchParams.get("success") === "true";
      const hasSeenWelcome = localStorage.getItem("hasSeenWelcome");

      if (isSuccess && !hasSeenWelcome) {
        // Buscar nome do usuário
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", session.user.id)
            .single();

          if (profile) {
            setUserName(profile.name);
          }
        }

        setShowWelcome(true);
        // Remover parâmetro da URL
        searchParams.delete("success");
        setSearchParams(searchParams, { replace: true });
      }
    };

    checkFirstAccess();
  }, [searchParams, setSearchParams]);

  const handleCloseWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem("hasSeenWelcome", "true");
  };

  return (
    <div className="space-y-6">
      {/* Modal de Boas-vindas */}
      <Dialog open={showWelcome} onOpenChange={handleCloseWelcome}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-primary animate-in zoom-in duration-500" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Bem-vindo{userName ? `, ${userName}` : ""}!
            </h2>
            <p className="text-lg text-muted-foreground">
              Sua assinatura foi ativada com sucesso. Agora você tem acesso a todos os recursos da plataforma!
            </p>
          </div>

          <div className="px-8 pb-8 space-y-6">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-foreground">Próximos Passos:</h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1">1. Complete seu perfil</h4>
                    <p className="text-sm text-muted-foreground">
                      Adicione suas informações pessoais e configure suas preferências
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1">2. Explore o Dashboard</h4>
                    <p className="text-sm text-muted-foreground">
                      Conheça todas as ferramentas e recursos disponíveis para você
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1">3. Comece a ganhar</h4>
                    <p className="text-sm text-muted-foreground">
                      Utilize suas ferramentas de afiliado e comece a gerar comissões
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleCloseWelcome} 
                className="w-full h-12 text-base font-semibold group"
                size="lg"
              >
                Começar agora
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button 
                onClick={() => {
                  handleCloseWelcome();
                  navigate("/profile");
                }} 
                variant="outline"
                className="w-full h-12 text-base"
                size="lg"
              >
                Completar Perfil
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Precisa de ajuda? Entre em contato com nosso suporte a qualquer momento.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dashboard Content */}
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
  );
};

export default Dashboard;
