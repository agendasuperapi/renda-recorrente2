import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh?: () => void | Promise<void>;
  disabled?: boolean;
}

export const PullToRefresh = ({ onRefresh, disabled }: PullToRefreshProps) => {
  const { pullDistance, isRefreshing, isReady, isStandalonePWA } = usePullToRefresh({
    onRefresh,
    disabled
  });

  if (!isStandalonePWA) return null;

  const showIndicator = pullDistance > 10 || isRefreshing;
  const progress = Math.min(pullDistance / 80, 1);

  return (
    <div
      className={cn(
        "fixed left-1/2 -translate-x-1/2 z-[9999] transition-all duration-200 ease-out",
        showIndicator ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      style={{
        top: `calc(env(safe-area-inset-top) + ${Math.max(pullDistance - 20, 8)}px)`
      }}
    >
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full bg-background border border-border shadow-lg",
          isRefreshing && "animate-pulse"
        )}
      >
        <RefreshCw
          className={cn(
            "w-5 h-5 text-primary transition-transform duration-200",
            isRefreshing && "animate-spin"
          )}
          style={{
            transform: isRefreshing ? undefined : `rotate(${progress * 360}deg)`,
            opacity: isRefreshing ? 1 : progress
          }}
        />
      </div>
      {isReady && !isRefreshing && (
        <p className="text-xs text-muted-foreground mt-1 text-center whitespace-nowrap">
          Solte para atualizar
        </p>
      )}
    </div>
  );
};
