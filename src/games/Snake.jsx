import { useRef, useState, useCallback } from 'react'
import { useKeys, useRaf, useBestScore, HUD, Stat, Overlay, Screen } from './common.jsx'
import Sound from '../sound.js'

const COLS = 22, ROWS = 16, CELL = 20
const W = COLS * CELL, H = ROWS * CELL
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' }
// grid steps per second get faster as you eat: interval shrinks toward the floor
const STEP_START = 0.15, STEP_MIN = 0.06, STEP_DROP = 0.005

// rounded-rect path helper (chunky snake segments)
const rr = (ctx, x, y, w, h, r) => {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export default function Snake({ onExit }) {
  const [best, submitBest] = useBestScore('snake')
  const [ui, setUi] = useState({ score: 0, len: 3, state: 'play' })
  const g = useRef(null)
  const canvas = useRef(null)

  // place food on a random empty cell; false => board is full (a win)
  const spawnFood = (s) => {
    const occupied = new Set(s.snake.map((seg) => seg.y * COLS + seg.x))
    const empty = []
    for (let i = 0; i < COLS * ROWS; i++) if (!occupied.has(i)) empty.push(i)
    if (!empty.length) { s.food = null; return false }
    const cell = empty[(Math.random() * empty.length) | 0]
    s.food = { x: cell % COLS, y: (cell / COLS) | 0 }
    return true
  }

  const reset = useCallback(() => {
    const cy = ROWS >> 1
    // head first; starts length-3 heading right, well clear of the walls
    const snake = [{ x: 5, y: cy }, { x: 4, y: cy }, { x: 3, y: cy }]
    const s = {
      snake, dir: 'right', queue: [], food: null,
      step: STEP_START, acc: 0, score: 0, state: 'play', eatFlash: 0, time: 0,
    }
    g.current = s
    spawnFood(s)
    setUi({ score: 0, len: snake.length, state: 'play' })
  }, [])

  // Queue turns, validating each against the PREVIOUS queued heading (not just
  // the live one) so two quick taps within one tick can never fold into a 180.
  const turn = (nd) => {
    const s = g.current; if (!s || s.state !== 'play') return
    const last = s.queue.length ? s.queue[s.queue.length - 1] : s.dir
    if (nd === last || nd === OPP[last]) return
    if (s.queue.length < 2) s.queue.push(nd)
  }

  useKeys((k) => {
    if (k === 'ArrowUp' || k === 'w' || k === 'W') turn('up')
    else if (k === 'ArrowDown' || k === 's' || k === 'S') turn('down')
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') turn('left')
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') turn('right')
  })

  const die = () => {
    const s = g.current
    s.state = 'over'; Sound.hit(); submitBest(s.score)
    setUi((u) => ({ ...u, state: 'over' }))
  }
  const win = () => {
    const s = g.current
    s.state = 'win'; submitBest(s.score)
    setUi((u) => ({ ...u, score: s.score, len: s.snake.length, state: 'win' }))
  }

  const tick = () => {
    const s = g.current
    if (s.queue.length) s.dir = s.queue.shift()
    const [dx, dy] = DIRS[s.dir]
    const head = s.snake[0]
    const nh = { x: head.x + dx, y: head.y + dy }
    // walls are deadly
    if (nh.x < 0 || nh.x >= COLS || nh.y < 0 || nh.y >= ROWS) return die()
    const eating = s.food && nh.x === s.food.x && nh.y === s.food.y
    // self-collision: the tail cell frees up this tick unless we're growing
    const bodyLen = eating ? s.snake.length : s.snake.length - 1
    for (let i = 0; i < bodyLen; i++) {
      if (s.snake[i].x === nh.x && s.snake[i].y === nh.y) return die()
    }
    s.snake.unshift(nh)
    if (eating) {
      s.score += 10; s.eatFlash = 0.18
      s.step = Math.max(STEP_MIN, s.step - STEP_DROP)
      Sound.pop()
      if (!spawnFood(s)) { win(); return }
      setUi((u) => ({ ...u, score: s.score, len: s.snake.length }))
    } else {
      s.snake.pop()
    }
  }

  useRaf((dt) => {
    const s = g.current
    if (!s) { reset(); return }
    if (s.state === 'play') {
      s.time += dt
      if (s.eatFlash > 0) s.eatFlash -= dt
      s.acc += dt
      // fixed-step catch-up (dt is capped in useRaf, so at most a couple ticks)
      while (s.acc >= s.step && s.state === 'play') { s.acc -= s.step; tick() }
    }
    draw()
  })

  const draw = () => {
    const s = g.current, cv = canvas.current; if (!cv || !s) return
    const ctx = cv.getContext('2d')
    ctx.fillStyle = '#08130c'; ctx.fillRect(0, 0, W, H)
    // faint grid dots
    ctx.fillStyle = 'rgba(57,255,20,0.06)'
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      ctx.fillRect(x * CELL + CELL / 2 - 1, y * CELL + CELL / 2 - 1, 2, 2)
    }
    // deadly boundary
    ctx.strokeStyle = '#1c5a2a'; ctx.lineWidth = 3
    ctx.strokeRect(1.5, 1.5, W - 3, H - 3)

    // food — pulsing apple with a shine and a little stem
    if (s.food) {
      const fx = s.food.x * CELL + CELL / 2, fy = s.food.y * CELL + CELL / 2
      const r = CELL * 0.34 * (1 + Math.sin(s.time * 8) * 0.12)
      ctx.shadowColor = '#ff3b30'; ctx.shadowBlur = 12
      ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.arc(fx, fy, r, 0, 7); ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.arc(fx - r * 0.3, fy - r * 0.3, r * 0.26, 0, 7); ctx.fill()
      ctx.fillStyle = '#39ff14'; ctx.fillRect(fx - 1, fy - r - 3, 2, 4)
    }

    // snake — tail first so the head sits on top; colour dims toward the tail
    const n = s.snake.length
    for (let i = n - 1; i >= 0; i--) {
      const seg = s.snake[i]
      const t = n > 1 ? i / (n - 1) : 0
      const cr = Math.round(57 - t * 30), cg = Math.round(255 - t * 150), cb = Math.round(20 + t * 20)
      const isHead = i === 0
      const pad = isHead ? 1.5 : 2.5
      const x = seg.x * CELL + pad, y = seg.y * CELL + pad, sz = CELL - pad * 2
      if (isHead) { ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 12 }
      ctx.fillStyle = (isHead && s.eatFlash > 0) ? '#eafff0' : `rgb(${cr},${cg},${cb})`
      rr(ctx, x, y, sz, sz, isHead ? 6 : 5); ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = 'rgba(255,255,255,0.16)'
      rr(ctx, x + 2, y + 2, sz - 4, (sz - 4) * 0.4, 3); ctx.fill()
    }
    // eyes on the head, tracking the direction of travel
    const head = s.snake[0]
    const hcx = head.x * CELL + CELL / 2, hcy = head.y * CELL + CELL / 2
    const [dx, dy] = DIRS[s.dir], px = -dy, py = dx
    for (const sgn of [1, -1]) {
      const ex = hcx + dx * 3 + px * sgn * 3.5, ey = hcy + dy * 3 + py * sgn * 3.5
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, 2.6, 0, 7); ctx.fill()
      ctx.fillStyle = '#06210d'; ctx.beginPath(); ctx.arc(ex + dx * 1.1, ey + dy * 1.1, 1.3, 0, 7); ctx.fill()
    }
  }

  return (
    <div>
      <HUD>
        <Stat label="SCORE" value={ui.score} />
        <Stat label="LEN" value={ui.len} color="var(--yellow)" />
        <Stat label="BEST" value={best} color="var(--cyan)" />
      </HUD>
      <Screen width={W} height={H} canvasRef={canvas}>
        {ui.state === 'over' && <Overlay title="GAME OVER" sub={`Score ${ui.score}`} color="var(--red)" onRetry={() => { Sound.select(); reset() }} onExit={onExit} />}
        {ui.state === 'win' && <Overlay title="PERFECT!" sub={`You filled the board · Score ${ui.score}`} color="var(--green)" onRetry={() => { Sound.select(); reset() }} onExit={onExit} />}
      </Screen>
      <p style={{ textAlign: 'center', fontFamily: 'var(--font-term)', fontSize: 20, color: 'var(--green-dim)' }}>
        ↑ ↓ ← → or WASD to steer · eat the apples · don't hit the walls or your own tail
      </p>
    </div>
  )
}
