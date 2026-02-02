const axios = require('axios');
const config = require('./config');

config.loadEnv();

// Отримуємо конфігурацію
let BTC_ENDPOINT = config.endpoints.BTC;
let ETH_ENDPOINT = config.endpoints.ETH;
const ROUNDS_APP_ID = process.env.ROUNDS || process.env.ROUNDS_APP_ID || '';

function overrideApplicationId(endpoint, appId) {
  try {
    const i = endpoint.indexOf('/applications/');
    if (i === -1) return endpoint;
    const base = endpoint.substring(0, i + '/applications/'.length);
    return base + String(appId);
  } catch { return endpoint; }
}

if (ROUNDS_APP_ID && ROUNDS_APP_ID.length > 0) {
  BTC_ENDPOINT = overrideApplicationId(BTC_ENDPOINT, ROUNDS_APP_ID);
  ETH_ENDPOINT = overrideApplicationId(ETH_ENDPOINT, ROUNDS_APP_ID);
}
const INTERVAL_MS = config.development.fastMode ? config.development.fastModeIntervalMs : config.timing.intervalMs;
const MUTATION_DELAY_MS = config.timing.mutationDelayMs;
const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 5000;

/**
 * Отримує поточну ціну з Binance API
 * @param {string} symbol - Символ криптовалюти (BTCUSDT, ETHUSDT)
 * @returns {Promise<number>} - Поточна ціна
 */
async function getCurrentPrice(symbol) {
  // Якщо увімкнений режим тестових цін
  if (config.development.useTestPrices) {
    const currency = symbol === 'BTCUSDT' ? 'BTC' : 'ETH';
    return config.development.testPrices[currency];
  }

  try {
    const response = await axios.get(`${config.binance.baseUrl}/ticker/price?symbol=${symbol}`, {
      timeout: config.timing.httpTimeoutMs
    });
    return parseFloat(response.data.price);
  } catch (error) {
    if (config.logging.verbose) {
      console.error(`Помилка при отриманні ціни для ${symbol}:`, error.message);
    }
    // Повертаємо fallback ціни з конфігурації
    const currency = symbol === 'BTCUSDT' ? 'BTC' : 'ETH';
    return config.binance.fallbackPrices[currency];
  }
}

/**
 * Виконує GraphQL мутацію
 * @param {string} endpoint - URL ендпоінту
 * @param {string} mutation - GraphQL мутація
 * @returns {Promise<Object>} - Результат мутації
 */
async function executeMutation(endpoint, mutation) {
  try {
    const response = await axios.post(endpoint, {
      query: mutation
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: config.timing.httpTimeoutMs
    });

    if (!response.data) {
      throw new Error('Порожня відповідь від сервера');
    }

    if (response.data.errors) {
      throw new Error(`GraphQL помилки: ${JSON.stringify(response.data.errors)}`);
    }

    return response.data;
  } catch (error) {
    if (config.logging.verbose) {
      console.error(`Помилка виконання мутації на ${endpoint}:`, error.message);
    }
    throw error;
  }
}

function emojiFor(name) {
  const e = config.logging.useEmojis;
  if (!e) return `[${name.toUpperCase()}]`;
  if (name === 'resolveRound') return '📊';
  if (name === 'closeRound') return '🔒';
  return '🔧';
}

async function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

async function tryMutation(endpoint, name, mutation, retries, delayMs, currency) {
  for (let i = 1; i <= retries; i++) {
    try {
      console.log(`${emojiFor(name)} ${name} для ${currency} спроба ${i}/${retries}...`);
      const res = await executeMutation(endpoint, mutation);
      const val = res.data?.[name] || 'OK';
      console.log(`${config.logging.useEmojis ? '✅' : '[SUCCESS]'} ${name} для ${currency}:`, val);
      return { ok: true, res };
    } catch (e) {
      console.log(`${config.logging.useEmojis ? '⚠️' : '[WARN]'} ${name} помилка для ${currency}:`, e?.message || e);
      if (i < retries) { await delay(delayMs) }
    }
  }
  return { ok: false };
}

