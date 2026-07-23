import { useRef, useState, useCallback } from 'react'
import { useKeys, useRaf, useBestScore, HUD, Stat, Overlay, Screen } from './common.jsx'
import Sound from '../sound.js'

const COLS = 15, ROWS = 16, TILE = 26
const W = COLS * TILE, H = ROWS * TILE

export default function DigDug({ onExit }) {
  const [best, submitBest] = useBestScore('digdug')
  const [ui, setUi] = useState({ score: 0, lives: 3, left: 4, state: 'play' })
  const g = useRef(null)
  const canvas = useRef(null)
  const keys = useKeys((k) => { if (k === ' ' || k === 'x' || k === 'X') fireHarpoon() })

  const reset = useCallback((level = 1, score = 0, lives = 3) => {
    // dirt everywhere except a starting shaft + a couple tunnels
    const dirt = Array.from({ length: ROWS }, () => Array(COLS).fill(1))
    const sky = 2 // top rows are open air
    for (let r = 0; r < sky; r++) for (let c = 0; c < COLS; c++) dirt[r][c] = 0
    // vertical start shaft
    const startC = 7
    for (let r = 0; r < 8; r++) dirt[r][startC] = 0
    // a couple of pre-dug tunnels
    for (let c = 2; c < 13; c++) dirt[5][c] = 0
    for (let r = 5; r < 11; r++) dirt[r][3] = 0
    for (let r = 5; r < 11; r++) dirt[r][11] = 0

    const monsters = []
    const spots = [[3, 8], [11, 8], [3, 13], [11, 13], [7, 12]]
    for (let i = 0; i < Math.min(3 + level, spots.length); i++) {
      const [c, r] = spots[i]
      dirt[r][c] = 0
      monsters.push({ c, r, x: c * TILE + TILE / 2, y: r * TILE + TILE / 2, dir: 'left', state: 'normal', inflate: 0, deflate: 0, ghost: 0, step: 0, type: i % 2 ? 'fygar' : 'pooka' })
    }
    const rocks = [[5, 8], [9, 9], [2, 11], [12, 11]].map(([c, r]) => { dirt[r][c] = 1; return { c, r, x: c * TILE + TILE / 2, y: r * TILE, falling: false, vy: 0, dead: false } })

    g.current = {
      dirt, monsters, rocks,
      player: { x: startC * TILE + TILE / 2, y: 1.5 * TILE, dir: 'down' },
      harpoon: null, score, lives, level, state: 'play', invuln: 0,
    }
    setUi({ score, lives, left: monsters.length, state: 'play' })
  }, [])

  const tileAt = (x, y) => [Math.floor(x / TILE), Math.floor(y / TILE)]
  const dig = (x, y) => {
    const s = g.current, [c, r] = tileAt(x, y)
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS && s.dirt[r][c] === 1) { s.dirt[r][c] = 0; Sound.step() }
  }

  const fireHarpoon = () => {
    const s = g.current; if (!s || s.state !== 'play') return
    const p = s.player
    if (s.harpoon && s.harpoon.active) {
      // already out → pump
      const m = s.harpoon.target
      if (m && m.state !== 'popped') {
        m.state = 'inflating'; m.inflate += 1; Sound.pop()
        if (m.inflate >= 4) { m.state = 'popped'; m.pop = 0.5; s.score += 300 + (s.harpoon.len) * 100; bumpScore() }
      }
      return
    }
    // shoot: extend in facing dir up to 2 tiles through tunnel
    const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[p.dir]
    const [pc, pr] = tileAt(p.x, p.y)
    let len = 0, hit = null
    for (let i = 1; i <= 2; i++) {
      const c = pc + d[0] * i, r = pr + d[1] * i
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS || s.dirt[r][c] === 1) break
      len = i
      const m = s.monsters.find((mm) => mm.state !== 'popped' && Math.floor(mm.x / TILE) === c && Math.floor(mm.y / TILE) === r)
      if (m) { hit = m; break }
    }
    s.harpoon = { active: true, dir: p.dir, len, target: hit, timer: 0.6, cx: pc, cy: pr }
    Sound.laser()
    if (hit) { hit.state = 'inflating'; hit.inflate = 1 }
  }

  const bumpScore = () => { const s = g.current; setUi((u) => ({ ...u, score: s.score, left: s.monsters.filter((m) => m.state !== 'popped').length })) }

  useRaf((dt) => {
    const s = g.current
    if (!s) { reset(); return }
    if (s.state === 'play') update(Math.min(dt, 0.03))
    draw()
  })

  const update = (dt) => {
    const s = g.current, p = s.player
    if (s.invuln > 0) s.invuln -= dt
    // player movement
    const sp = 95; let mx = 0, my = 0
    if (keys.current['ArrowLeft'] || keys.current['a']) { mx = -1; p.dir = 'left' }
    else if (keys.current['ArrowRight'] || keys.current['d']) { mx = 1; p.dir = 'right' }
    else if (keys.current['ArrowUp'] || keys.current['w']) { my = -1; p.dir = 'up' }
    else if (keys.current['ArrowDown'] || keys.current['s']) { my = 1; p.dir = 'down' }
    if (!(s.harpoon && s.harpoon.active)) {
      p.x = Math.max(TILE / 2, Math.min(W - TILE / 2, p.x + mx * sp * dt))
      p.y = Math.max(TILE / 2, Math.min(H - TILE / 2, p.y + my * sp * dt))
      dig(p.x, p.y)
    }

    // harpoon timer
    if (s.harpoon) {
      s.harpoon.timer -= dt
      const m = s.harpoon.target
      if (m && m.state === 'inflating') { m.deflate = 0 }
      if (s.harpoon.timer <= 0) s.harpoon = null
    }
    // monster deflate if not being pumped
    s.monsters.forEach((m) => {
      if (m.state === 'inflating') {
        if (!(s.harpoon && s.harpoon.active && s.harpoon.target === m)) {
          m.deflate = (m.deflate || 0) + dt
          if (m.deflate > 1.2) { m.state = 'normal'; m.inflate = 0; m.deflate = 0 }
        }
      }
    })

    // monsters move
    s.monsters.forEach((m) => {
      if (m.state === 'popped') { m.pop -= dt; return }
      if (m.state === 'inflating') return
      m.step -= dt
      if (m.step <= 0) {
        m.step = 0.34
        moveMonster(m)
      }
      // smooth toward tile center target
      const tx = m.c * TILE + TILE / 2, ty = m.r * TILE + TILE / 2
      m.x += Math.sign(tx - m.x) * Math.min(Math.abs(tx - m.x), 70 * dt)
      m.y += Math.sign(ty - m.y) * Math.min(Math.abs(ty - m.y), 70 * dt)
      // catch player
      if (s.invuln <= 0 && Math.hypot(m.x - p.x, m.y - p.y) < TILE * 0.7) hurt()
    })
    s.monsters = s.monsters.filter((m) => !(m.state === 'popped' && m.pop <= 0))
    if (s.monsters.length === 0) { winLevel(); return }

    // rocks
    s.rocks.forEach((rk) => {
      if (rk.dead) return
      const belowR = Math.floor(rk.y / TILE) + 1
      const col = rk.c
      if (!rk.falling) {
        if (belowR < ROWS && s.dirt[belowR][col] === 0) { rk.falling = true; rk.vy = 0; rk.wobble = 0.3 }
      } else {
        rk.vy += 380 * dt; rk.y += rk.vy * dt
        // crush monsters/player
        s.monsters.forEach((m) => { if (m.state !== 'popped' && Math.floor(m.x / TILE) === col && Math.abs(m.y - rk.y) < TILE * 0.7) { m.state = 'popped'; m.pop = 0.4; s.score += 500; bumpScore(); Sound.explode() } })
        if (s.invuln <= 0 && Math.floor(p.x / TILE) === col && Math.abs(p.y - rk.y) < TILE * 0.7) hurt()
        const r = Math.floor((rk.y + TILE / 2) / TILE)
        if (r + 1 >= ROWS || s.dirt[r + 1][col] === 1) { rk.dead = true; Sound.hit() }
        else s.dirt[r][col] = 0
      }
    })
  }

  const moveMonster = (m) => {
    const s = g.current, p = s.player
    const [pc, pr] = tileAt(p.x, p.y)
    const opts = [['left', -1, 0], ['right', 1, 0], ['up', 0, -1], ['down', 0, 1]]
      .filter(([, dc, dr]) => { const c = m.c + dc, r = m.r + dr; return c >= 0 && c < COLS && r >= 0 && r < ROWS && s.dirt[r][c] === 0 })
    if (opts.length === 0) {
      // ghost through dirt toward player occasionally
      m.c += Math.sign(pc - m.c); m.r += Math.sign(pr - m.r); return
    }
    // greedy toward player, avoid reversing unless needed
    opts.sort((a, b) => {
      const da = (m.c + a[1] - pc) ** 2 + (m.r + a[2] - pr) ** 2
      const db = (m.c + b[1] - pc) ** 2 + (m.r + b[2] - pr) ** 2
      return da - db
    })
    const pick = Math.random() < 0.75 ? opts[0] : opts[(Math.random() * opts.length) | 0]
    m.dir = pick[0]; m.c += pick[1]; m.r += pick[2]
  }

  const hurt = () => {
    const s = g.current
    s.lives -= 1; s.invuln = 1.6; Sound.explode()
    if (s.lives < 0) { s.state = 'over'; submitBest(s.score); setUi((u) => ({ ...u, state: 'over' })); return }
    s.player.x = 7 * TILE + TILE / 2; s.player.y = 1.5 * TILE
    setUi((u) => ({ ...u, lives: s.lives }))
  }
  const winLevel = () => {
    const s = g.current
    Sound.win(); submitBest(s.score)
    setTimeout(() => reset(s.level + 1, s.score + 1000, s.lives), 500); s.state = 'next'
  }

  const draw = () => {
    const s = g.current, cv = canvas.current; if (!cv || !s) return
    const ctx = cv.getContext('2d')
    // sky gradient at very top, then dirt layers
    for (let r = 0; r < ROWS; r++) {
      const shade = ['#3a1f0a', '#4a2810', '#5a3116', '#6a3a1c'][Math.min(3, Math.floor(r / 4))]
      for (let c = 0; c < COLS; c++) {
        if (s.dirt[r][c] === 1) { ctx.fillStyle = shade; ctx.fillRect(c * TILE, r * TILE, TILE, TILE); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(c * TILE, r * TILE, TILE, 3) }
        else { ctx.fillStyle = r < 2 ? '#0a1a2a' : '#0a0704'; ctx.fillRect(c * TILE, r * TILE, TILE, TILE) }
      }
    }
    // rocks
    s.rocks.forEach((rk) => {
      if (rk.dead && rk.settled) {}
      ctx.fillStyle = '#9aa0a6'; ctx.fillRect(rk.x - TILE / 2 + 2, rk.y + 2, TILE - 4, TILE - 4)
      ctx.fillStyle = '#c8ced4'; ctx.fillRect(rk.x - TILE / 2 + 4, rk.y + 4, TILE - 12, 5)
      ctx.strokeStyle = '#04140a'; ctx.lineWidth = 2; ctx.strokeRect(rk.x - TILE / 2 + 2, rk.y + 2, TILE - 4, TILE - 4)
    })
    // harpoon
    if (s.harpoon) {
      const p = s.player, d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[s.harpoon.dir]
      ctx.strokeStyle = '#f9f002'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + d[0] * s.harpoon.len * TILE, p.y + d[1] * s.harpoon.len * TILE); ctx.stroke()
    }
    // player
    const p = s.player
    if (!(s.invuln > 0 && Math.floor(performance.now() / 100) % 2)) {
      ctx.fillStyle = '#fff'; ctx.fillRect(p.x - 9, p.y - 9, 18, 18)
      ctx.fillStyle = '#29e7cd'; ctx.fillRect(p.x - 9, p.y - 9, 18, 8)
      ctx.fillStyle = '#04140a'; ctx.fillRect(p.x - 5, p.y - 6, 3, 3); ctx.fillRect(p.x + 2, p.y - 6, 3, 3)
    }
    // monsters
    s.monsters.forEach((m) => {
      const size = TILE * 0.4 + (m.inflate || 0) * 3
      if (m.state === 'popped') { ctx.fillStyle = '#f9f002'; ctx.globalAlpha = Math.max(0, m.pop); ctx.beginPath(); ctx.arc(m.x, m.y, size + 6, 0, 7); ctx.fill(); ctx.globalAlpha = 1; return }
      ctx.fillStyle = m.type === 'fygar' ? '#39ff14' : '#ff3b30'
      ctx.beginPath(); ctx.arc(m.x, m.y, size, 0, 7); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.fillRect(m.x - 6, m.y - 4, 4, 5); ctx.fillRect(m.x + 2, m.y - 4, 4, 5)
      ctx.fillStyle = '#0a1030'; ctx.fillRect(m.x - 5, m.y - 3, 2, 3); ctx.fillRect(m.x + 3, m.y - 3, 2, 3)
    })
  }

  return (
    <div>
      <HUD>
        <Stat label="SCORE" value={ui.score} />
        <Stat label="LIVES" value={Math.max(0, ui.lives)} color="var(--yellow)" />
        <Stat label="LEFT" value={ui.left} color="var(--red)" />
        <Stat label="BEST" value={best} color="var(--cyan)" />
      </HUD>
      <Screen width={W} height={H} canvasRef={canvas}>
        {ui.state === 'over' && <Overlay title="GAME OVER" sub={`Score ${ui.score}`} color="var(--red)" onRetry={() => { Sound.select(); reset() }} onExit={onExit} />}
      </Screen>
      <p style={{ textAlign: 'center', fontFamily: 'var(--font-term)', fontSize: 20, color: 'var(--green-dim)' }}>
        Arrows/WASD dig · SPACE fire harpoon, tap again to pump &amp; pop · drop rocks on monsters
      </p>
    </div>
  )
}
