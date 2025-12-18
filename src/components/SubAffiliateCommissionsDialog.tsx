import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, User, Mail, Calendar, Users, DollarSign, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";

interface CommissionDetail {
  id: string;
  amount: number;
  created_at: string;
  level: number;
  percentage: number;
  unified_user_name: string;
  unified_user_email: string;
  plan_name: string;
}

interface SubAffiliateData {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  plan_name: string | null;
  level: number;
  status: string | null;
  created_at: string;
  referrals_count: number;
  total_commission: number;
  my_commission_from_sub: number;
}

interface SubAffiliateCommissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subAffiliate: SubAffiliateData | null;
  parentAffiliateId: string;
}

export function SubAffiliateCommissionsDialog({
  open,
  onOpenChange,
  subAffiliate,
  parentAffiliateId,
}: SubAffiliateCommissionsDialogProps) {
  const [commissions, setCommissions] = useState<CommissionDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open && subAffiliate) {
      loadCommissions();
    }
  }, [open, subAffiliate?.id, parentAffiliateId]);

  const loadCommissions = async () => {
    if (!subAffiliate) return;
    
    setLoading(true);
    try {
      const { data: commissionsData, error } = await supabase
        .from('commissions')
        .select(`
          id,
          amount,
          created_at,
          level,
          percentage,
          unified_user_id,
          unified_users!fk_commissions_unified_user_id (
            external_user_id,
            name,
            email,
            plan_id
          )
        `)
        .eq('affiliate_id', parentAffiliateId)
        .in('status', ['pending', 'available', 'paid'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: subAffiliatesData, error: subError } = await supabase
        .from('sub_affiliates')
        .select('sub_affiliate_id')
        .eq('parent_affiliate_id', subAffiliate.id);

      if (subError) throw subError;

      const subAffiliateIds = [subAffiliate.id, ...(subAffiliatesData?.map(sa => sa.sub_affiliate_id) || [])];

      const filtered = commissionsData?.filter(c => {
        const externalUserId = c.unified_users?.external_user_id;
        return externalUserId && subAffiliateIds.includes(externalUserId);
      }).map(c => ({
        id: c.id,
        amount: c.amount,
        created_at: c.created_at,
        level: c.level || 1,
        percentage: c.percentage || 0,
        unified_user_name: c.unified_users?.name || 'N/A',
        unified_user_email: c.unified_users?.email || 'N/A',
        plan_name: 'N/A', // Plan relationship removed
      })) || [];

      setCommissions(filtered);
      setTotal(filtered.reduce((sum, c) => sum + Number(c.amount), 0));
    } catch (error) {
      console.error('Error loading commissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelBadge = (level: number) => {
    const colors: Record<number, string> = {
      1: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
      2: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      3: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    };
    
    return (
      <Badge className={colors[level] || colors[3]}>
        N{level}
      </Badge>
    );
  };

  const getStatusBadge = (status: string | null) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      active: { label: "Ativo", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
      canceled: { label: "Cancelado", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
      past_due: { label: "Inadimplente", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
      trialing: { label: "Trial", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
    };
    
    const config = statusConfig[status || ''] || { label: status || '-', className: "bg-muted text-muted-foreground" };
    
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (!subAffiliate) return null;

  const subAffiliateInfoCard = (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14 flex-shrink-0">
            <AvatarImage src={subAffiliate.avatar_url || undefined} />
            <AvatarFallback className="text-lg">
              {subAffiliate.name?.charAt(0).toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 space-y-3">
            {/* Nome e Username */}
            <div>
              <h3 className="font-semibold text-base truncate">{subAffiliate.name}</h3>
              {subAffiliate.username && (
                <p className="text-sm text-muted-foreground">@{subAffiliate.username}</p>
              )}
              {subAffiliate.email && (
                <p className="text-sm text-muted-foreground truncate">{subAffiliate.email}</p>
              )}
            </div>
            
            {/* Grid de informações */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Plano</span>
                <p className="font-medium">{subAffiliate.plan_name || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Nível</span>
                <div className="mt-0.5">{getLevelBadge(subAffiliate.level)}</div>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Status</span>
                <div className="mt-0.5">{getStatusBadge(subAffiliate.status)}</div>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Cadastro</span>
                <p className="font-medium">{format(new Date(subAffiliate.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Indicações</span>
                <p className="font-medium">{subAffiliate.referrals_count}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Comissão Sub</span>
                <p className="font-medium">{formatCurrency(Number(subAffiliate.total_commission) || 0)}</p>
              </div>
            </div>

            {/* Minha Comissão destacada */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Minha Comissão</span>
                <span className="text-lg font-bold text-success">
                  {formatCurrency(Number(subAffiliate.my_commission_from_sub) || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const mobileContent = (
    <>
      {subAffiliateInfoCard}

      <Card className="mb-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Histórico de Comissões</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-success">
            {formatCurrency(total)}
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : commissions.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          Nenhuma comissão encontrada.
        </p>
      ) : (
        <div className="space-y-3">
          {commissions.map((commission) => (
            <Card key={commission.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{commission.unified_user_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{commission.unified_user_email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-success text-sm">
                      {formatCurrency(Number(commission.amount))}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Plano:</span>
                    <span className="font-medium">{commission.plan_name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {getLevelBadge(commission.level)}
                  </div>
                  <Badge variant="outline" className="text-xs">{commission.percentage}%</Badge>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  {format(new Date(commission.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );

  const desktopContent = (
    <>
      {subAffiliateInfoCard}

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Comissões</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-success">
            {formatCurrency(total)}
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : commissions.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          Nenhuma comissão encontrada.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>% Comissão</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Valor Comissão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {commissions.map((commission) => (
              <TableRow key={commission.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{commission.unified_user_name}</p>
                    <p className="text-sm text-muted-foreground">{commission.unified_user_email}</p>
                  </div>
                </TableCell>
                <TableCell>{commission.plan_name}</TableCell>
                <TableCell>{getLevelBadge(commission.level)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{commission.percentage}%</Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(commission.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell className="font-semibold text-success">
                  {formatCurrency(Number(commission.amount))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh] rounded-t-[20px]">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle className="text-base">Detalhes - {subAffiliate.name}</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">
            {mobileContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes das Comissões - {subAffiliate.name}</DialogTitle>
        </DialogHeader>
        {desktopContent}
      </DialogContent>
    </Dialog>
  );
}