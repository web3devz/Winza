const axios = require('axios')
const WebSocket = require('ws')
const PocketBase = require('pocketbase').default
const config = require('./config')

config.loadEnv()

const PB_URL = process.env.POCKETBASE_URL || process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8091'
const pb = (() => { const c = new PocketBase(PB_URL); try { c.autoCancellation(false) } catch {}; return c })()

const LB_BTC = config.endpoints.LEADERBOARD_BTC
const LB_ETH = config.endpoints.LEADERBOARD_ETH

function now() { return new Date().toISOString() }
function log() { const args = Array.from(arguments); console.log(`[${now()}] [leaderboard-sync]`, ...args) }
function warn() { const args = Array.from(arguments); console.warn(`[${now()}] [leaderboard-sync]`, ...args) }
function error() { const args = Array.from(arguments); console.error(`[${now()}] [leaderboard-sync]`, ...args) }
function compactStr(v) { return String(v).replace(/\s+/g, ' ').trim() }
function trunc(s, n = 1000) { try { const t = String(s); return t.length > n ? t.slice(0, n) + '…' : t } catch { return '' } }

function extractChainId(endpointUrl) { const m = String(endpointUrl).match(/\/chains\/([^\/]+)/); return m ? m[1] : null }
function endpointToWsUrl(endpointUrl) { const m = String(endpointUrl).match(/^http:\/\/([^\/]+)/); const host = m ? m[1] : null; return host ? `ws://${host}/ws` : null }

async function executeQuery(endpoint, query) {
  const q = compactStr(query)
  log('POST', endpoint, 'query:', q)
  const res = await axios.post(endpoint, { query }, { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, timeout: 10000, validateStatus: () => true })
  log('HTTP', res.status, res.statusText)
  const raw = res?.data
  if (raw?.errors) { error('GraphQL errors:', trunc(JSON.stringify(raw.errors))); throw new Error(JSON.stringify(raw.errors)) }
  const data = raw?.data || {}
  log('RESPONSE keys=' + Object.keys(data).join(','))
  return data
}

async function upsertPlayer(item, chainLabel) {
  const owner = String(item.owner || '').trim()
  const chainId = String(item.chainId || '').trim()
  const chain = String(chainLabel || '').toLowerCase() === 'eth' ? 'eth' : 'btc'
  const data = {
    owner,
    chain_id: chainId,
    chain,
    wins: Number(item.wins || 0),
    losses: Number(item.losses || 0),
    total_won: Number(item.totalWon || 0),
    total_lost: Number(item.totalLost || 0),
  }
  try {
    const rec = await pb.collection('leaderboard_players').getFirstListItem(`owner = "${owner}" && chain_id = "${chainId}" && chain = "${chain}"`, { requestKey: `lb-${owner}-${chainId}-${chain}` })
    if (rec?.id) { log('update', chain, owner, chainId); await pb.collection('leaderboard_players').update(rec.id, data); return }
  } catch {}
  try { log('create', chain, owner, chainId); await pb.collection('leaderboard_players').create(data) } catch (e) { warn('create error:', e?.message || e) }
}

async function syncOnce(endpoint, chainLabel) {
  const q = `query{ topPlayers(limit:1000){ wins chainId totalWon owner losses totalLost } }`
  const data = await executeQuery(endpoint, q)
  const arr = Array.isArray(data?.topPlayers) ? data.topPlayers : []
  for (const it of arr) { try { await upsertPlayer(it, chainLabel) } catch (e) { warn('upsert error:', e?.message || e) } }
  log('synced', chainLabel, arr.length)
}

function makeWs(url, chainId, onEvent) {
  let ws
  let attempts = 0
  function connect() {
    attempts += 1
    ws = new WebSocket(url, 'graphql-transport-ws')
    ws.onopen = () => { attempts = 0; log('WS open', url); ws.send(JSON.stringify({ type: 'connection_init' })) }
    ws.onmessage = async (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.type === 'connection_ack') { ws.send(JSON.stringify({ id: 'leaderboard_notifications', type: 'subscribe', payload: { query: `subscription { notifications(chainId: "${chainId}") }` } })) }
      else if (msg.type === 'next') { try { onEvent() } catch (e) { error('WS onEvent error:', e?.message || e) } }
    }
    ws.onclose = (code, reason) => { const delay = Math.min(1000 * Math.pow(2, attempts), 30000); warn('WS closed code=' + code + ' reason=' + (reason || ''), 'reconnect in', delay + 'ms'); setTimeout(connect, delay) }
    ws.onerror = (err) => { error('WS error:', err?.message || err) }
  }
  connect()
  return () => { try { ws?.close() } catch {} }
}

async function start() {
  const pairs = [
    ['btc', LB_BTC],
    ['eth', LB_ETH],
  ].filter(([, ep]) => !!ep)

  for (const [label, ep] of pairs) {
    const chainId = extractChainId(ep)
    const wsUrl = endpointToWsUrl(ep)
    await syncOnce(ep, label)
    makeWs(wsUrl, chainId, async () => { await syncOnce(ep, label) })
  }
}

if (require.main === module) { start().catch((e) => { error('fatal start error:', e?.message || e); process.exit(1) }) }

module.exports = { start }
