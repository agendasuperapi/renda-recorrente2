import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ticket, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Coupons = () => {
  const { toast } = useToast();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "O código foi copiado para a área de transferência",
    });
  };

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Cupons e Links</h1>
          <p className="text-muted-foreground">
            Gerencie seus cupons de desconto e links de afiliado
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Seus Cupons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Ticket className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum cupom disponível no momento</p>
              <p className="text-sm mt-2">
                Entre em contato com o suporte para criar seus cupons
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Links de Afiliado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <ExternalLink className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Seus links de afiliado aparecerão aqui</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Coupons;
