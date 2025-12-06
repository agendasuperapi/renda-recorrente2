import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Plus, TrendingUp, Trophy, Zap } from "lucide-react";

interface EmptyGoalsStateProps {
  onCreateClick: () => void;
}

export const EmptyGoalsState = ({ onCreateClick }: EmptyGoalsStateProps) => {
  return (
    <Card className="border-dashed border-2">
      <CardContent className="p-8">
        <div className="flex flex-col items-center text-center max-w-md mx-auto">
          {/* Ícone principal com decoração */}
          <div className="relative mb-6">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Target className="h-12 w-12 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 p-1.5 rounded-full bg-yellow-500/20">
              <Trophy className="h-4 w-4 text-yellow-600" />
            </div>
            <div className="absolute -bottom-1 -left-1 p-1.5 rounded-full bg-green-500/20">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </div>

          {/* Título e descrição */}
          <h3 className="text-xl font-semibold mb-2">
            Defina suas metas
          </h3>
          <p className="text-muted-foreground mb-6">
            Crie metas mensais para acompanhar seu progresso e manter o foco nos seus objetivos. 
            Você pode definir metas por valor, vendas ou indicações.
          </p>

          {/* Benefícios */}
          <div className="grid grid-cols-3 gap-4 mb-6 w-full">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Zap className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
              <p className="text-xs font-medium">Motivação</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-xs font-medium">Foco</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Trophy className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-xs font-medium">Resultados</p>
            </div>
          </div>

          {/* Botão */}
          <Button onClick={onCreateClick} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Criar Primeira Meta
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
