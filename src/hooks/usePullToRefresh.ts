import { useEffect, useState, useCallback } from 'react';

interface UsePullToRefreshOptions {
  onRefresh?: () => void | Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  disabled = false
}: UsePullToRefreshOptions = {}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isStandalonePWA = useCallback(() => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  }, []);

  useEffect(() => {
    if (disabled || !isStandalonePWA()) return;

    let startY = 0;
    let currentY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || window.scrollY > 0) {
        setIsPulling(false);
        setPullDistance(0);
        return;
      }

      currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - startY);
      
      // Apply resistance to make it feel natural
      const resistedDistance = Math.min(distance * 0.5, threshold * 1.5);
      setPullDistance(resistedDistance);

      if (distance > 10) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        
        if (onRefresh) {
          await onRefresh();
        } else {
          window.location.reload();
        }
        
        setIsRefreshing(false);
      }
      
      setIsPulling(false);
      setPullDistance(0);
      startY = 0;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh, disabled, isStandalonePWA]);

  return {
    isPulling,
    pullDistance,
    isRefreshing,
    isReady: pullDistance >= threshold,
    isStandalonePWA: isStandalonePWA()
  };
};
