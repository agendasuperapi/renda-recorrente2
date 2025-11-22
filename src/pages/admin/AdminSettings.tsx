import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar configuração do banco de dados
  const { data: settingData, isLoading } = useQuery({
    queryKey: ['app-settings', 'environment_mode'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', 'environment_mode')
        .single();

      if (error) {
        console.error('Error fetching settings:', error);
        return null;
      }

      return data;
    },
  });

  const isProduction = settingData?.value === 'production';

  // Mutation para atualizar a configuração
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
    </div>
  );
}
