import { useRef, useState, useCallback } from 'react'
import { useKeys, useRaf, useBestScore, HUD, Stat, Overlay, Screen } from './common.jsx'
import Sound from '../sound.js'

// # wall · . pellet · o power · = ghost door · P pac start · space = void
const MAZE = [
  '###################',
  '#........#........#',
  '#o##.###.#.###.##o#',
  '#.................#',
  '#.##.#.#####.#.##.#',
  '#....#...#...#....#',
  '####.###.#.###.####',
  '   #.#.......#.#   ',
  '####.#.##=##.#.####',
  '#......#   #......#',
  '####.#.#####.#.####',
  '   #.#.......#.#   ',
  '####.#.#####.#.####',
  '#........#........#',
  '#o##.###.#.###.##o#',
  '#..#.....P.....#..#',
  '##.#.#.#####.#.#.##',
  '#....#...#...#....#',
  '#.######.#.######.#',
  '#.................#',
  '###################',
]
const ROWS = MAZE.length, COLS = MAZE[0].length, CELL = 20
const W = COLS * CELL, H = ROWS * CELL
const isWall = (c, r) => {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true
  const ch = MAZE[r][c]
  return ch === '#' || ch === '='
}
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' }

export default function PacMan({ onExit }) {
  const [best, submitBest] = useBestScore('pacman')
  const [ui, setUi] = useState({ score: 0, lives: 3, state: 'play' })
  const g = useRef(null)
  const canvas = useRef(null)

  const reset = useCallback(() => {
    const dots = MAZE.map((row) => row.split('').map((ch) => (ch === '.' ? 1 : ch === 'o' ? 2 : 0)))
    let total = 0
    dots.forEach((row) => row.forEach((d) => { if (d) total++ }))
    let pac = { c: 9, r: 15 }
    g.current = {
      dots, total, eaten: 0,
      pac: { tc: pac.c, tr: pac.r, nc: pac.c, nr: pac.r, p: 0, dir: 'left', want: 'left', mouth: 0 },
      ghosts: makeGhosts(),
      power: 0, score: 0, lives: 3, state: 'play', ghostScore: 200,
      scatter: 0, mode: 'scatter', modeTimer: 7, blink: 0,
    }
    setUi({ score: 0, lives: 3, state: 'play' })
  }, [])

  const makeGhosts = () => ([
    { name: 'blinky', color: '#ff3b30', tc: 9, tr: 9, nc: 9, nr: 9, p: 0, dir: 'up', mode: 'chase', corner: [COLS - 2, 0], home: [9, 9], out: true },
    { name: 'pinky', color: '#ff5db1', tc: 8, tr: 9, nc: 8, nr: 9, p: 0, dir: 'up', mode: 'chase', corner: [1, 0], home: [9, 9], out: true },
    { name: 'inky', color: '#29e7cd', tc: 10, tr: 9, nc: 10, nr: 9, p: 0, dir: 'up', mode: 'chase', corner: [COLS - 2, ROWS - 1], home: [9, 9], out: true },
    { name: 'clyde', color: '#ff9f1c', tc: 9, tr: 9, nc: 9, nr: 9, p: 0, dir: 'up', mode: 'chase', corner: [1, ROWS - 1], home: [9, 9], out: true },
  ])

  const openDirs = (c, r, exclude) => Object.keys(DIRS).filter((d) => {
    if (d === exclude) return false
    return !isWall(c + DIRS[d][0], r + DIRS[d][1])
  })

  const wrap = (c) => ((c % COLS) + COLS) % COLS

  const moveEntity = (e, speed, dt, chooseDir) => {
    e.p += speed * dt
    while (e.p >= 1) {
      e.p -= 1
      e.tc = e.nc; e.tr = e.nr
      const nd = chooseDir(e)
      e.dir = nd
      let nc = e.tc + DIRS[nd][0], nr = e.tr + DIRS[nd][1]
      nc = wrap(nc)
      e.nc = nc; e.nr = nr
    }
  }

  const pacChoose = (e) => {
    const s = g.current
    // try wanted direction
    if (!isWall(e.tc + DIRS[e.want][0], e.tr + DIRS[e.want][1])) return e.want
    if (!isWall(e.tc + DIRS[e.dir][0], e.tr + DIRS[e.dir][1])) return e.dir
    return e.dir // stuck: will re-eval; effectively stops (nc==tc? handle)
  }

  const ghostChoose = (gh) => {
    const s = g.current
    if (gh.mode === 'frightened') {
      const opts = openDirs(gh.tc, gh.tr, OPP[gh.dir])
      return opts.length ? opts[(Math.random() * opts.length) | 0] : OPP[gh.dir]
    }
    // target tile
    let target
    if (gh.mode === 'eaten') target = gh.home
    else if (s.mode === 'scatter') target = gh.corner
    else target = ghostTarget(gh)
    const opts = openDirs(gh.tc, gh.tr, OPP[gh.dir])
    if (!opts.length) return OPP[gh.dir]
    let best = opts[0], bd = Infinity
    for (const d of opts) {
      const nc = gh.tc + DIRS[d][0], nr = gh.tr + DIRS[d][1]
      const dist = (nc - target[0]) ** 2 + (nr - target[1]) ** 2
      if (dist < bd) { bd = dist; best = d }
    }
    return best
  }

  const ghostTarget = (gh) => {
    const s = g.current, p = s.pac
    const ahead = (n) => [p.tc + DIRS[p.dir][0] * n, p.tr + DIRS[p.dir][1] * n]
    if (gh.name === 'blinky') return [p.tc, p.tr]
    if (gh.name === 'pinky') return ahead(4)
    if (gh.name === 'inky') {
      const b = s.ghosts[0]
      const a = ahead(2)
      return [a[0] + (a[0] - b.tc), a[1] + (a[1] - b.tr)]
    }
    // clyde
    const d2 = (gh.tc - p.tc) ** 2 + (gh.tr - p.tr) ** 2
    return d2 > 64 ? [p.tc, p.tr] : gh.corner
  }

  useKeys((k) => {
    const s = g.current; if (!s) return
    if (k === 'ArrowUp') s.pac.want = 'up'
    else if (k === 'ArrowDown') s.pac.want = 'down'
    else if (k === 'ArrowLeft') s.pac.want = 'left'
    else if (k === 'ArrowRight') s.pac.want = 'right'
  })

  useRaf((dt) => {
    const s = g.current
    if (!s) { reset(); return }
    if (s.state === 'play') update(dt)
    draw()
  })

  const update = (dt) => {
    const s = g.current, p = s.pac
    s.blink += dt
    // mode timing (scatter/chase alternation)
    s.modeTimer -= dt
    if (s.modeTimer <= 0) {
      s.mode = s.mode === 'scatter' ? 'chase' : 'scatter'
      s.modeTimer = s.mode === 'scatter' ? 6 : 18
    }
    // instant reverse for pac
    if (p.want === OPP[p.dir] && p.nc !== p.tc + 0 * 0) {
      // swap
      const tc = p.tc, tr = p.tr
      p.tc = p.nc; p.tr = p.nr; p.nc = tc; p.nr = tr; p.p = 1 - p.p; p.dir = p.want
    }
    moveEntity(p, 5.2, dt, pacChoose)
    p.mouth += dt * 10
    // eat
    const d = s.dots[p.tr]?.[p.tc]
    if (d) {
      s.dots[p.tr][p.tc] = 0; s.eaten++
      if (d === 2) { s.power = 7; s.ghostScore = 200; s.ghosts.forEach((gh) => { if (gh.mode !== 'eaten') gh.mode = 'frightened' }); Sound.pop() }
      else Sound.step()
      s.score += d === 2 ? 50 : 10
      setUi((u) => ({ ...u, score: s.score }))
      if (s.eaten >= s.total) { s.state = 'win'; Sound.win(); submitBest(s.score); setUi((u) => ({ ...u, state: 'win' })); return }
    }
    // power timer
    if (s.power > 0) {
      s.power -= dt
      if (s.power <= 0) s.ghosts.forEach((gh) => { if (gh.mode === 'frightened') gh.mode = 'chase' })
    }
    // ghosts
    s.ghosts.forEach((gh) => {
      let speed = gh.mode === 'frightened' ? 3.2 : gh.mode === 'eaten' ? 8 : 4.5
      moveEntity(gh, speed, dt, ghostChoose)
      if (gh.mode === 'eaten' && gh.tc === gh.home[0] && gh.tr === gh.home[1] && gh.p < 0.2) gh.mode = 'chase'
      // collide with pac
      const dist = Math.abs(gh.tc + DIRS[gh.dir][0] * gh.p - (p.tc + DIRS[p.dir][0] * p.p)) +
                   Math.abs(gh.tr + DIRS[gh.dir][1] * gh.p - (p.tr + DIRS[p.dir][1] * p.p))
      if (dist < 0.6) {
        if (gh.mode === 'frightened') {
          gh.mode = 'eaten'; s.score += s.ghostScore; s.ghostScore *= 2
          Sound.coin(); setUi((u) => ({ ...u, score: s.score }))
        } else if (gh.mode !== 'eaten') {
          die()
        }
      }
    })
  }

  const die = () => {
    const s = g.current
    s.lives -= 1; Sound.explode()
    if (s.lives < 0) { s.state = 'over'; submitBest(s.score); setUi((u) => ({ ...u, state: 'over', lives: 0 })); return }
    setUi((u) => ({ ...u, lives: s.lives }))
    // respawn
    s.pac = { tc: 9, tr: 15, nc: 9, nr: 15, p: 0, dir: 'left', want: 'left', mouth: 0 }
    s.ghosts = makeGhosts(); s.power = 0
  }

  const px = (e) => (e.tc + DIRS[e.dir][0] * e.p) * CELL + CELL / 2
  const py = (e) => (e.tr + DIRS[e.dir][1] * e.p) * CELL + CELL / 2

  const draw = () => {
    const s = g.current, cv = canvas.current; if (!cv || !s) return
    const ctx = cv.getContext('2d')
    ctx.fillStyle = '#05080a'; ctx.fillRect(0, 0, W, H)
    // walls
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const ch = MAZE[r][c]
      if (ch === '#') {
        ctx.fillStyle = '#0a1e3a'
        ctx.fillRect(c * CELL + 2, r * CELL + 2, CELL - 4, CELL - 4)
        ctx.strokeStyle = '#2b6bd8'; ctx.lineWidth = 2
        ctx.strokeRect(c * CELL + 3, r * CELL + 3, CELL - 6, CELL - 6)
      } else if (ch === '=') {
        ctx.fillStyle = '#ff5db1'; ctx.fillRect(c * CELL + 2, r * CELL + CELL / 2 - 1, CELL - 4, 3)
      }
    }
    // dots
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const d = s.dots[r][c]
      if (d === 1) { ctx.fillStyle = '#ffe08a'; ctx.fillRect(c * CELL + CELL / 2 - 2, r * CELL + CELL / 2 - 2, 4, 4) }
      else if (d === 2 && Math.floor(s.blink * 6) % 2) {
        ctx.fillStyle = '#f9f002'; ctx.beginPath(); ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, 6, 0, 7); ctx.fill()
      }
    }
    // pac
    const p = s.pac, cx = px(p), cy = py(p)
    const ang = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[p.dir]
    const m = (Math.sin(p.mouth) * 0.5 + 0.5) * 0.32 + 0.03
    ctx.fillStyle = '#f9f002'
    ctx.beginPath(); ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, CELL / 2 - 1, ang + m * Math.PI, ang - m * Math.PI + Math.PI * 2)
    ctx.closePath(); ctx.fill()
    // ghosts
    s.ghosts.forEach((gh) => {
      const gx = px(gh), gy = py(gh)
      let col = gh.color
      if (gh.mode === 'frightened') col = (s.power < 2 && Math.floor(s.blink * 6) % 2) ? '#fff' : '#2b3bff'
      if (gh.mode === 'eaten') col = 'rgba(120,140,200,0.4)'
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.arc(gx, gy - 1, CELL / 2 - 1, Math.PI, 0)
      ctx.lineTo(gx + CELL / 2 - 1, gy + CELL / 2 - 2)
      for (let i = 0; i < 3; i++) ctx.lineTo(gx + CELL / 2 - 1 - (i + 0.5) * (CELL - 2) / 3, gy + CELL / 2 - 2 - (i % 2 ? 0 : 4))
      ctx.lineTo(gx - CELL / 2 + 1, gy + CELL / 2 - 2)
      ctx.closePath(); ctx.fill()
      // eyes
      if (gh.mode !== 'eaten') {
        ctx.fillStyle = '#fff'
        ctx.fillRect(gx - 5, gy - 4, 4, 5); ctx.fillRect(gx + 1, gy - 4, 4, 5)
        ctx.fillStyle = '#0a1030'
        const ex = DIRS[gh.dir][0], ey = DIRS[gh.dir][1]
        ctx.fillRect(gx - 4 + ex, gy - 2 + ey, 2, 2); ctx.fillRect(gx + 2 + ex, gy - 2 + ey, 2, 2)
      }
    })
  }

  return (
    <div>
      <HUD>
        <Stat label="SCORE" value={ui.score} />
        <Stat label="LIVES" value={'●'.repeat(Math.max(0, ui.lives))} color="var(--yellow)" />
        <Stat label="BEST" value={best} color="var(--cyan)" />
      </HUD>
      <Screen width={W} height={H} canvasRef={canvas}>
        {ui.state === 'over' && <Overlay title="GAME OVER" sub={`Score ${ui.score}`} color="var(--red)" onRetry={() => { Sound.select(); reset() }} onExit={onExit} />}
        {ui.state === 'win' && <Overlay title="YOU WIN!" sub={`Score ${ui.score}`} color="var(--green)" onRetry={() => { Sound.select(); reset() }} onExit={onExit} />}
      </Screen>
      <p style={{ textAlign: 'center', fontFamily: 'var(--font-term)', fontSize: 20, color: 'var(--green-dim)' }}>
        Arrow keys to move · eat the big dots to hunt the ghosts
      </p>
    </div>
  )
}
