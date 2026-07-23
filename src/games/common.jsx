// ============================================================
// common.jsx — shared building blocks for every game:
//   useKeys  : tracks held keys, blocks page scroll on arrows
//   useRaf   : requestAnimationFrame loop with delta time
//   useBestScore : per-game high score in localStorage
//   HUD / GameOver overlays
// ============================================================
import { useEffect, useRef, useState, useCallback } from 'react'
import Sound from '../sound.js'

const BLOCK = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar',
])

export function useKeys(onKeyDown) {
  const keys = useRef({})
  const cb = useRef(onKeyDown)
  cb.current = onKeyDown
  useEffect(() => {
    const dn = (e) => {
      if (BLOCK.has(e.key)) e.preventDefault()
      if (!keys.current[e.key]) cb.current?.(e.key, e)
      keys.current[e.key] = true
    }
    const up = (e) => { keys.current[e.key] = false }
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', dn)
      window.removeEventListener('keyup', up)
    }
  }, [])
  return keys
}

// fixed-ish RAF loop. `fn(dt)` gets seconds since last frame (capped).
export function useRaf(fn, running = true) {
  const cb = useRef(fn)
  cb.current = fn
  useEffect(() => {
    if (!running) return
    let raf, last = performance.now(), alive = true
    const tick = (now) => {
      if (!alive) return
      let dt = (now - last) / 1000
      last = now
      if (dt > 0.05) dt = 0.05
      cb.current(dt)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { alive = false; cancelAnimationFrame(raf) }
  }, [running])
}

export function useBestScore(gameId) {
  const key = `90s-best-${gameId}`
  const [best, setBest] = useState(() => Number(localStorage.getItem(key) || 0))
  const submit = useCallback((score) => {
    setBest((b) => {
      if (score > b) { localStorage.setItem(key, String(score)); return score }
      return b
    })
  }, [key])
  return [best, submit]
}

export function HUD({ children, style }) {
  return (
    <div style={{
      display: 'flex', gap: 22, alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-title)', fontSize: 11, color: 'var(--yellow)',
      textShadow: '0 0 8px var(--amber)', padding: '4px 0 12px', flexWrap: 'wrap',
      ...style,
    }}>{children}</div>
  )
}

export function Stat({ label, value, color = 'var(--green)' }) {
  return (
    <span style={{ color }}>
      <span style={{ opacity: 0.7, marginRight: 6 }}>{label}</span>{value}
    </span>
  )
}

// full-screen-of-canvas overlay for win / lose states
export function Overlay({ title, sub, onRetry, onExit, color = 'var(--red)', tips }) {
  useEffect(() => {
    if (/over|game over|lose/i.test(title)) Sound.gameover()
    else Sound.win()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 18,
      background: 'rgba(4,10,6,0.82)', backdropFilter: 'blur(1px)', zIndex: 5,
      textAlign: 'center', padding: 20,
    }}>
      <div className="title glow" style={{ fontSize: 34, color }}>{title}</div>
      {sub && <div style={{ fontFamily: 'var(--font-term)', fontSize: 26, color: 'var(--green)' }}>{sub}</div>}
      {tips && <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, color: 'var(--green-dim)', maxWidth: 380 }}>{tips}</div>}
      <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
        {onRetry && <button className="btn yellow" onClick={() => { Sound.select(); onRetry() }}>▶ Retry</button>}
        {onExit && <button className="btn ghost" onClick={() => { Sound.back(); onExit() }}>Menu</button>}
      </div>
    </div>
  )
}

// standard responsive canvas centered in the shell
export function Screen({ width, height, canvasRef, style, children }) {
  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
      <div style={{ position: 'relative', maxWidth: '100%' }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{
            width: 'min(100%, ' + width + 'px)',
            maxHeight: '68vh',
            aspectRatio: `${width}/${height}`,
            background: 'var(--screen)',
            border: '4px solid var(--green-dim)',
            borderRadius: 8,
            boxShadow: '0 0 0 4px var(--ink), 0 0 30px rgba(57,255,20,0.15)',
            ...style,
          }}
        />
        {children}
      </div>
    </div>
  )
}
