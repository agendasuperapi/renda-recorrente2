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
import { Loader2 } from "lucide-react";

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
        .in('key', ['environment_mode', 'commission_days_to_available', 'commission_min_withdrawal']);

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
  
  const [commissionDays, setCommissionDays] = useState('7');
  const [commissionMin, setCommissionMin] = useState('50.00');

  useEffect(() => {
    if (commissionDaysData) setCommissionDays(commissionDaysData.value);
    if (commissionMinData) setCommissionMin(commissionMinData.value);
  }, [commissionDaysData, commissionMinData]);

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
    mutationFn: async ({ days, min }: { days: string; min: string }) => {
      const updates = [
        supabase
          .from('app_settings')
          .update({ value: days })
          .eq('key', 'commission_days_to_available'),
        supabase
          .from('app_settings')
          .update({ value: min })
          .eq('key', 'commission_min_withdrawal'),
      ];

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
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
      await updateCommissionSettingsMutation.mutateAsync({
        days: commissionDays,
        min: commissionMin,
      });
      
      toast({
        title: "Configurações salvas",
        description: "Configurações de comissão atualizadas com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Configurações</h1>
        <p className="text-muted-foreground">
          Configure as preferências gerais do sistema
        </p>
      </div>

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
              <li>Após {commissionDays} dias do pagamento, o sistema verifica se é o dia de saque do afiliado</li>
              <li>Cada afiliado tem um dia específico baseado no dia da semana do cadastro</li>
              <li>O sistema verifica se o total pendente é maior ou igual a R$ {commissionMin}</li>
              <li>Se todas as condições forem atendidas, o status muda para <strong>Disponível</strong></li>
              <li>A verificação é executada automaticamente a cada hora</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personalização do Menu Lateral</CardTitle>
          <CardDescription>
            Configure as cores, gradiente e ícone do menu lateral do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
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
    </div>
  );
}
