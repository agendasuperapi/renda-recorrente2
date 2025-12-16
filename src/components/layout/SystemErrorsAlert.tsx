import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSystemErrors } from "@/hooks/useSystemErrors";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const SystemErrorsAlert = () => {
  const navigate = useNavigate();
  const { data: errors, isLoading } = useSystemErrors();

  if (isLoading || !errors || errors.totalErrors === 0) {
    return null;
  }

  const handleClick = () => {
    // Navegar para a aba de processamento de comissões com filtro de erros
    if (errors.commissionProcessingErrors > 0) {
      navigate("/admin/commissions?tab=processing");
    } else if (errors.paymentSyncErrors > 0) {
      navigate("/admin/stripe?tab=payments");
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/20 hover:bg-destructive/30 transition-all border border-destructive/50 shadow-md shadow-destructive/20 animate-pulse hover:animate-none"
          >
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="text-sm font-medium text-destructive">
              {errors.totalErrors} {errors.totalErrors === 1 ? 'erro' : 'erros'}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold text-destructive">Erros no Sistema</p>
            {errors.paymentSyncErrors > 0 && (
              <p className="text-sm">
                • {errors.paymentSyncErrors} erro(s) de sincronização de pagamentos
              </p>
            )}
            {errors.commissionProcessingErrors > 0 && (
              <p className="text-sm">
                • {errors.commissionProcessingErrors} erro(s) de processamento de comissões
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Clique para ver detalhes
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
