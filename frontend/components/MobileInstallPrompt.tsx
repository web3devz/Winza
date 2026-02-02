import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from './ui/button';
import { isPWA, canInstallPWA } from '../utils/pwaUtils';

export function MobileInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Don't show if already installed as PWA
    if (isPWA()) return;

    // Don't show if device doesn't support PWA
    if (!canInstallPWA()) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Remember user dismissed (could store in localStorage)
    localStorage.setItem('installPromptDismissed', 'true');
  };

  // Don't show if user previously dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('installPromptDismissed');
    if (dismissed === 'true') {
      setShowPrompt(false);
    }
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="sm:hidden fixed bottom-4 left-4 right-4 z-40">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Download className="w-6 h-6 text-red-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-1">
              Install Winza
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Add to your home screen for a better experience and faster access.
            </p>
            
            <div className="flex gap-2">
              <Button
                onClick={handleInstall}
                className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 h-auto"
              >
                Install
              </Button>
              <Button
                onClick={handleDismiss}
                variant="outline"
                className="text-sm px-4 py-2 h-auto"
              >
                Not now
              </Button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}