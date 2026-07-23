import { useRef, useState, useCallback } from 'react'
import { useKeys, useRaf, useBestScore, HUD, Stat, Overlay, Screen } from './common.jsx'
import Sound from '../sound.js'

// # solid · ^ spike · o ring · B big-ring · s small-ring · E exit · P start
const LEVELS = [
  [
    '#################',
    '#P    o      o  #',
    '#   ###   ###   #',
    '#  o        B   #',
    '# ####  ^^^  ### #',
    '#         ###   E#',
    '#   o   ###    ###',
    '# ###  ^^  o     #',
    '#     ####   ### #',
    '#  s      ^^^^   #',
    '#o###############',
    '#################',
  ],
  [
    '#################',
    '#P   o   o   o  #',
    '### ### ### ### #',
    '#  B          o #',
    '# #### ^^^^ ###  #',
    '#    o         ##E',
    '## ###   s   ### #',
    '#      ####      #',
    '# ^^ o    o  ^^  #',
    '######  ####  ####',
    '#o    ^^     o   #',
    '#################',
  ],
]
const TILE = 34, COLS = 17, ROWS = 12
const W = COLS * TILE, H = ROWS * TILE

export default function Bounce({ onExit }) {
  const [best, submitBest] = useBestScore('bounce')
  const [ui, setUi] = useState({ score: 0, lvl: 1, rings: 0, state: 'play' })
  const g = useRef(null)
  const canvas = useRef(null)

  const load = useCallback((idx = 0, score = 0) => {
    const map = LEVELS[idx].map((r) => r.padEnd(COLS, '#'))
    let start = { x: TILE, y: TILE }
    const rings = []
    map.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === 'P') start = { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 }
      if (ch === 'o') rings.push({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, type: 'o' })
      if (ch === 'B') rings.push({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, type: 'B' })
      if (ch === 's') rings.push({ x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, type: 's' })
    }))
    const total = rings.filter((r) => r.type === 'o').length
    g.current = {
      map, idx, ball: { x: start.x, y: start.y, vx: 0, vy: 0, r: TILE * 0.42, big: false, grounded: false },
      rings, total, collected: 0, score, state: 'play', start,
    }
    setUi({ score, lvl: idx + 1, rings: 0, state: 'play' })
  }, [])

  const solid = (cx, cy) => {
    const s = g.current
    if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) return true
    return s.map[cy][cx] === '#'
  }
  const spikeAt = (px, py) => {
    const s = g.current, cx = Math.floor(px / TILE), cy = Math.floor(py / TILE)
    return s.map[cy]?.[cx] === '^'
  }

  useRaf((dt) => {
    const s = g.current
    if (!s) { load(); return }
    if (s.state === 'play') update(Math.min(dt, 0.025), keys.current)
    draw()
  })

  const keys = useKeys()

  const die = () => {
    const s = g.current
    Sound.explode(); s.score = Math.max(0, s.score - 20)
    const b = s.ball; b.x = s.start.x; b.y = s.start.y; b.vx = 0; b.vy = 0
    setUi((u) => ({ ...u, score: s.score }))
  }

  const update = (dt, kk) => {
    const s = g.current, b = s.ball
    const speed = b.big ? 130 : 180
    if (kk['ArrowLeft'] || kk['a']) b.vx = -speed
    else if (kk['ArrowRight'] || kk['d']) b.vx = speed
    else b.vx *= 0.8
    if ((kk['ArrowUp'] || kk['w'] || kk[' ']) && b.grounded) {
      b.vy = b.big ? -520 : -430; b.grounded = false; Sound.jump()
    }
    b.vy += 1100 * dt
    if (b.vy > 640) b.vy = 640

    // X collision
    b.x += b.vx * dt
    let cy0 = Math.floor((b.y - b.r + 1) / TILE), cy1 = Math.floor((b.y + b.r - 1) / TILE)
    if (b.vx > 0) {
      let cx = Math.floor((b.x + b.r) / TILE)
      if (solid(cx, cy0) || solid(cx, cy1)) { b.x = cx * TILE - b.r; b.vx = 0 }
    } else if (b.vx < 0) {
      let cx = Math.floor((b.x - b.r) / TILE)
      if (solid(cx, cy0) || solid(cx, cy1)) { b.x = (cx + 1) * TILE + b.r; b.vx = 0 }
    }
    // Y collision
    b.y += b.vy * dt
    b.grounded = false
    let cx0 = Math.floor((b.x - b.r + 1) / TILE), cx1 = Math.floor((b.x + b.r - 1) / TILE)
    if (b.vy > 0) {
      let cy = Math.floor((b.y + b.r) / TILE)
      if (solid(cx0, cy) || solid(cx1, cy)) {
        b.y = cy * TILE - b.r
        if (b.vy > 260) { b.vy = -b.vy * 0.32; Sound.bounce() } else { b.vy = 0; b.grounded = true }
      }
    } else if (b.vy < 0) {
      let cy = Math.floor((b.y - b.r) / TILE)
      if (solid(cx0, cy) || solid(cx1, cy)) { b.y = (cy + 1) * TILE + b.r; b.vy = 0 }
    }
    // spikes
    if (spikeAt(b.x, b.y + b.r - 3) || spikeAt(b.x - b.r + 3, b.y) || spikeAt(b.x + b.r - 3, b.y)) { die(); return }
    // rings
    for (const ring of s.rings) {
      if (ring.dead) continue
      if (Math.hypot(ring.x - b.x, ring.y - b.y) < b.r + 10) {
        ring.dead = true
        if (ring.type === 'o') { s.collected++; s.score += 100; Sound.coin(); setUi((u) => ({ ...u, score: s.score, rings: s.collected })) }
        else if (ring.type === 'B') { b.big = true; b.r = TILE * 0.62; Sound.pop() }
        else if (ring.type === 's') { b.big = false; b.r = TILE * 0.30; Sound.pop() }
      }
    }
    // exit
    const ex = Math.floor(b.x / TILE), ey = Math.floor(b.y / TILE)
    if (s.map[ey]?.[ex] === 'E') {
      if (s.collected >= s.total) {
        Sound.win()
        if (s.idx + 1 < LEVELS.length) { load(s.idx + 1, s.score + 300) }
        else { s.state = 'win'; submitBest(s.score); setUi((u) => ({ ...u, state: 'win' })) }
      }
    }
  }

  const draw = () => {
    const s = g.current, cv = canvas.current; if (!cv || !s) return
    const ctx = cv.getContext('2d')
    ctx.fillStyle = '#07130c'; ctx.fillRect(0, 0, W, H)
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const ch = s.map[y][x]
      if (ch === '#') {
        ctx.fillStyle = '#1f7a2b'; ctx.fillRect(x * TILE, y * TILE, TILE, TILE)
        ctx.fillStyle = '#0d3a16'; ctx.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4)
        ctx.fillStyle = '#39ff1422'; ctx.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, 4)
      } else if (ch === '^') {
        ctx.fillStyle = '#ff3b30'; ctx.beginPath()
        ctx.moveTo(x * TILE, (y + 1) * TILE); ctx.lineTo(x * TILE + TILE / 2, y * TILE); ctx.lineTo((x + 1) * TILE, (y + 1) * TILE); ctx.closePath(); ctx.fill()
      } else if (ch === 'E') {
        ctx.strokeStyle = '#f9f002'; ctx.lineWidth = 4
        ctx.strokeRect(x * TILE + 6, y * TILE + 4, TILE - 12, TILE - 8)
        ctx.fillStyle = Math.floor(performance.now() / 200) % 2 ? '#f9f00255' : '#39ff1455'
        ctx.fillRect(x * TILE + 8, y * TILE + 6, TILE - 16, TILE - 12)
      }
    }
    // rings
    s.rings.forEach((r) => {
      if (r.dead) return
      ctx.lineWidth = 4
      ctx.strokeStyle = r.type === 'o' ? '#f9f002' : r.type === 'B' ? '#29e7cd' : '#ff5db1'
      ctx.beginPath(); ctx.arc(r.x, r.y, r.type === 'o' ? 8 : 11, 0, 7); ctx.stroke()
      if (r.type !== 'o') { ctx.fillStyle = ctx.strokeStyle; ctx.font = '8px "Press Start 2P"'; ctx.fillText(r.type === 'B' ? '+' : '-', r.x - 3, r.y + 3) }
    })
    // ball
    const b = s.ball
    const grad = ctx.createRadialGradient(b.x - b.r / 3, b.y - b.r / 3, 2, b.x, b.y, b.r)
    grad.addColorStop(0, '#ff8a80'); grad.addColorStop(1, '#c1121f')
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill()
    ctx.strokeStyle = '#4d0a0a'; ctx.lineWidth = 2; ctx.stroke()
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x - b.r / 3, b.y - b.r / 3, b.r / 5, 0, 7); ctx.fill()
  }

  return (
    <div>
      <HUD>
        <Stat label="SCORE" value={ui.score} />
        <Stat label="RINGS" value={`${ui.rings}/${g.current?.total ?? '?'}`} color="var(--yellow)" />
        <Stat label="LVL" value={ui.lvl} color="var(--pink)" />
        <Stat label="BEST" value={best} color="var(--cyan)" />
      </HUD>
      <Screen width={W} height={H} canvasRef={canvas}>
        {ui.state === 'win' && <Overlay title="COMPLETE!" sub={`Score ${ui.score}`} color="var(--green)" onRetry={() => { Sound.select(); load(0) }} onExit={onExit} />}
      </Screen>
      <p style={{ textAlign: 'center', fontFamily: 'var(--font-term)', fontSize: 20, color: 'var(--green-dim)' }}>
        ← → move · ↑/SPACE jump · grab all yellow rings then reach the exit · + grows, − shrinks
      </p>
    </div>
  )
}
