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

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' }
const ORDER = ['up', 'left', 'down', 'right'] // classic tie-break priority

const HOUSE_CENTER = [9, 9]
const HOUSE_EXIT = [9, 7] // the floor tile just above the door

const cellAt = (c, r) => MAZE[r]?.[c]

// Pac is blocked by walls, the door AND the void spaces.
const wallPac = (c, r) => {
  const ch = cellAt(c, r)
  return ch === undefined || ch === '#' || ch === '=' || ch === ' '
}

export default function PacMan({ onExit }) {
  const [best, submitBest] = useBestScore('pacman')
  const [ui, setUi] = useState({ score: 0, lives: 3, state: 'play' })
  const g = useRef(null)
  const canvas = useRef(null)

  // Ghosts pass the door only when leaving the house (after release) or
  // when returning home after being eaten. Otherwise it's solid to them.
  const wallGhost = (gh, c, r) => {
    const ch = cellAt(c, r)
    if (ch === undefined || ch === '#') return true
    if (ch === '=') {
      if (gh.state === 'eaten') return false
      if (gh.state === 'house' && g.current.time >= gh.releaseAt) return false
      return true
    }
    return false // '.', 'o', ' ' (house interior), 'P', '='(handled) are walkable
  }

  const makeGhosts = () => ([
    { name: 'blinky', color: '#ff3b30', tc: 9, tr: 7, nc: 8, nr: 7, p: 0, dir: 'left', state: 'out', frightened: false, releaseAt: 0, corner: [COLS - 2, 1] },
    { name: 'pinky', color: '#ff5db1', tc: 9, tr: 9, nc: 9, nr: 9, p: 0, dir: 'left', state: 'house', frightened: false, releaseAt: 1, corner: [1, 1] },
    { name: 'inky', color: '#29e7cd', tc: 8, tr: 9, nc: 8, nr: 9, p: 0, dir: 'left', state: 'house', frightened: false, releaseAt: 4, corner: [COLS - 2, ROWS - 2] },
    { name: 'clyde', color: '#ff9f1c', tc: 10, tr: 9, nc: 10, nr: 9, p: 0, dir: 'left', state: 'house', frightened: false, releaseAt: 8, corner: [1, ROWS - 2] },
  ])

  const reset = useCallback(() => {
    const dots = MAZE.map((row) => row.split('').map((ch) => (ch === '.' ? 1 : ch === 'o' ? 2 : 0)))
    let total = 0
    dots.forEach((row) => row.forEach((d) => { if (d) total++ }))
    g.current = {
      dots, total, eaten: 0, time: 0,
      // Pac starts already heading into the open left tile.
      pac: { tc: 9, tr: 15, nc: 8, nr: 15, p: 0, dir: 'left', want: 'left', stopped: false, mouth: 0 },
      ghosts: makeGhosts(),
      power: 0, score: 0, lives: 3, state: 'play', ghostScore: 200,
      mode: 'scatter', modeTimer: 7, blink: 0,
    }
    setUi({ score: 0, lives: 3, state: 'play' })
  }, [])

  // ---------- movement (from-tile -> to-tile with progress p in [0,1)) ----------
  // position is ALWAYS interpolated between (tc,tr) and (nc,nr), so a stopped
  // entity (nc==tc) renders exactly on the tile centre — no wall clipping.
  const step = (e, speed, dt, chooseFn) => {
    if (e.stopped) {
      const nd = chooseFn(e)
      if (nd == null) return
      e.stopped = false; e.dir = nd
      e.nc = e.tc + DIRS[nd][0]; e.nr = e.tr + DIRS[nd][1]
    }
    e.p += speed * dt
    while (e.p >= 1) {
      e.p -= 1
      e.tc = e.nc; e.tr = e.nr
      const nd = chooseFn(e)
      if (nd == null) { e.stopped = true; e.nc = e.tc; e.nr = e.tr; e.p = 0; return }
      e.dir = nd
      e.nc = e.tc + DIRS[nd][0]; e.nr = e.tr + DIRS[nd][1]
    }
  }

  const px = (e) => (e.tc + (e.nc - e.tc) * e.p) * CELL + CELL / 2
  const py = (e) => (e.tr + (e.nr - e.tr) * e.p) * CELL + CELL / 2

  const reverse = (e) => {
    if (e.p > 0 && e.p < 1) {
      const tc = e.tc, tr = e.tr
      e.tc = e.nc; e.tr = e.nr; e.nc = tc; e.nr = tr
      e.p = 1 - e.p; e.dir = OPP[e.dir]
    }
  }

  const pacChoose = (e) => {
    if (!wallPac(e.tc + DIRS[e.want][0], e.tr + DIRS[e.want][1])) return e.want
    if (!wallPac(e.tc + DIRS[e.dir][0], e.tr + DIRS[e.dir][1])) return e.dir
    return null // no way forward -> stop at centre
  }

  const ghostTargetTile = (gh) => {
    const s = g.current, p = s.pac
    if (gh.state === 'eaten') return HOUSE_CENTER
    if (gh.state === 'house') return s.time >= gh.releaseAt ? HOUSE_EXIT : HOUSE_CENTER
    if (s.mode === 'scatter') return gh.corner
    const ahead = (n) => [p.tc + DIRS[p.dir][0] * n, p.tr + DIRS[p.dir][1] * n]
    if (gh.name === 'blinky') return [p.tc, p.tr]
    if (gh.name === 'pinky') return ahead(4)
    if (gh.name === 'inky') {
      const b = s.ghosts[0]
      const a = ahead(2)
      return [a[0] + (a[0] - b.tc), a[1] + (a[1] - b.tr)]
    }
    // clyde: chase when far, flee to corner when close
    const d2 = (gh.tc - p.tc) ** 2 + (gh.tr - p.tr) ** 2
    return d2 > 64 ? [p.tc, p.tr] : gh.corner
  }

  const ghostChoose = (gh) => {
    const back = OPP[gh.dir]
    let opts = ORDER.filter((d) => !wallGhost(gh, gh.tc + DIRS[d][0], gh.tr + DIRS[d][1]))
    const noBack = opts.filter((d) => d !== back)
    if (noBack.length) opts = noBack       // never reverse unless it's a dead-end
    if (!opts.length) return back           // fully boxed in -> turn around
    if (gh.state === 'out' && gh.frightened) return opts[(Math.random() * opts.length) | 0]
    const target = ghostTargetTile(gh)
    let best = opts[0], bd = Infinity
    for (const d of opts) {                 // ORDER gives the classic up>left>down>right tie-break
      const nc = gh.tc + DIRS[d][0], nr = gh.tr + DIRS[d][1]
      const dist = (nc - target[0]) ** 2 + (nr - target[1]) ** 2
      if (dist < bd) { bd = dist; best = d }
    }
    return best
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

  const bump = () => { const s = g.current; setUi((u) => ({ ...u, score: s.score })) }

  const update = (dt) => {
    const s = g.current, p = s.pac
    s.time += dt; s.blink += dt

    // global scatter/chase alternation
    s.modeTimer -= dt
    if (s.modeTimer <= 0) {
      s.mode = s.mode === 'scatter' ? 'chase' : 'scatter'
      s.modeTimer = s.mode === 'scatter' ? 6 : 18
      // ghosts reverse on a mode flip (classic behaviour)
      s.ghosts.forEach((gh) => { if (gh.state === 'out') reverse(gh) })
    }

    // Pac can reverse instantly, mid-corridor
    if (p.want === OPP[p.dir] && !p.stopped) reverse(p)
    step(p, 5.4, dt, pacChoose)
    p.mouth += dt * 10

    // eat pellet
    const d = s.dots[p.tr]?.[p.tc]
    if (d) {
      s.dots[p.tr][p.tc] = 0; s.eaten++
      s.score += d === 2 ? 50 : 10
      if (d === 2) {
        s.power = 7; s.ghostScore = 200
        // Frighten every ghost that isn't already heading home (out OR still
        // in the house), so ghosts released mid-power emerge blue & edible.
        // Only ghosts already outside reverse direction (classic behaviour).
        s.ghosts.forEach((gh) => {
          if (gh.state === 'out' || gh.state === 'house') {
            gh.frightened = true
            if (gh.state === 'out') reverse(gh)
          }
        })
        Sound.pop()
      } else Sound.step()
      bump()
      if (s.eaten >= s.total) { s.state = 'win'; Sound.win(); submitBest(s.score); setUi((u) => ({ ...u, state: 'win' })); return }
    }

    if (s.power > 0) {
      s.power -= dt
      if (s.power <= 0) s.ghosts.forEach((gh) => { gh.frightened = false })
    }

    // ghosts
    s.ghosts.forEach((gh) => {
      const speed = gh.state === 'eaten' ? 9 : gh.state === 'house' ? 3.4 : gh.frightened ? 3.2 : 4.6
      step(gh, speed, dt, ghostChoose)
      // state transitions on arrival at key tiles
      if (gh.state === 'eaten' && gh.tc === HOUSE_CENTER[0] && gh.tr === HOUSE_CENTER[1]) {
        gh.state = 'house'; gh.releaseAt = s.time + 0.6; gh.frightened = false
      }
      if (gh.state === 'house' && gh.tc === HOUSE_EXIT[0] && gh.tr === HOUSE_EXIT[1]) {
        gh.state = 'out'
      }
      // collision with pac
      if (Math.hypot(px(gh) - px(p), py(gh) - py(p)) < CELL * 0.6) {
        if (gh.state === 'out' && gh.frightened) {
          gh.state = 'eaten'; gh.frightened = false
          s.score += s.ghostScore; s.ghostScore *= 2; Sound.coin(); bump()
        } else if (gh.state === 'out') die()
      }
    })
  }

  const die = () => {
    const s = g.current
    s.lives -= 1; Sound.explode()
    if (s.lives < 0) { s.state = 'over'; submitBest(s.score); setUi((u) => ({ ...u, state: 'over', lives: 0 })); return }
    setUi((u) => ({ ...u, lives: s.lives }))
    s.pac = { tc: 9, tr: 15, nc: 8, nr: 15, p: 0, dir: 'left', want: 'left', stopped: false, mouth: 0 }
    s.ghosts = makeGhosts(); s.power = 0; s.time = 0; s.mode = 'scatter'; s.modeTimer = 7
  }

  // ------------------------------- drawing -------------------------------
  const draw = () => {
    const s = g.current, cv = canvas.current; if (!cv || !s) return
    const ctx = cv.getContext('2d')
    ctx.fillStyle = '#05080a'; ctx.fillRect(0, 0, W, H)
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
      if (gh.frightened && gh.state !== 'eaten') col = (s.power < 2 && Math.floor(s.blink * 6) % 2) ? '#fff' : '#2b3bff'
      if (gh.state === 'eaten') col = 'rgba(120,140,200,0.4)'
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.arc(gx, gy - 1, CELL / 2 - 1, Math.PI, 0)
      ctx.lineTo(gx + CELL / 2 - 1, gy + CELL / 2 - 2)
      for (let i = 0; i < 3; i++) ctx.lineTo(gx + CELL / 2 - 1 - (i + 0.5) * (CELL - 2) / 3, gy + CELL / 2 - 2 - (i % 2 ? 0 : 4))
      ctx.lineTo(gx - CELL / 2 + 1, gy + CELL / 2 - 2)
      ctx.closePath(); ctx.fill()
      if (gh.state !== 'eaten') {
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
