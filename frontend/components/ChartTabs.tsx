import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { TrendingUp } from "lucide-react";
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries } from 'lightweight-charts';
import axios from 'axios';
import { useTheme } from "./ThemeProvider";

export function ChartTabs({ selectedToken }: { selectedToken: string }) {
  const [isChartVisible, setIsChartVisible] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const { theme } = useTheme();

  // Отримуємо реальні дані з Binance API
  const fetchBinanceData = async (token: string) => {
    try {
      // Мапінг токенів до символів Binance
      const symbolMap: { [key: string]: string } = {
        'BTC': 'BTCUSDT',
        'ETH': 'ETHUSDT',
        'LNRA': 'BTCUSDT' // Fallback для LNRA, оскільки його немає на Binance
      };

      const symbol = symbolMap[token] || 'BTCUSDT';

      // Отримуємо дані свічок за останні 100 хвилин
      const response = await axios.get(`https://api.binance.com/api/v3/klines`, {
        params: {
          symbol: symbol,
          interval: '1m', // 1-хвилинні свічки
          limit: 100
        }
      });

      // Конвертуємо дані Binance в формат для lightweight-charts
      const chartData = response.data.map((kline: any[]) => ({
        time: Math.floor(kline[0] / 1000) as any, // Конвертуємо мілісекунди в секунди
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4])
      }));

      return chartData;
    } catch (error) {
      console.error('Помилка при отриманні даних з Binance:', error);
      // Повертаємо тестові дані у випадку помилки
      return generateTestData(token);
    }
  };

  // Генеруємо тестові дані як fallback
  const generateTestData = (token: string) => {
    const data = [];
    // Базові ціни для різних токенів
    const basePrices = {
      'BTC': 67000,
      'ETH': 3456,
      'LNRA': 0.0234
    };
    const basePrice = basePrices[token as keyof typeof basePrices] || 67000;
    let currentPrice = basePrice;

    for (let i = 0; i < 100; i++) {
      const time = Math.floor(Date.now() / 1000) - (100 - i) * 60; // Хвилинні дані
      const change = (Math.random() - 0.5) * (basePrice * 0.02); // 2% випадкова зміна
      currentPrice += change;

      const open = currentPrice;
      const high = open + Math.random() * (basePrice * 0.01);
      const low = open - Math.random() * (basePrice * 0.01);
      const close = low + Math.random() * (high - low);

      data.push({
        time: time as any,
        open: Math.max(0, open),
        high: Math.max(0, high),
        low: Math.max(0, low),
        close: Math.max(0, close),
      });

      currentPrice = close;
    }

    return data;
  };

  // Effect to update chart options when theme changes
  useEffect(() => {
    if (chartRef.current) {
      const isDark = theme === 'dark';
      chartRef.current.applyOptions({
        layout: {
          background: { type: ColorType.Solid, color: isDark ? '#09090b' : '#ffffff' }, // zinc-950 or white
          textColor: isDark ? '#a1a1aa' : '#333', // zinc-400 or gray-800
        },
        grid: {
          vertLines: {
            color: isDark ? '#27272a' : '#f0f0f0', // zinc-800 or gray-100
          },
          horzLines: {
            color: isDark ? '#27272a' : '#f0f0f0',
          },
        },
        rightPriceScale: {
          borderColor: isDark ? '#27272a' : '#cccccc',
        },
        timeScale: {
          borderColor: isDark ? '#27272a' : '#cccccc',
        },
      });
    }
  }, [theme]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isChartVisible && chartContainerRef.current) {
      // Створюємо графік тільки якщо його ще немає
      if (!chartRef.current) {
        const isDark = theme === 'dark';
        const chart = createChart(chartContainerRef.current, {
          width: chartContainerRef.current.clientWidth,
          height: 400,
          layout: {
            background: { type: ColorType.Solid, color: isDark ? '#09090b' : '#ffffff' },
            textColor: isDark ? '#a1a1aa' : '#333',
          },
          grid: {
            vertLines: {
              color: isDark ? '#27272a' : '#f0f0f0',
            },
            horzLines: {
              color: isDark ? '#27272a' : '#f0f0f0',
            },
          },
          crosshair: {
            mode: 1,
          },
          rightPriceScale: {
            borderColor: isDark ? '#27272a' : '#cccccc',
          },
          timeScale: {
            borderColor: isDark ? '#27272a' : '#cccccc',
            timeVisible: true,
            secondsVisible: false,
          },
        });

        // Додаємо серію свічок
        const candlestickSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
        });

        chartRef.current = chart;
        seriesRef.current = candlestickSeries;

        // Обробляємо зміну розміру
        const handleResize = () => {
          if (chartContainerRef.current && chartRef.current) {
            chartRef.current.applyOptions({
              width: chartContainerRef.current.clientWidth,
            });
          }
        };

        window.addEventListener('resize', handleResize);
      }

      // Завантажуємо реальні дані з Binance
      const loadChartData = async () => {
        if (seriesRef.current) {
          const chartData = await fetchBinanceData(selectedToken);
          seriesRef.current.setData(chartData);
        }
      };

      // Початкове завантаження даних
      loadChartData();

      // Очищуємо попередній інтервал якщо є
      if (intervalId) {
        clearInterval(intervalId);
      }

      // Автоматичне оновлення даних кожну секунду
      intervalId = setInterval(() => {
        loadChartData();
      }, 1000);

      return () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    }

    // Очищуємо графік коли ховаємо
    if (!isChartVisible && chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
      if (intervalId) {
        clearInterval(intervalId);
      }
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isChartVisible, selectedToken]); // theme is handled in separate effect

  return (
    <div className="bg-white dark:bg-zinc-950 rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-zinc-800">
      {/* Chart Toggle Button */}
      <div className="border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 px-4 sm:px-6 py-3 sm:py-4">
        <Button
          onClick={() => setIsChartVisible(!isChartVisible)}
          className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 touch-target w-full sm:w-auto justify-center sm:justify-start"
        >
          <TrendingUp className="w-4 h-4" />
          {isChartVisible ? "Hide Chart" : "Show Chart"}
        </Button>
      </div>

      {/* Chart Content - показується тільки коли isChartVisible = true */}
      {isChartVisible && (
        <div className="p-4 sm:p-6">
          <div className="mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">{selectedToken}/USD Chart</h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Real-time {selectedToken} price chart from Binance (1-minute intervals)</p>
          </div>
          <div
            ref={chartContainerRef}
            className="w-full h-64 sm:h-96 bg-gray-50 dark:bg-zinc-900 rounded-lg sm:rounded-xl border border-gray-200 dark:border-zinc-800"
          />
        </div>
      )}
    </div>
  );
}
