const axios = require('axios')
const WebSocket = require('ws')
const config = require('./config')

config.loadEnv()

function extractChainId(endpointUrl) {
  const m = endpointUrl.match(/\/chains\/([^/]+)/)
  return m ? m[1] : null
}

function endpointToWsUrl(endpointUrl) {
  const m = endpointUrl.match(/^http:\/\/([^/]+)/)
  const host = m ? m[1] : null
  return host ? `ws://${host}/ws` : null
}

const LOTTERY_ENDPOINT = process.env.LOTTERY_HTTP || config.endpoints.LOTTERY
const LOTTERY_CHAIN_ID = extractChainId(LOTTERY_ENDPOINT)
const WS_URL = endpointToWsUrl(LOTTERY_ENDPOINT)

const BOT_ENDPOINT = process.env.LOTTERY_BOT_HTTP
const TARGET_OWNER = process.env.VITE_LOTTERY_TARGET_OWNER || process.env.LOTTERY_TARGET_OWNER
const BOT_OWNER = process.env.LOTTERY_BOT_OWNER

if (!BOT_ENDPOINT) throw new Error('LOTTERY_BOT_HTTP env is required')
if (!TARGET_OWNER) throw new Error('LOTTERY_TARGET_OWNER or VITE_LOTTERY_TARGET_OWNER env is required')
if (!BOT_OWNER) throw new Error('LOTTERY_BOT_OWNER env is required')

// State
let lastProcessedRoundId = -1
const pendingDelayed = new Set()
const placedRounds = new Set()
const buyInFlight = new Set()
let checkInProgress = false
let lastCheckTs = 0
const MIN_CHECK_INTERVAL_MS = 2000
let periodicTimer = null
const PERIODIC_CHECK_MS = 5000

// Logging
function now() { return new Date().toISOString() }
function log(...args) { console.log(`[${now()}] [bot-buy-tickets]`, ...args) }
function error(...args) { console.error(`[${now()}] [bot-buy-tickets]`, ...args) }
function trunc(s, n = 1000) { try { const t = String(s); return t.length > n ? t.slice(0, n) + '…' : t } catch { return '' } }

// Helper: Sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: Random Amount
function getRandomAmount() {
  // Generates a random number between 4 and 6 inclusive, formatted as a string with 2 decimal places?
  // The user asked for "random from 4 to 6".
  // "4." suggests it needs to be a string format Linera accepts.
  // Let's do integer or simple float string.
  // Range: [4, 6]
  const min = 4;
  const max = 6;
  const val = Math.floor(Math.random() * (max - min + 1)) + min; 
  return `${val}.`; // e.g., "4.", "5.", "6."
}

// GraphQL Helper
async function executeQuery(endpoint, query) {
  const q = String(query)
  log('POST', endpoint, 'size=' + q.length)
  try {
    const res = await axios.post(endpoint, { query }, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      timeout: 10000,
      validateStatus: () => true
    })
    log('HTTP', res.status, res.statusText)
    const raw = res?.data
    if (res.status >= 400) {
      error('HTTP error payload=', trunc(JSON.stringify(raw)))
      const msg = raw?.error ? JSON.stringify(raw.error) : raw?.errors ? JSON.stringify(raw.errors) : res.statusText
      throw new Error('HTTP ' + res.status + ' ' + msg)
    }
    if (raw?.error) {
      error('error field present:', trunc(JSON.stringify(raw.error)))
      throw new Error(JSON.stringify(raw.error))
    }
    if (raw?.errors) {
      error('GraphQL errors:', trunc(JSON.stringify(raw.errors)))
      throw new Error(JSON.stringify(raw.errors))
    }
    const data = raw?.data || {}
    const keys = Object.keys(data)
    log('RESPONSE keys=' + keys.join(',') + ' size=' + JSON.stringify(data).length)
    log('RESPONSE preview=', trunc(JSON.stringify(raw)))
    return data
  } catch (e) {
    error('POST failed:', e?.message || e)
    throw new Error(e?.message || 'Unknown error')
  }
}

// Fetch Active Round
async function getActiveRound() {
  const query = `query { allRounds { id status } }`
  try {
    const data = await executeQuery(LOTTERY_ENDPOINT, query)
    const rounds = data?.allRounds || []
    log('allRounds count=', rounds.length)
    const activeRound = rounds
      .filter(r => String(r.status).toUpperCase() === 'ACTIVE')
      .sort((a, b) => Number(b.id) - Number(a.id))[0]
    if (activeRound) {
      log('activeRound id=' + activeRound.id, 'status=' + activeRound.status)
    } else {
      log('no ACTIVE round found')
    }
    return activeRound || null
  } catch (e) {
    error('Failed to fetch active round:', e.message)
    return null
  }
}

