import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  XCircle, 
  AlertCircle,
  DollarSign,
  ShoppingCart,
  Users,
  Calendar,
  Pencil,
  Trash2
} from "lucide-react";
import { useTheme } from "next-themes";
import { GoalProgress } from "./GoalsTab";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GoalHistorySectionProps {
  goals: GoalProgress[];
  showValues: boolean;
  onEdit?: (goal: GoalProgress) => void;
  onDelete?: () => void;
}

const goalTypeConfig = {
  value: {
    label: 'Valor',
    icon: DollarSign,
    format: (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    hiddenFormat: 'R$ •••••'
  },
  sales: {
    label: 'Vendas',
    icon: ShoppingCart,
    format: (v: number) => `${v} vendas`,
    hiddenFormat: '•• vendas'
  },
  referrals: {
    label: 'Indicações',
    icon: Users,
    format: (v: number) => `${v} indicações`,
    hiddenFormat: '•• indicações'
  }
};

const statusConfig = {
  completed: {
    label: 'Meta Batida',
    icon: Trophy,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
    badgeVariant: 'default' as const,
    badgeClass: 'bg-green-500 hover:bg-green-500'
  },
  expired: {
    label: 'Não Atingida',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
    badgeVariant: 'destructive' as const,
    badgeClass: ''
  },
  pending: {
    label: 'Pendente',
    icon: AlertCircle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    badgeVariant: 'secondary' as const,
    badgeClass: ''
  },
  active: {
    label: 'Ativa',
    icon: AlertCircle,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    badgeVariant: 'default' as const,
    badgeClass: ''
  }
};

export const GoalHistorySection = ({ goals, showValues, onEdit, onDelete }: GoalHistorySectionProps) => {
  const { theme } = useTheme();
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!deletingGoalId) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('affiliate_goals')
        .delete()
        .eq('id', deletingGoalId);
      
      if (error) throw error;
      
      toast({
        title: "Meta excluída",
        description: "A meta foi excluída com sucesso.",
      });
      
      onDelete?.();
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a meta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeletingGoalId(null);
    }
  };

  if (goals.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-full bg-muted">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Nenhum histórico</p>
              <p className="text-sm text-muted-foreground">
                Suas metas anteriores aparecerão aqui
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {goals.map((goal) => {
          const typeConfig = goalTypeConfig[goal.goal_type];
          const status = statusConfig[goal.status];
          const TypeIcon = typeConfig.icon;
          const StatusIcon = status.icon;

          const productIcon = theme === 'dark' 
            ? goal.product_icon_dark 
            : goal.product_icon_light;

          const periodLabel = format(parseISO(goal.period_start), "MMMM 'de' yyyy", { locale: ptBR });

          return (
            <Card key={goal.id} className="overflow-hidden group">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Ícone do status */}
                  <div className={`p-2.5 rounded-lg ${status.bgColor}`}>
                    <StatusIcon className={`h-5 w-5 ${status.color}`} />
                  </div>

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <TypeIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{typeConfig.label}</span>
                      {goal.product_name ? (
                        <div className="flex items-center gap-1">
                          {productIcon && (
                            <img src={productIcon} alt="" className="h-4 w-4 rounded" />
                          )}
                          <span className="text-xs text-muted-foreground truncate">
                            {goal.product_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Geral</span>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground capitalize">
                      {periodLabel}
                    </p>
                  </div>

                  {/* Resultado */}
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      {showValues 
                        ? `${goal.progress_percentage.toFixed(0)}%`
                        : '••%'
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {showValues 
                        ? `${typeConfig.format(goal.current_value)} / ${typeConfig.format(goal.target_value)}`
                        : `${typeConfig.hiddenFormat} / ${typeConfig.hiddenFormat}`
                      }
                    </p>
                  </div>

                  {/* Badge de status */}
                  <Badge 
                    variant={status.badgeVariant}
                    className={`shrink-0 ${status.badgeClass}`}
                  >
                    {status.label}
                  </Badge>

                  {/* Botões de ação */}
                  <div className="flex items-center gap-1">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(goal)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeletingGoalId(goal.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deletingGoalId} onOpenChange={(open) => !open && setDeletingGoalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A meta será removida permanentemente do seu histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
