import { useRef, useState, useCallback } from 'react'
import { useKeys, useRaf, useBestScore, HUD, Stat, Overlay, Screen } from './common.jsx'
import Sound from '../sound.js'

const COLS = 10, ROWS = 20, CELL = 24
const FIELD_W = COLS * CELL, W = FIELD_W + 130, H = ROWS * CELL

// tetromino shapes as rotation-0 cell lists + a color
const SHAPES = {
  I: { c: '#29e7cd', cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { c: '#f9f002', cells: [[1, 0], [2, 0], [1, 1], [2, 1]] },
  T: { c: '#ff5db1', cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  S: { c: '#39ff14', cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { c: '#ff3b30', cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { c: '#3b7bff', cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { c: '#ff9f1c', cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
}
const KEYS = Object.keys(SHAPES)

function rotate(cells) { return cells.map(([x, y]) => [-y + 2, x]) } // rotate around ~center

export default function Tetris({ onExit }) {
  const [best, submitBest] = useBestScore('tetris')
  const [ui, setUi] = useState({ score: 0, lines: 0, level: 1, over: false })
  const g = useRef(null)

  const reset = useCallback(() => {
    const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null))
    g.current = {
      grid, cur: null, next: KEYS[(Math.random() * 7) | 0],
      cx: 0, cy: 0, cells: [], color: '', drop: 0, speed: 0.8,
      score: 0, lines: 0, level: 1, over: false, das: 0, softTimer: 0,
    }
    spawn()
    setUi({ score: 0, lines: 0, level: 1, over: false })
  }, [])

  const spawn = () => {
    const s = g.current
    const key = s.next
    s.next = KEYS[(Math.random() * 7) | 0]
    s.cells = SHAPES[key].cells.map((c) => [...c])
    s.color = SHAPES[key].c
    s.cx = 3; s.cy = 0
    if (collide(s.cells, s.cx, s.cy)) {
      s.over = true; Sound.gameover(); submitBest(s.score)
      setUi({ score: s.score, lines: s.lines, level: s.level, over: true })
    }
  }

  const collide = (cells, ox, oy) => {
    const { grid } = g.current
    return cells.some(([x, y]) => {
      const gx = x + ox, gy = y + oy
      return gx < 0 || gx >= COLS || gy >= ROWS || (gy >= 0 && grid[gy][gx])
    })
  }

  const lock = () => {
    const s = g.current
    s.cells.forEach(([x, y]) => { if (y + s.cy >= 0) s.grid[y + s.cy][x + s.cx] = s.color })
    // clear lines
    let cleared = 0
    for (let y = ROWS - 1; y >= 0; y--) {
      if (s.grid[y].every((c) => c)) {
        s.grid.splice(y, 1); s.grid.unshift(Array(COLS).fill(null)); cleared++; y++
      }
    }
    if (cleared) {
      s.lines += cleared
      s.score += [0, 100, 300, 500, 800][cleared] * s.level
      s.level = 1 + Math.floor(s.lines / 10)
      s.speed = Math.max(0.08, 0.8 - (s.level - 1) * 0.07)
      cleared === 4 ? Sound.clear() : Sound.combo(cleared)
      setUi({ score: s.score, lines: s.lines, level: s.level, over: false })
    } else Sound.hit()
    spawn()
  }

  const step = (dir) => {
    const s = g.current
    if (!collide(s.cells, s.cx + dir, s.cy)) { s.cx += dir; Sound.step() }
  }
  const softDrop = () => {
    const s = g.current
    if (!collide(s.cells, s.cx, s.cy + 1)) { s.cy++; s.score += 1 } else lock()
  }
  const hardDrop = () => {
    const s = g.current
    let d = 0
    while (!collide(s.cells, s.cx, s.cy + 1)) { s.cy++; d++ }
    s.score += d * 2; Sound.pop(); lock()
  }
  const rot = () => {
    const s = g.current
    const r = rotate(s.cells)
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!collide(r, s.cx + kick, s.cy)) { s.cells = r; s.cx += kick; Sound.move(); return }
    }
  }

  useKeys((k) => {
    const s = g.current
    if (!s || s.over) return
    if (k === 'ArrowLeft') step(-1)
    else if (k === 'ArrowRight') step(1)
    else if (k === 'ArrowUp' || k === 'x' || k === 'X') rot()
    else if (k === 'ArrowDown') softDrop()
    else if (k === ' ') hardDrop()
  })

  useRaf((dt) => {
    const s = g.current
    if (!s) { reset(); return }
    if (!s.over) {
      // auto-repeat horizontal via held keys handled by keydown; gravity here
      s.drop += dt
      if (s.drop >= s.speed) { s.drop = 0; softDrop() }
    }
    draw()
  })

  const draw = () => {
    const s = g.current
    const cv = canvas.current; if (!cv || !s) return
    const ctx = cv.getContext('2d')
    ctx.fillStyle = '#0b1a0e'; ctx.fillRect(0, 0, W, H)
    // grid lines
    ctx.strokeStyle = '#12331a'; ctx.lineWidth = 1
    for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); ctx.stroke() }
    for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(FIELD_W, y * CELL); ctx.stroke() }
    // settled
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (s.grid[y][x]) block(ctx, x, y, s.grid[y][x])
    // ghost
    if (!s.over) {
      let gy = s.cy; while (!collide(s.cells, s.cx, gy + 1)) gy++
      s.cells.forEach(([x, y]) => { ctx.globalAlpha = 0.22; block(ctx, x + s.cx, y + gy, s.color); ctx.globalAlpha = 1 })
      s.cells.forEach(([x, y]) => block(ctx, x + s.cx, y + s.cy, s.color))
    }
    // sidebar
    ctx.fillStyle = '#081308'; ctx.fillRect(FIELD_W, 0, 130, H)
    ctx.fillStyle = '#f9f002'; ctx.font = '10px "Press Start 2P", monospace'
    ctx.fillText('NEXT', FIELD_W + 22, 34)
    const n = SHAPES[s.next]
    n.cells.forEach(([x, y]) => {
      ctx.fillStyle = n.c
      ctx.fillRect(FIELD_W + 28 + x * 18, 50 + y * 18, 16, 16)
    })
  }
  const block = (ctx, x, y, c) => {
    const px = x * CELL, py = y * CELL
    ctx.fillStyle = c; ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(px + 1, py + 1, CELL - 2, 4)
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(px + 1, py + CELL - 5, CELL - 2, 4)
  }

  const canvas = useRef(null)

  return (
    <div>
      <HUD>
        <Stat label="SCORE" value={ui.score} />
        <Stat label="LINES" value={ui.lines} color="var(--yellow)" />
        <Stat label="LEVEL" value={ui.level} color="var(--pink)" />
        <Stat label="BEST" value={best} color="var(--cyan)" />
      </HUD>
      <Screen width={W} height={H} canvasRef={canvas}>
        {ui.over && (
          <Overlay title="GAME OVER" sub={`Score ${ui.score}`} color="var(--red)"
            onRetry={() => { Sound.select(); reset() }} onExit={onExit} />
        )}
      </Screen>
      <p style={{ textAlign: 'center', fontFamily: 'var(--font-term)', fontSize: 20, color: 'var(--green-dim)' }}>
        ← → move &nbsp;·&nbsp; ↑ rotate &nbsp;·&nbsp; ↓ soft drop &nbsp;·&nbsp; SPACE hard drop
      </p>
    </div>
  )
}
