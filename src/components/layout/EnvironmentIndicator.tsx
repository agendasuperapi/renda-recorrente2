import { useEnvironmentOptional, EnvironmentFilter } from '@/contexts/EnvironmentContext';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnvironmentIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

const environmentConfig: Record<EnvironmentFilter, { label: string; icon: React.ElementType; bgColor: string; textColor: string; borderColor: string }> = {
  production: {
    label: 'Produção',
    icon: CheckCircle2,
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-500/20',
  },
  test: {
    label: 'Teste',
    icon: AlertCircle,
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-500/20',
  },
};

export function EnvironmentIndicator({ className, showLabel = true }: EnvironmentIndicatorProps) {
  const envContext = useEnvironmentOptional();
  
  // If not inside provider, don't show indicator
  if (!envContext) {
    return null;
  }

  const { environment } = envContext;
  const config = environmentConfig[environment];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium",
        config.bgColor,
        config.textColor,
        config.borderColor,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {showLabel && <span>{config.label}</span>}
    </div>
  );
}
