import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Plus } from "lucide-react";

const GoogleBusiness = () => {
  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Empresas Google</h1>
            <p className="text-muted-foreground">
              Gerencie suas empresas do Google Meu Negócio
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Empresa
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Suas Empresas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhuma empresa cadastrada</p>
              <p className="text-sm mt-2">
                Adicione empresas do Google Meu Negócio para começar
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-info/5 border-info/20">
          <CardHeader>
            <CardTitle className="text-sm">O que você pode fazer?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Vincule empresas do Google Meu Negócio aos seus aplicativos</p>
            <p>• Monitore avaliações e respostas</p>
            <p>• Gerencie informações de múltiplas empresas</p>
            <p>• Acompanhe estatísticas de visualização</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GoogleBusiness;
