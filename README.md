# 🕹️ 90s GAME ARCADE

A fully front-end retro arcade built with **React + Vite** — no backend, no assets to download, just 10 classic games in one CRT-flavoured cabinet. Neon-green & digital-yellow Game Boy palette, pixel fonts, scanline overlay, and chiptune sound synthesised on the fly with the Web Audio API.

> Insert coin. 1 credit. Enjoy. 👾

## ✨ Features

- **10 playable classics**, each a self-contained `<canvas>` game
- **Pac-Man loading screen** → arcade home grid → per-game "do you want to play?" popup → play
- **CRT styling** — scanlines, vignette, flicker, custom pixel cursor, `Press Start 2P` / `Pixelify Sans` / `VT323` fonts
- **Zero audio files** — every blip, coin, and explosion is a synthesised chiptune (`src/sound.js`)
- **High scores** saved locally per game (`localStorage`)
- **Code-split** — each game only loads when you pick it

## 🎮 The games

| # | Game | Year | Genre | Controls |
|---|------|------|-------|----------|
| 1 | Tetris | 1984 | Tile Puzzle | ← → move · ↑ rotate · ↓ soft · Space hard drop |
| 2 | Pac-Man | 1980 | Maze Chaser | Arrow keys · 4 ghosts with distinct AI |
| 3 | Zuma | 2003 | Marble Popper | Mouse aim · click shoot · right-click swap |
| 4 | Peggle | 2007 | Pachinko Puzzle | Mouse aim · click to drop · clear orange pegs |
| 5 | Arkanoid | 1986 | Brick Breaker | Mouse / ← → · click to launch & fire |
| 6 | Frogger | 1981 | Action-Avoidance | Arrow keys to hop · fill all 5 homes |
| 7 | Space Impact | 2000 | Scrolling Shooter | WASD/Arrows · Space shoot · beat the boss |
| 8 | Bounce | 2001 | Physics Platformer | ← → move · ↑/Space jump · grab the rings |
| 9 | Dig Dug | 1982 | Strategy Maze | WASD/Arrows dig · Space pump · drop rocks |
| 10 | Sokoban | 1982 | Transport Puzzle | Arrows/WASD push · Z undo · R reset |

## 🚀 Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # production build to /dist
npm run preview  # preview the build
npm run lint     # eslint
```

### Dev shortcuts

Deep-link straight into a screen while developing:

- `?screen=home` — skip the loading screen
- `?game=<id>` — boot straight into a game (`tetris`, `pacman`, `zuma`, `peggle`, `arkanoid`, `frogger`, `spaceimpact`, `bounce`, `digdug`, `sokoban`)

## 🗂️ Project structure

```
src/
├── App.jsx              # router: loading → home → playing (+ confirm modal)
├── sound.js            # Web Audio chiptune synth (no audio assets)
├── index.css           # CRT theme, palette, fonts, retro buttons
├── components/
│   ├── LoadingScreen.jsx   # Pac-Man eating-dots boot bar
│   ├── Home.jsx            # arcade title + game grid
│   ├── GameModal.jsx       # "do you want to play?" popup
│   ├── GameShell.jsx       # top bar / back / mute wrapper
│   └── GameIcon.jsx        # pixel-art SVG icons
└── games/
    ├── index.js            # game registry (lazy-loaded)
    ├── common.jsx          # shared hooks: useKeys / useRaf / useBestScore, HUD, Overlay, Screen
    └── *.jsx               # one file per game
```

## 🛠️ Tech

- React 19 + Vite
- HTML5 Canvas for every game loop (`requestAnimationFrame`)
- Web Audio API for sound
- No external game engine, no backend, no network calls at runtime

## 🎨 Palette

Neon green `#39ff14` · digital yellow `#f9f002` on deep CRT black-green `#060a06`, with Game Boy accents — meant to feel like an old monitor or the original Game Boy screen.

---

Made with ♥ & caffeine. No coins actually required.
