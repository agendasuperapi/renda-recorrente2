import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ReferenceType, Reference } from "./ReferenceSelector";

interface ReferenceItemSelectorProps {
  type: ReferenceType;
  selectedReferences: Reference[];
  onSelect: (reference: Reference) => void;
}

const referenceTypeLabels: Record<ReferenceType, string> = {
  commission: "comissão",
  referral: "indicação",
  sub_affiliate: "sub-afiliado"
};

export function ReferenceItemSelector({ type, selectedReferences, onSelect }: ReferenceItemSelectorProps) {
  const { userId } = useAuth();

  // Fetch commissions
  const { data: commissions, isLoading: loadingCommissions } = useQuery({
    queryKey: ["user-commissions-for-reference", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("view_commissions_daily")
        .select("id, cliente, valor, data_filtro, produto, status")
        .eq("affiliate_id", userId)
        .order("data_filtro", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId && type === "commission",
  });

  // Fetch referrals
  const { data: referrals, isLoading: loadingReferrals } = useQuery({
    queryKey: ["user-referrals-for-reference", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("view_referrals")
        .select("id, name, plan_name, product_name, created_at, status")
        .eq("affiliate_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId && type === "referral",
  });

  // Fetch sub-affiliates
  const { data: subAffiliates, isLoading: loadingSubAffiliates } = useQuery({
    queryKey: ["user-sub-affiliates-for-reference", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("view_sub_affiliates")
        .select("id, name, email, plan_name, level, created_at")
        .eq("parent_affiliate_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId && type === "sub_affiliate",
  });

  const isLoading = loadingCommissions || loadingReferrals || loadingSubAffiliates;

  const getOptions = (): { id: string; label: string; details?: string }[] => {
    if (type === "commission" && commissions) {
      return commissions.map(c => ({
        id: c.id,
        label: `${c.cliente || "Cliente"} - R$ ${Number(c.valor).toFixed(2)}`,
        details: `${c.produto || ""} - ${format(new Date(c.data_filtro), "dd/MM/yyyy", { locale: ptBR })}`
      }));
    }
    if (type === "referral" && referrals) {
      return referrals.map(r => ({
        id: r.id,
        label: r.name || "Indicado",
        details: `${r.plan_name || ""} - ${format(new Date(r.created_at), "dd/MM/yyyy", { locale: ptBR })}`
      }));
    }
    if (type === "sub_affiliate" && subAffiliates) {
      return subAffiliates.map(s => ({
        id: s.id,
        label: s.name || "Sub-afiliado",
        details: `Nível ${s.level} - ${s.plan_name || "Sem plano"}`
      }));
    }
    return [];
  };

  const options = getOptions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Select
      onValueChange={(value) => {
        const selected = options.find(o => o.id === value);
        if (selected) {
          onSelect({
            type,
            id: selected.id,
            label: selected.label,
            details: selected.details
          });
        }
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={`Selecione ${referenceTypeLabels[type]}`} />
      </SelectTrigger>
      <SelectContent>
        {options.length === 0 ? (
          <div className="p-2 text-sm text-muted-foreground text-center">
            Nenhum item encontrado
          </div>
        ) : (
          options.map((option) => (
            <SelectItem 
              key={option.id} 
              value={option.id}
              disabled={selectedReferences.some(ref => ref.type === type && ref.id === option.id)}
            >
              <div className="flex flex-col">
                <span>{option.label}</span>
                {option.details && (
                  <span className="text-xs text-muted-foreground">{option.details}</span>
                )}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
