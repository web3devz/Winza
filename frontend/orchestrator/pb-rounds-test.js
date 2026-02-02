const PocketBase = require('pocketbase').default
const config = require('./config')

config.loadEnv()

const PB_URL = process.env.POCKETBASE_URL || process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8091'
const pb = (() => {
  const c = new PocketBase(PB_URL)
  try { c.autoCancellation(false) } catch {}
  return c
})()

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randFloat(min, max, digits = 2) {
  const n = Math.random() * (max - min) + min
  return Number(n.toFixed(digits))
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function iso(ms) {
  return new Date(ms).toISOString()
}

async function latestRoundId(chain) {
  try {
    const res = await pb.collection('rounds').getList(1, 1, { sort: '-round_id', filter: `chain ~ "${chain}"`, requestKey: `latest-${chain}` })
    const it = res?.items?.[0]
    return Number(it?.round_id || 0)
  } catch { return 0 }
}

function makeRound(chain, id, baseMs) {
  const status = pick(['ACTIVE', 'CLOSED', 'RESOLVED'])
  const createdAtMs = baseMs + randInt(-30, 0) * 60000
  const closedAtMs = status === 'ACTIVE' ? null : createdAtMs + randInt(1, 10) * 60000
  const resolvedAtMs = status === 'RESOLVED' ? closedAtMs || createdAtMs + randInt(5, 15) * 60000 : null
  const upBets = randInt(10, 500)
  const downBets = randInt(10, 500)
  const upPool = randFloat(0.01, 5)
  const downPool = randFloat(0.01, 5)
  const prizePool = Number((upPool + downPool).toFixed(4))
  const closingPrice = status === 'ACTIVE' ? null : randFloat(20000, 80000, 2)
  const resolutionPrice = status === 'RESOLVED' ? randFloat(20000, 80000, 2) : null
  const result = status === 'RESOLVED' ? pick(['UP', 'DOWN']) : null
  return {
    round_id: Number(id),
    chain: String(chain),
    status: String(status),
    resolution_price: resolutionPrice,
    closing_price: closingPrice,
    up_bets: Number(upBets),
    down_bets: Number(downBets),
    result: result,
    prize_pool: Number(prizePool),
    up_bets_pool: Number(upPool),
    down_bets_pool: Number(downPool),
    created_at: iso(createdAtMs),
    resolved_at: resolvedAtMs ? iso(resolvedAtMs) : null,
    closed_at: closedAtMs ? iso(closedAtMs) : null,
  }
}

async function seedChain(chain, count) {
  const base = await latestRoundId(chain)
  const startId = base + 1
  const now = Date.now()
  let created = 0
  for (let i = 0; i < count; i++) {
    const id = startId + i
    const data = makeRound(chain, id, now - i * 60000)
    try {
      await pb.collection('rounds').create(data)
      created += 1
    } catch (e) {
      try {
        const res = await pb.collection('rounds').getFirstListItem(`round_id = ${Number(id)} && chain ~ "${chain}"`, { requestKey: `find-${chain}-${id}` })
        if (res?.id) await pb.collection('rounds').update(res.id, data)
      } catch {}
    }
  }
  const list = await pb.collection('rounds').getList(1, 200, { sort: '-round_id', filter: `chain ~ "${chain}"`, requestKey: `list-${chain}` })
  const items = list?.items || []
  if (items.length > 10) {
    const toDelete = items.slice(10)
    for (const rec of toDelete) {
      try { await pb.collection('rounds').delete(rec.id) } catch {}
    }
  }
  console.log(`[pb-test] chain=${chain} created=${created} total=${(list?.items || []).length}`)
  const first = list?.items?.[0]
  if (first?.id) {
    const upd = { status: 'RESOLVED', result: pick(['UP','DOWN']), resolution_price: randFloat(20000, 80000, 2), resolved_at: iso(Date.now()) }
    try { await pb.collection('rounds').update(first.id, upd) } catch {}
    console.log(`[pb-test] chain=${chain} updated latest id=${first.round_id}`)
  }
}

async function main() {
  console.log('PB URL', PB_URL)
  await seedChain('btc', 12)
  await seedChain('eth', 12)
  console.log('Done')
}

main().catch((e) => { console.error(e?.message || e); process.exit(1) })
