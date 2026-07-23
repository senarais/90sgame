import { useEffect, useRef, useState } from 'react'
import Sound from '../sound.js'

// Fake boot sequence: Pac-Man eats a row of dots as the progress bar.
export default function LoadingScreen({ onDone }) {
  const canvas = useRef(null)
  const [pct, setPct] = useState(0)
  const [ready, setReady] = useState(false)
  const done = useRef(false)

  useEffect(() => {
    const cv = canvas.current
    const ctx = cv.getContext('2d')
    const W = cv.width, H = cv.height
    const DOTS = 20
    let progress = 0
    let last = performance.now()
    let raf
    let eaten = -1

    const tick = (now) => {
      const dt = (now - last) / 1000; last = now
      // uneven loading feel: pause a couple times
      const speed = progress < 0.4 ? 0.5 : progress < 0.7 ? 0.22 : progress < 0.85 ? 0.12 : 0.4
      progress = Math.min(1, progress + dt * speed)
      setPct(Math.floor(progress * 100))

      ctx.fillStyle = '#060a06'; ctx.fillRect(0, 0, W, H)
      const y = H / 2
      const pad = 30
      const trackW = W - pad * 2
      const pacX = pad + trackW * progress
      // dots
      for (let i = 0; i < DOTS; i++) {
        const dx = pad + (trackW - 20) * (i / (DOTS - 1)) + 10
        if (dx < pacX - 6) continue
        ctx.fillStyle = i % 5 === 4 ? '#f9f002' : '#ffe08a'
        ctx.beginPath(); ctx.arc(dx, y, i % 5 === 4 ? 6 : 3, 0, 7); ctx.fill()
      }
      // eat sfx
      const ne = Math.floor(progress * DOTS)
      if (ne !== eaten) { eaten = ne; Sound.step && safe(() => Sound.step()) }
      // pacman
      const mouth = (Math.sin(now / 70) * 0.5 + 0.5) * 0.32 + 0.02
      ctx.fillStyle = '#f9f002'
      ctx.beginPath(); ctx.moveTo(pacX, y)
      ctx.arc(pacX, y, 15, mouth * Math.PI, -mouth * Math.PI + Math.PI * 2)
      ctx.closePath(); ctx.fill()

      if (progress >= 1 && !done.current) { done.current = true; setReady(true) }
      if (!done.current) raf = requestAnimationFrame(tick)
    }
    const safe = (f) => { try { f() } catch { /* audio not unlocked yet */ } }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const start = () => { Sound.resume(); Sound.confirm(); onDone() }

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 26, background: 'var(--void)',
    }}>
      <div className="title glow-y" style={{ fontSize: 'clamp(20px,6vw,44px)', textAlign: 'center' }}>
        90<span style={{ color: 'var(--green)', textShadow: '0 0 8px var(--green)' }}>s</span> GAME
      </div>
      <div style={{ fontFamily: 'var(--font-term)', fontSize: 26, color: 'var(--green)' }} className="blink">
        {ready ? 'READY' : 'LOADING SYSTEM…'}
      </div>
      <canvas ref={canvas} width={460} height={80} style={{ width: 'min(90vw,460px)' }} />
      <div style={{ fontFamily: 'var(--font-title)', fontSize: 14, color: 'var(--yellow)' }}>{pct}%</div>
      {ready && (
        <button className="btn yellow" style={{ marginTop: 6, fontSize: 16, animation: 'pressUp 1s infinite' }} onClick={start}>
          ▶ PRESS START
        </button>
      )}
      <div style={{ position: 'absolute', bottom: 20, fontFamily: 'var(--font-term)', fontSize: 18, color: 'var(--green-dim)' }}>
        © 199X — INSERT COIN — 1 CREDIT
      </div>
    </div>
  )
}
