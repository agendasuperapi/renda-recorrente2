import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface SubAffiliateCommissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subAffiliateName: string;
  subAffiliateId: string;
  parentAffiliateId: string;
}

export function SubAffiliateCommissionsDialog({
  open,
  onOpenChange,
  subAffiliateName,
  subAffiliateId,
  parentAffiliateId,
}: SubAffiliateCommissionsDialogProps) {
  const [commissions, setCommissions] = useState<CommissionDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) {
      loadCommissions();
    }
  }, [open, subAffiliateId, parentAffiliateId]);

  const loadCommissions = async () => {
    setLoading(true);
    try {
      // Buscar comissões onde o affiliate_id é o pai e o unified_user_id pertence ao sub ou sua rede
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
            plan_id,
            plans (
              name
            )
          )
        `)
        .eq('affiliate_id', parentAffiliateId)
        .in('status', ['pending', 'available', 'paid'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filtrar apenas comissões relacionadas ao sub-afiliado ou sua rede
      const { data: subAffiliatesData, error: subError } = await supabase
        .from('sub_affiliates')
        .select('sub_affiliate_id')
        .eq('parent_affiliate_id', subAffiliateId);

      if (subError) throw subError;

      const subAffiliateIds = [subAffiliateId, ...(subAffiliatesData?.map(sa => sa.sub_affiliate_id) || [])];

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
        plan_name: c.unified_users?.plans?.name || 'N/A',
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
    const variants: Record<number, "default" | "secondary" | "outline"> = {
      1: "default",
      2: "secondary",
      3: "outline",
    };
    
    return (
      <Badge variant={variants[level] || "outline"}>
        Nível {level}
      </Badge>
    );
  };

  const mobileContent = (
    <>
      <Card className="mb-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Total das Minhas Comissões</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-success">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format(total)}
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
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(Number(commission.amount))}
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
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">Total das Minhas Comissões</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-success">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format(total)}
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
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(Number(commission.amount))}
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
            <DrawerTitle className="text-base">Detalhes - {subAffiliateName}</DrawerTitle>
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
          <DialogTitle>Detalhes das Comissões - {subAffiliateName}</DialogTitle>
        </DialogHeader>
        {desktopContent}
      </DialogContent>
    </Dialog>
  );
}