async function performWithFallback(endpoint, primaryName, primaryMutation, secondaryName, secondaryMutation, retries, delayMs, currency) {
  const a = await tryMutation(endpoint, primaryName, primaryMutation, retries, delayMs, currency);
  if (a.ok) return { which: 'primary', res: a.res };
  const b = await tryMutation(endpoint, secondaryName, secondaryMutation, retries, delayMs, currency);
  if (b.ok) return { which: 'secondary', res: b.res };
  return { which: null };
}

/**
 * Виконує цикл мутацій для одного ендпоінту
 * @param {string} endpoint - URL ендпоінту
 * @param {string} currency - Назва валюти (BTC або ETH)
 * @param {string} symbol - Символ для Binance API
 */
async function processCurrency(endpoint, currency, symbol) {
  try {
    const emoji = config.logging.useEmojis;
    console.log(`${emoji ? '\n🔄' : '\n[PROCESS]'} Обробка ${currency}...`);
    
    // Отримуємо поточну ціну
    const currentPrice = await getCurrentPrice(symbol);
    console.log(`${emoji ? '💰' : '[PRICE]'} Поточна ціна ${currency}: $${currentPrice.toFixed(2)}`);

    // Якщо немає активного раунду — відкриваємо новий
    const active = await getActiveRound(endpoint);
    if (!active) {
      const openMutation = `mutation { openRound }`;
      console.log(`${emoji ? '🟢' : '[OPEN]'} Виконуємо openRound для ${currency}...`);
      try {
        const openRes = await executeMutation(endpoint, openMutation);
        console.log(`${emoji ? '✅' : '[SUCCESS]'} openRound для ${currency}:`, openRes.data?.openRound || 'OK');
      } catch (e) {
        console.log(`${emoji ? '⚠️' : '[WARN]'} openRound пропущено/помилка для ${currency}:`, e?.message || e);
      }
      await new Promise(resolve => setTimeout(resolve, MUTATION_DELAY_MS));
    }

    const resolveMutation = `
      mutation {
        resolveRound(resolutionPrice: "${currentPrice}")
      }
    `;

    const closeMutation = `
      mutation {
        closeRound(closingPrice: "${currentPrice}")
      }
    `;

    await performWithFallback(endpoint, 'resolveRound', resolveMutation, 'closeRound', closeMutation, RETRY_COUNT, RETRY_DELAY_MS, currency);

    await delay(MUTATION_DELAY_MS);

    await performWithFallback(endpoint, 'closeRound', closeMutation, 'resolveRound', resolveMutation, RETRY_COUNT, RETRY_DELAY_MS, currency);

    // 3. Після закриття — відкриваємо новий раунд, якщо потрібен
    const againActive = await getActiveRound(endpoint);
    if (!againActive) {
      const openMutation2 = `mutation { openRound }`;
      console.log(`${emoji ? '🟢' : '[OPEN]'} Відкриваємо новий раунд для ${currency}...`);
      try {
        const openRes2 = await executeMutation(endpoint, openMutation2);
        console.log(`${emoji ? '✅' : '[SUCCESS]'} openRound (post-close) для ${currency}:`, openRes2.data?.openRound || 'OK');
      } catch (e) {
        console.log(`${emoji ? '⚠️' : '[WARN]'} openRound (post-close) пропущено/помилка для ${currency}:`, e?.message || e);
      }
    }

  } catch (error) {
    const emoji = config.logging.useEmojis;
    console.error(`${emoji ? '❌' : '[ERROR]'} Помилка при обробці ${currency}:`, error.message);
  }
}

/**
 * Основний цикл оркестратора
 */
