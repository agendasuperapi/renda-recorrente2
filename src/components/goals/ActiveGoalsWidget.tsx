import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  ArrowRight, 
  Trophy, 
  DollarSign, 
  ShoppingCart, 
  Users,
  Flame,
  TrendingUp,
  CheckCircle,
  Plus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import { ScrollAnimation } from "@/components/ScrollAnimation";

interface ActiveGoal {
  id: string;
  goal_type: 'value' | 'sales' | 'referrals';
  target_value: number;
  current_value: number;
  progress_percentage: number;
  days_remaining: number;
  product_id: string | null;
  product_name: string | null;
  product_icon_light: string | null;
  product_icon_dark: string | null;
}

interface ActiveGoalsWidgetProps {
  showValues: boolean;
  affiliateId?: string;
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
    format: (v: number) => `${v}`,
    hiddenFormat: '••'
  },
  referrals: {
    label: 'Indicações',
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
    format: (v: number) => `${v}`,
    hiddenFormat: '••'
  }
};

const getProgressStatus = (percentage: number) => {
  if (percentage >= 100) return { 
    icon: Trophy, 
    color: 'text-green-500', 
    progressColor: 'bg-green-500'
  };
  if (percentage >= 75) return { 
    icon: CheckCircle, 
    color: 'text-green-500', 
    progressColor: 'bg-green-500'
  };
  if (percentage >= 50) return { 
    icon: TrendingUp, 
    color: 'text-blue-500', 
    progressColor: 'bg-blue-500'
  };
  if (percentage >= 25) return { 
    icon: Target, 
    color: 'text-orange-500', 
    progressColor: 'bg-orange-500'
  };
  return { 
    icon: Flame, 
    color: 'text-red-500', 
    progressColor: 'bg-red-500'
  };
};

export const ActiveGoalsWidget = ({ showValues, affiliateId }: ActiveGoalsWidgetProps) => {
  const { theme } = useTheme();
  const [goals, setGoals] = useState<ActiveGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveGoals = async () => {
      if (!affiliateId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }
        affiliateId = session.user.id;
      }

      const { data, error } = await supabase
        .from('view_affiliate_goals_progress' as any)
        .select('*')
        .eq('affiliate_id', affiliateId)
        .eq('status', 'active')
        .order('progress_percentage', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Erro ao buscar metas ativas:', error);
      } else if (data) {
        setGoals(data as unknown as ActiveGoal[]);
      }
      setLoading(false);
    };

    fetchActiveGoals();
  }, [affiliateId]);

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-primary/10 to-success/10 border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Minhas Metas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted rounded-lg" />
            <div className="h-16 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-success/10 border-primary/20 hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Target className="h-5 w-5 text-primary" />
          Minhas Metas
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          asChild 
          className="gap-1.5 text-xs touch-manipulation"
          onClick={(e) => e.stopPropagation()}
        >
          <Link 
            to="/user/commissions?tab=goals"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            Ver todas
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {goals.length === 0 ? (
          <div className="text-center py-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <Target className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Você ainda não tem metas ativas
            </p>
            <Button size="sm" variant="outline" asChild className="gap-2">
              <Link to="/user/commissions?tab=goals">
                <Plus className="h-4 w-4" />
                Criar primeira meta
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal, index) => {
              const typeConfig = goalTypeConfig[goal.goal_type];
              const TypeIcon = typeConfig.icon;
              const progressStatus = getProgressStatus(goal.progress_percentage);
              const productIcon = theme === 'dark' 
                ? goal.product_icon_dark 
                : goal.product_icon_light;

              return (
                <ScrollAnimation key={goal.id} animation="fade-up" delay={100 * index}>
                  <div className={`p-3 rounded-lg border bg-card/80 backdrop-blur-sm hover:bg-card transition-all ${
                    goal.progress_percentage >= 100 ? 'border-green-500/50' : ''
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-1.5 rounded-md ${typeConfig.bgColor}`}>
                        <TypeIcon className={`h-3.5 w-3.5 ${typeConfig.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">
                            {typeConfig.label}
                          </span>
                          {goal.product_name ? (
                            <div className="flex items-center gap-1">
                              {productIcon && (
                                <img src={productIcon} alt="" className="h-3.5 w-3.5 rounded" />
                              )}
                              <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                                {goal.product_name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Geral</span>
                          )}
                        </div>
                      </div>
                      {goal.progress_percentage >= 100 && (
                        <Trophy className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold">
                        {showValues ? typeConfig.format(goal.current_value) : typeConfig.hiddenFormat}
                      </span>
                      <span className="text-muted-foreground">
                        / {showValues ? typeConfig.format(goal.target_value) : typeConfig.hiddenFormat}
                      </span>
                    </div>

                    <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`absolute inset-y-0 left-0 rounded-full ${progressStatus.progressColor} transition-all duration-500`}
                        style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                      <span className={progressStatus.color}>
                        {showValues ? `${goal.progress_percentage.toFixed(0)}%` : '••%'}
                      </span>
                      <span>{goal.days_remaining} dias restantes</span>
                    </div>
                  </div>
                </ScrollAnimation>
              );
            })}

            {goals.length > 0 && goals.length < 3 && (
              <Button variant="ghost" size="sm" asChild className="w-full gap-2 text-xs text-muted-foreground">
                <Link to="/user/commissions?tab=goals">
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar meta
                </Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
