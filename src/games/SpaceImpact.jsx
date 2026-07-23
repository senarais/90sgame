import { useRef, useState, useCallback } from 'react'
import { useKeys, useRaf, useBestScore, HUD, Stat, Overlay, Screen } from './common.jsx'
import Sound from '../sound.js'

const W = 520, H = 360

export default function SpaceImpact({ onExit }) {
  const [best, submitBest] = useBestScore('spaceimpact')
  const [ui, setUi] = useState({ score: 0, lives: 3, weapon: 1, boss: 0, state: 'play' })
  const g = useRef(null)
  const canvas = useRef(null)

  const reset = useCallback(() => {
    g.current = {
      ship: { x: 60, y: H / 2, r: 12, cd: 0 },
      bullets: [], enemies: [], ebullets: [], powers: [], particles: [], stars: makeStars(),
      score: 0, lives: 3, weapon: 1, spawn: 0, t: 0, dist: 0,
      boss: null, bossHp: 0, state: 'play', invuln: 0,
    }
    setUi({ score: 0, lives: 3, weapon: 1, boss: 0, state: 'play' })
  }, [])

  const makeStars = () => Array.from({ length: 60 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.5 + 0.5 }))

  const fire = () => {
    const s = g.current, sh = s.ship
    if (sh.cd > 0) return
    sh.cd = 0.16
    Sound.laser()
    const shots = { 1: [[0]], 2: [[-6], [6]], 3: [[-8, -0.25], [0, 0], [8, 0.25]] }[Math.min(s.weapon, 3)]
    shots.forEach(([dy, ang]) => s.bullets.push({ x: sh.x + 14, y: sh.y + (dy || 0), vx: 460, vy: (ang || 0) * 200 }))
  }

  useKeys((k) => { if (k === ' ' || k === 'x' || k === 'X') fire() })
  const keys = useKeys()

  useRaf((dt) => {
    const s = g.current
    if (!s) { reset(); return }
    if (s.state === 'play') update(Math.min(dt, 0.03))
    draw()
  })

  const spawnEnemy = () => {
    const s = g.current
    const types = ['grunt', 'zig', 'shooter']
    const type = types[(Math.random() * types.length) | 0]
    const y = 30 + Math.random() * (H - 60)
    s.enemies.push({
      type, x: W + 20, y, y0: y, r: type === 'shooter' ? 14 : 12,
      hp: type === 'shooter' ? 3 : type === 'zig' ? 2 : 1,
      vx: -(90 + Math.random() * 60), t: Math.random() * 6, cd: 1 + Math.random(),
      color: type === 'shooter' ? '#ff5db1' : type === 'zig' ? '#f9f002' : '#39ff14',
    })
  }

  const update = (dt) => {
    const s = g.current, sh = s.ship
    s.t += dt; s.dist += dt
    sh.cd -= dt; if (s.invuln > 0) s.invuln -= dt
    s.stars.forEach((st) => { st.x -= st.s * 40 * dt; if (st.x < 0) { st.x = W; st.y = Math.random() * H } })
    // ship control
    const sp = 220
    if (keys.current['ArrowUp'] || keys.current['w']) sh.y -= sp * dt
    if (keys.current['ArrowDown'] || keys.current['s']) sh.y += sp * dt
    if (keys.current['ArrowLeft'] || keys.current['a']) sh.x -= sp * dt
    if (keys.current['ArrowRight'] || keys.current['d']) sh.x += sp * dt
    if (keys.current[' '] || keys.current['x']) fire()
    sh.x = Math.max(14, Math.min(W * 0.6, sh.x)); sh.y = Math.max(16, Math.min(H - 16, sh.y))

    // spawn or boss
    if (!s.boss) {
      s.spawn -= dt
      if (s.spawn <= 0) { spawnEnemy(); s.spawn = Math.max(0.35, 1.1 - s.dist * 0.01) }
      if (s.dist > 45) startBoss()
    }
    // bullets
    s.bullets.forEach((b) => { b.x += b.vx * dt; b.y += b.vy * dt })
    s.bullets = s.bullets.filter((b) => b.x < W + 10 && b.y > -10 && b.y < H + 10)
    // enemies
    s.enemies.forEach((e) => {
      e.x += e.vx * dt; e.t += dt
      if (e.type === 'zig') e.y = e.y0 + Math.sin(e.t * 4) * 40
      if (e.type === 'shooter') { e.cd -= dt; if (e.cd <= 0 && e.x < W) { e.cd = 1.4; const a = Math.atan2(sh.y - e.y, sh.x - e.x); s.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200 }) } }
    })
    s.enemies = s.enemies.filter((e) => e.x > -30 && e.hp > 0)
    // enemy bullets
    s.ebullets.forEach((b) => { b.x += b.vx * dt; b.y += b.vy * dt })
    s.ebullets = s.ebullets.filter((b) => b.x > -10 && b.x < W + 10 && b.y > -10 && b.y < H + 10)
    // powers
    s.powers.forEach((p) => { p.x -= 80 * dt })
    s.powers = s.powers.filter((p) => p.x > -20 && !p.dead)
    // particles
    s.particles.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt })
    s.particles = s.particles.filter((p) => p.life > 0)

    // collisions: bullets vs enemies
    for (const b of s.bullets) {
      for (const e of s.enemies) {
        if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + 3) {
          e.hp -= 1; b.dead = true; Sound.hit()
          if (e.hp <= 0) { explode(e.x, e.y, e.color); s.score += 100; if (Math.random() < 0.12) s.powers.push({ x: e.x, y: e.y, type: Math.random() < 0.5 ? 'gun' : 'life' }) }
          break
        }
      }
      // bullets vs boss
      if (s.boss && b.x > s.boss.x - s.boss.w / 2 && b.x < s.boss.x + s.boss.w / 2 && b.y > s.boss.y - s.boss.h / 2 && b.y < s.boss.y + s.boss.h / 2) {
        s.boss.hp -= 1; b.dead = true; Sound.hit(); explode(b.x, b.y, '#ff9f1c')
        setUi((u) => ({ ...u, boss: Math.max(0, s.boss.hp) }))
        if (s.boss.hp <= 0) { bossDown() }
      }
    }
    s.bullets = s.bullets.filter((b) => !b.dead)
    setUi((u) => (u.score !== s.score ? { ...u, score: s.score } : u))

    // boss update
    if (s.boss) {
      const bo = s.boss
      bo.x = Math.min(bo.x, W - bo.w / 2 - 8)
      bo.y = H / 2 + Math.sin(s.t) * (H / 2 - bo.h / 2 - 10)
      bo.cd -= dt
      if (bo.cd <= 0) { bo.cd = 0.6; for (let i = -1; i <= 1; i++) { const a = Math.PI + i * 0.35; s.ebullets.push({ x: bo.x - bo.w / 2, y: bo.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220 }) } Sound.laser() }
    }

    // enemy/boss body & bullets vs ship
    if (s.invuln <= 0) {
      const hitShip = s.enemies.some((e) => Math.hypot(e.x - sh.x, e.y - sh.y) < e.r + sh.r) ||
        s.ebullets.some((b) => Math.hypot(b.x - sh.x, b.y - sh.y) < sh.r + 3) ||
        (s.boss && Math.abs(sh.x - s.boss.x) < s.boss.w / 2 + sh.r && Math.abs(sh.y - s.boss.y) < s.boss.h / 2 + sh.r)
      if (hitShip) hurt()
    }
    // powers pickup
    for (const p of s.powers) {
      if (Math.hypot(p.x - sh.x, p.y - sh.y) < sh.r + 10) {
        p.dead = true; Sound.coin()
        if (p.type === 'gun') { s.weapon = Math.min(3, s.weapon + 1); setUi((u) => ({ ...u, weapon: s.weapon })) }
        else { s.lives += 1; setUi((u) => ({ ...u, lives: s.lives })) }
      }
    }
  }

  const startBoss = () => {
    const s = g.current
    s.enemies = []; s.boss = { x: W + 90, y: H / 2, w: 70, h: 120, hp: 60, cd: 1 }
    s.bossHp = 60; Sound.combo(4); setUi((u) => ({ ...u, boss: 60 }))
  }
  const bossDown = () => {
    const s = g.current
    for (let i = 0; i < 40; i++) explode(s.boss.x + (Math.random() - 0.5) * s.boss.w, s.boss.y + (Math.random() - 0.5) * s.boss.h, '#ff9f1c')
    s.score += 5000; s.boss = null; s.state = 'win'; Sound.win(); submitBest(s.score)
    setUi((u) => ({ ...u, score: s.score, state: 'win' }))
  }
  const hurt = () => {
    const s = g.current
    s.lives -= 1; s.invuln = 1.5; s.weapon = Math.max(1, s.weapon - 1); Sound.explode()
    explode(s.ship.x, s.ship.y, '#39ff14')
    if (s.lives < 0) { s.state = 'over'; submitBest(s.score); setUi((u) => ({ ...u, state: 'over' })) }
    else setUi((u) => ({ ...u, lives: s.lives, weapon: s.weapon }))
  }
  const explode = (x, y, c) => {
    const s = g.current
    for (let i = 0; i < 10; i++) { const a = Math.random() * 7, sp = 40 + Math.random() * 140; s.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4 + Math.random() * 0.3, c }) }
  }

  const draw = () => {
    const s = g.current, cv = canvas.current; if (!cv || !s) return
    const ctx = cv.getContext('2d')
    ctx.fillStyle = '#050a10'; ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#2a5a3a'; s.stars.forEach((st) => ctx.fillRect(st.x, st.y, st.s, st.s))
    // ship
    const sh = s.ship
    if (!(s.invuln > 0 && Math.floor(s.t * 20) % 2)) {
      ctx.fillStyle = '#39ff14'
      ctx.beginPath(); ctx.moveTo(sh.x + 16, sh.y); ctx.lineTo(sh.x - 12, sh.y - 11); ctx.lineTo(sh.x - 6, sh.y); ctx.lineTo(sh.x - 12, sh.y + 11); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#29e7cd'; ctx.fillRect(sh.x - 14, sh.y - 3, 6, 6)
      ctx.fillStyle = '#f9f002'; ctx.fillRect(sh.x - 20 - Math.random() * 6, sh.y - 2, 8, 4)
    }
    // bullets
    ctx.fillStyle = '#f9f002'; s.bullets.forEach((b) => ctx.fillRect(b.x, b.y - 1.5, 10, 3))
    ctx.fillStyle = '#ff5db1'; s.ebullets.forEach((b) => { ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, 7); ctx.fill() })
    // enemies
    s.enemies.forEach((e) => {
      ctx.fillStyle = e.color
      ctx.beginPath(); ctx.moveTo(e.x - e.r, e.y); ctx.lineTo(e.x + e.r, e.y - e.r); ctx.lineTo(e.x + e.r * 0.4, e.y); ctx.lineTo(e.x + e.r, e.y + e.r); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#04140a'; ctx.fillRect(e.x - 2, e.y - 2, 4, 4)
    })
    // powers
    s.powers.forEach((p) => {
      ctx.fillStyle = p.type === 'gun' ? '#29e7cd' : '#ff5db1'
      ctx.fillRect(p.x - 8, p.y - 8, 16, 16)
      ctx.fillStyle = '#04140a'; ctx.font = '10px "Press Start 2P"'; ctx.fillText(p.type === 'gun' ? 'G' : 'L', p.x - 4, p.y + 4)
    })
    // boss
    if (s.boss) {
      const bo = s.boss
      ctx.fillStyle = '#7a1a1a'; ctx.fillRect(bo.x - bo.w / 2, bo.y - bo.h / 2, bo.w, bo.h)
      ctx.fillStyle = '#ff3b30'; ctx.fillRect(bo.x - bo.w / 2, bo.y - bo.h / 2, bo.w, 8); ctx.fillRect(bo.x - bo.w / 2, bo.y + bo.h / 2 - 8, bo.w, 8)
      ctx.fillStyle = '#f9f002'; ctx.beginPath(); ctx.arc(bo.x - bo.w / 4, bo.y, 8, 0, 7); ctx.arc(bo.x + bo.w / 4, bo.y - 20, 8, 0, 7); ctx.fill()
      // health bar
      ctx.fillStyle = '#04140a'; ctx.fillRect(W / 2 - 100, 8, 200, 8)
      ctx.fillStyle = '#ff3b30'; ctx.fillRect(W / 2 - 100, 8, 200 * (bo.hp / s.bossHp), 8)
    }
    // particles
    s.particles.forEach((p) => { ctx.globalAlpha = Math.max(0, p.life * 2); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 3, 3); ctx.globalAlpha = 1 })
    if (!s.boss) {
      ctx.fillStyle = '#1f7a2b'; ctx.font = '8px "Press Start 2P"'
      ctx.fillText('DISTANCE ' + Math.floor(s.dist) + '/45', 10, H - 10)
    }
  }

  return (
    <div>
      <HUD>
        <Stat label="SCORE" value={ui.score} />
        <Stat label="LIVES" value={Math.max(0, ui.lives)} color="var(--yellow)" />
        <Stat label="GUN" value={'▮'.repeat(ui.weapon)} color="var(--cyan)" />
        <Stat label="BEST" value={best} color="var(--pink)" />
      </HUD>
      <Screen width={W} height={H} canvasRef={canvas}>
        {ui.state === 'over' && <Overlay title="SHIP DOWN" sub={`Score ${ui.score}`} color="var(--red)" onRetry={() => { Sound.select(); reset() }} onExit={onExit} />}
        {ui.state === 'win' && <Overlay title="BOSS DESTROYED" sub={`Score ${ui.score}`} color="var(--green)" onRetry={() => { Sound.select(); reset() }} onExit={onExit} />}
      </Screen>
      <p style={{ textAlign: 'center', fontFamily: 'var(--font-term)', fontSize: 20, color: 'var(--green-dim)' }}>
        Arrows/WASD to fly · SPACE to shoot · grab G to upgrade your gun · survive to the boss
      </p>
    </div>
  )
}
