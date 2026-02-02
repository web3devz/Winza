/**
 * Конфігурація для Linera Prediction Game Orchestrator
 */
const fs = require('fs')
const path = require('path')

function loadEnv() {
  const dirs = [__dirname, path.resolve(__dirname, '..')]
  const files = ['.env', '.env.local']
  for (const dir of dirs) {
    for (const name of files) {
      const p = path.join(dir, name)
      if (fs.existsSync(p)) {
        const text = fs.readFileSync(p, 'utf8')
        for (const line of text.split(/\r?\n/)) {
          const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
          if (m) {
            const k = m[1]
            const v = m[2].replace(/^"|"$/g, '')
            if (!process.env[k]) process.env[k] = v
          }
        }
      }
    }
  }
  const keys = Object.keys(process.env)
  function expand(str) {
    let out = String(str)
    const re = /\$\{([A-Z0-9_]+)\}/g
    for (let i = 0; i < 3; i++) {
      let changed = false
      out = out.replace(re, (_, k) => {
        const val = process.env[k] || ''
        changed = true
        return val
      })
      if (!changed) break
    }
    return out
  }
  for (const k of keys) {
    const v = process.env[k]
    if (typeof v === 'string' && v.includes('${')) {
      process.env[k] = expand(v)
    }
  }
}

function cleanEndpoint(s) {
  return String(s || '').replace(/\s+/g, '')
}

const endpoints = {}
Object.defineProperties(endpoints, {
  BTC: { enumerable: true, get() { const v = process.env.BTC_HTTP || process.env.VITE_BTC_ENDPOINT; return cleanEndpoint(v) } },
  ETH: { enumerable: true, get() { const v = process.env.ETH_HTTP || process.env.VITE_ETH_ENDPOINT; return cleanEndpoint(v) } },
  LOTTERY: { enumerable: true, get() { const v = process.env.LOTTERY_HTTP || process.env.VITE_LOTTERY_ENDPOINT; return cleanEndpoint(v) } },
  LEADERBOARD_BTC: { enumerable: true, get() { const v = process.env.LEADERBOARD_BTC_HTTP || process.env.VITE_LEADERBOARD_BTC_ENDPOINT || process.env.LEADERBOARD_HTTP || process.env.VITE_LEADERBOARD_ENDPOINT; return cleanEndpoint(v) } },
  LEADERBOARD_ETH: { enumerable: true, get() { const v = process.env.LEADERBOARD_ETH_HTTP || process.env.VITE_LEADERBOARD_ETH_ENDPOINT || process.env.LEADERBOARD_HTTP || process.env.VITE_LEADERBOARD_ENDPOINT; return cleanEndpoint(v) } },
})

module.exports = {
  loadEnv,
  // Ендпоінти Linera applications
  endpoints,

  // Налаштування часу
  timing: {
    // Інтервал між циклами (мілісекунди)
    intervalMs: 5 * 60 * 1000,

    // Затримка між мутаціями resolveRound та closeRound (мілісекунди)
    mutationDelayMs: 400,

    // Таймаут для HTTP запитів (мілісекунди)
    httpTimeoutMs: 10000
  },

  

  // Налаштування Binance API
  binance: {
    baseUrl: 'https://api.binance.com/api/v3',
    symbols: {
      BTC: 'BTCUSDT',
      ETH: 'ETHUSDT'
    },
    // Fallback ціни у випадку помилки API
    fallbackPrices: {
      BTC: 67000,
      ETH: 3400
    }
  },

  // Налаштування логування
  logging: {
    // Показувати детальні логи
    verbose: true,

    // Показувати емодзі в логах
    useEmojis: true,

    // Логувати помилки в файл
    logErrorsToFile: false,

    // Шлях до файлу логів (якщо logErrorsToFile = true)
    errorLogPath: './orchestrator-errors.log'
  },

  // Налаштування для розробки/тестування
  development: {
    // Швидкий режим для тестування (кожні 30 секунд)
    fastMode: false,
    fastModeIntervalMs: 30 * 1000,

    // Використовувати тестові ціни замість Binance API
    useTestPrices: false,
    testPrices: {
      BTC: 67234.56,
      ETH: 3456.78
    }
  }
}
