const axios = require('axios')
const WebSocket = require('ws')
const config = require('./config')

config.loadEnv()

let LOTTERY_HTTP = config.endpoints.LOTTERY
const overrideApplicationId = (endpoint, appId) => {
  try {
    const i = endpoint.indexOf('/applications/')
    if (i === -1) return endpoint
    const base = endpoint.substring(0, i + '/applications/'.length)
    return base + String(appId)
  } catch { return endpoint }
}
const LOTTERY_ROUNDS_APP_ID = process.env.LOTTERY_ROUNDS || ''
if (LOTTERY_ROUNDS_APP_ID && LOTTERY_ROUNDS_APP_ID.length > 0) {
  LOTTERY_HTTP = overrideApplicationId(LOTTERY_HTTP, LOTTERY_ROUNDS_APP_ID)
}

function now() { return new Date().toISOString() }
function log() { const args = Array.from(arguments); console.log(`[${now()}] [lottery-orchestrator]`, ...args) }
function warn() { const args = Array.from(arguments); console.warn(`[${now()}] [lottery-orchestrator]`, ...args) }
function error() { const args = Array.from(arguments); console.error(`[${now()}] [lottery-orchestrator]`, ...args) }
function compactStr(v) { return String(v).replace(/\s+/g, ' ').trim() }
function trunc(s, n = 1000) { try { const t = String(s); return t.length > n ? t.slice(0, n) + '…' : t } catch { return '' } }

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function extractChainId(endpointUrl) {
  const m = endpointUrl.match(/\/chains\/([^/]+)/)
  return m ? m[1] : null
}

function endpointToWsUrl(endpointUrl) {
  const m = endpointUrl.match(/^http:\/\/([^/]+)/)
  const host = m ? m[1] : null
  return host ? `ws://${host}/ws` : null
}

async function executeQuery(endpoint, query) {
  const t = now()
  const q = compactStr(query)
  log('POST', endpoint, 'query:', q)
  try {
    const res = await axios.post(endpoint, { query }, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      timeout: 10000,
      validateStatus: () => true
    })
    log('HTTP', res.status, res.statusText)
    const raw = res?.data
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
    throw e
  }
}

async function executeMutation(endpoint, mutation) {
  const t = now()
  const m = compactStr(mutation)
  log('POST', endpoint, 'mutation:', m)
  try {
    const res = await axios.post(endpoint, { query: mutation }, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      timeout: 10000,
      validateStatus: () => true
    })
    log('HTTP', res.status, res.statusText)
    const raw = res?.data
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
    throw e
  }
}

const ALL_ROUNDS_QUERY = `query {
  allRounds {
    id
    status
    ticketPrice
    totalTicketsSold
    currentWinnerPool
    pool1Count
    pool2Count
    pool3Count
    pool4Count
    pool1WinnersDrawn
    pool2WinnersDrawn
    pool3WinnersDrawn
    pool4WinnersDrawn
  }
}`

async function fetchAllRounds() {
  const data = await executeQuery(LOTTERY_HTTP, ALL_ROUNDS_QUERY)
  const rounds = data?.allRounds || []
  log('allRounds count=', rounds.length)
  return rounds
}

function makeWs(url, chainId, onEvent) {
  let ws
  let attempts = 0
  function connect() {
    attempts += 1
    ws = new WebSocket(url, 'graphql-transport-ws')
    ws.onopen = () => {
      attempts = 0
      log('WS open', url)
      ws.send(JSON.stringify({ type: 'connection_init' }))
    }
    ws.onmessage = async (ev) => {
      const msg = JSON.parse(ev.data)
      log('WS message type=' + msg.type, 'payload=' + (msg.payload ? 'present' : 'undefined'))
      if (msg.type === 'connection_ack') {
        ws.send(JSON.stringify({ id: 'lottery_notifications', type: 'subscribe', payload: { query: `subscription { notifications(chainId: "${chainId}") }` } }))
        log('WS subscribed notifications chainId=' + chainId)
      } else if (msg.type === 'next') {
        try { onEvent() } catch (e) { error('WS onEvent error:', e?.message || e) }
      }
    }
    ws.onclose = (code, reason) => {
      const delay = Math.min(1000 * Math.pow(2, attempts), 30000)
      warn('WS closed code=' + code + ' reason=' + (reason || ''), 'reconnect in', delay + 'ms')
      setTimeout(connect, delay)
    }
    ws.onerror = (err) => { error('WS error:', err?.message || err) }
  }
  connect()
  return () => { try { ws?.close() } catch {} }
}

