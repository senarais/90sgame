import { useEffect } from 'react'
import Sound from '../sound.js'
import GameIcon from './GameIcon.jsx'

// "Do you want to play <game>?" — modelled on the retro dialog reference art.
export default function GameModal({ game, onYes, onNo }) {
  useEffect(() => {
    Sound.resume(); Sound.select()
    const onKey = (e) => {
      if (e.key === 'Escape') onNo()
      if (e.key === 'Enter') onYes()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [game, onYes, onNo])

  return (
    <div
      onClick={onNo}
      style={{
        position: 'fixed', inset: 0, zIndex: 100, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(4,10,6,0.78)', animation: 'blink 0.2s steps(2) 1',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', width: 'min(92vw, 440px)',
          background: '#e9e4cf', border: '4px solid #04140a',
          borderRadius: 4, boxShadow: '10px 10px 0 rgba(0,0,0,0.5)', padding: 0,
          fontFamily: 'var(--font-ui)',
        }}
      >
        {/* title bar with hazard stripes */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
          background: 'repeating-linear-gradient(45deg,#f9c200 0 10px,#04140a 10px 20px)',
          borderBottom: '4px solid #04140a',
        }}>
          <span style={{ background: '#e9e4cf', color: '#04140a', fontFamily: 'var(--font-title)', fontSize: 9, padding: '4px 8px', border: '2px solid #04140a' }}>
            SYSTEM
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={onNo}
            style={{ background: '#ff3b30', color: '#fff', border: '3px solid #04140a', width: 30, height: 30, cursor: 'inherit', fontFamily: 'var(--font-title)', fontSize: 12, lineHeight: 1 }}
          >×</button>
        </div>

        {/* body */}
        <div style={{ display: 'flex', gap: 16, padding: 20 }}>
          <div style={{ border: '3px solid #04140a', background: '#0b1a0e', padding: 6, height: 76, width: 76, flexShrink: 0, display: 'grid', placeItems: 'center' }}>
            <GameIcon icon={game.icon} color={game.color} size={58} />
          </div>
          <div style={{ color: '#04140a' }}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 15, marginBottom: 8 }}>{game.title}</div>
            <div style={{ fontSize: 16, lineHeight: 1.35, color: '#2a2a1a' }}>
              {game.year} · {game.genre}
              <br />{game.blurb}
            </div>
          </div>
        </div>

        <div style={{ padding: '0 20px 8px', color: '#04140a', fontFamily: 'var(--font-title)', fontSize: 11 }}>
          DO YOU WANT TO PLAY?
        </div>

        {/* buttons */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-end', padding: 20 }}>
          <button className="btn" style={{ background: '#c9c3a8', color: '#04140a', boxShadow: '4px 4px 0 #7a755f' }}
            onClick={() => { Sound.back(); onNo() }}>NO</button>
          <button className="btn yellow" onClick={() => { Sound.confirm(); onYes() }}>▶ YES</button>
        </div>
      </div>
    </div>
  )
}
