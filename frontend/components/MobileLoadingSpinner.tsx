import { useEffect, useState } from 'react';

interface MobileLoadingSpinnerProps {
  isLoading: boolean;
  message?: string;
}

export function MobileLoadingSpinner({ isLoading, message = "Loading..." }: MobileLoadingSpinnerProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 md:hidden">
      <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full text-center">
        {/* Spinner */}
        <div className="w-8 h-8 border-3 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
        
        {/* Message */}
        <p className="text-gray-700 text-sm">
          {message}
          <span className="inline-block w-6 text-left">{dots}</span>
        </p>
      </div>
    </div>
  );
}