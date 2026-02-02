import { TrendingUp, ExternalLink, MessageCircle, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-8 lg:mt-16">
      <div className="container mx-auto px-4 py-8 lg:py-12 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 lg:gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg lg:text-xl font-bold text-gray-800">Winza</h3>
                <p className="text-xs lg:text-sm text-gray-600">Crypto Prediction Game</p>
              </div>
            </div>
            <p className="text-sm lg:text-base text-gray-600 mb-4 max-w-md">
              Experience the thrill of cryptocurrency prediction with real-time BTC and ETH price movements. 
              Built on Linera blockchain for fast, secure transactions.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors touch-manipulation">
                <ExternalLink className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors touch-manipulation">
                <Mail className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors touch-manipulation">
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Game Info */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3 lg:mb-4 text-sm lg:text-base">Game Info</h4>
            <ul className="space-y-2 text-xs lg:text-sm text-gray-600">
              <li><a href="#" className="hover:text-gray-800 transition-colors touch-manipulation py-1 block">How to Play</a></li>
              <li><a href="#" className="hover:text-gray-800 transition-colors touch-manipulation py-1 block">Rules & Payouts</a></li>
              <li><a href="#" className="hover:text-gray-800 transition-colors touch-manipulation py-1 block">Game History</a></li>
              <li><a href="#" className="hover:text-gray-800 transition-colors touch-manipulation py-1 block">Statistics</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3 lg:mb-4 text-sm lg:text-base">Support</h4>
            <ul className="space-y-2 text-xs lg:text-sm text-gray-600">
              <li><a href="#" className="hover:text-gray-800 transition-colors touch-manipulation py-1 block">Help Center</a></li>
              <li><a href="#" className="hover:text-gray-800 transition-colors touch-manipulation py-1 block">Contact Us</a></li>
              <li><a href="#" className="hover:text-gray-800 transition-colors touch-manipulation py-1 block">Bug Reports</a></li>
              <li><a href="#" className="hover:text-gray-800 transition-colors touch-manipulation py-1 block">Feature Requests</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-6 lg:mt-8 pt-6 lg:pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-xs lg:text-sm text-gray-500 text-center md:text-left">
            © 2026 Winza. Built with Linera blockchain technology.
          </p>
          <div className="flex flex-wrap gap-4 lg:gap-6 mt-4 md:mt-0 justify-center md:justify-end">
            <a href="#" className="text-xs lg:text-sm text-gray-500 hover:text-gray-700 transition-colors touch-manipulation py-1">Privacy Policy</a>
            <a href="#" className="text-xs lg:text-sm text-gray-500 hover:text-gray-700 transition-colors touch-manipulation py-1">Terms of Service</a>
            <a href="#" className="text-xs lg:text-sm text-gray-500 hover:text-gray-700 transition-colors touch-manipulation py-1">Disclaimer</a>
          </div>
        </div>
      </div>
    </footer>
  );
}