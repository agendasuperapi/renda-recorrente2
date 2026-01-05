import { Construction, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ComingSoonProps {
  title?: string;
}

const ComingSoon = ({ title }: ComingSoonProps) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-primary/20 bg-gradient-to-br from-background to-muted/30">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Construction className="w-10 h-10 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1">
                <Sparkles className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </div>
          
          {title && (
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          )}
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Em Desenvolvimento
            </h1>
            <p className="text-muted-foreground">
              Esta funcionalidade está sendo desenvolvida e estará disponível em breve nas próximas versões.
            </p>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-sm text-primary">
            <Sparkles className="w-4 h-4" />
            <span>Fique atento às atualizações!</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComingSoon;