async function orchestratorCycle() {
  const timestamp = new Date().toLocaleString('uk-UA');
  const emoji = config.logging.useEmojis;
  
  console.log(`${emoji ? '\n🚀' : '\n[START]'} Запуск циклу оркестратора: ${timestamp}`);
  console.log('=' .repeat(60));

  try {
    // Обробляємо BTC та ETH паралельно
    await Promise.all([
      processCurrency(BTC_ENDPOINT, 'BTC', config.binance.symbols.BTC),
      processCurrency(ETH_ENDPOINT, 'ETH', config.binance.symbols.ETH)
    ]);

    console.log(`${emoji ? '\n✨' : '\n[COMPLETE]'} Цикл завершено успішно: ${new Date().toLocaleString('uk-UA')}`);
  } catch (error) {
    console.error(`${emoji ? '❌' : '[CRITICAL_ERROR]'} Критична помилка в циклі оркестратора:`, error.message);
  }

  console.log('=' .repeat(60));
  console.log(`${emoji ? '⏰' : '[NEXT]'} Наступний цикл через ${INTERVAL_MS / 1000 / 60} хвилин...`);
}

/**
 * Запуск оркестратора
 */
async function startOrchestrator() {
  const emoji = config.logging.useEmojis;
  
  console.log(`${emoji ? '🎯' : '[INIT]'} Запуск Linera Prediction Game Orchestrator`);
  console.log(`${emoji ? '📡' : '[CONFIG]'} BTC Endpoint: ${BTC_ENDPOINT}`);
  console.log(`${emoji ? '📡' : '[CONFIG]'} ETH Endpoint: ${ETH_ENDPOINT}`);
  if (ROUNDS_APP_ID && ROUNDS_APP_ID.length > 0) {
    console.log(`${emoji ? '🧩' : '[CONFIG]'} Використовується ROUNDS AppId: ${ROUNDS_APP_ID}`);
  }
  console.log(`${emoji ? '⏱️' : '[CONFIG]'} Інтервал: ${INTERVAL_MS / 1000 / 60} хвилин`);
  console.log(`${emoji ? '⚡' : '[CONFIG]'} Затримка між мутаціями: ${MUTATION_DELAY_MS}мс`);
  
  if (config.development.fastMode) {
    console.log(`${emoji ? '🚀' : '[DEV]'} УВАГА: Увімкнений швидкий режим розробки!`);
  }
  
  if (config.development.useTestPrices) {
    console.log(`${emoji ? '🧪' : '[TEST]'} УВАГА: Використовуються тестові ціни!`);
  }
  
  console.log(`${emoji ? '🔄' : '[STATUS]'} Оркестратор працює в нескінченному циклі...\n`);

  // Виконуємо перший цикл одразу
  await orchestratorCycle();

  // Встановлюємо інтервал для наступних циклів
  setInterval(orchestratorCycle, INTERVAL_MS);
}

// Обробка сигналів завершення
process.on('SIGINT', () => {
  const emoji = config.logging.useEmojis;
  console.log(`${emoji ? '\n🛑' : '\n[STOP]'} Отримано сигнал SIGINT. Зупинка оркестратора...`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  const emoji = config.logging.useEmojis;
  console.log(`${emoji ? '\n🛑' : '\n[STOP]'} Отримано сигнал SIGTERM. Зупинка оркестратора...`);
  process.exit(0);
});

// Запуск оркестратора
if (require.main === module) {
  startOrchestrator().catch(error => {
    console.error('💥 Критична помилка при запуску оркестратора:', error);
    process.exit(1);
  });
}

module.exports = {
  startOrchestrator,
  getCurrentPrice,
  executeMutation,
  processCurrency
};
async function executeQuery(endpoint, query) {
  const response = await axios.post(endpoint, { query }, { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, timeout: config.timing.httpTimeoutMs });
  if (response.data?.errors) {
    throw new Error(`GraphQL помилки: ${JSON.stringify(response.data.errors)}`);
  }
  return response.data?.data || {};
}

async function getActiveRound(endpoint) {
  const q = `query { allRounds { id status } }`;
  const data = await executeQuery(endpoint, q);
  const rounds = data?.allRounds || [];
  const active = rounds.filter(r => String(r.status).toUpperCase() === 'ACTIVE').sort((a,b) => Number(b.id) - Number(a.id))[0];
  return active || null;
}
