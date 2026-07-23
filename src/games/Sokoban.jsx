import { useRef, useState, useCallback, useEffect } from 'react'
import { useKeys, useBestScore, HUD, Stat, Overlay, Screen } from './common.jsx'
import Sound from '../sound.js'

// # wall · space floor · . goal · $ box · * box on goal · @ player · + player on goal
const LEVELS = [
  [
    '#######',
    '#     #',
    '# .   #',
    '# $@  #',
    '#     #',
    '#######',
  ],
  [
    '#######',
    '#  .  #',
    '#  $  #',
    '# $@. #',
    '#     #',
    '#######',
  ],
  [
    '########',
    '#      #',
    '# .$.$ #',
    '#  @   #',
    '# .$   #',
    '#      #',
    '########',
  ],
  [
    '########',
    '#      #',
    '# .$@$.#',
    '# .$ $.#',
    '#      #',
    '########',
  ],
]

export default function Sokoban({ onExit }) {
  const [best] = useBestScore('sokoban')
  const [lvl, setLvl] = useState(0)
  const [moves, setMoves] = useState(0)
  const [pushes, setPushes] = useState(0)
  const [won, setWon] = useState(false)
  const g = useRef(null)
  const canvas = useRef(null)
  const [, force] = useState(0)

  const parse = (rows) => {
    const w = Math.max(...rows.map((r) => r.length))
    const walls = [], goals = new Set(), boxes = new Set()
    let player = { x: 0, y: 0 }
    const grid = rows.map((r) => r.padEnd(w, ' '))
    grid.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '#') walls.push(`${x},${y}`)
      if (ch === '.' || ch === '*' || ch === '+') goals.add(`${x},${y}`)
      if (ch === '$' || ch === '*') boxes.add(`${x},${y}`)
      if (ch === '@' || ch === '+') player = { x, y }
    }))
    return { w, h: grid.length, walls: new Set(walls), goals, boxes: new Set(boxes), player }
  }

  const load = useCallback((i) => {
    const st = parse(LEVELS[i])
    g.current = { ...st, history: [] }
    setMoves(0); setPushes(0); setWon(false); setLvl(i); force((n) => n + 1)
  }, [])

  useEffect(() => { load(0) }, [load])

  const key = (x, y) => `${x},${y}`
  const isWall = (x, y) => g.current.walls.has(key(x, y))

  const tryMove = (dx, dy) => {
    const s = g.current; if (!s || won) return
    const { player, boxes } = s
    const nx = player.x + dx, ny = player.y + dy
    if (isWall(nx, ny)) { Sound.deny(); return }
    let pushed = false
    if (boxes.has(key(nx, ny))) {
      const bx = nx + dx, by = ny + dy
      if (isWall(bx, by) || boxes.has(key(bx, by))) { Sound.deny(); return }
      boxes.delete(key(nx, ny)); boxes.add(key(bx, by)); pushed = true; Sound.push()
    } else Sound.step()
    s.history.push({ player: { ...player }, boxes: new Set(boxes), pushed })
    s.player = { x: nx, y: ny }
    setMoves((m) => m + 1)
    if (pushed) setPushes((p) => p + 1)
    force((n) => n + 1)
    // win check
    if ([...s.goals].every((gk) => boxes.has(gk))) {
      setWon(true); Sound.win()
    }
  }

  const undo = () => {
    const s = g.current; if (!s || !s.history.length) return
    const last = s.history.pop()
    s.player = last.player; s.boxes = last.boxes
    setMoves((m) => Math.max(0, m - 1)); if (last.pushed) setPushes((p) => Math.max(0, p - 1))
    Sound.back(); force((n) => n + 1)
  }

  useKeys((k) => {
    if (k === 'ArrowUp' || k === 'w') tryMove(0, -1)
    else if (k === 'ArrowDown' || k === 's') tryMove(0, 1)
    else if (k === 'ArrowLeft' || k === 'a') tryMove(-1, 0)
    else if (k === 'ArrowRight' || k === 'd') tryMove(1, 0)
    else if (k === 'z' || k === 'u') undo()
    else if (k === 'r') load(lvl)
  })

  const s = g.current
  const CELL = s ? Math.floor(Math.min(440 / s.w, 400 / s.h)) : 40
  const W = s ? s.w * CELL : 440, H = s ? s.h * CELL : 400

  useEffect(() => {
    const cv = canvas.current; if (!cv || !s) return
    const ctx = cv.getContext('2d')
    ctx.fillStyle = '#0b1a0e'; ctx.fillRect(0, 0, cv.width, cv.height)
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      const k = key(x, y)
      if (s.walls.has(k)) {
        ctx.fillStyle = '#1f7a2b'; ctx.fillRect(x * CELL, y * CELL, CELL, CELL)
        ctx.fillStyle = '#0d3a16'; ctx.fillRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4)
        ctx.strokeStyle = '#39ff1433'; ctx.strokeRect(x * CELL + 4, y * CELL + 4, CELL - 8, CELL - 8)
      }
      if (s.goals.has(k)) {
        ctx.fillStyle = '#f9f002'; ctx.beginPath()
        ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, CELL * 0.16, 0, 7); ctx.fill()
      }
    }
    // boxes
    s.boxes.forEach((bk) => {
      const [x, y] = bk.split(',').map(Number)
      const onGoal = s.goals.has(bk)
      ctx.fillStyle = onGoal ? '#39ff14' : '#ff9f1c'
      ctx.fillRect(x * CELL + 5, y * CELL + 5, CELL - 10, CELL - 10)
      ctx.strokeStyle = '#04140a'; ctx.lineWidth = 3; ctx.strokeRect(x * CELL + 5, y * CELL + 5, CELL - 10, CELL - 10)
      ctx.beginPath(); ctx.moveTo(x * CELL + 5, y * CELL + 5); ctx.lineTo(x * CELL + CELL - 5, y * CELL + CELL - 5)
      ctx.moveTo(x * CELL + CELL - 5, y * CELL + 5); ctx.lineTo(x * CELL + 5, y * CELL + CELL - 5); ctx.stroke()
    })
    // player
    const p = s.player
    ctx.fillStyle = '#29e7cd'
    ctx.beginPath(); ctx.arc(p.x * CELL + CELL / 2, p.y * CELL + CELL / 2, CELL * 0.32, 0, 7); ctx.fill()
    ctx.fillStyle = '#04140a'; ctx.fillRect(p.x * CELL + CELL / 2 - 6, p.y * CELL + CELL / 2 - 4, 4, 5)
    ctx.fillRect(p.x * CELL + CELL / 2 + 2, p.y * CELL + CELL / 2 - 4, 4, 5)
  })

  const nextLevel = () => load((lvl + 1) % LEVELS.length)

  return (
    <div>
      <HUD>
        <Stat label="LEVEL" value={`${lvl + 1}/${LEVELS.length}`} />
        <Stat label="MOVES" value={moves} color="var(--yellow)" />
        <Stat label="PUSHES" value={pushes} color="var(--pink)" />
      </HUD>
      <Screen width={W} height={H} canvasRef={canvas} style={{ maxHeight: '60vh' }}>
        {won && <Overlay title="SOLVED!" sub={`${moves} moves`} color="var(--green)"
          onRetry={nextLevel} onExit={onExit} tips="Next level →" />}
      </Screen>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
        <button className="btn ghost" onClick={() => { undo() }}>↶ Undo (Z)</button>
        <button className="btn ghost" onClick={() => load(lvl)}>⟳ Reset (R)</button>
        <button className="btn ghost" onClick={nextLevel}>Skip →</button>
      </div>
      <p style={{ textAlign: 'center', fontFamily: 'var(--font-term)', fontSize: 20, color: 'var(--green-dim)' }}>
        Arrows/WASD push boxes onto the ★ goals · Z undo · R reset · best solve: {best || '—'}
      </p>
    </div>
  )
}