async function waitForClosedRound(timeoutMs = 60000) {
  const chainId = extractChainId(LOTTERY_HTTP)
  const wsUrl = endpointToWsUrl(LOTTERY_HTTP)

  const initial = await fetchAllRounds()
  const candidate = initial.filter(r => String(r.status).toUpperCase() === 'CLOSED').sort((a,b) => Number(b.id) - Number(a.id))[0]
  if (candidate) { log('latest CLOSED round id=' + candidate.id); return candidate.id }

  return await new Promise((resolve) => {
    let done = false
    const timer = setTimeout(async () => {
      if (done) return
      done = true
      const rounds = await fetchAllRounds()
      const c = rounds.filter(r => String(r.status).toUpperCase() === 'CLOSED').sort((a,b) => Number(b.id) - Number(a.id))[0]
      log('timeout fallback latest CLOSED id=' + (c ? c.id : 'null'))
      resolve(c ? c.id : null)
      stop()
    }, timeoutMs)
    const stop = makeWs(wsUrl, chainId, async () => {
      if (done) return
      const rounds = await fetchAllRounds()
      const c = rounds.filter(r => String(r.status).toUpperCase() === 'CLOSED').sort((a,b) => Number(b.id) - Number(a.id))[0]
      if (c) {
        done = true
        clearTimeout(timer)
        log('WS event found CLOSED id=' + c.id)
        resolve(c.id)
        stop()
      }
    })
  })
}

async function isRoundComplete(id) {
  const rounds = await fetchAllRounds()
  const r = rounds.find(r => Number(r.id) === Number(id))
  const complete = String(r?.status || '').toUpperCase() === 'COMPLETE'
  log('round', id, 'status=', r?.status, 'complete=', complete)
  return complete
}

async function generateWinnersLoop(roundId) {
  while (true) {
    const complete = await isRoundComplete(roundId)
    if (complete) break
    const mutation = `mutation { generateWinner(roundId: ${Number(roundId)}) }`
    try {
      log('generateWinner call roundId=' + roundId)
      await executeMutation(LOTTERY_HTTP, mutation)
    } catch (e) {
      error('generateWinner error:', e?.message || e)
    }
    await sleep(10000)
  }
}

async function closeLotteryRound() {
  const mutation = `mutation { closeRound }`
  log('closeLotteryRound call')
  const res = await executeMutation(LOTTERY_HTTP, mutation)
  log('closeLotteryRound result keys=' + Object.keys(res || {}).join(','))
  return res
}

async function cycle() {
  log('cycle start')
  await closeLotteryRound()
  const closedId = await waitForClosedRound(60000)
  log('closed round id=' + closedId)
  if (closedId != null) {
    log('start generateWinner loop for round ' + closedId)
    await generateWinnersLoop(closedId)
    log('round ' + closedId + ' COMPLETE')
  }
  log('cycle end')
}

async function start() {
  log('orchestrator started')
  while (true) {
    try {
      await cycle()
    } catch (e) {
      error('cycle error:', e?.message || e)
    }
    log('sleeping 5m')
    await sleep(5 * 60 * 1000)
  }
}

if (require.main === module) {
  start().catch((e) => { error('fatal start error:', e?.message || e); process.exit(1) })
}

module.exports = { start }
