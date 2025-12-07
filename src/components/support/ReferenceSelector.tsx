import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, Link2, DollarSign, Users, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export type ReferenceType = "commission" | "referral" | "sub_affiliate";

export interface Reference {
  type: ReferenceType;
  id: string;
  label: string;
  details?: string;
}

interface ReferenceSelectorProps {
  selectedReferences: Reference[];
  onReferencesChange: (references: Reference[]) => void;
}

const referenceTypeConfig = {
  commission: { 
    label: "Comissão", 
    icon: DollarSign,
    color: "bg-green-500/20 text-green-600"
  },
  referral: { 
    label: "Indicação", 
    icon: UserPlus,
    color: "bg-blue-500/20 text-blue-600"
  },
  sub_affiliate: { 
    label: "Sub-afiliado", 
    icon: Users,
    color: "bg-purple-500/20 text-purple-600"
  },
};

export function ReferenceSelector({ selectedReferences, onReferencesChange }: ReferenceSelectorProps) {
  const { userId } = useAuth();
  const [selectedType, setSelectedType] = useState<ReferenceType | "">("");
  const [isOpen, setIsOpen] = useState(false);

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
    enabled: !!userId && selectedType === "commission",
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
    enabled: !!userId && selectedType === "referral",
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
    enabled: !!userId && selectedType === "sub_affiliate",
  });

  const handleAddReference = (type: ReferenceType, id: string, label: string, details?: string) => {
    // Check if already added
    if (selectedReferences.some(ref => ref.type === type && ref.id === id)) {
      return;
    }

    onReferencesChange([...selectedReferences, { type, id, label, details }]);
    setSelectedType("");
    setIsOpen(false);
  };

  const handleRemoveReference = (index: number) => {
    const newRefs = [...selectedReferences];
    newRefs.splice(index, 1);
    onReferencesChange(newRefs);
  };

  const isLoading = loadingCommissions || loadingReferrals || loadingSubAffiliates;

  const getOptions = () => {
    if (selectedType === "commission" && commissions) {
      return commissions.map(c => ({
        id: c.id,
        label: `${c.cliente || "Cliente"} - R$ ${Number(c.valor).toFixed(2)}`,
        details: `${c.produto || ""} - ${format(new Date(c.data_filtro), "dd/MM/yyyy", { locale: ptBR })}`
      }));
    }
    if (selectedType === "referral" && referrals) {
      return referrals.map(r => ({
        id: r.id,
        label: r.name || "Indicado",
        details: `${r.plan_name || ""} - ${format(new Date(r.created_at), "dd/MM/yyyy", { locale: ptBR })}`
      }));
    }
    if (selectedType === "sub_affiliate" && subAffiliates) {
      return subAffiliates.map(s => ({
        id: s.id,
        label: s.name || "Sub-afiliado",
        details: `Nível ${s.level} - ${s.plan_name || "Sem plano"}`
      }));
    }
    return [];
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Vincular Referência (opcional)</span>
      </div>

      {/* Selected References */}
      {selectedReferences.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedReferences.map((ref, index) => {
            const config = referenceTypeConfig[ref.type];
            const Icon = config.icon;
            return (
              <Badge 
                key={`${ref.type}-${ref.id}`}
                variant="outline"
                className={`${config.color} flex items-center gap-1 pr-1`}
              >
                <Icon className="w-3 h-3" />
                <span className="max-w-[150px] truncate">{ref.label}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveReference(index)}
                  className="ml-1 hover:bg-background/50 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Type Selection */}
      {!isOpen && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="text-muted-foreground"
        >
          <Link2 className="w-4 h-4 mr-2" />
          Adicionar referência
        </Button>
      )}

      {isOpen && (
        <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Selecione o tipo:</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setIsOpen(false);
                setSelectedType("");
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {(Object.entries(referenceTypeConfig) as [ReferenceType, typeof referenceTypeConfig.commission][]).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <Button
                  key={type}
                  type="button"
                  variant={selectedType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType(type)}
                  className="text-xs"
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {config.label}
                </Button>
              );
            })}
          </div>

          {selectedType && (
            <div className="pt-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Select
                  onValueChange={(value) => {
                    const options = getOptions();
                    const selected = options.find(o => o.id === value);
                    if (selected) {
                      handleAddReference(selectedType, selected.id, selected.label, selected.details);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={`Selecione ${referenceTypeConfig[selectedType].label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {getOptions().length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Nenhum item encontrado
                      </div>
                    ) : (
                      getOptions().map((option) => (
                        <SelectItem 
                          key={option.id} 
                          value={option.id}
                          disabled={selectedReferences.some(ref => ref.type === selectedType && ref.id === option.id)}
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
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}