import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SubAffiliate {
  id: string;
  parent_affiliate_id: string;
  external_user_id: string;
  name: string;
  username: string | null;
  email: string;
  avatar_url: string | null;
  plan_name: string | null;
  plan_id: string | null;
  status: string;
  created_at: string;
  referrals_count: number;
  total_commission: number;
}

const SubAffiliates = () => {
  const [subAffiliates, setSubAffiliates] = useState<SubAffiliate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, commissions: 0 });
  const { toast } = useToast();

  useEffect(() => {
    loadSubAffiliates();
  }, []);

  const loadSubAffiliates = async () => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('view_sub_affiliates' as any)
        .select('*')
        .eq('parent_affiliate_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSubAffiliates((data as any) || []);
      
      // Calcular estatísticas
      const total = data?.length || 0;
      const commissions = data?.reduce((sum: number, sub: any) => sum + (Number(sub.total_commission) || 0), 0) || 0;
      setStats({ total, commissions });

    } catch (error: any) {
      console.error('Erro ao carregar sub-afiliados:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: "Ativo", variant: "default" as const },
      trialing: { label: "Teste", variant: "secondary" as const },
      canceled: { label: "Cancelado", variant: "destructive" as const },
      past_due: { label: "Atrasado", variant: "destructive" as const },
      unpaid: { label: "Não Pago", variant: "destructive" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: "secondary" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Sub Afiliados</h1>
          <p className="text-muted-foreground">
            Gerencie sua rede de sub-afiliados
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        </div>
        <TableSkeleton columns={7} rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Sub Afiliados</h1>
        <p className="text-muted-foreground">
          Gerencie sua rede de sub-afiliados
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Sub-Afiliados
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Comissões de Sub-Afiliados
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(stats.commissions)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Sub-Afiliados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome/Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Cadastro</TableHead>
                <TableHead className="text-right">Indicações</TableHead>
                <TableHead className="text-right">Comissão Gerada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subAffiliates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum sub-afiliado encontrado
                  </TableCell>
                </TableRow>
              ) : (
                subAffiliates.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={sub.avatar_url || undefined} />
                          <AvatarFallback>
                            {sub.name?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{sub.name}</div>
                          {sub.username && (
                            <div className="text-xs text-muted-foreground">
                              @{sub.username}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{sub.email}</TableCell>
                    <TableCell>
                      {sub.plan_name || <span className="text-muted-foreground">Sem plano</span>}
                    </TableCell>
                    <TableCell>{getStatusBadge(sub.status)}</TableCell>
                    <TableCell>
                      {format(new Date(sub.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">{sub.referrals_count}</TableCell>
                    <TableCell className="text-right font-medium">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(Number(sub.total_commission) || 0)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubAffiliates;
