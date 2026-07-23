import { GAMES } from '../games/index.js'
import GameIcon from './GameIcon.jsx'
import Sound from '../sound.js'

export default function Home({ onPick }) {
  return (
    <div style={{ minHeight: '100%', overflowY: 'auto', height: '100%', padding: '32px 20px 60px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
        {/* marquee title */}
        <div style={{ marginBottom: 6 }}>
          <div className="title glow-y" style={{ fontSize: 'clamp(30px, 9vw, 80px)', lineHeight: 1.1 }}>
            90<span style={{ color: 'var(--green)', textShadow: '0 0 10px var(--green)' }}>s</span>
            <span style={{ display: 'block', fontSize: '0.5em', color: 'var(--green)', textShadow: '0 0 8px var(--green)', marginTop: 8 }}>GAME ARCADE</span>
          </div>
        </div>
        <div className="blink" style={{ fontFamily: 'var(--font-term)', fontSize: 22, color: 'var(--yellow)', marginBottom: 4 }}>
          ▚ SELECT YOUR GAME ▞
        </div>
        <div style={{ fontFamily: 'var(--font-term)', fontSize: 18, color: 'var(--green-dim)', marginBottom: 30 }}>
          10 classics · insert coin · high scores saved on this machine
        </div>

        <div style={{
          display: 'grid', gap: 16,
          gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
        }}>
          {GAMES.map((g, i) => (
            <button
              key={g.id}
              onMouseEnter={() => Sound.hover()}
              onClick={() => { Sound.select(); onPick(g) }}
              className="game-card"
              style={{
                textAlign: 'left', cursor: 'inherit', color: 'var(--green)',
                background: 'linear-gradient(180deg,#0e1c10,#0a140b)',
                border: '3px solid var(--green-dim)', borderRadius: 10,
                padding: 16, display: 'flex', gap: 14, alignItems: 'center',
                position: 'relative', overflow: 'hidden',
                boxShadow: 'inset 0 0 20px rgba(57,255,20,0.05)',
                transition: 'transform .08s, border-color .1s, box-shadow .1s',
              }}
            >
              <span style={{
                position: 'absolute', top: 6, right: 10, fontFamily: 'var(--font-title)',
                fontSize: 9, color: g.color, opacity: 0.85,
              }}>{g.year}</span>
              <div style={{
                width: 68, height: 68, flexShrink: 0, display: 'grid', placeItems: 'center',
                background: '#081108', border: `2px solid ${g.color}`, borderRadius: 8,
              }}>
                <GameIcon icon={g.icon} color={g.color} size={52} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="title" style={{ fontSize: 14, color: g.color, marginBottom: 6, textShadow: `0 0 6px ${g.color}66` }}>
                  {g.title}
                </div>
                <div style={{ fontFamily: 'var(--font-term)', fontSize: 16, color: 'var(--green)', lineHeight: 1.1 }}>
                  {g.genre}
                </div>
                <div style={{ fontFamily: 'var(--font-title)', fontSize: 8, color: 'var(--green-dim)', marginTop: 8 }}>
                  ▶ PRESS TO PLAY
                </div>
              </div>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 40, fontFamily: 'var(--font-term)', fontSize: 16, color: 'var(--green-dim)' }}>
          made with ♥ &amp; caffeine · a fully-frontend arcade · no coins actually required
        </div>
      </div>

      <style>{`
        .game-card:hover { transform: translateY(-4px); border-color: var(--green) !important; box-shadow: 0 6px 0 rgba(0,0,0,0.4), inset 0 0 24px rgba(57,255,20,0.12) !important; }
        .game-card:active { transform: translateY(0); }
      `}</style>
    </div>
  )
}
