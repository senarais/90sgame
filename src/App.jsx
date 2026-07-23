import { useEffect, useState } from 'react'
import LoadingScreen from './components/LoadingScreen.jsx'
import Home from './components/Home.jsx'
import GameModal from './components/GameModal.jsx'
import GameShell from './components/GameShell.jsx'
import Sound from './sound.js'

import { GAMES } from './games/index.js'

// Optional deep-link for quick testing: ?screen=home or ?game=tetris
function initialState() {
  const p = new URLSearchParams(window.location.search)
  const gid = p.get('game')
  if (gid) { const g = GAMES.find((x) => x.id === gid); if (g) return { screen: 'playing', playing: g } }
  if (p.get('screen') === 'home') return { screen: 'home', playing: null }
  return { screen: 'loading', playing: null }
}

export default function App() {
  const init = initialState()
  const [screen, setScreen] = useState(init.screen) // loading | home | playing
  const [pending, setPending] = useState(null)      // game awaiting confirm
  const [playing, setPlaying] = useState(init.playing) // active game

  // unlock the Web Audio context on the very first user gesture
  useEffect(() => {
    const unlock = () => Sound.resume()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  return (
    <>
      {screen === 'loading' && <LoadingScreen onDone={() => setScreen('home')} />}

      {screen === 'home' && <Home onPick={(g) => setPending(g)} />}

      {screen === 'playing' && playing && (
        <GameShell game={playing} onExit={() => { setPlaying(null); setScreen('home') }} />
      )}

      {pending && (
        <GameModal
          game={pending}
          onYes={() => { const g = pending; setPending(null); setPlaying(g); setScreen('playing') }}
          onNo={() => { setPending(null); Sound.back() }}
        />
      )}

      <div className="crt-overlay crt-flicker" />
    </>
  )
}