// Buy Tickets Mutation with Retry
async function buyTickets(roundId) {
  const amount = getRandomAmount()
  const opId = `${roundId}-${Date.now()}`
  const mutation = `
    mutation {
      transfer(
        owner: "${BOT_OWNER}",
        amount: "${amount}",
        targetAccount: {
          chainId: "${LOTTERY_CHAIN_ID}",
          owner: "${TARGET_OWNER}"
        },
        purchaseTickets: true
      )
    }
  `
  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log('opId=' + opId, 'round=' + roundId, 'amount=' + amount, 'attempt=' + attempt + '/' + maxRetries)
      log('mutation preview=', trunc(mutation, 300))
      const res = await executeQuery(BOT_ENDPOINT, mutation)
      const keys = Object.keys(res || {})
      if (keys.length === 0) {
        throw new Error('Empty response')
      }
      log('mutation success opId=' + opId, 'keys=' + keys.join(','))
      return true
    } catch (e) {
      error('mutation failed opId=' + opId, e?.message || e)
      if (attempt < maxRetries) {
        const delay = 2000 * attempt
        log('retry in', delay + 'ms')
        await sleep(delay)
      } else {
        error('mutation final failure opId=' + opId)
        return false
      }
    }
  }
}

function scheduleDelayed(roundId) {
  if (pendingDelayed.has(roundId)) {
    log('delayed retries already scheduled for round', roundId)
    return
  }
  pendingDelayed.add(roundId)
  setTimeout(async () => {
    try {
      const active = await getActiveRound()
      if (!active || Number(active.id) !== Number(roundId)) {
        log('skip delayed retries, active changed or not found', roundId)
        return
      }
      if (placedRounds.has(roundId)) { log('skip delayed: already placed', roundId); return }
      if (buyInFlight.has(roundId)) { log('skip delayed: buy in-flight', roundId); return }
      log('starting delayed retries for round', roundId)
      buyInFlight.add(roundId)
      const ok = await buyTickets(roundId)
      buyInFlight.delete(roundId)
      if (ok) {
        log('delayed retries succeeded for round', roundId)
        placedRounds.add(roundId)
        lastProcessedRoundId = roundId
      } else {
        error('delayed retries failed for round', roundId)
      }
    } catch (e) {
      error('delayed retry error for round ' + roundId, e?.message || e)
    } finally {
      pendingDelayed.delete(roundId)
    }
  }, 60000)
}

// Check and Buy Logic
async function checkAndBuy() {
  if (checkInProgress) { log('check skipped: in progress'); return }
  const now = Date.now()
  if (now - lastCheckTs < MIN_CHECK_INTERVAL_MS) { log('check skipped: throttled'); return }
  lastCheckTs = now
  checkInProgress = true
  try {
    const activeRound = await getActiveRound()
    if (!activeRound) { log('no active round to process'); return }
    const roundId = Number(activeRound.id)
    if (placedRounds.has(roundId)) { log('already placed for round', roundId); return }
    if (buyInFlight.has(roundId)) { log('buy already in-flight for round', roundId); return }
    if (roundId <= lastProcessedRoundId) { log('active round already processed or older', roundId); return }
    log('new active round', roundId, 'lastProcessed=', lastProcessedRoundId)
    buyInFlight.add(roundId)
    try {
      const ok = await buyTickets(roundId)
      if (ok) {
        placedRounds.add(roundId)
        lastProcessedRoundId = roundId
      } else {
        scheduleDelayed(roundId)
      }
    } finally {
      buyInFlight.delete(roundId)
    }
  } finally {
    checkInProgress = false
  }
}

// WebSocket Connection
function connectWs() {
  let ws
  let reconnectTimer

  function connect() {
    ws = new WebSocket(WS_URL, 'graphql-transport-ws')
    
    ws.onopen = () => {
      log('ws open', WS_URL)
      ws.send(JSON.stringify({ type: 'connection_init' }))
      log('connection_init sent')
    }

    ws.onmessage = async (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.type === 'connection_ack') {
        log('connection_ack')
        ws.send(JSON.stringify({
          id: 'bot_subscription',
          type: 'subscribe',
          payload: { query: `subscription { notifications(chainId: "${LOTTERY_CHAIN_ID}") }` }
        }))
        log('subscribed notifications chainId=' + LOTTERY_CHAIN_ID)
        checkAndBuy()
      } else if (msg.type === 'next') {
        log('ws next event received')
        checkAndBuy()
      } else {
        log('ws message type=', msg.type)
      }
    }

    ws.onclose = (code, reason) => {
      log('ws closed code=' + code + ' reason=' + (reason || ''))
      clearTimeout(reconnectTimer)
      reconnectTimer = setTimeout(connect, 5000)
    }

    ws.onerror = (err) => {
      error('ws error:', err?.message || err)
      ws.close()
    }
  }

  connect()
  if (!periodicTimer) {
    periodicTimer = setInterval(() => { try { checkAndBuy() } catch {} }, PERIODIC_CHECK_MS)
  }
}

// Start
log('Starting bot...')
connectWs()
