// Central registry of every game. `component` is lazy-loaded so the
// homepage stays snappy and each game only loads when picked.
import { lazy } from 'react'

export const GAMES = [
  {
    id: 'tetris', title: 'TETRIS', year: 1984, genre: 'Tile Puzzle',
    color: '#29e7cd', icon: 'tetris',
    blurb: 'Stack the falling blocks, clear four rows at once for a TETRIS.',
    component: lazy(() => import('./Tetris.jsx')),
  },
  {
    id: 'pacman', title: 'PAC-MAN', year: 1980, genre: 'Maze Chaser',
    color: '#f9f002', icon: 'pacman',
    blurb: 'Eat every dot. Four ghosts, four different brains, one hungry hero.',
    component: lazy(() => import('./PacMan.jsx')),
  },
  {
    id: 'zuma', title: 'ZUMA', year: 2003, genre: 'Marble Popper',
    color: '#39ff14', icon: 'zuma',
    blurb: 'Spin the frog, fire marbles, match 3 before they reach the skull.',
    component: lazy(() => import('./Zuma.jsx')),
  },
  {
    id: 'peggle', title: 'PEGGLE', year: 2007, genre: 'Pachinko Puzzle',
    color: '#ff9f1c', icon: 'peggle',
    blurb: 'Pachinko meets pinball. Clear every orange peg for extreme fever.',
    component: lazy(() => import('./Peggle.jsx')),
  },
  {
    id: 'arkanoid', title: 'ARKANOID', year: 1986, genre: 'Brick Breaker',
    color: '#ff5db1', icon: 'arkanoid',
    blurb: 'Smash the wall, grab power-ups, survive the multiball.',
    component: lazy(() => import('./Arkanoid.jsx')),
  },
  {
    id: 'frogger', title: 'FROGGER', year: 1981, genre: 'Action-Avoidance',
    color: '#39ff14', icon: 'frogger',
    blurb: 'Cross the road, ride the logs, fill all five homes. Do not splat.',
    component: lazy(() => import('./Frogger.jsx')),
  },
  {
    id: 'spaceimpact', title: 'SPACE IMPACT', year: 2000, genre: 'Scrolling Shooter',
    color: '#29e7cd', icon: 'ship',
    blurb: 'The Nokia classic. Upgrade your gun and take down the boss.',
    component: lazy(() => import('./SpaceImpact.jsx')),
  },
  {
    id: 'bounce', title: 'BOUNCE', year: 2001, genre: 'Physics Platformer',
    color: '#ff3b30', icon: 'bounce',
    blurb: 'Momentum is everything. Grab the rings, dodge the spikes.',
    component: lazy(() => import('./Bounce.jsx')),
  },
  {
    id: 'digdug', title: 'DIG DUG', year: 1982, genre: 'Strategy Maze',
    color: '#ff9f1c', icon: 'digdug',
    blurb: 'Dig your own tunnels, pump up the monsters, drop rocks for combos.',
    component: lazy(() => import('./DigDug.jsx')),
  },
  {
    id: 'sokoban', title: 'SOKOBAN', year: 1982, genre: 'Transport Puzzle',
    color: '#f9f002', icon: 'sokoban',
    blurb: 'Pure logic. Push every crate onto a goal — no take-backs on a corner.',
    component: lazy(() => import('./Sokoban.jsx')),
  },
]

export const getGame = (id) => GAMES.find((g) => g.id === id)
