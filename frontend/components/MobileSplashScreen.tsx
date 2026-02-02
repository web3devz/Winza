import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';

interface MobileSplashScreenProps {
  isVisible: boolean;
  onComplete: () => void;
}

export function MobileSplashScreen({ isVisible, onComplete }: MobileSplashScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="sm:hidden fixed inset-0 bg-gradient-to-br from-red-500 to-red-600 z-50 flex flex-col items-center justify-center">
      {/* Logo */}
      <div className="mb-8">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl">
          <TrendingUp className="w-12 h-12 text-red-600" />
        </div>
      </div>

      {/* App Name */}
      <h1 className="text-4xl font-bold text-white mb-2">Winza</h1>
      <p className="text-red-100 text-lg mb-12">Crypto Prediction Game</p>

      {/* Loading Progress */}
      <div className="w-64 mb-4">
        <div className="bg-red-400 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-white h-full rounded-full transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Loading Text */}
      <p className="text-red-100 text-sm">
        {progress < 30 ? 'Initializing...' :
         progress < 60 ? 'Loading markets...' :
         progress < 90 ? 'Connecting...' :
         'Ready!'}
      </p>

      {/* Version */}
      <div className="absolute bottom-8 text-red-200 text-xs">
        v1.0.0
      </div>
    </div>
  );
}