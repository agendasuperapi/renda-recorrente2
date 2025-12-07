import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Plus, History, Trophy, TrendingUp } from "lucide-react";
import { ScrollAnimation } from "@/components/ScrollAnimation";
import { GoalCard } from "./GoalCard";
import { CreateGoalDialog } from "./CreateGoalDialog";
import { GoalHistorySection } from "./GoalHistorySection";
import { EmptyGoalsState } from "./EmptyGoalsState";

interface GoalsTabProps {
  embedded?: boolean;
  showValues?: boolean;
}

export interface GoalProgress {
  id: string;
  affiliate_id: string;
  product_id: string | null;
  goal_type: 'value' | 'sales' | 'referrals';
  target_value: number;
  period_start: string;
  period_end: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_name: string | null;
  product_icon_light: string | null;
  product_icon_dark: string | null;
  current_value: number;
  progress_percentage: number;
  status: 'active' | 'completed' | 'expired' | 'pending';
  days_remaining: number;
}

const GoalsTab = ({ embedded = false, showValues = true }: GoalsTabProps) => {
  const { userId } = useUser();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalProgress | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'history'>('active');

  const { data: goals, isLoading, refetch } = useQuery({
    queryKey: ['affiliate-goals', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('view_affiliate_goals_progress')
        .select('*')
        .eq('affiliate_id', userId)
        .order('period_start', { ascending: false });
      
      if (error) throw error;
      return data as GoalProgress[];
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  const activeGoals = goals?.filter(g => g.status === 'active') || [];
  const historyGoals = goals?.filter(g => g.status !== 'active') || [];
  
  // Estatísticas do histórico
  const completedGoals = historyGoals.filter(g => g.status === 'completed').length;
  const totalHistoryGoals = historyGoals.length;

  const handleEdit = (goal: GoalProgress) => {
    setEditingGoal(goal);
    setIsCreateDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingGoal(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com botão de criar */}
      <ScrollAnimation animation="fade-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Suas Metas</h2>
              <p className="text-sm text-muted-foreground">
                Defina e acompanhe suas metas de performance
              </p>
            </div>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Meta
          </Button>
        </div>
      </ScrollAnimation>

      {/* Sub-tabs: Ativas / Histórico */}
      <ScrollAnimation animation="fade-up" delay={100}>
        <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as 'active' | 'history')}>
          <TabsList className="grid grid-cols-2 gap-2 bg-muted/50 p-1.5 rounded-xl mb-4 w-fit">
            <TabsTrigger 
              value="active"
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Ativas ({activeGoals.length})</span>
            </TabsTrigger>
            <TabsTrigger 
              value="history"
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25"
            >
              <History className="h-4 w-4" />
              <span>Histórico ({historyGoals.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent 
            value="active" 
            forceMount 
            className="mt-4 data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-150"
          >
            {activeGoals.length === 0 ? (
              <EmptyGoalsState onCreateClick={() => setIsCreateDialogOpen(true)} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeGoals.map((goal, index) => (
                  <ScrollAnimation key={goal.id} animation="fade-up" delay={index * 50}>
                    <GoalCard 
                      goal={goal} 
                      showValues={showValues}
                      onEdit={() => handleEdit(goal)}
                      onDelete={() => refetch()}
                    />
                  </ScrollAnimation>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent 
            value="history" 
            forceMount 
            className="mt-4 data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-150"
          >
            {/* Estatísticas do histórico */}
            {totalHistoryGoals > 0 && (
              <Card className="mb-4 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Trophy className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        {completedGoals}/{totalHistoryGoals}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        metas concluídas com sucesso
                      </p>
                    </div>
                    {completedGoals > 0 && (
                      <div className="ml-auto text-right">
                        <p className="text-lg font-semibold text-green-600">
                          {Math.round((completedGoals / totalHistoryGoals) * 100)}%
                        </p>
                        <p className="text-xs text-muted-foreground">taxa de sucesso</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            <GoalHistorySection 
              goals={historyGoals} 
              showValues={showValues}
              onEdit={handleEdit}
              onDelete={() => refetch()}
            />
          </TabsContent>
        </Tabs>
      </ScrollAnimation>

      {/* Dialog de criação/edição */}
      <CreateGoalDialog 
        open={isCreateDialogOpen}
        onOpenChange={handleCloseDialog}
        editingGoal={editingGoal}
        onSuccess={() => {
          handleCloseDialog();
          refetch();
        }}
      />
    </div>
  );
};

export default GoalsTab;
