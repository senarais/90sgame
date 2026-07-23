// Chunky pixel-art icons drawn as inline SVG, tinted per game.
export default function GameIcon({ icon, color = '#39ff14', size = 56 }) {
  const P = (x, y, w = 1, h = 1, c = color) => <rect key={`${x}-${y}-${c}`} x={x} y={y} width={w} height={h} fill={c} />
  const svg = (children) => (
    <svg viewBox="0 0 16 16" width={size} height={size} style={{ imageRendering: 'pixelated', shapeRendering: 'crispEdges' }}>{children}</svg>
  )
  switch (icon) {
    case 'tetris':
      return svg([
        P(6, 2, 4, 2, '#29e7cd'), P(8, 4, 2, 2, '#29e7cd'),
        P(2, 8, 2, 2, '#ff5db1'), P(4, 8, 2, 2, '#ff5db1'), P(4, 10, 2, 2, '#ff5db1'), P(6, 10, 2, 2, '#ff5db1'),
        P(10, 8, 4, 4, '#f9f002'),
      ])
    case 'pacman':
      return svg([
        <path key="p" d="M8 3 A5 5 0 1 0 8 13 L8 8 Z" fill="#f9f002" transform="rotate(25 8 8)" />,
        P(12, 7, 2, 2, '#ffe08a'), P(15, 7, 1, 2, '#ffe08a'),
      ])
    case 'zuma':
      return svg([
        P(3, 7, 3, 3, '#ff3b30', 3), <circle key="a" cx="4" cy="8" r="2" fill="#ff3b30" />,
        <circle key="b" cx="8" cy="8" r="2" fill="#f9f002" />, <circle key="c" cx="12" cy="8" r="2" fill="#39ff14" />,
        <circle key="d" cx="8" cy="12" r="1.6" fill="#29e7cd" />,
      ])
    case 'peggle':
      return svg([
        <circle key="1" cx="4" cy="4" r="1.6" fill="#29e7cd" />, <circle key="2" cx="8" cy="4" r="1.6" fill="#ff9f1c" />,
        <circle key="3" cx="12" cy="4" r="1.6" fill="#29e7cd" />, <circle key="4" cx="6" cy="8" r="1.6" fill="#ff9f1c" />,
        <circle key="5" cx="10" cy="8" r="1.6" fill="#29e7cd" />, <circle key="6" cx="8" cy="12" r="1.8" fill="#fff" />,
      ])
    case 'arkanoid':
      return svg([
        P(2, 2, 3, 2, '#ff3b30'), P(6, 2, 3, 2, '#ff9f1c'), P(10, 2, 4, 2, '#f9f002'),
        P(2, 5, 3, 2, '#39ff14'), P(6, 5, 3, 2, '#29e7cd'), P(10, 5, 4, 2, '#ff5db1'),
        <circle key="b" cx="9" cy="10" r="1.4" fill="#fff" />, P(5, 13, 6, 2, '#39ff14'),
      ])
    case 'frogger':
      return svg([
        <circle key="h" cx="8" cy="9" r="4" fill="#39ff14" />,
        P(4, 3, 2, 2, '#39ff14'), P(10, 3, 2, 2, '#39ff14'),
        P(5, 3, 1, 1, '#04140a'), P(11, 3, 1, 1, '#04140a'),
        P(3, 12, 2, 2, '#1e6b3a'), P(11, 12, 2, 2, '#1e6b3a'),
      ])
    case 'ship':
      return svg([
        <path key="s" d="M2 5 L12 8 L2 11 L4 8 Z" fill="#39ff14" />,
        P(0, 7, 3, 2, '#f9f002'), <circle key="c" cx="9" cy="8" r="1" fill="#29e7cd" />,
        P(13, 4, 1, 1, '#ff5db1'), P(14, 11, 1, 1, '#ff5db1'),
      ])
    case 'bounce':
      return svg([
        <circle key="b" cx="8" cy="8" r="5" fill="#ff3b30" />,
        <circle key="s" cx="6" cy="6" r="1.4" fill="#fff" />,
        P(1, 13, 14, 2, '#1f7a2b'), P(4, 12, 1, 1, '#f9f002'),
      ])
    case 'digdug':
      return svg([
        P(1, 1, 14, 14, '#5a3116'), P(3, 6, 10, 4, '#0a0704'),
        <circle key="m" cx="11" cy="8" r="2.4" fill="#ff3b30" />, P(4, 7, 3, 2, '#fff'),
        P(4, 7, 5, 1, '#f9f002'),
      ])
    case 'sokoban':
      return svg([
        P(3, 3, 5, 5, '#ff9f1c'), <path key="x1" d="M3 3 L8 8 M8 3 L3 8" stroke="#04140a" strokeWidth="0.6" />,
        <circle key="g" cx="11" cy="11" r="1.6" fill="#f9f002" />,
        P(9, 9, 5, 5, 'none'), <rect key="gb" x="9" y="9" width="5" height="5" fill="none" stroke="#39ff14" strokeWidth="0.6" />,
      ])
    default:
      return svg([P(4, 4, 8, 8)])
  }
}
