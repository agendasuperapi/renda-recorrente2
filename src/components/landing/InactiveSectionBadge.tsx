import { EyeOff, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface InactiveSectionBadgeProps {
  sectionName: string;
  onToggle: () => void;
  isActive: boolean;
}

export const InactiveSectionBadge = ({ sectionName, onToggle, isActive }: InactiveSectionBadgeProps) => {
  return (
    <div className="absolute top-2 left-2 z-50 flex items-center gap-2">
      {!isActive && (
        <Badge 
          variant="destructive" 
          className="flex items-center gap-1 bg-destructive/90 text-destructive-foreground shadow-lg"
        >
          <EyeOff className="h-3 w-3" />
          Seção Inativa
        </Badge>
      )}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant={isActive ? "outline" : "default"}
              className={`h-7 px-2 ${!isActive ? 'bg-primary hover:bg-primary/90' : ''}`}
              onClick={onToggle}
            >
              <Power className="h-3 w-3 mr-1" />
              {isActive ? "Desativar" : "Ativar"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isActive ? `Desativar seção "${sectionName}"` : `Ativar seção "${sectionName}"`}</p>
            <p className="text-xs text-muted-foreground">
              {isActive 
                ? "Seções inativas só aparecem para super admins" 
                : "Ativar para mostrar a todos os usuários"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
