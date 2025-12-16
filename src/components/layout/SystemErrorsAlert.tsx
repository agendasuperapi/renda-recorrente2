import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSystemErrors } from "@/hooks/useSystemErrors";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

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
            className="relative flex items-center justify-center p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors border border-destructive/30"
          >
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <Badge 
              variant="destructive" 
              className="absolute -top-1.5 -right-1.5 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
            >
              {errors.totalErrors}
            </Badge>
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
