import { Suspense, useState } from 'react'
import Sound from '../sound.js'

export default function GameShell({ game, onExit }) {
  const [muted, setMuted] = useState(Sound.muted)
  const Game = game.component
  return (
    <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
        borderBottom: '3px solid var(--green-dim)', background: '#0a140b',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button className="btn ghost" style={{ fontSize: 10, padding: '8px 12px' }}
          onClick={() => { Sound.back(); onExit() }}>◀ ARCADE</button>
        <div className="title" style={{ fontSize: 14, color: game.color, textShadow: `0 0 8px ${game.color}66`, flex: 1 }}>
          {game.title}
        </div>
        <span style={{ fontFamily: 'var(--font-term)', fontSize: 16, color: 'var(--green-dim)' }}>{game.year}</span>
        <button className="btn ghost" style={{ fontSize: 10, padding: '8px 12px' }}
          onClick={() => { const m = Sound.toggleMute(); setMuted(m); if (!m) Sound.select() }}>
          {muted ? '🔇 OFF' : '🔊 ON'}
        </button>
      </div>

      <div style={{ flex: 1, padding: '18px 12px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
        <Suspense fallback={
          <div className="blink" style={{ textAlign: 'center', marginTop: 80, fontFamily: 'var(--font-title)', fontSize: 14, color: 'var(--yellow)' }}>
            LOADING CARTRIDGE…
          </div>
        }>
          <div key={game.id}><Game onExit={onExit} /></div>
        </Suspense>
      </div>
    </div>
  )
}
