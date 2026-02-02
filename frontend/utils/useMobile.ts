import { useState, useEffect } from 'react';
import { isMobileDevice, isTouchDevice, getViewportDimensions, isLandscape } from './mobileUtils';

interface MobileState {
  isMobile: boolean;
  isTouch: boolean;
  viewport: { width: number; height: number };
  isLandscape: boolean;
  orientation: 'portrait' | 'landscape';
}

export function useMobile(): MobileState {
  const [mobileState, setMobileState] = useState<MobileState>({
    isMobile: false,
    isTouch: false,
    viewport: { width: 0, height: 0 },
    isLandscape: false,
    orientation: 'portrait'
  });

  useEffect(() => {
    const updateMobileState = () => {
      const viewport = getViewportDimensions();
      const landscape = isLandscape();

      setMobileState({
        isMobile: isMobileDevice(),
        isTouch: isTouchDevice(),
        viewport,
        isLandscape: landscape,
        orientation: landscape ? 'landscape' : 'portrait'
      });
    };

    // Initial check
    updateMobileState();

    // Listen for resize and orientation changes
    window.addEventListener('resize', updateMobileState);
    window.addEventListener('orientationchange', updateMobileState);

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateMobileState);
      window.removeEventListener('orientationchange', updateMobileState);
    };
  }, []);

  return mobileState;
}

export function useSwipeGesture(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  threshold: number = 80,
  element?: HTMLElement | null
) {
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    const targetElement = element || document;

    const handleTouchStart = (e: Event) => {
      const touchEvent = e as TouchEvent;
      startX = touchEvent.touches[0].clientX;
      startY = touchEvent.touches[0].clientY;
      startTime = Date.now();
    };

    const handleTouchEnd = (e: Event) => {
      const touchEvent = e as TouchEvent;
      const endX = touchEvent.changedTouches[0].clientX;
      const endY = touchEvent.changedTouches[0].clientY;
      const endTime = Date.now();

      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const deltaTime = endTime - startTime;

      // Ignore if touch was too long (likely scrolling)
      if (deltaTime > 500) return;

      // Check if swipe is significant enough and fast enough
      if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
        // Determine primary direction - must be clearly horizontal or vertical
        if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
          // Horizontal swipe
          if (deltaX > 0) {
            onSwipeRight?.();
          } else {
            onSwipeLeft?.();
          }
        } else if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
          // Vertical swipe
          if (deltaY > 0) {
            onSwipeDown?.();
          } else {
            onSwipeUp?.();
          }
        }
      }
    };

    targetElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    targetElement.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      targetElement.removeEventListener('touchstart', handleTouchStart);
      targetElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, element]);
}