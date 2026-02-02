import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface MobileFeedbackProps {
  type: 'success' | 'error' | 'warning' | 'loading';
  message: string;
  isVisible: boolean;
  onClose?: () => void;
  duration?: number;
}

export function MobileFeedback({ 
  type, 
  message, 
  isVisible, 
  onClose, 
  duration = 3000 
}: MobileFeedbackProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      if (type !== 'loading' && duration > 0) {
        const timer = setTimeout(() => {
          setShow(false);
          setTimeout(() => onClose?.(), 300);
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      setShow(false);
    }
  }, [isVisible, type, duration, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-6 h-6 text-yellow-600" />;
      case 'loading':
        return <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'loading':
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="sm:hidden fixed top-20 left-4 right-4 z-50">
      <div className={`
        ${getBackgroundColor()}
        border rounded-xl p-4 shadow-lg
        transform transition-all duration-300 ease-out
        ${show ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95'}
      `}>
        <div className="flex items-center gap-3">
          {getIcon()}
          <p className="text-gray-800 font-medium flex-1">{message}</p>
          {type !== 'loading' && onClose && (
            <button
              onClick={() => {
                setShow(false);
                setTimeout(() => onClose(), 300);
              }}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}