// Mobile utility functions

/**
 * Detect if the device is mobile based on user agent and screen size
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768;
}

/**
 * Detect if the device supports touch
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get safe area insets for devices with notches
 */
export function getSafeAreaInsets() {
  if (typeof window === 'undefined') return { top: 0, bottom: 0, left: 0, right: 0 };
  
  const style = getComputedStyle(document.documentElement);
  
  return {
    top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
    bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
    left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0'),
    right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0'),
  };
}

/**
 * Prevent zoom on input focus (iOS Safari)
 */
export function preventZoomOnInputFocus() {
  if (typeof document === 'undefined') return;
  
  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    if (input instanceof HTMLElement) {
      input.style.fontSize = '16px';
    }
  });
}

/**
 * Add haptic feedback for mobile interactions
 */
export function hapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light') {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  
  const patterns = {
    light: [10],
    medium: [20],
    heavy: [30]
  };
  
  navigator.vibrate(patterns[type]);
}

/**
 * Optimize scroll performance for mobile
 */
export function optimizeScrollPerformance(element: HTMLElement) {
  // Use type assertion for webkit-specific properties
  (element.style as any).webkitOverflowScrolling = 'touch';
  element.style.overscrollBehavior = 'contain';
}

/**
 * Get viewport dimensions accounting for mobile browsers
 */
export function getViewportDimensions() {
  if (typeof window === 'undefined') return { width: 0, height: 0 };
  
  // Use visualViewport API if available (better for mobile)
  if (window.visualViewport) {
    return {
      width: window.visualViewport.width,
      height: window.visualViewport.height
    };
  }
  
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
}

/**
 * Check if device is in landscape mode
 */
export function isLandscape(): boolean {
  if (typeof window === 'undefined') return false;
  
  return window.innerWidth > window.innerHeight;
}

/**
 * Format numbers for mobile display (shorter format)
 */
export function formatMobileNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Debounce function for mobile input optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for scroll and resize events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}