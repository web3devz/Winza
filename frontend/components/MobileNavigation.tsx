import { useState } from 'react';
import { Menu, X, Home, TrendingUp, Wallet, Settings, Clock } from 'lucide-react';
import { Button } from './ui/button';

interface MobileNavigationProps {
  currentTime?: string;
  timezone?: string;
}

export function MobileNavigation({ currentTime, timezone }: MobileNavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      {/* Mobile Menu Button - Fixed position */}
      <div className="sm:hidden fixed bottom-4 right-4 z-50">
        <Button
          onClick={toggleMenu}
          className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/25 touch-target"
          size="icon"
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="sm:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={toggleMenu} />
      )}

      {/* Mobile Menu Panel */}
      <div className={`sm:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-40 transform transition-transform duration-300 ${
        isMenuOpen ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <div className="p-6">
          {/* Handle bar */}
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6"></div>
          
          {/* Menu Items */}
          <div className="space-y-4">
            {/* Time Display */}
            {currentTime && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Clock className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="text-gray-800 font-medium">{currentTime}</div>
                  {timezone && <div className="text-xs text-gray-500">{timezone}</div>}
                </div>
              </div>
            )}

            {/* Navigation Items */}
            <button className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 rounded-xl transition-colors touch-target">
              <Home className="w-5 h-5 text-gray-600" />
              <span className="text-gray-800 font-medium">Home</span>
            </button>

            <button className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 rounded-xl transition-colors touch-target">
              <TrendingUp className="w-5 h-5 text-gray-600" />
              <span className="text-gray-800 font-medium">Markets</span>
            </button>

            <button className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 rounded-xl transition-colors touch-target">
              <Wallet className="w-5 h-5 text-gray-600" />
              <span className="text-gray-800 font-medium">Wallet</span>
            </button>

            <button className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 rounded-xl transition-colors touch-target">
              <Settings className="w-5 h-5 text-gray-600" />
              <span className="text-gray-800 font-medium">Settings</span>
            </button>
          </div>

          {/* Close Button */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <Button
              onClick={toggleMenu}
              variant="outline"
              className="w-full touch-target"
            >
              Close Menu
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}