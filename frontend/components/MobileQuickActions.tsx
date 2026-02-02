import { useState } from 'react';
import { TrendingUp, TrendingDown, Zap, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface MobileQuickActionsProps {
  onQuickBet?: (direction: 'UP' | 'DOWN', amount: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function MobileQuickActions({ onQuickBet, onRefresh, isLoading }: MobileQuickActionsProps) {
  const [quickAmount, setQuickAmount] = useState('10');
  const quickAmounts = ['5', '10', '25', '50', '100'];

  const handleQuickBet = (direction: 'UP' | 'DOWN') => {
    if (onQuickBet && quickAmount) {
      onQuickBet(direction, quickAmount);
    }
  };

  return (
    <div className="sm:hidden fixed bottom-20 left-4 right-4 z-30">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4">
        {/* Quick Amount Selection */}
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Quick Bet Amount (LNRA)</div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {quickAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => setQuickAmount(amount)}
                className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  quickAmount === amount
                    ? 'bg-red-100 text-red-700 border-2 border-red-300'
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                {amount}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={() => handleQuickBet('UP')}
            disabled={isLoading}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 touch-target active:scale-95"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            UP {quickAmount}
          </Button>
          
          <Button
            onClick={() => handleQuickBet('DOWN')}
            disabled={isLoading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 touch-target active:scale-95"
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            DOWN {quickAmount}
          </Button>
          
          <Button
            onClick={onRefresh}
            disabled={isLoading}
            variant="outline"
            size="icon"
            className="touch-target"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Lightning indicator */}
        <div className="flex items-center justify-center mt-3 text-xs text-gray-500">
          <Zap className="w-3 h-3 mr-1" />
          Quick Actions
        </div>
      </div>
    </div>
  );
}