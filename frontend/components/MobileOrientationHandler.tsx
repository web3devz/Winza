import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';

export function MobileOrientationHandler() {
  const [isLandscape, setIsLandscape] = useState(false);
  const [showRotatePrompt, setShowRotatePrompt] = useState(false);

  useEffect(() => {
    const handleOrientationChange = () => {
      const landscape = window.innerWidth > window.innerHeight;
      setIsLandscape(landscape);
      
      // Show rotate prompt if in landscape on small screens
      if (landscape && window.innerWidth < 768) {
        setShowRotatePrompt(true);
        setTimeout(() => setShowRotatePrompt(false), 3000);
      } else {
        setShowRotatePrompt(false);
      }
    };

    // Initial check
    handleOrientationChange();

    // Listen for orientation changes
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  // Apply landscape-specific styles
  useEffect(() => {
    if (isLandscape && window.innerWidth < 768) {
      document.body.classList.add('landscape-mobile');
    } else {
      document.body.classList.remove('landscape-mobile');
    }
  }, [isLandscape]);

  if (!showRotatePrompt) return null;

  return (
    <div className="sm:hidden fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-6 mx-4 text-center max-w-sm">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <RotateCcw className="w-8 h-8 text-red-600" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Rotate Your Device
        </h3>
        
        <p className="text-gray-600 text-sm">
          For the best experience, please rotate your device to portrait mode.
        </p>
      </div>
    </div>
  );
}