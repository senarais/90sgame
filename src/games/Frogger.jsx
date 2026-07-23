import { useRef, useState, useCallback } from 'react'
import { useKeys, useRaf, useBestScore, HUD, Stat, Overlay, Screen } from './common.jsx'
import Sound from '../sound.js'

const CELL = 40, COLS = 13, ROWS = 14
const W = COLS * CELL, H = ROWS * CELL

// lane config by row (0 = top goal). type: safe / road / water / goal
const LANES = [
  { row: 0, type: 'goal' },
  { row: 1, type: 'water', dir: 1, speed: 60, gap: 3, len: 3, kind: 'log' },
  { row: 2, type: 'water', dir: -1, speed: 90, gap: 3, len: 2, kind: 'turtle' },
  { row: 3, type: 'water', dir: 1, speed: 70, gap: 4, len: 4, kind: 'log' },
  { row: 4, type: 'water', dir: -1, speed: 110, gap: 3, len: 2, kind: 'turtle' },
  { row: 5, type: 'water', dir: 1, speed: 85, gap: 3, len: 3, kind: 'log' },
  { row: 6, type: 'safe' },
  { row: 7, type: 'road', dir: -1, speed: 120, gap: 3, len: 1, kind: 'car', color: '#ff5db1' },
  { row: 8, type: 'road', dir: 1, speed: 90, gap: 4, len: 1, kind: 'car', color: '#29e7cd' },
  { row: 9, type: 'road', dir: -1, speed: 150, gap: 5, len: 1, kind: 'truck', color: '#f9f002' },
  { row: 10, type: 'road', dir: 1, speed: 70, gap: 3, len: 1, kind: 'car', color: '#ff9f1c' },
  { row: 11, type: 'road', dir: -1, speed: 110, gap: 4, len: 2, kind: 'truck', color: '#ff3b30' },
  { row: 12, type: 'safe' },
  { row: 13, type: 'safe' },
]

