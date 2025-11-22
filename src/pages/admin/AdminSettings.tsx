import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettings() {
  const [isProduction, setIsProduction] = useState(() => {
    const saved = localStorage.getItem("app_environment");
    return saved === "production";
  });
  const { toast } = useToast();

  const handleToggle = (checked: boolean) => {
    setIsProduction(checked);
    const environment = checked ? "production" : "test";
    localStorage.setItem("app_environment", environment);
    
    toast({
      title: "Configuração atualizada",
      description: `Modo ${checked ? "Produção" : "Teste"} ativado`,
    });
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
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
