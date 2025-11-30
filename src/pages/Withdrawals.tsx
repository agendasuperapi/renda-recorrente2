import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Wallet, Plus, Clock, CheckCircle2, XCircle, AlertTriangle, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import pixIcon from "@/assets/pix-icon.png";

const DAYS_OF_WEEK: Record<number, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

const Withdrawals = () => {
  const { userId } = useAuth();

  const formatCpf = (cpf: string | null | undefined) => {
    if (!cpf) return '';
    const numbers = cpf.replace(/\D/g, '');
    if (numbers.length !== 11) return cpf;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  // Buscar dados do perfil
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('withdrawal_day, name, cpf')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });

  // Buscar configurações
  const { data: settings } = useQuery({
    queryKey: ['withdrawal-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['commission_min_withdrawal', 'commission_days_to_available']);
      
      if (error) throw error;
      
      return {
        minWithdrawal: parseFloat(data?.find(s => s.key === 'commission_min_withdrawal')?.value || '50'),
        daysToAvailable: parseInt(data?.find(s => s.key === 'commission_days_to_available')?.value || '7')
      };
    }
  });

  // Buscar comissões disponíveis
  const { data: commissionsData, isLoading: commissionsLoading } = useQuery({
    queryKey: ['commissions-summary', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commissions')
        .select('status, amount')
        .eq('affiliate_id', userId);
      
      if (error) throw error;
      
      const available = data?.filter(c => c.status === 'available').reduce((sum, c) => sum + c.amount, 0) || 0;
      const pending = data?.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0) || 0;
      const paid = data?.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0) || 0;
      
      return { available, pending, paid };
    },
    enabled: !!userId
  });

// Verificar se hoje é o dia de saque
const today = new Date();
const currentDayOfWeek = today.getDay(); // 0=Domingo, 1=Segunda, ..., 6=Sábado

  const isWithdrawalDay = profile?.withdrawal_day === currentDayOfWeek;
  const hasMinimumAmount = (commissionsData?.available || 0) >= (settings?.minWithdrawal || 50);
  const canWithdraw = isWithdrawalDay && hasMinimumAmount;

  // Determinar se usa "no próximo" ou "na próxima" baseado no dia da semana
  const getWithdrawalDayPrefix = () => {
    const day = profile?.withdrawal_day ?? 1;
    // Sábado (6) e Domingo (0) usam "no próximo"
    if (day === 0 || day === 6) {
      return "no próximo";
    }
    // Segunda a Sexta usam "na próxima"
    return "na próxima";
  };

// Calcular próximo dia de saque
const getNextWithdrawalDate = () => {
  if (profile?.withdrawal_day === null || profile?.withdrawal_day === undefined) return null;
  const withdrawalDay = profile.withdrawal_day as number;

  const daysUntil = withdrawalDay - currentDayOfWeek;
  const daysToAdd = daysUntil > 0 ? daysUntil : 7 + daysUntil;

  const nextDate = new Date();
  nextDate.setDate(today.getDate() + daysToAdd);

  return nextDate.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

  if (profileLoading || commissionsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Saques</h1>
          <p className="text-muted-foreground">
            Gerencie suas solicitações de saque
          </p>
        </div>
      </div>

      {/* Card de Status de Saque */}
      {!canWithdraw && (
        <Alert variant={isWithdrawalDay ? "default" : "destructive"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Solicitação de Saque Indisponível</AlertTitle>
          <AlertDescription className="space-y-2 mt-2">
            <p>Para solicitar saque, você precisa:</p>
            <ul className="space-y-1 ml-4">
              <li className="flex items-center gap-2">
                {isWithdrawalDay ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <span>
                  Aguardar seu dia de saque ({DAYS_OF_WEEK[profile?.withdrawal_day ?? 1]})
                </span>
              </li>
              <li className="flex items-center gap-2">
                {hasMinimumAmount ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <span>
                  Ter saldo mínimo de R$ {settings?.minWithdrawal.toFixed(2)} 
                  (Você tem: R$ {commissionsData?.available.toFixed(2)})
                </span>
              </li>
            </ul>
            {!isWithdrawalDay && (
              <p className="mt-3 font-medium">
                <Clock className="inline h-4 w-4 mr-1" />
                Próximo dia de saque: {getNextWithdrawalDate()}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Disponível para Saque
            </CardTitle>
            <Wallet className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              R$ {commissionsData?.available.toFixed(2) || '0,00'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Análise (Pendente)
            </CardTitle>
            <Wallet className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">
              R$ {commissionsData?.pending.toFixed(2) || '0,00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Disponível em até {settings?.daysToAvailable} dias após o pagamento
            </p>
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
            <div className="text-2xl font-bold">
              R$ {commissionsData?.paid.toFixed(2) || '0,00'}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Chave PIX (CPF)
            </CardTitle>
            <img src={pixIcon} alt="PIX" className="h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCpf(profile?.cpf) || 'Não cadastrado'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Pagamentos serão feitos nesta chave
            </p>
          </CardContent>
        </Card>

        <Card className={isWithdrawalDay ? "border-success/20 bg-success/5" : "border-muted"}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Dia de Saque
            </CardTitle>
            <Calendar className={isWithdrawalDay ? "h-5 w-5 text-success" : "h-5 w-5 text-muted-foreground"} />
          </CardHeader>
          <CardContent>
            {isWithdrawalDay ? (
              <>
                <div className="text-xl font-bold text-success mb-2">
                  Hoje é seu dia de saque!
                </div>
                <p className="text-xs text-muted-foreground">
                  ⚠️ Se o saque não for solicitado hoje, só poderá solicitar novamente {getWithdrawalDayPrefix()} {DAYS_OF_WEEK[profile?.withdrawal_day ?? 1]}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {DAYS_OF_WEEK[profile?.withdrawal_day ?? 1]}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Próximo saque: {getNextWithdrawalDate()}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button 
          className="gap-2" 
          disabled={!canWithdraw}
          size="lg"
        >
          <Plus className="h-4 w-4" />
          Solicitar Saque de R$ {commissionsData?.available.toFixed(2) || '0,00'}
        </Button>
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
          <p>• O valor mínimo para saque é R$ {settings?.minWithdrawal.toFixed(2)}</p>
          <p>• Seu dia de saque é: {DAYS_OF_WEEK[profile?.withdrawal_day ?? 1]}</p>
          <p>• Comissões ficam disponíveis após {settings?.daysToAvailable} dias do pagamento</p>
          <p>• Certifique-se de ter PIX cadastrado no seu CPF {formatCpf(profile?.cpf)}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Withdrawals;
