// PWA utility functions

/**
 * Register service worker for PWA functionality
 */
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, refresh the page
                  console.log('New content available, refreshing...');
                  window.location.reload();
                }
              });
            }
          });
        })
        .catch((registrationError) => {
          console.warn('SW registration failed: ', registrationError);
          // Don't throw error, just log it
        });
    });
  }
}

/**
 * Check if app is running as PWA
 */
export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}

/**
 * Show install prompt for PWA
 */
export function showInstallPrompt() {
  let deferredPrompt: any;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button or banner
    const installButton = document.getElementById('install-button');
    if (installButton) {
      installButton.style.display = 'block';
      installButton.addEventListener('click', () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult: any) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
          }
          deferredPrompt = null;
        });
      });
    }
  });
}

/**
 * Handle PWA app installed event
 */
export function handleAppInstalled() {
  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    // Hide install button
    const installButton = document.getElementById('install-button');
    if (installButton) {
      installButton.style.display = 'none';
    }
  });
}

/**
 * Check if device supports PWA installation
 */
export function canInstallPWA(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}