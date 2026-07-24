// Central registry of every game. `component` is lazy-loaded so the
// homepage stays snappy and each game only loads when picked.
//
// `guide` powers the pre-game tutorial cards (see GameGuide.jsx):
//   objective — one or two lines on the goal / what you're doing
//   controls  — [{ keys, action }] rows rendered as a key legend
//   tips      — short strategy bullets shown before the START button
import { lazy } from 'react'

export const GAMES = [
  {
    id: 'tetris', title: 'TETRIS', year: 1984, genre: 'Tile Puzzle',
    color: '#29e7cd', icon: 'tetris',
    blurb: 'Stack the falling blocks, clear four rows at once for a TETRIS.',
    guide: {
      objective: 'Move and rotate the falling tetrominoes to complete solid horizontal lines. Full lines vanish — clear four at once for a TETRIS.',
      controls: [
        { keys: ['←', '→'], action: 'Move left / right' },
        { keys: ['↑', 'X'], action: 'Rotate piece' },
        { keys: ['↓'], action: 'Soft drop' },
        { keys: ['SPACE'], action: 'Hard drop' },
      ],
      tips: [
        'Clearing multiple rows at once scores far more.',
        'Keep the stack flat and leave a column for I-pieces.',
        'The board speeds up as you level — plan ahead.',
      ],
    },
    component: lazy(() => import('./Tetris.jsx')),
  },
  {
    id: 'pacman', title: 'PAC-MAN', year: 1980, genre: 'Maze Chaser',
    color: '#f9f002', icon: 'pacman',
    blurb: 'Eat every dot. Four ghosts, four different brains, one hungry hero.',
    guide: {
      objective: 'Eat every dot in the maze while dodging the four ghosts. Grab a power pellet to turn the tables and hunt them for bonus points.',
      controls: [
        { keys: ['←', '→'], action: 'Steer left / right' },
        { keys: ['↑', '↓'], action: 'Steer up / down' },
      ],
      tips: [
        'Power pellets make ghosts edible for a few seconds.',
        'Each ghost chases with a different pattern.',
        'Use the side tunnels to slip away from a corner.',
      ],
    },
    component: lazy(() => import('./PacMan.jsx')),
  },
  {
    id: 'zuma', title: 'ZUMA', year: 2003, genre: 'Marble Popper',
    color: '#39ff14', icon: 'zuma',
    blurb: 'Spin the frog, fire marbles, match 3 before they reach the skull.',
    guide: {
      objective: 'Fire marbles from the frog into the advancing chain. Match 3 or more of the same color to pop them before the line reaches the skull.',
      controls: [
        { keys: ['MOUSE'], action: 'Aim the frog' },
        { keys: ['CLICK'], action: 'Shoot a marble' },
        { keys: ['R-CLICK'], action: 'Swap loaded marble' },
      ],
      tips: [
        'Chain reactions and gaps trigger bonus combos.',
        'Right-click swaps to your backup marble color.',
        'Aim into gaps to insert a matching color.',
      ],
    },
    component: lazy(() => import('./Zuma.jsx')),
  },
  {
    id: 'peggle', title: 'PEGGLE', year: 2007, genre: 'Pachinko Puzzle',
    color: '#ff9f1c', icon: 'peggle',
    blurb: 'Pachinko meets pinball. Clear every orange peg for extreme fever.',
    guide: {
      objective: 'Drop balls into the pegs and clear every ORANGE peg to win. You have a limited number of balls, so make each drop count.',
      controls: [
        { keys: ['MOUSE'], action: 'Aim the launcher' },
        { keys: ['CLICK'], action: 'Drop the ball' },
      ],
      tips: [
        'Only orange pegs must be cleared — blue ones are just points.',
        'Hitting a green peg earns a free ball.',
        'Catch the ball in the moving bucket for another free ball.',
      ],
    },
    component: lazy(() => import('./Peggle.jsx')),
  },
  {
    id: 'arkanoid', title: 'ARKANOID', year: 1986, genre: 'Brick Breaker',
    color: '#ff5db1', icon: 'arkanoid',
    blurb: 'Smash the wall, grab power-ups, survive the multiball.',
    guide: {
      objective: 'Bounce the ball off your paddle to smash every brick. Do not let the ball fall past you. Catch power-ups as they drop.',
      controls: [
        { keys: ['MOUSE', '← →'], action: 'Move the paddle' },
        { keys: ['CLICK', 'SPACE'], action: 'Launch ball / fire lasers' },
      ],
      tips: [
        'Power-ups: wide paddle, multiball, lasers, slow, extra life.',
        'Hit the paddle edges to angle the ball sharply.',
        'Multiball clears bricks fast — but harder to track.',
      ],
    },
    component: lazy(() => import('./Arkanoid.jsx')),
  },
  {
    id: 'frogger', title: 'FROGGER', year: 1981, genre: 'Action-Avoidance',
    color: '#39ff14', icon: 'frogger',
    blurb: 'Cross the road, ride the logs, fill all five homes. Do not splat.',
    guide: {
      objective: 'Guide your frog across the busy road and the river to fill all five home slots. Get hit by traffic or fall in the water and you splat.',
      controls: [
        { keys: ['↑', '↓'], action: 'Hop forward / back' },
        { keys: ['←', '→'], action: 'Hop left / right' },
      ],
      tips: [
        'You cannot swim — ride logs and turtles across the water.',
        'Time your hops through gaps in the traffic.',
        'Fill all five homes at the top to win.',
      ],
    },
    component: lazy(() => import('./Frogger.jsx')),
  },
  {
    id: 'spaceimpact', title: 'SPACE IMPACT', year: 2000, genre: 'Scrolling Shooter',
    color: '#29e7cd', icon: 'ship',
    blurb: 'The Nokia classic. Upgrade your gun and take down the boss.',
    guide: {
      objective: 'Fly your ship through waves of enemies, upgrade your weapon, and survive long enough to destroy the boss at the end.',
      controls: [
        { keys: ['ARROWS', 'WASD'], action: 'Fly the ship' },
        { keys: ['SPACE', 'X'], action: 'Shoot' },
      ],
      tips: [
        'Grab the G pickup to upgrade your gun.',
        'Weave between enemy bullets — they track you.',
        'Conserve health for the boss fight.',
      ],
    },
    component: lazy(() => import('./SpaceImpact.jsx')),
  },
  {
    id: 'bounce', title: 'BOUNCE', year: 2001, genre: 'Physics Platformer',
    color: '#ff3b30', icon: 'bounce',
    blurb: 'Momentum is everything. Grab the rings, dodge the spikes.',
    guide: {
      objective: 'Bounce across the platforms, collect every yellow ring, then reach the glowing exit. Land on a spike and you respawn at the start.',
      controls: [
        { keys: ['←', '→', 'A', 'D'], action: 'Roll left / right' },
        { keys: ['↑', 'W', 'SPACE'], action: 'Jump' },
      ],
      tips: [
        'You can jump about two tiles up and three across — plan your route.',
        'Every yellow ring must be collected before the exit opens.',
        'Landing hard makes you bounce again, so aim for wide platforms.',
      ],
    },
    component: lazy(() => import('./Bounce.jsx')),
  },
  {
    id: 'digdug', title: 'DIG DUG', year: 1982, genre: 'Strategy Maze',
    color: '#ff9f1c', icon: 'digdug',
    blurb: 'Dig your own tunnels, pump up the monsters, drop rocks for combos.',
    guide: {
      objective: 'Dig tunnels through the earth and wipe out every monster — inflate them with your harpoon until they pop, or drop rocks on them.',
      controls: [
        { keys: ['ARROWS', 'WASD'], action: 'Dig / move' },
        { keys: ['SPACE', 'X'], action: 'Fire harpoon, tap again to pump' },
      ],
      tips: [
        'Keep tapping fire to pump a speared monster until it bursts.',
        'Dig under a rock, then let it fall to crush monsters below.',
        'Green Fygars breathe fire — do not line up with them.',
      ],
    },
    component: lazy(() => import('./DigDug.jsx')),
  },
  {
    id: 'sokoban', title: 'SOKOBAN', year: 1982, genre: 'Transport Puzzle',
    color: '#f9f002', icon: 'sokoban',
    blurb: 'Pure logic. Push every crate onto a goal — no take-backs on a corner.',
    guide: {
      objective: 'Push every crate onto a ★ goal tile. You can only push — never pull — so one careless shove into a corner can lock a puzzle.',
      controls: [
        { keys: ['ARROWS', 'WASD'], action: 'Walk / push crates' },
        { keys: ['Z'], action: 'Undo last move' },
        { keys: ['R'], action: 'Reset the level' },
      ],
      tips: [
        'A crate pushed into a corner can never come out — avoid it.',
        'Plan the order you place crates before you start pushing.',
        'Undo is free, so experiment.',
      ],
    },
    component: lazy(() => import('./Sokoban.jsx')),
  },
  {
    id: 'snake', title: 'SNAKE', year: 1997, genre: 'Grid Survival',
    color: '#39ff14', icon: 'snake',
    blurb: 'The Nokia legend. Eat the apples, grow longer, never bite your own tail.',
    guide: {
      objective: 'Steer the snake to eat the glowing apples. Every apple makes you one segment longer and a little faster. Hit a wall or your own tail and the run ends.',
      controls: [
        { keys: ['↑', '↓', '←', '→'], action: 'Steer the snake' },
        { keys: ['W', 'A', 'S', 'D'], action: 'Also steer' },
      ],
      tips: [
        'You cannot turn back on yourself — plan each turn ahead.',
        'The longer you grow, the faster the snake moves.',
        'Leave yourself an exit; do not coil into a dead end.',
      ],
    },
    component: lazy(() => import('./Snake.jsx')),
  },
]

export const getGame = (id) => GAMES.find((g) => g.id === id)
