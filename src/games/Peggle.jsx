import { useRef, useState, useCallback, useEffect } from 'react'
import { useRaf, useBestScore, HUD, Stat, Overlay, Screen } from './common.jsx'
import Sound from '../sound.js'

const W = 480, H = 540
const BALL_R = 7, PEG_R = 9
const AIM = { x: W / 2, y: 26 }
const SPEED = 430, GRAV = 460 // launch speed + gravity (shared by sim & trajectory preview)
const MIN_ANGLE = 0.14 // how flat you may shoot — flatter = more sideways range to the far pegs

export default function Peggle({ onExit }) {
  const [best, submitBest] = useBestScore('peggle')
  const [ui, setUi] = useState({ score: 0, balls: 10, orange: 25, state: 'play' })
  const g = useRef(null)
  const canvas = useRef(null)

  const buildPegs = () => {
    const pegs = []
    const rows = 9, cols = 11
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const off = (r % 2) * (W / cols / 2)
        const x = 40 + c * ((W - 80) / (cols - 1)) + off * 0
        const y = 130 + r * 36
        // carve a diamond-ish hole in the middle for style
        if (Math.abs(c - cols / 2) + Math.abs(r - rows / 2) < 2) continue
        if (x > W - 30 || x < 30) continue
        pegs.push({ x: x + (r % 2 ? 16 : 0), y, hit: false, type: 'blue' })
      }
    }
    // pick 25 orange targets
    const idxs = [...pegs.keys()].sort(() => Math.random() - 0.5).slice(0, 25)
    idxs.forEach((i) => (pegs[i].type = 'orange'))
    // a few green (power) pegs
    ;[...pegs.keys()].filter((i) => pegs[i].type === 'blue').sort(() => Math.random() - 0.5).slice(0, 2).forEach((i) => (pegs[i].type = 'green'))
    return pegs
  }

  const reset = useCallback(() => {
    const pegs = buildPegs()
    g.current = {
      pegs, ball: null, aim: Math.PI / 2, balls: 10, score: 0,
      bucket: { x: W / 2, dir: 1 }, state: 'play', freeGlow: 0, particles: [],
    }
    setUi({ score: 0, balls: 10, orange: pegs.filter((p) => p.type === 'orange').length, state: 'play' })
  }, [])

  useEffect(() => {
    const cv = canvas.current
    const aim = (e) => {
      const s = g.current; if (!s) return
      const rect = cv.getBoundingClientRect()
      const mx = (e.clientX - rect.left) * (W / rect.width)
      const my = (e.clientY - rect.top) * (H / rect.height)
      let a = Math.atan2(my - AIM.y, mx - AIM.x)
      a = Math.max(MIN_ANGLE, Math.min(Math.PI - MIN_ANGLE, a)) // keep pointing into the field
      s.aim = a
    }
    const shoot = () => {
      const s = g.current; if (!s || s.state !== 'play' || s.ball || s.balls <= 0) return
      s.ball = { x: AIM.x, y: AIM.y + 14, vx: Math.cos(s.aim) * SPEED, vy: Math.sin(s.aim) * SPEED }
      s.balls -= 1; setUi((u) => ({ ...u, balls: s.balls })); Sound.bounce()
    }
    cv.addEventListener('mousemove', aim)
    cv.addEventListener('click', shoot)
    return () => { cv.removeEventListener('mousemove', aim); cv.removeEventListener('click', shoot) }
  }, [])

  useRaf((dt) => {
    const s = g.current
    if (!s) { reset(); return }
    if (s.state === 'play') update(Math.min(dt, 0.025))
    draw()
  })

  const endBall = () => {
    const s = g.current
    // remove hit pegs, award
    let gained = 0, greenHit = false
    s.pegs = s.pegs.filter((p) => {
      if (p.hit) {
        gained += p.type === 'orange' ? 200 : p.type === 'green' ? 100 : 50
        if (p.type === 'green') greenHit = true
        return false
      }
      return true
    })
    s.score += gained
    const orange = s.pegs.filter((p) => p.type === 'orange').length
    if (greenHit) { s.balls += 1; Sound.coin() }
    setUi((u) => ({ ...u, score: s.score, orange, balls: s.balls }))
    if (orange === 0) { s.state = 'win'; submitBest(s.score); Sound.win(); setUi((u) => ({ ...u, state: 'win' })); return }
    if (s.balls <= 0) { s.state = 'over'; submitBest(s.score); setUi((u) => ({ ...u, state: 'over' })); return }
  }

  const update = (dt) => {
    const s = g.current
    // bucket slides
    s.bucket.x += s.bucket.dir * 90 * dt
    if (s.bucket.x < 60 || s.bucket.x > W - 60) s.bucket.dir *= -1
    // particles
    s.particles.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt })
    s.particles = s.particles.filter((p) => p.life > 0)

    const b = s.ball; if (!b) return
    const steps = 4
    for (let st = 0; st < steps; st++) {
      const h = dt / steps
      b.vy += GRAV * h
      b.x += b.vx * h; b.y += b.vy * h
      if (b.x < BALL_R) { b.x = BALL_R; b.vx = Math.abs(b.vx) * 0.9 }
      if (b.x > W - BALL_R) { b.x = W - BALL_R; b.vx = -Math.abs(b.vx) * 0.9 }
      // pegs
      for (const p of s.pegs) {
        const dx = b.x - p.x, dy = b.y - p.y
        const d = Math.hypot(dx, dy)
        if (d < BALL_R + PEG_R) {
          const nx = dx / (d || 1), ny = dy / (d || 1)
          const overlap = BALL_R + PEG_R - d
          b.x += nx * overlap; b.y += ny * overlap
          const dot = b.vx * nx + b.vy * ny
          b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny
          b.vx *= 0.86; b.vy *= 0.86
          if (!p.hit) {
            p.hit = true
            Sound.pop()
            for (let i = 0; i < 6; i++) { const a = Math.random() * 7; s.particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * 80, vy: Math.sin(a) * 80 - 40, life: 0.4, color: pegColor(p) }) }
          }
        }
      }
    }
    // bucket catch
    if (b.y > H - 34 && Math.abs(b.x - s.bucket.x) < 34) {
      s.ball = null; s.balls += 1; Sound.coin(); setUi((u) => ({ ...u, balls: s.balls })); endBall(); return
    }
    if (b.y > H + BALL_R) { s.ball = null; endBall() }
  }

  const pegColor = (p) => p.type === 'orange' ? '#ff9f1c' : p.type === 'green' ? '#39ff14' : '#29e7cd'

  // Simulate the shot with the exact same physics and return sampled points,
  // stopping at the first peg it would strike — so the guide reaches the target.
  const predictPath = () => {
    const s = g.current
    let x = AIM.x, y = AIM.y + 14
    let vx = Math.cos(s.aim) * SPEED, vy = Math.sin(s.aim) * SPEED
    const pts = []
    const h = 1 / 240
    for (let i = 0; i < 1400; i++) {
      vy += GRAV * h; x += vx * h; y += vy * h
      if (x < BALL_R) { x = BALL_R; vx = Math.abs(vx) * 0.9 }
      if (x > W - BALL_R) { x = W - BALL_R; vx = -Math.abs(vx) * 0.9 }
      if (i % 4 === 0) pts.push([x, y])
      let hit = false
      for (const p of s.pegs) {
        if (p.hit) continue
        if ((x - p.x) ** 2 + (y - p.y) ** 2 < (BALL_R + PEG_R) ** 2) { hit = true; break }
      }
      if (hit || y > H) break
    }
    return pts
  }

  const draw = () => {
    const s = g.current, cv = canvas.current; if (!cv || !s) return
    const ctx = cv.getContext('2d')
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, '#0b1a2e'); grad.addColorStop(1, '#08130c')
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H)
    // pegs
    s.pegs.forEach((p) => {
      ctx.fillStyle = p.hit ? '#ffffff' : pegColor(p)
      ctx.beginPath(); ctx.arc(p.x, p.y, PEG_R, 0, 7); ctx.fill()
      if (p.type === 'orange' && !p.hit) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke() }
      if (!p.hit) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(p.x - 3, p.y - 3, 2.5, 0, 7); ctx.fill() }
    })
    // particles
    s.particles.forEach((p) => { ctx.globalAlpha = Math.max(0, p.life * 2.5); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 3, 3); ctx.globalAlpha = 1 })
    // aim trajectory — a dotted parabola tracing the real path to the first peg
    if (!s.ball) {
      const path = predictPath()
      path.forEach(([x, y], i) => {
        ctx.globalAlpha = Math.max(0.12, 1 - i / (path.length + 4))
        ctx.fillStyle = '#f9f002'
        ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill()
      })
      ctx.globalAlpha = 1
      // marker where the ball first lands
      const end = path[path.length - 1]
      if (end) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(end[0], end[1], 6, 0, 7); ctx.stroke() }
    }
    // aimer cannon
    const a = s.aim
    ctx.strokeStyle = '#f9f002'; ctx.lineWidth = 6; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(AIM.x, AIM.y); ctx.lineTo(AIM.x + Math.cos(a) * 22, AIM.y + Math.sin(a) * 22); ctx.stroke()
    ctx.fillStyle = '#f9f002'; ctx.beginPath(); ctx.arc(AIM.x, AIM.y, 10, 0, 7); ctx.fill()
    ctx.fillStyle = '#04140a'; ctx.beginPath(); ctx.arc(AIM.x, AIM.y, 4, 0, 7); ctx.fill()
    // ball
    if (s.ball) {
      // magenta so the ball never blends into the white flash of hit pegs
      ctx.fillStyle = '#ff3caf'; ctx.beginPath(); ctx.arc(s.ball.x, s.ball.y, BALL_R, 0, 7); ctx.fill()
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke()
    }
    // bucket
    ctx.fillStyle = '#1f7a2b'; ctx.fillRect(s.bucket.x - 32, H - 26, 64, 20)
    ctx.fillStyle = '#39ff1455'; ctx.fillRect(s.bucket.x - 28, H - 24, 56, 8)
  }

  return (
    <div>
      <HUD>
        <Stat label="SCORE" value={ui.score} />
        <Stat label="ORANGE" value={ui.orange} color="var(--amber)" />
        <Stat label="BALLS" value={ui.balls} color="var(--yellow)" />
        <Stat label="BEST" value={best} color="var(--cyan)" />
      </HUD>
      <Screen width={W} height={H} canvasRef={canvas} style={{ cursor: 'crosshair' }}>
        {ui.state === 'over' && <Overlay title="OUT OF BALLS" sub={`Score ${ui.score}`} color="var(--red)" onRetry={() => { Sound.select(); reset() }} onExit={onExit} />}
        {ui.state === 'win' && <Overlay title="EXTREME FEVER!" sub={`Score ${ui.score}`} color="var(--green)" onRetry={() => { Sound.select(); reset() }} onExit={onExit} />}
      </Screen>
      <p style={{ textAlign: 'center', fontFamily: 'var(--font-term)', fontSize: 20, color: 'var(--green-dim)' }}>
        Aim with mouse · click to drop the ball · clear every ORANGE peg · green = free ball, bucket = free ball
      </p>
    </div>
  )
}
