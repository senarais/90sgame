import { useEffect } from 'react'
import Sound from '../sound.js'
import GameIcon from './GameIcon.jsx'

// Pre-game tutorial: three retro cards (how to play / controls / tips)
// followed by a big START PLAY button. Shown by GameShell before the
// actual game mounts. Press Enter to start.
export default function GameGuide({ game, onStart }) {
  const g = game.guide || {}
  const accent = game.color

  useEffect(() => {
    Sound.resume(); Sound.select()
    const onKey = (e) => { if (e.key === 'Enter') onStart() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onStart])

  return (
    <div style={{
      width: '100%', maxWidth: 640, margin: '0 auto',
      display: 'flex', flexDirection: 'column', gap: 16,
      animation: 'blink 0.18s steps(2) 1',
    }}>
      {/* header: icon + title + meta */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{
          border: `3px solid ${accent}`, background: 'var(--screen)', padding: 8,
          width: 72, height: 72, flexShrink: 0, display: 'grid', placeItems: 'center',
          borderRadius: 6, boxShadow: `0 0 16px ${accent}55`,
        }}>
          <GameIcon icon={game.icon} color={accent} size={52} />
        </div>
        <div>
          <div className="title glow" style={{ fontSize: 18, color: accent }}>{game.title}</div>
          <div style={{ fontFamily: 'var(--font-term)', fontSize: 20, color: 'var(--green-dim)', marginTop: 4 }}>
            {game.year} · {game.genre}
          </div>
        </div>
      </div>

      {/* HOW TO PLAY */}
      <Card accent={accent} label="HOW TO PLAY">
        <p style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 17, lineHeight: 1.4, color: 'var(--green-soft)' }}>
          {g.objective || game.blurb}
        </p>
      </Card>

      {/* CONTROLS */}
      {g.controls?.length > 0 && (
        <Card accent={accent} label="CONTROLS">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {g.controls.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {c.keys.map((k, j) => <Key key={j} accent={accent}>{k}</Key>)}
                </div>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 16, color: 'var(--green-soft)' }}>
                  {c.action}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TIPS */}
      {g.tips?.length > 0 && (
        <Card accent={accent} label="TIPS">
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {g.tips.map((t, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, fontFamily: 'var(--font-ui)', fontSize: 16, color: 'var(--green-soft)', lineHeight: 1.35 }}>
                <span style={{ color: accent, flexShrink: 0 }}>▸</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* START */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
        <button
          className="btn"
          style={{
            fontSize: 15, padding: '16px 34px', background: accent, color: 'var(--ink)',
            boxShadow: `5px 5px 0 rgba(0,0,0,0.5)`, animation: 'pressUp 1.6s ease-in-out infinite',
          }}
          onClick={() => { Sound.confirm(); onStart() }}
        >
          ▶ START PLAY
        </button>
      </div>
      <div style={{ textAlign: 'center', fontFamily: 'var(--font-term)', fontSize: 17, color: 'var(--green-dim)', marginTop: -6 }}>
        or press ENTER
      </div>
    </div>
  )
}

function Card({ accent, label, children }) {
  return (
    <div style={{
      position: 'relative', border: '3px solid var(--line)', borderRadius: 8,
      background: 'var(--panel)', padding: '20px 16px 16px',
    }}>
      <span style={{
        position: 'absolute', top: -11, left: 14, background: 'var(--bg)', padding: '0 8px',
        fontFamily: 'var(--font-title)', fontSize: 10, color: accent, letterSpacing: 1,
      }}>{label}</span>
      {children}
    </div>
  )
}

function Key({ accent, children }) {
  return (
    <kbd style={{
      fontFamily: 'var(--font-title)', fontSize: 9, color: 'var(--ink)',
      background: accent, border: '2px solid var(--ink)', borderRadius: 4,
      padding: '5px 7px', minWidth: 22, textAlign: 'center', lineHeight: 1,
      boxShadow: '0 2px 0 rgba(0,0,0,0.4)', display: 'inline-block',
    }}>{children}</kbd>
  )
}
