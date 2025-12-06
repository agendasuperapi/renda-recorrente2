import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  XCircle, 
  AlertCircle,
  DollarSign,
  ShoppingCart,
  Users,
  Calendar
} from "lucide-react";
import { useTheme } from "next-themes";
import { GoalProgress } from "./GoalsTab";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GoalHistorySectionProps {
  goals: GoalProgress[];
  showValues: boolean;
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
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500/10',
    badgeVariant: 'default' as const,
    badgeClass: 'bg-yellow-500 hover:bg-yellow-500'
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

export const GoalHistorySection = ({ goals, showValues }: GoalHistorySectionProps) => {
  const { theme } = useTheme();

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
    <div className="space-y-3">
      {goals.map((goal) => {
        const typeConfig = goalTypeConfig[goal.goal_type];
        const status = statusConfig[goal.status];
        const TypeIcon = typeConfig.icon;
        const StatusIcon = status.icon;

        const productIcon = theme === 'dark' 
          ? goal.product_icon_dark 
          : goal.product_icon_light;

        const periodLabel = format(new Date(goal.period_start), "MMMM 'de' yyyy", { locale: ptBR });

        return (
          <Card key={goal.id} className="overflow-hidden">
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
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
