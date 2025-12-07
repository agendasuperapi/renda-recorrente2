import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Reference, ReferenceType } from "./ReferenceSelector";
import { DollarSign, Users, Network, Calendar, Package, CreditCard, User, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface ReferenceDetailsDialogProps {
  reference: Reference | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeConfig: Record<ReferenceType, {
  icon: typeof DollarSign;
  title: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  iconClass: string;
}> = {
  commission: {
    icon: DollarSign,
    title: "Detalhes da Comissão",
    bgClass: "bg-emerald-100 dark:bg-emerald-900/30",
    borderClass: "border-emerald-300 dark:border-emerald-700",
    textClass: "text-emerald-800 dark:text-emerald-200",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  referral: {
    icon: Users,
    title: "Detalhes da Indicação",
    bgClass: "bg-blue-100 dark:bg-blue-900/30",
    borderClass: "border-blue-300 dark:border-blue-700",
    textClass: "text-blue-800 dark:text-blue-200",
    iconClass: "text-blue-600 dark:text-blue-400",
  },
  sub_affiliate: {
    icon: Network,
    title: "Detalhes do Sub-afiliado",
    bgClass: "bg-purple-100 dark:bg-purple-900/30",
    borderClass: "border-purple-300 dark:border-purple-700",
    textClass: "text-purple-800 dark:text-purple-200",
    iconClass: "text-purple-600 dark:text-purple-400",
  },
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  available: { label: "Disponível", variant: "default" },
  paid: { label: "Pago", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  registered: { label: "Cadastrado", variant: "secondary" },
  converted: { label: "Convertido", variant: "default" },
  active: { label: "Ativo", variant: "default" },
  inactive: { label: "Inativo", variant: "secondary" },
};

export function ReferenceDetailsDialog({ reference, open, onOpenChange }: ReferenceDetailsDialogProps) {
  const isMobile = useIsMobile();

  const { data: details, isLoading } = useQuery({
    queryKey: ["reference-details", reference?.type, reference?.id],
    queryFn: async () => {
      if (!reference) return null;

      switch (reference.type) {
        case "commission": {
          const { data, error } = await supabase
            .from("view_commissions_daily")
            .select("*")
            .eq("id", reference.id)
            .single();
          if (error) throw error;
          return { type: "commission" as const, data };
        }
        case "referral": {
          const { data, error } = await supabase
            .from("view_referrals")
            .select("*")
            .eq("id", reference.id)
            .single();
          if (error) throw error;
          return { type: "referral" as const, data };
        }
        case "sub_affiliate": {
          const { data, error } = await supabase
            .from("view_sub_affiliates")
            .select("*")
            .eq("id", reference.id)
            .single();
          if (error) throw error;
          return { type: "sub_affiliate" as const, data };
        }
      }
    },
    enabled: open && !!reference,
  });

  if (!reference) return null;

  const config = typeConfig[reference.type];
  const Icon = config.icon;

  const Content = () => (
    <div className="space-y-4">
      {/* Header Card */}
      <div className={`p-4 rounded-lg border ${config.bgClass} ${config.borderClass}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${config.bgClass}`}>
            <Icon className={`w-6 h-6 ${config.iconClass}`} />
          </div>
          <div>
            <p className={`font-semibold ${config.textClass}`}>{reference.label}</p>
            {reference.details && (
              <p className={`text-sm opacity-75 ${config.textClass}`}>{reference.details}</p>
            )}
          </div>
        </div>
      </div>

      {/* Details */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : details ? (
        <div className="space-y-3">
          {details.type === "commission" && details.data && (
            <>
              <DetailRow icon={User} label="Cliente" value={details.data.cliente || "N/A"} />
              <DetailRow 
                icon={DollarSign} 
                label="Valor" 
                value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(details.data.valor || 0)} 
              />
              <DetailRow icon={Package} label="Produto" value={details.data.produto || "N/A"} />
              <DetailRow icon={CreditCard} label="Plano" value={details.data.plano || "N/A"} />
              <DetailRow icon={TrendingUp} label="Nível" value={`Nível ${details.data.level || 1}`} />
              <DetailRow 
                icon={Calendar} 
                label="Data" 
                value={details.data.created_at ? format(new Date(details.data.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "N/A"} 
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant={statusConfig[details.data.status]?.variant || "secondary"}>
                  {statusConfig[details.data.status]?.label || details.data.status}
                </Badge>
              </div>
            </>
          )}
          
          {details.type === "referral" && details.data && (
            <>
              <DetailRow icon={User} label="Nome" value={details.data.name || "N/A"} />
              <DetailRow icon={Package} label="Produto" value={details.data.product_name || "N/A"} />
              <DetailRow icon={CreditCard} label="Plano" value={details.data.plan_name || "N/A"} />
              <DetailRow 
                icon={Calendar} 
                label="Data de cadastro" 
                value={details.data.created_at ? format(new Date(details.data.created_at), "dd/MM/yyyy", { locale: ptBR }) : "N/A"} 
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant={statusConfig[details.data.status]?.variant || "secondary"}>
                  {statusConfig[details.data.status]?.label || details.data.status}
                </Badge>
              </div>
            </>
          )}
          
          {details.type === "sub_affiliate" && details.data && (
            <>
              <DetailRow icon={User} label="Nome" value={details.data.name || "N/A"} />
              <DetailRow icon={TrendingUp} label="Nível" value={`Nível ${details.data.level || 1}`} />
              <DetailRow icon={CreditCard} label="Plano" value={details.data.plan_name || "N/A"} />
              <DetailRow 
                icon={Calendar} 
                label="Data de entrada" 
                value={details.data.created_at ? format(new Date(details.data.created_at), "dd/MM/yyyy", { locale: ptBR }) : "N/A"} 
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant={statusConfig[details.data.status]?.variant || "secondary"}>
                  {statusConfig[details.data.status]?.label || details.data.status}
                </Badge>
              </div>
            </>
          )}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-4">
          Não foi possível carregar os detalhes
        </p>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Icon className={`w-5 h-5 ${config.iconClass}`} />
              {config.title}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">
            <Content />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${config.iconClass}`} />
            {config.title}
          </DialogTitle>
        </DialogHeader>
        <Content />
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof DollarSign; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
