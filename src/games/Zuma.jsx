import { useRef, useState, useCallback, useEffect } from 'react'
import { useRaf, useBestScore, HUD, Stat, Overlay, Screen } from './common.jsx'
import Sound from '../sound.js'

const W = 480, H = 430
const CX = W / 2, CY = H / 2 + 8
const R = 13, SPACING = 25
// Five hues spread ~55°+ apart so no two marbles are confusable. (The old
// pink #ff5db1 sat only 34° from red — violet is far from every other hue.)
const COLORS = ['#ff3b30', '#f9f002', '#39ff14', '#29e7cd', '#b15cff']

// build a spiral path from outer edge into the hole near the centre
function buildPath() {
  const pts = []
  const turns = 2.6, N = 900
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const ang = t * turns * Math.PI * 2
    const rad = 195 * (1 - t) + 26 * t
    pts.push([CX + Math.cos(ang) * rad, CY + Math.sin(ang) * rad * 0.86])
  }
  // cumulative length
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  return { pts, cum, len: cum[cum.length - 1] }
}

export default function Zuma({ onExit }) {
  const [best, submitBest] = useBestScore('zuma')
  const [ui, setUi] = useState({ score: 0, left: 56, state: 'play' })
  const g = useRef(null)
  const canvas = useRef(null)
  const path = useRef(buildPath())

  const posAt = (dist) => {
    const { pts, cum, len } = path.current
    const d = Math.max(0, Math.min(len, dist))
    // binary search
    let lo = 0, hi = cum.length - 1
    while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < d) lo = m + 1; else hi = m }
    const i = Math.max(1, lo)
    const seg = cum[i] - cum[i - 1] || 1
    const f = (d - cum[i - 1]) / seg
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]
  }

  const rndColor = (pool) => pool[(Math.random() * pool.length) | 0]

  const reset = useCallback(() => {
    const nColors = 5
    const pool = COLORS.slice(0, nColors)
    const chain = []
    const startCount = 22
    for (let i = 0; i < startCount; i++) chain.push({ color: rndColor(pool), dist: 0 })
    const s = {
      chain, pool, headDist: 260, toSpawn: 34, spawnTimer: 0, speed: 16,
      shooter: { color: rndColor(pool), next: rndColor(pool), angle: 0 },
      shot: null, score: 0, combo: 0, state: 'play', pop: [], slow: 0,
    }
    g.current = s
    reflow()
    setUi({ score: 0, left: chain.length + s.toSpawn, state: 'play' })
  }, [])

  // rigid contiguous chain anchored at headDist
  const reflow = () => {
    const s = g.current
    s.chain.forEach((b, i) => { b.dist = s.headDist - i * SPACING })
  }

  useEffect(() => {
    const cv = canvas.current
    const aim = (e) => {
      const s = g.current; if (!s) return
      const rect = cv.getBoundingClientRect()
      const mx = (e.clientX - rect.left) * (W / rect.width)
      const my = (e.clientY - rect.top) * (H / rect.height)
      s.shooter.angle = Math.atan2(my - CY, mx - CX)
    }
    const shoot = () => {
      const s = g.current; if (!s || s.state !== 'play' || s.shot) return
      const a = s.shooter.angle
      s.shot = { x: CX + Math.cos(a) * 26, y: CY + Math.sin(a) * 26, vx: Math.cos(a) * 460, vy: Math.sin(a) * 460, color: s.shooter.color }
      s.shooter.color = s.shooter.next; s.shooter.next = rndColor(s.pool)
      Sound.laser()
    }
    const swap = (e) => {
      const s = g.current; if (!s) return
      e.preventDefault()
      const t = s.shooter.color; s.shooter.color = s.shooter.next; s.shooter.next = t; Sound.move()
    }
    cv.addEventListener('mousemove', aim)
    cv.addEventListener('click', shoot)
    cv.addEventListener('contextmenu', swap)
    return () => { cv.removeEventListener('mousemove', aim); cv.removeEventListener('click', shoot); cv.removeEventListener('contextmenu', swap) }
  }, [])

  useRaf((dt) => {
    const s = g.current
    if (!s) { reset(); return }
    if (s.state === 'play') update(Math.min(dt, 0.03))
    draw()
  })

  const update = (dt) => {
    const s = g.current
    // spawn new balls at the tail while any remain
    if (s.toSpawn > 0) {
      s.spawnTimer -= dt
      const tail = s.chain[s.chain.length - 1]
      if (!tail || tail.dist > SPACING) {
        s.chain.push({ color: rndColor(s.pool), dist: 0 }); s.toSpawn -= 1
      }
    }
    // advance chain
    if (s.slow > 0) s.slow -= dt
    const spd = s.speed * (s.slow > 0 ? 0.4 : 1)
    s.headDist += spd * dt
    reflow()
    if (s.headDist >= path.current.len + R) { s.state = 'over'; submitBest(s.score); setUi((u) => ({ ...u, state: 'over' })); return }
    // set xy
    s.chain.forEach((b) => { const [x, y] = posAt(b.dist); b.x = x; b.y = y })
    // shot
    if (s.shot) {
      s.shot.x += s.shot.vx * dt; s.shot.y += s.shot.vy * dt
      if (s.shot.x < R || s.shot.x > W - R) s.shot.vx *= -1
      if (s.shot.y < R || s.shot.y > H - R) s.shot.vy *= -1
      // collide with chain
      let hitIdx = -1, hd = 1e9
      for (let i = 0; i < s.chain.length; i++) {
        const d = Math.hypot(s.chain[i].x - s.shot.x, s.chain[i].y - s.shot.y)
        if (d < R * 2 && d < hd) { hd = d; hitIdx = i }
      }
      if (hitIdx >= 0) insertBall(hitIdx)
      else if (s.shot.x < R || s.shot.x > W - R || s.shot.y < R || s.shot.y > H - R) { /* keep bouncing */ }
    }
    // pops animation
    s.pop.forEach((p) => { p.life -= dt })
    s.pop = s.pop.filter((p) => p.life > 0)
    // win
    if (s.chain.length === 0 && s.toSpawn <= 0) { s.state = 'win'; submitBest(s.score); Sound.win(); setUi((u) => ({ ...u, state: 'win' })) }
  }

  const insertBall = (idx) => {
    const s = g.current
    const shotColor = s.shot.color
    // decide side: insert before or after idx based on whether shot is nearer head or tail neighbour
    const b = s.chain[idx]
    let insertAt = idx
    const prev = s.chain[idx - 1], next = s.chain[idx + 1]
    // pick neighbour that is closer to the shot; insert between them
    if (next) {
      const dPrev = prev ? Math.hypot((prev.x + b.x) / 2 - s.shot.x, (prev.y + b.y) / 2 - s.shot.y) : 1e9
      const dNext = Math.hypot((next.x + b.x) / 2 - s.shot.x, (next.y + b.y) / 2 - s.shot.y)
      insertAt = dNext < dPrev ? idx + 1 : idx
    }
    s.chain.splice(insertAt, 0, { color: shotColor, dist: 0 })
    s.shot = null
    reflow()
    s.chain.forEach((bb) => { const [x, y] = posAt(bb.dist); bb.x = x; bb.y = y })
    resolveMatches(insertAt)
  }

  const resolveMatches = (idx) => {
    const s = g.current
    let combo = 0
    const tryRun = (center) => {
      const col = s.chain[center]?.color
      if (!col) return false
      let lo = center, hi = center
      while (lo - 1 >= 0 && s.chain[lo - 1].color === col) lo--
      while (hi + 1 < s.chain.length && s.chain[hi + 1].color === col) hi++
      if (hi - lo + 1 >= 3) {
        const count = hi - lo + 1
        for (let i = lo; i <= hi; i++) s.pop.push({ x: s.chain[i].x, y: s.chain[i].y, color: s.chain[i].color, life: 0.35 })
        s.chain.splice(lo, count)
        combo++
        s.score += count * 50 * combo
        s.headDist = Math.max(0, s.headDist - count * SPACING * 0.5) // reward: chain recedes
        return { seam: lo }
      }
      return false
    }
    let res = tryRun(idx)
    if (res) {
      Sound.combo(combo)
      // chain reaction at seam where two groups now touch
      let guard = 0
      while (res && guard++ < 20) {
        reflow()
        const seam = res.seam
        if (seam > 0 && seam < s.chain.length && s.chain[seam - 1].color === s.chain[seam].color) {
          res = tryRun(seam)
          if (res) Sound.combo(combo)
        } else res = false
      }
      reflow()
      s.chain.forEach((bb) => { const [x, y] = posAt(bb.dist); bb.x = x; bb.y = y })
    } else { Sound.hit() }
    setUi((u) => ({ ...u, score: s.score, left: s.chain.length + s.toSpawn }))
  }

  const drawBall = (ctx, x, y, color, r = R) => {
    const grad = ctx.createRadialGradient(x - r / 3, y - r / 3, 1, x, y, r)
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.3, color); grad.addColorStop(1, color)
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5; ctx.stroke()
  }

  const draw = () => {
    const s = g.current, cv = canvas.current; if (!cv || !s) return
    const ctx = cv.getContext('2d')
    ctx.fillStyle = '#08130c'; ctx.fillRect(0, 0, W, H)
    // path track
    const { pts } = path.current
    ctx.strokeStyle = '#12331a'; ctx.lineWidth = R * 2 + 4; ctx.lineJoin = 'round'; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 2; i < pts.length; i += 3) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke()
    ctx.strokeStyle = '#0a220f'; ctx.lineWidth = R * 2; ctx.stroke()
    // hole
    const [hx, hy] = pts[pts.length - 1]
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(hx, hy, R + 6, 0, 7); ctx.fill()
    ctx.strokeStyle = '#ff3b30'; ctx.lineWidth = 3; ctx.stroke()
    // chain balls
    s.chain.forEach((b) => drawBall(ctx, b.x, b.y, b.color))
    // pops
    s.pop.forEach((p) => { ctx.globalAlpha = Math.max(0, p.life * 3); drawBall(ctx, p.x, p.y, p.color, R + (0.35 - p.life) * 40); ctx.globalAlpha = 1 })
    // shot
    if (s.shot) drawBall(ctx, s.shot.x, s.shot.y, s.shot.color)
    // frog / shooter
    const a = s.shooter.angle
    const ex = Math.cos(a), ey = Math.sin(a)
    const tipX = CX + ex * 24, tipY = CY + ey * 24
    // aim guide — a dashed ray that stops at the first marble it would hit
    if (!s.shot) {
      let endT = 660
      for (const b of s.chain) {
        const t = (b.x - CX) * ex + (b.y - CY) * ey
        if (t < 24) continue
        const perp = Math.hypot(b.x - (CX + ex * t), b.y - (CY + ey * t))
        if (perp < R * 1.4 && t < endT) endT = t
      }
      ctx.strokeStyle = 'rgba(249,240,2,0.4)'; ctx.lineWidth = 2; ctx.setLineDash([5, 9])
      ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(CX + ex * endT, CY + ey * endT); ctx.stroke(); ctx.setLineDash([])
    }
    ctx.save(); ctx.translate(CX, CY); ctx.rotate(a)
    ctx.fillStyle = '#2e8b57'; ctx.beginPath(); ctx.arc(0, 0, 22, 0, 7); ctx.fill()
    ctx.fillStyle = '#1e6b3a'; ctx.fillRect(0, -8, 26, 16)
    ctx.fillStyle = '#f9f002'; ctx.beginPath(); ctx.arc(-6, -12, 6, 0, 7); ctx.arc(-6, 12, 6, 0, 7); ctx.fill()
    ctx.fillStyle = '#04140a'; ctx.beginPath(); ctx.arc(-4, -12, 3, 0, 7); ctx.arc(-4, 12, 3, 0, 7); ctx.fill()
    ctx.restore()
    // next-ball preview tucked behind the frog
    drawBall(ctx, CX - ex * 20, CY - ey * 20, s.shooter.next, 7)
    // the LOADED ball sits in the mouth — this is exactly the marble that launches, same colour
    drawBall(ctx, tipX, tipY, s.shooter.color, R)
  }

  return (
    <div>
      <HUD>
        <Stat label="SCORE" value={ui.score} />
        <Stat label="BALLS" value={ui.left} color="var(--yellow)" />
        <Stat label="BEST" value={best} color="var(--cyan)" />
      </HUD>
      <Screen width={W} height={H} canvasRef={canvas} style={{ cursor: 'crosshair' }}>
        {ui.state === 'over' && <Overlay title="SWALLOWED!" sub={`Score ${ui.score}`} color="var(--red)" onRetry={() => { Sound.select(); reset() }} onExit={onExit} />}
        {ui.state === 'win' && <Overlay title="CLEARED!" sub={`Score ${ui.score}`} color="var(--green)" onRetry={() => { Sound.select(); reset() }} onExit={onExit} />}
      </Screen>
      <p style={{ textAlign: 'center', fontFamily: 'var(--font-term)', fontSize: 20, color: 'var(--green-dim)' }}>
        Aim with mouse · click to shoot · right-click to swap · match 3+ before they reach the skull
      </p>
    </div>
  )
}
