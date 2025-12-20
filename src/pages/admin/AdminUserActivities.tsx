import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Search, 
  Filter, 
  User, 
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Download
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  getActivityTypeLabel, 
  getCategoryIcon, 
  getCategoryColor 
} from "@/lib/activityLogger";

interface Activity {
  id: string;
  user_id: string;
  activity_type: string;
  description: string;
  category: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_name: string;
  user_email: string | null;
  username: string | null;
  avatar_url: string | null;
}

const CATEGORIES = [
  { value: "all", label: "Todas" },
  { value: "profile", label: "Perfil" },
  { value: "security", label: "Segurança" },
  { value: "coupon", label: "Cupons" },
  { value: "financial", label: "Financeiro" },
  { value: "goal", label: "Metas" },
  { value: "subscription", label: "Assinatura" },
  { value: "support", label: "Suporte" },
  { value: "auth", label: "Autenticação" },
];

interface AdminUserActivitiesProps {
  isEmbedded?: boolean;
}

export default function AdminUserActivities({ isEmbedded = false }: AdminUserActivitiesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());

  // Buscar atividades
  const { data: activities, isLoading, refetch } = useQuery({
    queryKey: ['admin-user-activities', selectedCategory, selectedUserId],
    queryFn: async () => {
      let query = supabase
        .from('activities')
        .select(`
          id,
          user_id,
          activity_type,
          description,
          category,
          metadata,
          ip_address,
          user_agent,
          created_at,
          profiles!inner (
            name,
            email,
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (selectedCategory !== "all") {
        query = query.eq('category', selectedCategory);
      }

      if (selectedUserId) {
        query = query.eq('user_id', selectedUserId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        ...item,
        user_name: item.profiles?.name || 'Usuário',
        user_email: item.profiles?.email,
        username: item.profiles?.username,
        avatar_url: item.profiles?.avatar_url,
      })) as Activity[];
    },
  });

  // Buscar lista de usuários para filtro
  const { data: users } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, username, avatar_url')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Filtrar por busca
  const filteredActivities = activities?.filter(activity => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      activity.user_name?.toLowerCase().includes(searchLower) ||
      activity.username?.toLowerCase().includes(searchLower) ||
      activity.description?.toLowerCase().includes(searchLower) ||
      activity.activity_type?.toLowerCase().includes(searchLower)
    );
  });

  // Agrupar por data
  const groupedActivities = filteredActivities?.reduce((groups, activity) => {
    const date = format(new Date(activity.created_at), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, Activity[]>);

  const toggleExpanded = (id: string) => {
    setExpandedActivities(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const exportToCSV = () => {
    if (!filteredActivities?.length) return;

    const headers = ['Data/Hora', 'Usuário', 'Username', 'Tipo', 'Descrição', 'Categoria'];
    const rows = filteredActivities.map(a => [
      format(new Date(a.created_at), 'dd/MM/yyyy HH:mm:ss'),
      a.user_name,
      a.username || '',
      a.activity_type,
      a.description,
      a.category || ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `atividades_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className={isEmbedded ? "space-y-4" : "space-y-4 sm:space-y-6 p-4 sm:p-6"}>
      {/* Header - only show when not embedded */}
      {!isEmbedded && (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Atividades dos Usuários</h1>
            <p className="text-muted-foreground">
              Histórico de ações realizadas pelos usuários no sistema
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuário, descrição..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={selectedUserId || "all"} 
                onValueChange={(v) => setSelectedUserId(v === "all" ? null : v)}
              >
                <SelectTrigger className="w-[200px]">
                  <User className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} {user.username && `(@${user.username})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {isEmbedded && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportToCSV}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Atividades */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline de Atividades
            {filteredActivities && (
              <Badge variant="secondary" className="ml-2">
                {filteredActivities.length} registros
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : !filteredActivities?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma atividade encontrada</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-320px)] pr-4">
              <div className="space-y-6">
                {Object.entries(groupedActivities || {}).map(([date, dayActivities]) => (
                  <div key={date}>
                    {/* Data Header */}
                    <div className="sticky top-0 bg-background/95 backdrop-blur z-10 py-2 mb-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </div>
                    </div>

                    {/* Atividades do dia */}
                    <div className="relative pl-4 border-l-2 border-muted space-y-1.5">
                      {dayActivities.map((activity) => (
                        <Collapsible
                          key={activity.id}
                          open={expandedActivities.has(activity.id)}
                          onOpenChange={() => toggleExpanded(activity.id)}
                        >
                          <div className="relative">
                            {/* Dot na timeline */}
                            <div className="absolute -left-[17px] top-2.5 w-2 h-2 rounded-full bg-primary border-2 border-background" />
                            
                            <div className="bg-muted/30 rounded-md px-3 py-2 hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-2">
                                {/* Avatar */}
                                <Avatar className="h-7 w-7">
                                  <AvatarImage src={activity.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {activity.user_name?.charAt(0)?.toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>

                                {/* Content */}
                                <div className="flex-1 min-w-0 flex items-center gap-2">
                                  <span className="font-medium text-sm truncate">{activity.user_name}</span>
                                  {activity.username && (
                                    <span className="text-muted-foreground text-xs hidden sm:inline">
                                      @{activity.username}
                                    </span>
                                  )}
                                </div>

                                {activity.category && (
                                  <Badge 
                                    variant="outline" 
                                    className={`text-[10px] px-1.5 py-0 h-5 ${getCategoryColor(activity.category)}`}
                                  >
                                    {getCategoryIcon(activity.category)} {activity.category}
                                  </Badge>
                                )}

                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {format(new Date(activity.created_at), 'HH:mm')}
                                </span>

                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                                    {expandedActivities.has(activity.id) ? (
                                      <ChevronUp className="h-3 w-3" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                              </div>

                              <p className="text-xs text-muted-foreground mt-1 ml-9 truncate">
                                {activity.description || getActivityTypeLabel(activity.activity_type)}
                              </p>

                              <CollapsibleContent>
                                <div className="mt-2 pt-2 border-t border-border/50 space-y-1.5 text-xs ml-9">
                                  <div className="flex gap-4">
                                    <div>
                                      <span className="text-muted-foreground">Tipo: </span>
                                      <span className="font-mono">{activity.activity_type}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-muted-foreground">User ID: </span>
                                      <span className="font-mono truncate">{activity.user_id}</span>
                                    </div>
                                  </div>
                                  
                                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                                    <div>
                                      <span className="text-muted-foreground">Metadata:</span>
                                      <pre className="mt-1 p-1.5 bg-muted rounded text-[10px] overflow-x-auto">
                                        {JSON.stringify(activity.metadata, null, 2)}
                                      </pre>
                                    </div>
                                  )}

                                  {activity.user_agent && (
                                    <div>
                                      <span className="text-muted-foreground">User Agent: </span>
                                      <span className="truncate">{activity.user_agent}</span>
                                    </div>
                                  )}
                                </div>
                              </CollapsibleContent>
                            </div>
                          </div>
                        </Collapsible>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
