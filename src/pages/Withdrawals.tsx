import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Wallet, Plus, Clock, CheckCircle2, XCircle, AlertTriangle, Calendar, CircleDollarSign, TrendingUp, Loader2, Eye } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import pixIcon from "@/assets/pix-icon.png";
import { WithdrawalDetailsDialog, WithdrawalData } from "@/components/WithdrawalDetailsDialog";
const DAYS_OF_WEEK: Record<number, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado"
};
const Withdrawals = () => {
  const {
    userId
  } = useAuth();
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalData | null>(null);
  const formatCpf = (cpf: string | null | undefined) => {
    if (!cpf) return '';
    const numbers = cpf.replace(/\D/g, '');
    if (numbers.length !== 11) return cpf;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  // Buscar dados do perfil para saques (queryKey específica para não conflitar com outras queries)
  const {
    data: profile,
    isLoading: profileLoading
  } = useQuery({
    queryKey: ['profile-withdrawals', userId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('profiles').select('withdrawal_day, name, cpf').eq('id', userId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 0, // Sempre buscar dados frescos
  });

  // Buscar configurações
  const {
    data: settings
  } = useQuery({
    queryKey: ['withdrawal-settings'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('app_settings').select('key, value').in('key', ['commission_min_withdrawal', 'commission_days_to_available']);
      if (error) throw error;
      return {
        minWithdrawal: parseFloat(data?.find(s => s.key === 'commission_min_withdrawal')?.value || '50'),
        daysToAvailable: parseInt(data?.find(s => s.key === 'commission_days_to_available')?.value || '7')
      };
    }
  });

  // Buscar comissões disponíveis da view
  const {
    data: commissionsData,
    isLoading: commissionsLoading
  } = useQuery({
    queryKey: ['commissions-summary', userId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase
        .from('view_withdrawals_summary' as any)
        .select('available, pending, requested, withdrawn')
        .eq('affiliate_id', userId)
        .single();
      
      if (error) throw error;
      
      return {
        available: (data as any)?.available || 0,
        pending: (data as any)?.pending || 0,
        requested: (data as any)?.requested || 0,
        paid: (data as any)?.withdrawn || 0
      };
    },
    enabled: !!userId
  });

  // Buscar histórico de saques
  const {
    data: withdrawals,
    isLoading: withdrawalsLoading
  } = useQuery({
    queryKey: ['withdrawals', userId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('withdrawals').select(`
        *,
        profiles!withdrawals_affiliate_id_fkey (name, email, username)
      `).eq('affiliate_id', userId).order('requested_date', {
        ascending: false
      });
      if (error) throw error;
      return data as unknown as WithdrawalData[];
    },
    enabled: !!userId
  });

  const handleViewDetails = (withdrawal: WithdrawalData) => {
    setSelectedWithdrawal(withdrawal);
    setDetailsDialogOpen(true);
  };

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

  // Mutation para criar solicitação de saque  
  const createWithdrawalMutation = useMutation({
    mutationFn: async () => {
      // Buscar todas as comissões disponíveis para incluir no saque
      const {
        data: availableCommissions,
        error: commissionsError
      } = await supabase.from('commissions').select('id').eq('affiliate_id', userId).eq('status', 'available');
      if (commissionsError) throw commissionsError;
      const commissionIds = availableCommissions?.map(c => c.id) || [];

      // Criar o saque
      const {
        data,
        error
      } = await supabase.from('withdrawals').insert([{
        affiliate_id: userId!,
        amount: commissionsData?.available || 0,
        pix_key: profile?.cpf || '',
        pix_type: 'cpf',
        commission_ids: commissionIds
      }]).select().single();
      if (error) throw error;

      // Atualizar as comissões com o withdrawal_id e mudar status para 'requested'
      if (commissionIds.length > 0) {
        const {
          error: updateError
        } = await supabase.from('commissions').update({
          withdrawal_id: data.id,
          status: 'requested'
        }).in('id', commissionIds);
        if (updateError) throw updateError;
      }
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Saque solicitado!",
        description: "Sua solicitação foi enviada e será processada em até 24 horas."
      });
      setWithdrawalDialogOpen(false);
      queryClient.invalidateQueries({
        queryKey: ['commissions-summary']
      });
      queryClient.invalidateQueries({
        queryKey: ['withdrawals']
      });
    },
    onError: (error: any) => {
      console.error('Erro ao solicitar saque:', error);
      toast({
        title: "Erro ao solicitar saque",
        description: error.message || "Não foi possível processar sua solicitação. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  const handleWithdrawalClick = () => {
    // Verificar se não é o dia de saque
    if (!isWithdrawalDay) {
      toast({
        title: "Dia de saque incorreto",
        description: `Você só pode solicitar saques ${getWithdrawalDayPrefix()} ${DAYS_OF_WEEK[profile?.withdrawal_day ?? 1]}.`,
        variant: "destructive"
      });
      return;
    }

    // Verificar se não tem saldo mínimo
    if (!hasMinimumAmount) {
      toast({
        title: "Saldo insuficiente",
        description: `Saldo mínimo de R$ ${settings?.minWithdrawal.toFixed(2)} necessário para solicitar saque. Seu saldo atual é R$ ${commissionsData?.available.toFixed(2)}.`,
        variant: "destructive"
      });
      return;
    }

    // Se passar todas as validações, abre o modal
    setWithdrawalDialogOpen(true);
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
      year: "numeric"
    });
  };
  if (profileLoading || commissionsLoading) {
    return <div className="space-y-6 p-4 sm:p-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>;
  }
  return <div className="space-y-3 md:space-y-6 pb-4 p-4 sm:p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Saques</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gerencie suas solicitações de saque
          </p>
        </div>
      </div>

      {/* Card de Status de Saque */}
      {!canWithdraw}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <Card className="relative overflow-hidden">
          <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-emerald-200/60 dark:bg-emerald-800/40 flex items-end justify-start pl-4 pb-4">
            <CircleDollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <CardHeader className="pb-1 md:pb-2 p-4 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Disponível
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              R$ {commissionsData?.available.toFixed(2) || '0,00'}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-sky-200/60 dark:bg-sky-800/40 flex items-end justify-start pl-4 pb-4">
            <Clock className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          </div>
          <CardHeader className="pb-1 md:pb-2 p-4 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Pendente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-sky-600 dark:text-sky-400">
              R$ {commissionsData?.pending.toFixed(2) || '0,00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 hidden md:block">
              Disponível em até {settings?.daysToAvailable} dias
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-violet-200/60 dark:bg-violet-800/40 flex items-end justify-start pl-4 pb-4">
            <TrendingUp className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <CardHeader className="pb-1 md:pb-2 p-4 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Sacado
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold text-violet-600 dark:text-violet-400">
              R$ {commissionsData?.paid.toFixed(2) || '0,00'}
            </div>
          </CardContent>
        </Card>
      </div>

      {!hasMinimumAmount && <Alert variant="destructive" className="py-3">
          <XCircle className="h-4 w-4" />
          <AlertTitle className="text-sm md:text-base">Saldo insuficiente</AlertTitle>
          <AlertDescription className="text-xs md:text-sm">
            Mínimo de R$ {settings?.minWithdrawal.toFixed(2)}
          </AlertDescription>
        </Alert>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <Card className="border-primary/20 bg-primary/5 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-primary/20 dark:bg-primary/30 flex items-end justify-start pl-4 pb-4">
            <img src={pixIcon} alt="PIX" className="h-5 w-5" />
          </div>
          <CardHeader className="pb-1 md:pb-2 p-4 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">
              Chave PIX (CPF)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold">
              {profileLoading ? (
                <Skeleton className="h-7 w-36" />
              ) : profile?.cpf ? (
                formatCpf(profile.cpf)
              ) : (
                'Não cadastrado'
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 md:mt-2">
              Pagamentos nesta chave
            </p>
          </CardContent>
        </Card>

        <Card className={`relative overflow-hidden ${isWithdrawalDay ? "border-success/20 bg-success/5" : "border-destructive/20 bg-destructive/5"}`}>
          <div className={`absolute -top-6 -right-6 h-24 w-24 rounded-full flex items-end justify-start pl-4 pb-4 ${isWithdrawalDay ? "bg-emerald-200/60 dark:bg-emerald-800/40" : "bg-rose-200/60 dark:bg-rose-800/40"}`}>
            <Calendar className={`h-5 w-5 ${isWithdrawalDay ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`} />
          </div>
          <CardHeader className="pb-1 md:pb-2 p-4 md:p-6">
            <CardTitle className="text-xs md:text-sm font-medium">
              Dia de Saque
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            {isWithdrawalDay ? <>
                <div className="text-lg md:text-xl font-bold text-success mb-1 md:mb-2">
                  Hoje é seu dia!
                </div>
                <p className="text-xs text-muted-foreground">
                  ⚠️ Solicite hoje, próximo apenas {getWithdrawalDayPrefix()} {DAYS_OF_WEEK[profile?.withdrawal_day ?? 1]}
                </p>
              </> : <>
                <div className="text-lg md:text-2xl font-bold text-destructive">
                  {DAYS_OF_WEEK[profile?.withdrawal_day ?? 1]}
                </div>
                <p className="text-xs text-destructive mt-1 md:mt-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Solicitação disponível somente nesse dia
                </p>
              </>}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button className="gap-2 w-full md:w-auto" size="default" onClick={handleWithdrawalClick}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Solicitar Saque de</span>
          <span className="sm:hidden">Solicitar</span> R$ {commissionsData?.available.toFixed(2) || '0,00'}
        </Button>
      </div>

      {/* Modal de Solicitação de Saque */}
      <Dialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">Solicitar Saque</DialogTitle>
            <DialogDescription>
              Confirme os dados abaixo para solicitar seu saque
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Nome do Afiliado</p>
                  <p className="font-semibold text-lg">{profile?.name}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <img src={pixIcon} alt="PIX" className="h-4 w-4" />
                    Chave PIX (CPF)
                  </p>
                  <p className="font-semibold text-lg font-mono">{formatCpf(profile?.cpf)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-success/10 border border-success/20 rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Valor do Saque</p>
                  <p className="font-bold text-2xl text-success">
                    R$ {commissionsData?.available.toFixed(2) || '0,00'}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <Alert>
              <Clock className="h-4 w-4" />
              <AlertTitle>Prazo de Transferência</AlertTitle>
              <AlertDescription>
                A transferência será processada em até 24 horas após a solicitação, apenas em dias úteis.
              </AlertDescription>
            </Alert>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>ℹ️ O valor será depositado via PIX na chave cadastrada</p>
              <p>ℹ️ Certifique-se de que sua chave PIX está ativa e correta</p>
              <p>ℹ️ Após a solicitação, o valor ficará bloqueado até a confirmação do pagamento</p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setWithdrawalDialogOpen(false)} disabled={createWithdrawalMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => createWithdrawalMutation.mutate()} disabled={createWithdrawalMutation.isPending} className="gap-2">
              {createWithdrawalMutation.isPending ? <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Processando...
                </> : <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar Saque
                </>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="md:bg-card md:border bg-transparent border-0 shadow-none md:shadow-sm">
        <CardHeader className="p-4 md:p-6 hidden md:block">
          <CardTitle className="text-lg md:text-xl">Histórico de Saques</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          {/* Mobile View - Cards */}
          <div className="md:hidden space-y-2">
            {withdrawalsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : withdrawals && withdrawals.length > 0 ? (
              withdrawals.map(withdrawal => (
                <Card key={withdrawal.id} className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={withdrawal.status === 'paid' ? 'default' : withdrawal.status === 'approved' ? 'secondary' : withdrawal.status === 'rejected' ? 'destructive' : 'outline'}
                          className="text-[10px]"
                        >
                          {withdrawal.status === 'pending' ? 'Pendente' : withdrawal.status === 'approved' ? 'Aprovado' : withdrawal.status === 'paid' ? 'Pago' : withdrawal.status === 'rejected' ? 'Rejeitado' : withdrawal.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(withdrawal.requested_date || withdrawal.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className="font-semibold text-base">
                        R$ {withdrawal.amount.toFixed(2)}
                      </p>
                      {withdrawal.paid_date && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Pago em {new Date(withdrawal.paid_date).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleViewDetails(withdrawal)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">
                Nenhum saque solicitado
              </p>
            )}
          </div>

          {/* Desktop View - Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs md:text-sm">Data</TableHead>
                  <TableHead className="text-xs md:text-sm">Valor</TableHead>
                  <TableHead className="text-xs md:text-sm">Chave PIX</TableHead>
                  <TableHead className="text-xs md:text-sm">Status</TableHead>
                  <TableHead className="text-xs md:text-sm">Pagamento</TableHead>
                  <TableHead className="text-xs md:text-sm w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawalsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : withdrawals && withdrawals.length > 0 ? (
                  withdrawals.map(withdrawal => (
                    <TableRow key={withdrawal.id}>
                      <TableCell className="text-xs md:text-sm">
                        {new Date(withdrawal.requested_date || withdrawal.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                        {' '}
                        <span className="text-muted-foreground">
                          {new Date(withdrawal.requested_date || withdrawal.created_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-xs md:text-sm whitespace-nowrap">
                        R$ {withdrawal.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatCpf(withdrawal.pix_key)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={withdrawal.status === 'paid' ? 'default' : withdrawal.status === 'approved' ? 'secondary' : withdrawal.status === 'rejected' ? 'destructive' : 'outline'}
                          className="text-xs"
                        >
                          {withdrawal.status === 'pending' ? 'Pendente' : withdrawal.status === 'approved' ? 'Aprovado' : withdrawal.status === 'paid' ? 'Pago' : withdrawal.status === 'rejected' ? 'Rejeitado' : withdrawal.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs md:text-sm">
                        {withdrawal.paid_date ? (
                          <>
                            {new Date(withdrawal.paid_date).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                            {' '}
                            <span className="text-muted-foreground">
                              {new Date(withdrawal.paid_date).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewDetails(withdrawal)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-xs md:text-sm">
                      Nenhum saque solicitado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-info/5 border-info/20">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-xs md:text-sm">Informações Importantes</CardTitle>
        </CardHeader>
        <CardContent className="text-xs md:text-sm text-muted-foreground space-y-1 md:space-y-2 p-4 pt-0 md:p-6 md:pt-0">
          <p>• Mínimo: R$ {settings?.minWithdrawal.toFixed(2)}</p>
          <p>• Dia: {DAYS_OF_WEEK[profile?.withdrawal_day ?? 1]}</p>
          <p>• Disponível após {settings?.daysToAvailable} dias</p>
          <p className="hidden md:block">• Certifique-se de ter PIX no CPF {formatCpf(profile?.cpf)}</p>
        </CardContent>
      </Card>

      {/* Dialog de Detalhes do Saque */}
      <WithdrawalDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        withdrawal={selectedWithdrawal}
        showAdminActions={false}
      />
    </div>;
};
export default Withdrawals;