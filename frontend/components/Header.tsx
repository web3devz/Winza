import { TrendingUp, Wallet, RefreshCw, ChevronDown, Plus, Minus, Ticket, Sun, Moon, Trophy } from "lucide-react";
import { Button } from "./ui/button";
import { useLinera } from "./LineraProvider";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "./ThemeProvider";

interface HeaderProps {
  gameMode: 'prediction' | 'lottery' | 'leaderboard';
  setGameMode: (mode: 'prediction' | 'lottery' | 'leaderboard') => void;
}

export function Header({ gameMode, setGameMode }: HeaderProps) {
  const {
    balance,
    loading,
    accountOwner,
    refreshBalance,
    application,
    status,
    connectWallet,
    claimEnabled,
    pendingBundles,
    claimChainBalance,
    markBundlesClaimed,
    hasClaimed
  } = useLinera();
  const { theme, setTheme } = useTheme();
  const [isConnecting, setIsConnecting] = useState(false);
  const connected = !!accountOwner && status === 'Ready';
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [chainBalance, setChainBalance] = useState<string>("0");
  const [mintAmount, setMintAmount] = useState<string>("");
  const [isMinting, setIsMinting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showMintInput, setShowMintInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isClaiming, setIsClaiming] = useState(false);


  // Закриваємо dropdown при кліку поза ним
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setShowMintInput(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle opening notifications - mark as read if needed

  // Запитуємо chainBalance при відкритті dropdown
  useEffect(() => {
    if (isDropdownOpen) {
      queryChainBalance();
    }
  }, [isDropdownOpen, application, accountOwner]);

  // Функція для запиту chainBalance
  const queryChainBalance = async () => {
    if (!application || !accountOwner) return;

    try {
      const query = `
        query {
          accounts {
            entry(key: "${accountOwner}") {
              value
            }
            chainBalance
          }
        }
      `;

      const result = await application.query(JSON.stringify({ query }));
      const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
      const chainBal = parsedResult?.data?.accounts?.chainBalance || "0";
      setChainBalance(chainBal);
    } catch (error) {
      console.error('Chain balance query error:', error);
      setChainBalance("0");
    }
  };

  // Функція для mint
  const handleMint = async () => {
    if (!application || !accountOwner || !mintAmount) return;

    setIsMinting(true);
    try {
      const mutation = `
        mutation {
          mint(
            owner: "${accountOwner}",
            amount: "${mintAmount}"
          )
        }
      `;

      await application.query(JSON.stringify({ query: mutation }));
      if (refreshBalance) {
        await refreshBalance();
      }
      await queryChainBalance();
      setMintAmount("");
      setShowMintInput(false);
      if (markBundlesClaimed) {
        markBundlesClaimed();
      }
    } catch (error) {
      console.error('Mint error:', error);
    } finally {
      setIsMinting(false);
    }
  };

  // Функція для withdraw
  const handleWithdraw = async () => {
    if (!application) return;

    setIsWithdrawing(true);
    try {
      const mutation = `
        mutation {
          withdraw
        }
      `;

      await application.query(JSON.stringify({ query: mutation }));
      if (refreshBalance) {
        await refreshBalance();
      }
      await queryChainBalance();
      if (markBundlesClaimed) {
        markBundlesClaimed();
      }
    } catch (error) {
      console.error('Withdraw error:', error);
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Форматування балансу для відображення
  const formatBalance = (balance?: string) => {
    if (!balance) return "0.0000";
    const numBalance = parseFloat(balance);
    return numBalance.toFixed(4);
  };

  // Функція для ручного оновлення балансу
  const handleRefreshBalance = async () => {
    console.log('handleRefreshBalance called');
    console.log('refreshBalance function:', refreshBalance);
    console.log('isRefreshing:', isRefreshing);

    if (!refreshBalance || isRefreshing) {
      console.log('Refresh blocked - no function or already refreshing');
      return;
    }

    setIsRefreshing(true);
    try {
      console.log('Calling refreshBalance...');
      await refreshBalance();
      console.log('refreshBalance completed');
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <header className="bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 shadow-sm sticky top-0 z-40 transition-colors duration-300">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Winza Title with Logo */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
              <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white">Winza</h1>
            </div>

            {/* Game Mode Switcher */}
            <div className="flex bg-gray-100 dark:bg-zinc-900 p-1 rounded-lg ml-2">
              <button
                onClick={() => setGameMode('prediction')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${gameMode === 'prediction'
                  ? 'bg-white dark:bg-zinc-800 shadow-sm text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <TrendingUp className="w-3 h-3" />
                <span className="hidden sm:inline">Prediction</span>
              </button>
              <button
                onClick={() => setGameMode('lottery')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${gameMode === 'lottery'
                  ? 'bg-white dark:bg-zinc-800 shadow-sm text-red-600 dark:text-red-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <Ticket className="w-3 h-3" />
                <span className="hidden sm:inline">Lottery</span>
                <span className="sm:hidden">Lotto</span>
              </button>
              <button
                onClick={() => setGameMode('leaderboard')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${gameMode === 'leaderboard'
                  ? 'bg-white dark:bg-zinc-800 shadow-sm text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <Trophy className="w-3 h-3" />
                <span className="hidden sm:inline">Leaderboard</span>
                <span className="sm:hidden">Leaders</span>
              </button>
            </div>
          </div>

          {/* Right side - Actions and Wallet */}
          <div className="flex items-center gap-2 sm:gap-4">

            {/* Connect Wallet Button (shown when not connected) */}
            {!connected && (
              <Button
                onClick={async () => {
                  if (!connectWallet || isConnecting) return;
                  setIsConnecting(true);
                  try {
                    await connectWallet();
                  } finally {
                    setIsConnecting(false);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={isConnecting || loading}
              >
                {isConnecting || loading ? 'Connecting...' : 'Connect Wallet'}
              </Button>
            )}

            {/* Notifications & Wallet Dropdown */}
            {connected && (
              <div className="flex items-center gap-3">
                {/* Claim Button */}
                <div className="relative">
                  <button
                    onClick={async () => {
                      if (!claimChainBalance || isClaiming || !claimEnabled) return;
                      setIsClaiming(true);
                      try {
                        await claimChainBalance();
                      } finally {
                        setIsClaiming(false);
                      }
                    }}
                    disabled={!claimEnabled || isClaiming}
                    className={`
                      relative flex items-center justify-center px-4 h-10 rounded-full font-medium text-sm transition-all duration-200
                      ${claimEnabled
                        ? 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg active:scale-95'
                        : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 cursor-not-allowed border border-gray-200 dark:border-zinc-700'
                      }
                    `}
                  >
                    {isClaiming ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>{hasClaimed && !claimEnabled ? 'Claimed' : 'Claim'}</span>
                    )}
                  </button>

                  {(pendingBundles || 0) > 0 && claimEnabled && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 rounded-full ring-2 ring-white dark:ring-zinc-950 bg-red-500 text-[10px] font-bold text-white shadow-sm animate-bounce">
                      {(pendingBundles || 0) > 9 ? '9+' : (pendingBundles || 0)}
                    </span>
                  )}
                </div>


                {/* Wallet Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <div
                    className={`
                      flex items-center gap-3 px-4 h-10 rounded-full cursor-pointer transition-all duration-200 border
                      ${isDropdownOpen
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 ring-2 ring-red-100 dark:ring-red-900/30'
                        : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 hover:border-red-200 dark:hover:border-red-800 hover:bg-red-50/50 dark:hover:bg-red-900/10'
                      }
                    `}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                      <Wallet className="w-3.5 h-3.5" />
                    </div>

                    <div className="hidden sm:flex flex-col items-start">
                      <div className="text-gray-900 dark:text-gray-100 text-sm font-semibold leading-none mb-0.5">
                        {loading ? "..." : `${formatBalance(balance)} LNRA`}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-none">
                        {accountOwner ? `${accountOwner.slice(0, 6)}...${accountOwner.slice(-4)}` : "WALLET"}
                      </div>
                    </div>

                    <div className="sm:hidden">
                      <div className="text-gray-900 dark:text-gray-100 text-xs font-semibold">
                        {loading ? "..." : formatBalance(balance)}
                      </div>
                    </div>

                    <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-red-500' : ''}`} />
                  </div>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in-95 duration-100">
                      <div className="p-5">
                        {/* Balances */}
                        <div className="space-y-3 mb-5">
                          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-100 dark:border-zinc-800">
                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Owner Balance</span>
                            <span className="font-bold text-gray-900 dark:text-white">{formatBalance(balance)} LNRA</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-100 dark:border-zinc-800">
                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Chain Balance</span>
                            <span className="font-bold text-gray-900 dark:text-white">{formatBalance(chainBalance)} LNRA</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {/* Mint Section */}
                          <div>
                            {!showMintInput ? (
                              <Button
                                onClick={() => setShowMintInput(true)}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium h-10 rounded-lg shadow-sm"
                                disabled={isMinting}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Mint Tokens
                              </Button>
                            ) : (
                              <div className="space-y-2 bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-gray-200 dark:border-zinc-800">
                                <input
                                  type="number"
                                  value={mintAmount}
                                  onChange={(e) => setMintAmount(e.target.value)}
                                  placeholder="Amount"
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                  <Button
                                    onClick={handleMint}
                                    disabled={isMinting || !mintAmount}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                                  >
                                    {isMinting ? "Minting..." : "Confirm"}
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setShowMintInput(false);
                                      setMintAmount("");
                                    }}
                                    variant="outline"
                                    className="flex-1 h-8 text-xs bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Withdraw Button */}
                          <Button
                            onClick={handleWithdraw}
                            disabled={isWithdrawing}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium h-10 rounded-lg shadow-sm"
                          >
                            <Minus className="w-4 h-4 mr-2" />
                            {isWithdrawing ? "Withdrawing..." : "Withdraw"}
                          </Button>

                          {/* Refresh Balance Button */}
                          <Button
                            onClick={handleRefreshBalance}
                            disabled={isRefreshing || loading}
                            variant="outline"
                            className="w-full h-10 rounded-lg border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-600 dark:text-gray-400"
                          >
                            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? "Refreshing..." : "Refresh Balance"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Theme Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="ml-2 rounded-full w-9 h-9 border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
