// Small line-icon set (24 × 24, stroke = currentColor). Works in HTML and,
// with x / y, nested inside the network SVG.

export type IconName =
  | 'attacker' | 'users' | 'firewall' | 'limiter' | 'balancer' | 'server'
  | 'cache' | 'bot' | 'shield' | 'cpu' | 'memory' | 'network'
  | 'home' | 'search' | 'report'
  | 'check' | 'x' | 'alert' | 'zap' | 'info' | 'lock'
  | 'arrow-right' | 'play' | 'stop' | 'skip' | 'restart' | 'sun' | 'moon';

const PATHS: Record<IconName, string> = {
  attacker: 'M4 5h16v10H4z M2 19h20 M7.5 8.5l2 1.5-2 1.5 M11.5 11.5h4',
  users: 'M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M2.5 20a6.5 6.5 0 0 1 13 0 M16 4.6a3.5 3.5 0 0 1 0 6.8 M18 14.3a6.5 6.5 0 0 1 3.5 5.7',
  firewall: 'M3 4h18v16H3z M3 9.3h18 M3 14.7h18 M9 4v5.3 M15 4v5.3 M6 9.3v5.4 M12 9.3v5.4 M18 9.3v5.4 M9 14.7V20 M15 14.7V20',
  limiter: 'M3.5 17a9 9 0 1 1 17 0 M12 14l4.5-4.5 M12 15a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  balancer: 'M3 12h6 M9 12l4-6h7 M9 12l4 6h7 M17.5 3.5L20 6l-2.5 2.5 M17.5 15.5L20 18l-2.5 2.5',
  server: 'M3.5 3.5h17v7h-17z M3.5 13.5h17v7h-17z M7 7h.01 M7 17h.01 M11 7h6 M11 17h6',
  cache: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9 M12 3c-2.5 2.5-3.8 5.5-3.8 9s1.3 6.5 3.8 9',
  bot: 'M5 8.5h14v11H5z M12 8.5V5 M12 4.2h.01 M9.3 13h.01 M14.7 13h.01 M9.5 16.3h5 M2.5 12.5v3 M21.5 12.5v3',
  shield: 'M12 3l7.5 3v5.5c0 4.5-3.2 8.3-7.5 9.5-4.3-1.2-7.5-5-7.5-9.5V6z',
  cpu: 'M7 7h10v10H7z M10 10h4v4h-4z M10 3.5V7 M14 3.5V7 M10 17v3.5 M14 17v3.5 M3.5 10H7 M3.5 14H7 M17 10h3.5 M17 14h3.5',
  memory: 'M3 7h18v8H3z M6.5 15v3 M10 15v3 M14 15v3 M17.5 15v3 M7 10.5h2 M11 10.5h2 M15 10.5h2',
  network: 'M12 19.5h.01 M8.5 16a5 5 0 0 1 7 0 M5.2 12.6a9.7 9.7 0 0 1 13.6 0 M2 9.2a14.3 14.3 0 0 1 20 0',
  home: 'M3.5 11L12 4l8.5 7 M5.5 9.5V20h13V9.5 M10 20v-5.5h4V20',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z M15.3 15.3L20.5 20.5',
  report: 'M6 3.5h8.5l4 4v13H6z M14.5 3.5v4h4 M9.5 17.5v-3 M12.25 17.5v-6 M15 17.5v-4.5',
  check: 'M5 12.5l4.5 4.5L19 7',
  x: 'M6 6l12 12 M18 6L6 18',
  alert: 'M12 3.5L2.5 20h19z M12 10v4.5 M12 17.3v.2',
  zap: 'M13 2.5L4.5 13.5H11l-1 8 8.5-11H12z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v5.5 M12 7.8v.2',
  lock: 'M5 11h14v9.5H5z M8 11V8a4 4 0 0 1 8 0v3',
  'arrow-right': 'M5 12h14 M13 6l6 6-6 6',
  play: 'M7 4.5v15l12-7.5z',
  stop: 'M6.5 6.5h11v11h-11z',
  skip: 'M5.5 5.5l9 6.5-9 6.5z M18.5 5.5v13',
  restart: 'M4 12a8 8 0 1 0 2.35-5.65 M4 4v4.5h4.5',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 2.5v2 M12 19.5v2 M5.3 5.3l1.4 1.4 M17.3 17.3l1.4 1.4 M2.5 12h2 M19.5 12h2 M5.3 18.7l1.4-1.4 M17.3 6.7l1.4-1.4',
  moon: 'M20 14.2A8.5 8.5 0 1 1 9.8 4a6.8 6.8 0 0 0 10.2 10.2z',
};

export function Icon({ name, size = 16, x, y, strokeWidth = 1.75, className }: {
  name: IconName;
  size?: number;
  x?: number;
  y?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      x={x}
      y={y}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
