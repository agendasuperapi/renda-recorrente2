import { useState, useEffect } from "react";
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
import { Loader2, RefreshCw, Settings, DollarSign, Palette } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <div className="container mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Configurações</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Configure as preferências gerais do sistema
        </p>
      </div>

      <Tabs defaultValue="environment" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="environment" className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-background">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Ambiente</span>
          </TabsTrigger>
          <TabsTrigger value="commissions" className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-background">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Comissões</span>
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-background">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Tema</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="environment" className="mt-4">
          <Card>
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
        </TabsContent>

        <TabsContent value="commissions" className="mt-4">
          <Card>
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
        </TabsContent>

        <TabsContent value="theme" className="mt-4 space-y-4">
          <Card>
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

          <Card>
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

          <Card>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
