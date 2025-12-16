import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SystemErrors {
  paymentSyncErrors: number;
  commissionProcessingErrors: number;
  totalErrors: number;
}

export const useSystemErrors = () => {
  return useQuery({
    queryKey: ["system-errors"],
    queryFn: async (): Promise<SystemErrors> => {
      // Buscar erros de sincronização de pagamentos
      const { count: paymentSyncErrors } = await supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("sync_status", "error");

      // Buscar erros de processamento de comissões
      const { count: commissionProcessingErrors } = await supabase
        .from("unified_payments")
        .select("*", { count: "exact", head: true })
        .eq("commission_processed", false)
        .not("commission_error", "is", null);

      const syncErrors = paymentSyncErrors || 0;
      const commissionErrors = commissionProcessingErrors || 0;

      return {
        paymentSyncErrors: syncErrors,
        commissionProcessingErrors: commissionErrors,
        totalErrors: syncErrors + commissionErrors,
      };
    },
    staleTime: 30000, // 30 segundos
    refetchInterval: 60000, // Refetch a cada minuto
  });
};
