import { useEffect, useState, useCallback, useRef } from 'react';

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
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const isRefreshingRef = useRef(false);

  const isStandalonePWA = useCallback(() => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  }, []);

  useEffect(() => {
    if (disabled || !isStandalonePWA()) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only start pull if at top of page
      if (window.scrollY <= 0 && !isRefreshingRef.current) {
        startYRef.current = e.touches[0].clientY;
        isPullingRef.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshingRef.current) return;
      
      // Cancel if scrolled away from top
      if (window.scrollY > 0) {
        isPullingRef.current = false;
        setPullDistance(0);
        return;
      }

      const currentY = e.touches[0].clientY;
      const distance = currentY - startYRef.current;
      
      // Only pull down, not up
      if (distance <= 0) {
        setPullDistance(0);
        return;
      }

      // Apply resistance to make it feel natural
      const resistedDistance = Math.min(distance * 0.5, threshold * 1.5);
      setPullDistance(resistedDistance);

      // Prevent default scroll when pulling
      if (distance > 10) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = async () => {
      if (!isPullingRef.current) return;
      
      const currentDistance = pullDistance;
      isPullingRef.current = false;

      if (currentDistance >= threshold && !isRefreshingRef.current) {
        isRefreshingRef.current = true;
        setIsRefreshing(true);
        
        try {
          if (onRefresh) {
            await onRefresh();
          } else {
            window.location.reload();
          }
        } finally {
          isRefreshingRef.current = false;
          setIsRefreshing(false);
        }
      }
      
      setPullDistance(0);
      startYRef.current = 0;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [threshold, onRefresh, disabled, isStandalonePWA, pullDistance]);

  return {
    pullDistance,
    isRefreshing,
    isReady: pullDistance >= threshold,
    isStandalonePWA: isStandalonePWA()
  };
};