export default function Frogger({ onExit }) {
  const [best, submitBest] = useBestScore('frogger')
  const [ui, setUi] = useState({ score: 0, lives: 3, homes: 0, state: 'play' })
  const g = useRef(null)
  const canvas = useRef(null)

  const spawnLanes = (speedMul) => LANES.map((l) => {
    if (l.type === 'safe' || l.type === 'goal') return { ...l, items: [] }
    const items = []
    const period = l.len + l.gap
    for (let i = -1; i < COLS + period; i += period) items.push({ x: i * CELL })
    return { ...l, items, speed: l.speed * speedMul }
  })

  const reset = useCallback((score = 0, lives = 3, level = 1) => {
    g.current = {
      frog: { c: 6, r: 13, onLog: null, x: 6 * CELL },
      lanes: spawnLanes(1 + (level - 1) * 0.25),
      homes: [false, false, false, false, false], homeCols: [1, 3.5, 6, 8.5, 11],
      score, lives, level, state: 'play', timer: 30, hopTimer: 0,
    }
    setUi({ score, lives, homes: 0, state: 'play' })
  }, [])

  const hop = (dc, dr) => {
    const s = g.current, f = s.frog
    const nc = f.c + dc, nr = f.r + dr
    if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) return
    f.c = nc; f.r = nr; f.x = nc * CELL; f.onLog = null; f.hop = 1
    if (dr < 0) { s.score += 10; setUi((u) => ({ ...u, score: s.score })) }
    Sound.jump()
  }

  useKeys((k) => {
    const s = g.current; if (!s || s.state !== 'play') return
    if (k === 'ArrowUp') hop(0, -1)
    else if (k === 'ArrowDown') hop(0, 1)
    else if (k === 'ArrowLeft') hop(-1, 0)
    else if (k === 'ArrowRight') hop(1, 0)
  })

  useRaf((dt) => {
    const s = g.current
    if (!s) { reset(); return }
    if (s.state === 'play') update(dt)
    draw()
  })

  const die = () => {
    const s = g.current
    s.lives -= 1; Sound.explode()
    if (s.lives < 0) { s.state = 'over'; submitBest(s.score); setUi((u) => ({ ...u, state: 'over' })); return }
    s.frog = { c: 6, r: 13, onLog: null, x: 6 * CELL }; s.timer = 30
    setUi((u) => ({ ...u, lives: s.lives }))
  }

  const update = (dt) => {
    const s = g.current, f = s.frog
    if (f.hop) f.hop = Math.max(0, f.hop - dt * 6)
    s.timer -= dt
    if (s.timer <= 0) { die(); return }
    // move lane items
    s.lanes.forEach((l) => {
      if (!l.items) return
      const span = (COLS + l.len + l.gap) * CELL
      l.items.forEach((it) => {
        it.x += l.dir * l.speed * dt
        if (l.dir > 0 && it.x > W + l.gap * CELL) it.x -= span
        if (l.dir < 0 && it.x < -(l.len + l.gap) * CELL) it.x += span
      })
    })
    // frog logic per lane
    const lane = s.lanes[f.r]
    if (lane.type === 'water') {
      // must be on a log/turtle
      let riding = null
      for (const it of lane.items) {
        if (f.x + CELL * 0.5 > it.x && f.x + CELL * 0.5 < it.x + lane.len * CELL) { riding = it; break }
      }
      if (riding) { f.x += lane.dir * lane.speed * dt; f.c = Math.round(f.x / CELL) }
      else { die(); return }
      if (f.x < -CELL / 2 || f.x > W - CELL / 2) { die(); return }
    } else if (lane.type === 'road') {
      for (const it of lane.items) {
        if (f.x + CELL * 0.75 > it.x && f.x + CELL * 0.25 < it.x + lane.len * CELL) { die(); return }
      }
    } else if (lane.type === 'goal') {
      // reached top row: check home slot
      let landed = -1
      s.homeCols.forEach((hc, i) => { if (!s.homes[i] && Math.abs(f.x / CELL - hc) < 0.9) landed = i })
      if (landed >= 0) {
        s.homes[landed] = true; s.score += 100 + Math.ceil(s.timer) * 2
        Sound.win()
        f.c = 6; f.r = 13; f.x = 6 * CELL; s.timer = 30
        const done = s.homes.filter(Boolean).length
        setUi((u) => ({ ...u, score: s.score, homes: done }))
        if (done >= 5) { setTimeout(() => reset(s.score + 500, s.lives, s.level + 1), 500); s.state = 'next' }
      } else { die(); return }
    }
  }

  const draw = () => {
    const s = g.current, cv = canvas.current; if (!cv || !s) return
    const ctx = cv.getContext('2d')
    // backgrounds per lane
    s.lanes.forEach((l) => {
      const y = l.row * CELL
      ctx.fillStyle = l.type === 'water' ? '#0a2f5a' : l.type === 'road' ? '#181818'
        : l.type === 'goal' ? '#0d3a16' : '#123a1c'
      ctx.fillRect(0, y, W, CELL)
      if (l.type === 'road') { ctx.strokeStyle = '#f9f00255'; ctx.lineWidth = 2; ctx.setLineDash([12, 12]); ctx.beginPath(); ctx.moveTo(0, y + CELL / 2); ctx.lineTo(W, y + CELL / 2); ctx.stroke(); ctx.setLineDash([]) }
    })
    // goal homes
    s.homeCols.forEach((hc, i) => {
      const x = hc * CELL
      ctx.fillStyle = s.homes[i] ? '#39ff14' : '#0a1c0d'
      ctx.fillRect(x + 4, 4, CELL - 8, CELL - 8)
      if (s.homes[i]) { ctx.fillStyle = '#04140a'; ctx.font = '18px monospace'; ctx.textAlign = 'center'; ctx.fillText('🐸', x + CELL / 2, y0(0)) ; ctx.textAlign = 'left' }
    })
    // lane items
    s.lanes.forEach((l) => {
      if (!l.items) return
      const y = l.row * CELL
      l.items.forEach((it) => {
        if (l.kind === 'log' || l.kind === 'turtle') {
          ctx.fillStyle = l.kind === 'log' ? '#7a4a1e' : '#2e8b57'
          roundRect(ctx, it.x + 2, y + 6, l.len * CELL - 4, CELL - 12, 8); ctx.fill()
          if (l.kind === 'turtle') { ctx.fillStyle = '#1e6b3a'; for (let k = 0; k < l.len; k++) { ctx.beginPath(); ctx.arc(it.x + k * CELL + CELL / 2, y + CELL / 2, CELL / 3, 0, 7); ctx.fill() } }
        } else {
          ctx.fillStyle = l.color
          roundRect(ctx, it.x + 3, y + 6, l.len * CELL - 6, CELL - 12, 5); ctx.fill()
          ctx.fillStyle = '#ffffff66'; ctx.fillRect(it.x + 6, y + 9, l.len * CELL - 12, 4)
        }
      })
    })
    // frog
    const f = s.frog
    const fy = f.r * CELL - (f.hop || 0) * 6
    ctx.fillStyle = '#39ff14'
    ctx.beginPath(); ctx.arc(f.x + CELL / 2, fy + CELL / 2, CELL / 2 - 6, 0, 7); ctx.fill()
    ctx.fillStyle = '#0d3a16'
    ctx.fillRect(f.x + 10, fy + 12, 5, 5); ctx.fillRect(f.x + CELL - 15, fy + 12, 5, 5)
    // timer bar
    ctx.fillStyle = '#04140a'; ctx.fillRect(0, H - 6, W, 6)
    ctx.fillStyle = s.timer < 8 ? '#ff3b30' : '#f9f002'; ctx.fillRect(0, H - 6, W * (s.timer / 30), 6)
  }
  const y0 = (r) => r * CELL + CELL / 2 + 6
  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath(); ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
  }

  return (
    <div>
      <HUD>
        <Stat label="SCORE" value={ui.score} />
        <Stat label="LIVES" value={Math.max(0, ui.lives)} color="var(--yellow)" />
        <Stat label="HOME" value={`${ui.homes}/5`} color="var(--pink)" />
        <Stat label="BEST" value={best} color="var(--cyan)" />
      </HUD>
      <Screen width={W} height={H} canvasRef={canvas}>
        {ui.state === 'over' && <Overlay title="SPLAT!" sub={`Score ${ui.score}`} color="var(--red)" onRetry={() => { Sound.select(); reset() }} onExit={onExit} />}
      </Screen>
      <p style={{ textAlign: 'center', fontFamily: 'var(--font-term)', fontSize: 20, color: 'var(--green-dim)' }}>
        Arrow keys to hop · cross the road, ride the logs, fill all 5 homes
      </p>
    </div>
  )
}
