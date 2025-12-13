import { useState, useEffect, Suspense, lazy } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarConfigEditor } from "@/components/SidebarConfigEditor";
import { BackgroundConfigEditor } from "@/components/BackgroundConfigEditor";
import { StatusBarConfigEditor } from "@/components/StatusBarConfigEditor";
import { Loader2, RefreshCw, Settings, DollarSign, Palette, LayoutDashboard, GitBranch, Users, Coins, FileSearch, FileText, UserX } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollAnimation } from "@/components/ScrollAnimation";

// Lazy load components for tabs
const AdminLandingPageContent = lazy(() => import("./AdminLandingPage"));
const AdminVersionsContent = lazy(() => import("./AdminVersions"));
const AdminUsersContent = lazy(() => import("./AdminUsers"));
const AdminCommissionLevelsContent = lazy(() => import("./AdminCommissionLevels"));
const AdminCpfApisContent = lazy(() => import("./AdminCpfApis"));
const AdminLegalDocumentsContent = lazy(() => import("./AdminLegalDocuments"));
const AdminDeletedUsersContent = lazy(() => import("./AdminDeletedUsers"));

const TabLoadingFallback = () => (
  <div className="space-y-4 p-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar configurações do banco de dados
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .in('key', ['environment_mode', 'commission_days_to_available', 'commission_min_withdrawal', 'commission_check_schedule', 'min_sales_for_renda_coupons']);

      if (error) {
        console.error('Error fetching settings:', error);
        return [];
      }

      return data;
    },
  });

  const settingData = settingsData?.find(s => s.key === 'environment_mode');
  const commissionDaysData = settingsData?.find(s => s.key === 'commission_days_to_available');
  const commissionMinData = settingsData?.find(s => s.key === 'commission_min_withdrawal');
  const commissionScheduleData = settingsData?.find(s => s.key === 'commission_check_schedule');
  const minSalesRendaData = settingsData?.find(s => s.key === 'min_sales_for_renda_coupons');
  
  const [commissionDays, setCommissionDays] = useState('7');
  const [commissionMin, setCommissionMin] = useState('50.00');
  const [scheduleType, setScheduleType] = useState<'hourly' | 'specific'>('hourly');
  const [scheduleTime, setScheduleTime] = useState('00:00');
  const [minSalesForRenda, setMinSalesForRenda] = useState('10');

  useEffect(() => {
    if (commissionDaysData) setCommissionDays(commissionDaysData.value);
    if (commissionMinData) setCommissionMin(commissionMinData.value);
    if (minSalesRendaData) setMinSalesForRenda(minSalesRendaData.value);
    if (commissionScheduleData) {
      const value = commissionScheduleData.value;
      if (value === 'hourly') {
        setScheduleType('hourly');
      } else {
        setScheduleType('specific');
        setScheduleTime(value);
      }
    }
  }, [commissionDaysData, commissionMinData, commissionScheduleData, minSalesRendaData]);

  const isProduction = settingData?.value === 'production';

  // Mutation para atualizar a configuração de ambiente
  const updateSettingMutation = useMutation({
    mutationFn: async (newValue: string) => {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: newValue })
        .eq('key', 'environment_mode');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    },
  });

  // Mutation para atualizar configurações de comissão
  const updateCommissionSettingsMutation = useMutation({
    mutationFn: async ({ days, min, schedule, minSalesRenda }: { days: string; min: string; schedule: string; minSalesRenda: string }) => {
      const updates = [
        supabase
          .from('app_settings')
          .update({ value: days })
          .eq('key', 'commission_days_to_available'),
        supabase
          .from('app_settings')
          .update({ value: min })
          .eq('key', 'commission_min_withdrawal'),
        supabase
          .from('app_settings')
          .upsert({
            key: 'commission_check_schedule',
            value: schedule,
            description: 'Frequência de verificação das comissões'
          }, {
            onConflict: 'key'
          }),
        supabase
          .from('app_settings')
          .upsert({
            key: 'min_sales_for_renda_coupons',
            value: minSalesRenda,
            description: 'Quantidade mínima de vendas de outros produtos para liberar cupons do App Renda Recorrente'
          }, {
            onConflict: 'key'
          })
      ];

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    },
  });

  // Mutation para processar comissões manualmente
  const processCommissionsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('process-commission-status', {
        body: { triggered_at: new Date().toISOString(), manual: true }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Processamento iniciado",
        description: "As comissões estão sendo verificadas. Isso pode levar alguns instantes.",
      });
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao processar",
        description: error.message || "Não foi possível processar as comissões",
        variant: "destructive",
      });
    },
  });

  const handleToggle = async (checked: boolean) => {
    const environment = checked ? "production" : "test";
    
    try {
      await updateSettingMutation.mutateAsync(environment);
      
      toast({
        title: "Configuração atualizada",
        description: `Modo ${checked ? "Produção" : "Teste"} ativado`,
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível salvar a configuração",
        variant: "destructive",
      });
    }
  };

  const handleSaveCommissionSettings = async () => {
    try {
      const scheduleValue = scheduleType === 'hourly' ? 'hourly' : scheduleTime;
      
      await updateCommissionSettingsMutation.mutateAsync({
        days: commissionDays,
        min: commissionMin,
        schedule: scheduleValue,
        minSalesRenda: minSalesForRenda,
      });

      // Reconfigurar cron job automaticamente
      try {
        const { error: cronError } = await supabase.functions.invoke('setup-commission-cron');
        
        if (cronError) {
          console.error('Erro ao reconfigurar cron:', cronError);
          toast({
            title: "Configurações salvas com aviso",
            description: "Configurações salvas, mas houve um erro ao reconfigurar o cron job. Execute o script manualmente no SQL Editor.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Configurações salvas",
          description: "Configurações de comissão atualizadas e cron job reconfigurado automaticamente!",
        });
      } catch (cronError) {
        console.error('Erro ao chamar edge function:', cronError);
        toast({
          title: "Configurações salvas com aviso",
          description: "Configurações salvas, mas houve um erro ao reconfigurar o cron job. Execute o script manualmente no SQL Editor.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full p-3 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Configurações</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Configure as preferências gerais do sistema
        </p>
      </div>

      <Tabs defaultValue="environment" className="w-full">
        <TabsList className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-2 bg-muted/50 p-1.5 rounded-xl">
          <TabsTrigger value="environment" className="flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs sm:text-sm font-medium">
            <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Ambiente</span>
          </TabsTrigger>
          <TabsTrigger value="commissions" className="flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs sm:text-sm font-medium">
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Saques</span>
          </TabsTrigger>
          <TabsTrigger value="commission-levels" className="flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs sm:text-sm font-medium">
            <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Níveis</span>
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs sm:text-sm font-medium">
            <Palette className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Tema</span>
          </TabsTrigger>
          <TabsTrigger value="landing" className="flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs sm:text-sm font-medium">
            <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Landing</span>
          </TabsTrigger>
          <TabsTrigger value="versions" className="flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs sm:text-sm font-medium">
            <GitBranch className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Versões</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs sm:text-sm font-medium">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Usuários</span>
          </TabsTrigger>
          <TabsTrigger value="deleted-users" className="flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs sm:text-sm font-medium">
            <UserX className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Excluídos</span>
          </TabsTrigger>
          <TabsTrigger value="cpf-apis" className="flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs sm:text-sm font-medium">
            <FileSearch className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>API CPF</span>
          </TabsTrigger>
          <TabsTrigger value="legal" className="flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs sm:text-sm font-medium">
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Termos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="environment" className="mt-4">
          <ScrollAnimation animation="fade-up">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>Ambiente da Aplicação</CardTitle>
                <CardDescription>
                  Escolha se o aplicativo está operando em modo de teste ou produção
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="environment-mode" className="text-base">
                      Modo de Operação
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {isProduction ? "Produção" : "Teste"} - {isProduction 
                        ? "Operações reais com dados de produção" 
                        : "Ambiente de testes com dados de sandbox"}
                    </p>
                  </div>
                  <Switch
                    id="environment-mode"
                    checked={isProduction}
                    onCheckedChange={handleToggle}
                    disabled={isLoading || updateSettingMutation.isPending}
                  />
                </div>
              </CardContent>
            </Card>
          </ScrollAnimation>
        </TabsContent>

        <TabsContent value="commissions" className="mt-4">
          <ScrollAnimation animation="fade-up">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>Configurações de Comissões</CardTitle>
                <CardDescription>
                  Configure o fluxo automático de aprovação de comissões
                </CardDescription>
              </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="commission-days">
                    Dias para disponibilização
                  </Label>
                  <Input
                    id="commission-days"
                    type="number"
                    min="1"
                    value={commissionDays}
                    onChange={(e) => setCommissionDays(e.target.value)}
                    className="max-w-xs"
                  />
                  <p className="text-sm text-muted-foreground">
                    Número de dias após o pagamento para a comissão ficar disponível para saque
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commission-min">
                    Valor mínimo para saque (R$)
                  </Label>
                  <Input
                    id="commission-min"
                    type="number"
                    min="0"
                    step="0.01"
                    value={commissionMin}
                    onChange={(e) => setCommissionMin(e.target.value)}
                    className="max-w-xs"
                  />
                  <p className="text-sm text-muted-foreground">
                    Valor mínimo em reais que o afiliado precisa ter para solicitar saque
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Frequência de Verificação</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="schedule-hourly"
                        checked={scheduleType === 'hourly'}
                        onChange={() => setScheduleType('hourly')}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="schedule-hourly" className="font-normal cursor-pointer">
                        A cada hora (recomendado)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="schedule-specific"
                        checked={scheduleType === 'specific'}
                        onChange={() => setScheduleType('specific')}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="schedule-specific" className="font-normal cursor-pointer">
                        Horário específico:
                      </Label>
                      <Input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        disabled={scheduleType !== 'specific'}
                        className="max-w-[150px]"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Escolha com que frequência o sistema verificará as comissões pendentes
                  </p>
                  <div className="mt-3 pt-3 border-t">
                    <Button 
                      variant="outline"
                      onClick={() => processCommissionsMutation.mutate()}
                      disabled={processCommissionsMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      {processCommissionsMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Processar Comissões Agora
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Clique para verificar e atualizar o status das comissões manualmente
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min-sales-renda">
                    Vendas mínimas para App Renda Recorrente
                  </Label>
                  <Input
                    id="min-sales-renda"
                    type="number"
                    min="0"
                    value={minSalesForRenda}
                    onChange={(e) => setMinSalesForRenda(e.target.value)}
                    className="max-w-xs"
                  />
                  <p className="text-sm text-muted-foreground">
                    Quantidade mínima de vendas de outros produtos que o afiliado precisa ter para poder liberar cupons do App Renda Recorrente (sub-afiliados)
                  </p>
                </div>

                <div className="pt-2">
                  <Button 
                    onClick={handleSaveCommissionSettings}
                    disabled={updateCommissionSettingsMutation.isPending}
                  >
                    {updateCommissionSettingsMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Salvar Configurações
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Como funciona o fluxo automático:</h4>
                <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                  <li>Comissões são criadas automaticamente quando um pagamento é processado</li>
                  <li>Status inicial: <strong>Pendente</strong></li>
                  <li>Após {commissionDays} dias do pagamento, o status muda para <strong>Disponível</strong></li>
                  <li>Na tela de Saques, o afiliado só pode solicitar saque se:</li>
                  <ul className="ml-6 space-y-1">
                    <li>• For o dia de saque dele (baseado no dia da semana do cadastro)</li>
                    <li>• Tiver saldo disponível maior ou igual a R$ {commissionMin}</li>
                  </ul>
                  <li>A verificação automática é executada {scheduleType === 'hourly' ? 'a cada hora' : `diariamente às ${scheduleTime}`}</li>
                </ul>
              </div>
            </CardContent>
            </Card>
          </ScrollAnimation>
        </TabsContent>

        <TabsContent value="theme" className="mt-4 space-y-4">
          <ScrollAnimation animation="fade-up">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>Menu Lateral</CardTitle>
                <CardDescription>
                  Configure as cores, gradiente e ícone do menu lateral do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="space-y-1">
                    <Label className="text-base">
                      Aparência do Sidebar
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Personalize cores, gradiente, textos e o logo do menu lateral
                    </p>
                  </div>
                  <SidebarConfigEditor 
                    onConfigSaved={() => {
                      toast({
                        title: "Configurações salvas",
                        description: "Recarregue a página para ver as mudanças aplicadas",
                      });
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </ScrollAnimation>

          <ScrollAnimation animation="fade-up" delay={100}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>Fundo das Páginas</CardTitle>
                <CardDescription>
                  Configure o gradiente de fundo das páginas do dashboard (exceto Landing Page e Auth)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="space-y-1">
                    <Label className="text-base">
                      Fundo do Dashboard
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Personalize o gradiente de fundo com cores e intensidades diferentes para cada dispositivo
                    </p>
                  </div>
                  <BackgroundConfigEditor 
                    onConfigSaved={() => {
                      toast({
                        title: "Configurações salvas",
                        description: "O fundo das páginas foi atualizado",
                      });
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </ScrollAnimation>

          <ScrollAnimation animation="fade-up" delay={200}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>Barra de Status (PWA)</CardTitle>
                <CardDescription>
                  Configure a cor da barra de status do dispositivo (hora, bateria, sinal) para PWAs instalados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="space-y-1">
                    <Label className="text-base">
                      Barra de Status
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Personalize a cor exibida no topo do dispositivo em modo claro e escuro
                    </p>
                  </div>
                  <StatusBarConfigEditor 
                    onConfigSaved={() => {
                      toast({
                        title: "Configurações salvas",
                        description: "A cor da barra de status foi atualizada",
                      });
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </ScrollAnimation>
        </TabsContent>

        <TabsContent value="landing" className="mt-4">
          <Suspense fallback={<TabLoadingFallback />}>
            <AdminLandingPageContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="versions" className="mt-4">
          <Suspense fallback={<TabLoadingFallback />}>
            <AdminVersionsContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Suspense fallback={<TabLoadingFallback />}>
            <AdminUsersContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="deleted-users" className="mt-4">
          <Suspense fallback={<TabLoadingFallback />}>
            <AdminDeletedUsersContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="commission-levels" className="mt-4">
          <Suspense fallback={<TabLoadingFallback />}>
            <AdminCommissionLevelsContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="cpf-apis" className="mt-4">
          <Suspense fallback={<TabLoadingFallback />}>
            <AdminCpfApisContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="legal" className="mt-4">
          <Suspense fallback={<TabLoadingFallback />}>
            <AdminLegalDocumentsContent />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
