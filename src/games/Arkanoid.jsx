import { useRef, useState, useCallback, useEffect } from 'react'
import { useRaf, useBestScore, HUD, Stat, Overlay, Screen } from './common.jsx'
import Sound from '../sound.js'

const W = 420, H = 480
const BW = 40, BH = 18, COLS = 10, ROWS = 6, GAP = 2, TOP = 60
const COLORS = ['#ff3b30', '#ff9f1c', '#f9f002', '#39ff14', '#29e7cd', '#ff5db1']

export default function Arkanoid({ onExit }) {
  const [best, submitBest] = useBestScore('arkanoid')
  const [ui, setUi] = useState({ score: 0, lives: 3, level: 1, state: 'play' })
  const g = useRef(null)
  const canvas = useRef(null)

  const buildBricks = (level) => {
    const bricks = []
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (level > 1 && (r + c) % (level + 1) === 0 && Math.random() < 0.25) continue
      bricks.push({
        x: c * (BW + GAP) + 12, y: TOP + r * (BH + GAP),
        hp: r < 2 ? 2 : 1, color: COLORS[r % COLORS.length], alive: true,
      })
    }
    return bricks
  }

  const reset = useCallback((level = 1, score = 0, lives = 3) => {
    g.current = {
      paddle: { x: W / 2 - 45, w: 90 }, laser: false, laserTimer: 0, shots: [],
      balls: [{ x: W / 2, y: H - 60, vx: 150, vy: -260, r: 6 }],
      bricks: buildBricks(level), powers: [],
      score, lives, level, state: 'play', stuck: true,
    }
    setUi({ score, lives, level, state: 'play' })
  }, [])

  useEffect(() => {
    const move = (e) => {
      const s = g.current; if (!s) return
      const cv = canvas.current; const rect = cv.getBoundingClientRect()
      const scale = W / rect.width
      const mx = (e.clientX - rect.left) * scale
      s.paddle.x = Math.max(0, Math.min(W - s.paddle.w, mx - s.paddle.w / 2))
    }
    const click = () => {
      const s = g.current; if (!s) return
      if (s.stuck) { s.stuck = false; Sound.bounce() }
      if (s.laser) s.shots.push({ x: s.paddle.x + 8, y: H - 30 }, { x: s.paddle.x + s.paddle.w - 12, y: H - 30 }) && Sound.laser()
    }
    const key = (e) => {
      const s = g.current; if (!s) return
      if (e.key === 'ArrowLeft') s.paddle.x = Math.max(0, s.paddle.x - 28)
      if (e.key === 'ArrowRight') s.paddle.x = Math.min(W - s.paddle.w, s.paddle.x + 28)
      if (e.key === ' ') { e.preventDefault(); click() }
    }
    const cv = canvas.current
    cv.addEventListener('mousemove', move)
    cv.addEventListener('click', click)
    window.addEventListener('keydown', key)
    return () => { cv.removeEventListener('mousemove', move); cv.removeEventListener('click', click); window.removeEventListener('keydown', key) }
  }, [])

  useRaf((dt) => {
    const s = g.current
    if (!s) { reset(); return }
    if (s.state === 'play') update(dt)
    draw()
  })

  const update = (dt) => {
    const s = g.current, pad = s.paddle
    if (s.laser) { s.laserTimer -= dt; if (s.laserTimer <= 0) s.laser = false }
    // balls
    for (const b of s.balls) {
      if (s.stuck) { b.x = pad.x + pad.w / 2; b.y = H - 60; continue }
      b.x += b.vx * dt; b.y += b.vy * dt
      if (b.x < b.r) { b.x = b.r; b.vx *= -1; Sound.bounce() }
      if (b.x > W - b.r) { b.x = W - b.r; b.vx *= -1; Sound.bounce() }
      if (b.y < b.r) { b.y = b.r; b.vy *= -1; Sound.bounce() }
      // paddle
      if (b.vy > 0 && b.y + b.r >= H - 22 && b.y + b.r <= H - 6 && b.x >= pad.x && b.x <= pad.x + pad.w) {
        const hit = (b.x - (pad.x + pad.w / 2)) / (pad.w / 2)
        const sp = Math.hypot(b.vx, b.vy)
        const ang = hit * 1.05 - Math.PI / 2
        b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp
        b.y = H - 28; Sound.bounce()
      }
      // bricks
      for (const br of s.bricks) {
        if (!br.alive) continue
        if (b.x > br.x - b.r && b.x < br.x + BW + b.r && b.y > br.y - b.r && b.y < br.y + BH + b.r) {
          // resolve axis
          const ox = Math.min(Math.abs(b.x - br.x), Math.abs(b.x - (br.x + BW)))
          const oy = Math.min(Math.abs(b.y - br.y), Math.abs(b.y - (br.y + BH)))
          if (ox < oy) b.vx *= -1; else b.vy *= -1
          br.hp -= 1
          if (br.hp <= 0) {
            br.alive = false; s.score += 100; Sound.pop()
            if (Math.random() < 0.16) dropPower(br.x + BW / 2, br.y)
          } else { s.score += 20; Sound.hit() }
          setUi((u) => ({ ...u, score: s.score }))
          break
        }
      }
    }
    // lost balls
    s.balls = s.balls.filter((b) => b.y - b.r < H)
    if (s.balls.length === 0) {
      s.lives -= 1; Sound.explode()
      if (s.lives < 0) { s.state = 'over'; submitBest(s.score); setUi((u) => ({ ...u, state: 'over' })); return }
      s.balls = [{ x: pad.x + pad.w / 2, y: H - 60, vx: 150, vy: -260, r: 6 }]
      s.stuck = true; s.laser = false; setUi((u) => ({ ...u, lives: s.lives }))
    }
    // shots
    s.shots.forEach((sh) => { sh.y -= 520 * dt })
    for (const sh of s.shots) for (const br of s.bricks) {
      if (br.alive && sh.x > br.x && sh.x < br.x + BW && sh.y < br.y + BH && sh.y > br.y) {
        br.hp -= 1; sh.dead = true
        if (br.hp <= 0) { br.alive = false; s.score += 100; Sound.pop() } else Sound.hit()
        setUi((u) => ({ ...u, score: s.score }))
      }
    }
    s.shots = s.shots.filter((sh) => sh.y > 0 && !sh.dead)
    // powers
    s.powers.forEach((p) => { p.y += 120 * dt })
    for (const p of s.powers) {
      if (p.y > H - 24 && p.y < H - 4 && p.x > pad.x && p.x < pad.x + pad.w) {
        p.dead = true; Sound.coin(); applyPower(p.type)
      }
    }
    s.powers = s.powers.filter((p) => p.y < H && !p.dead)
    // win
    if (s.bricks.every((br) => !br.alive)) {
      Sound.win(); const nl = s.level + 1
      setTimeout(() => reset(nl, s.score + 500, s.lives + 1), 400)
      s.state = 'next'
    }
  }

  const dropPower = (x, y) => {
    const types = ['wide', 'multi', 'laser', 'slow', 'life']
    g.current.powers.push({ x, y, type: types[(Math.random() * types.length) | 0] })
  }
  const applyPower = (t) => {
    const s = g.current
    if (t === 'wide') s.paddle.w = Math.min(150, s.paddle.w + 30)
    else if (t === 'multi') {
      const extra = []
      s.balls.forEach((b) => { for (let i = 0; i < 2; i++) extra.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 300, vy: -260, r: 6 }) })
      s.balls.push(...extra)
    } else if (t === 'laser') { s.laser = true; s.laserTimer = 8 }
    else if (t === 'slow') s.balls.forEach((b) => { b.vx *= 0.75; b.vy *= 0.75 })
    else if (t === 'life') { s.lives += 1; setUi((u) => ({ ...u, lives: s.lives })) }
  }

  const draw = () => {
    const s = g.current, cv = canvas.current; if (!cv || !s) return
    const ctx = cv.getContext('2d')
    ctx.fillStyle = '#07110b'; ctx.fillRect(0, 0, W, H)
    // border frame
    ctx.strokeStyle = '#1f7a2b'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, W - 4, H - 4)
    // bricks
    s.bricks.forEach((br) => {
      if (!br.alive) return
      ctx.fillStyle = br.color; ctx.fillRect(br.x, br.y, BW, BH)
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(br.x, br.y, BW, 4)
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(br.x, br.y + BH - 4, BW, 4)
      if (br.hp > 1) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(br.x + 2, br.y + 2, BW - 4, BH - 4) }
    })
    // paddle
    const pad = s.paddle
    ctx.fillStyle = s.laser ? '#ff3b30' : '#39ff14'
    ctx.fillRect(pad.x, H - 22, pad.w, 12)
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(pad.x, H - 22, pad.w, 4)
    // balls
    s.balls.forEach((b) => {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill()
      ctx.fillStyle = 'rgba(57,255,20,0.5)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 3, 0, 7); ctx.fill()
    })
    // shots
    ctx.fillStyle = '#f9f002'; s.shots.forEach((sh) => ctx.fillRect(sh.x - 2, sh.y, 4, 12))
    // powers
    s.powers.forEach((p) => {
      const c = { wide: '#39ff14', multi: '#29e7cd', laser: '#ff3b30', slow: '#ff9f1c', life: '#ff5db1' }[p.type]
      ctx.fillStyle = c; ctx.fillRect(p.x - 10, p.y - 6, 20, 12)
      ctx.fillStyle = '#04140a'; ctx.font = '8px "Press Start 2P", monospace'
      ctx.fillText(p.type[0].toUpperCase(), p.x - 3, p.y + 3)
    })
    if (s.stuck) {
      ctx.fillStyle = '#f9f002'; ctx.font = '10px "Press Start 2P", monospace'; ctx.textAlign = 'center'
      ctx.fillText('CLICK / SPACE TO LAUNCH', W / 2, H - 80); ctx.textAlign = 'left'
    }
  }

  return (
    <div>
      <HUD>
        <Stat label="SCORE" value={ui.score} />
        <Stat label="LIVES" value={Math.max(0, ui.lives)} color="var(--yellow)" />
        <Stat label="LVL" value={ui.level} color="var(--pink)" />
        <Stat label="BEST" value={best} color="var(--cyan)" />
      </HUD>
      <Screen width={W} height={H} canvasRef={canvas}>
        {ui.state === 'over' && <Overlay title="GAME OVER" sub={`Score ${ui.score}`} color="var(--red)" onRetry={() => { Sound.select(); reset() }} onExit={onExit} />}
      </Screen>
      <p style={{ textAlign: 'center', fontFamily: 'var(--font-term)', fontSize: 20, color: 'var(--green-dim)' }}>
        Move the mouse (or ← →) · click / SPACE to launch &amp; fire lasers
      </p>
    </div>
  )
}
