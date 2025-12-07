import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
import { 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Target, 
  Flame, 
  TrendingUp, 
  CheckCircle, 
  Trophy,
  Calendar,
  DollarSign,
  ShoppingCart,
  Users
} from "lucide-react";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GoalProgress } from "./GoalsTab";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GoalCardProps {
  goal: GoalProgress;
  showValues: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const goalTypeConfig = {
  value: {
    label: 'Valor',
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
    format: (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    hiddenFormat: 'R$ •••••'
  },
  sales: {
    label: 'Vendas',
    icon: ShoppingCart,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    format: (v: number) => `${v} vendas`,
    hiddenFormat: '•• vendas'
  },
  referrals: {
    label: 'Indicações',
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
    format: (v: number) => `${v} indicações`,
    hiddenFormat: '•• indicações'
  }
};

const getProgressStatus = (percentage: number) => {
  if (percentage >= 100) return { 
    icon: Trophy, 
    color: 'text-yellow-500', 
    bgColor: 'bg-yellow-500/20',
    label: 'Meta Batida!',
    progressColor: 'bg-yellow-500'
  };
  if (percentage >= 75) return { 
    icon: CheckCircle, 
    color: 'text-green-500', 
    bgColor: 'bg-green-500/20',
    label: 'Quase lá!',
    progressColor: 'bg-green-500'
  };
  if (percentage >= 50) return { 
    icon: TrendingUp, 
    color: 'text-blue-500', 
    bgColor: 'bg-blue-500/20',
    label: 'Bom progresso',
    progressColor: 'bg-blue-500'
  };
  if (percentage >= 25) return { 
    icon: Target, 
    color: 'text-orange-500', 
    bgColor: 'bg-orange-500/20',
    label: 'Continue assim',
    progressColor: 'bg-orange-500'
  };
  return { 
    icon: Flame, 
    color: 'text-red-500', 
    bgColor: 'bg-red-500/20',
    label: 'Acelere!',
    progressColor: 'bg-red-500'
  };
};

export const GoalCard = ({ goal, showValues, onEdit, onDelete }: GoalCardProps) => {
  const { theme } = useTheme();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const typeConfig = goalTypeConfig[goal.goal_type];
  const StatusIcon = typeConfig.icon;
  const progressStatus = getProgressStatus(goal.progress_percentage);
  const ProgressIcon = progressStatus.icon;

  const productIcon = theme === 'dark' 
    ? goal.product_icon_dark 
    : goal.product_icon_light;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('affiliate_goals')
        .delete()
        .eq('id', goal.id);

      if (error) throw error;
      
      toast.success('Meta excluída com sucesso');
      onDelete();
    } catch (error) {
      console.error('Erro ao excluir meta:', error);
      toast.error('Erro ao excluir meta');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const periodLabel = format(parseISO(goal.period_start), "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <>
      <Card className={`relative overflow-hidden transition-all hover:shadow-lg ${
        goal.progress_percentage >= 100 ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/5 to-transparent' : ''
      }`}>
        {/* Badge de meta batida */}
        {goal.progress_percentage >= 100 && (
          <div className="absolute top-0 right-0">
            <div className="bg-yellow-500 text-yellow-950 text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
              <Trophy className="h-3 w-3" />
              META BATIDA!
            </div>
          </div>
        )}

        <CardContent className="p-4 pt-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${typeConfig.bgColor}`}>
                <StatusIcon className={`h-4 w-4 ${typeConfig.color}`} />
              </div>
              <div>
                <p className="font-medium text-sm">{typeConfig.label}</p>
                {goal.product_name ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {productIcon && (
                      <img src={productIcon} alt="" className="h-4 w-4 rounded" />
                    )}
                    <span className="text-xs text-muted-foreground">{goal.product_name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Meta Geral</span>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Valores */}
          <div className="space-y-2 mb-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">
                {showValues 
                  ? typeConfig.format(goal.current_value)
                  : typeConfig.hiddenFormat
                }
              </span>
              <span className="text-sm text-muted-foreground">
                / {showValues 
                    ? typeConfig.format(goal.target_value)
                    : typeConfig.hiddenFormat
                  }
              </span>
            </div>

            {/* Barra de progresso */}
            <div className="relative">
              <Progress 
                value={Math.min(goal.progress_percentage, 100)} 
                className="h-2.5"
              />
              <div 
                className={`absolute inset-0 h-2.5 rounded-full ${progressStatus.progressColor} transition-all`}
                style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Status e período */}
          <div className="flex items-center justify-between text-xs">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${progressStatus.bgColor}`}>
              <ProgressIcon className={`h-3 w-3 ${progressStatus.color}`} />
              <span className={progressStatus.color}>
                {showValues ? `${goal.progress_percentage.toFixed(0)}%` : '••%'}
              </span>
            </div>

            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{goal.days_remaining} dias restantes</span>
            </div>
          </div>

          {/* Período */}
          <p className="text-xs text-muted-foreground mt-2 capitalize">
            {periodLabel}
          </p>
        </CardContent>
      </Card>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A meta será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
