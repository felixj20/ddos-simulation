'use client';

import { useSyncExternalStore } from 'react';
import type { Flow, Stage, StageEdge, StageNode } from '../lib/simulation';
import { fmt } from '../lib/simulation';
import { Icon, type IconName } from './Icons';

const FLOW_COLOR: Record<Flow, string> = { udp: 'var(--udp)', http: 'var(--http)', legit: 'var(--legit)' };
const ICON: Record<Exclude<StageNode['kind'], 'swarm'>, IconName> = {
  attacker: 'attacker', users: 'users', firewall: 'firewall', limiter: 'limiter', balancer: 'balancer', server: 'server',
};

const BOX = { w: 128, h: 92 };
const DETAIL_CHAR = 7.3; // approx. width of one 12px mono character
const SWARM_R = 14;

const GEOMETRY = {
  h: { width: 1000, height: 420, place: (d: number, l: number) => ({ x: 72 + d * 856, y: 210 + l * 170 }) },
  v: { width: 440, height: 780, place: (d: number, l: number) => ({ x: 220 + l * 168, y: 58 + d * 664 }) },
};
type Orientation = keyof typeof GEOMETRY;

function useMedia(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

function anchor(node: StageNode, orientation: Orientation, side: 'out' | 'in') {
  const { x, y } = GEOMETRY[orientation].place(node.depth, node.lateral);
  const sign = side === 'out' ? 1 : -1;
  const half = node.kind === 'swarm' ? SWARM_R : orientation === 'h' ? BOX.w / 2 : BOX.h / 2;
  return orientation === 'h' ? { x: x + sign * half, y } : { x, y: y + sign * half };
}

// Distributes packet colours proportionally to the flows sharing an edge.
function packetColors(edge: StageEdge, count: number) {
  const colors: string[] = [];
  let carry = 0;
  for (const { flow, units } of edge.flows) {
    const exact = edge.units > 0 ? (units / edge.units) * count + carry : 0;
    const whole = Math.round(exact);
    carry = exact - whole;
    for (let i = 0; i < whole; i++) colors.push(FLOW_COLOR[flow]);
  }
  // Interleave so mixed flows don't travel in blocks.
  return colors.map((_, i) => colors[(i * 3) % colors.length] ?? FLOW_COLOR.http);
}

function packetCount(edge: StageEdge) {
  if (edge.units <= 0) return 0;
  if (edge.hideLabel) return 1;
  return Math.max(1, Math.min(8, Math.ceil(edge.units / 18)));
}

function labelWidth(text: string) {
  return text.length * 7.4 + 18;
}

export function NetworkStage({ stage, live }: { stage: Stage; live: boolean }) {
  const narrow = useMedia('(max-width: 640px)');
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');
  const orientation: Orientation = narrow ? 'v' : 'h';
  const geo = GEOMETRY[orientation];
  const nodes = new Map(stage.nodes.map((node) => [node.id, node]));
  const clampX = (x: number, w: number) => Math.min(geo.width - w / 2 - 4, Math.max(w / 2 + 4, x));

  // Crop the horizontal layout to its content so single-lane levels don't float in empty space.
  let top = 0;
  let height = geo.height;
  if (orientation === 'h') {
    const extents = stage.nodes.flatMap((node) => {
      const { y } = geo.place(node.depth, node.lateral);
      const half = node.kind === 'swarm' ? SWARM_R : BOX.h / 2;
      return [y - half, y + half + (node.badge ? 36 : 0)];
    });
    const minY = Math.min(...extents, ...stage.labels.map((label) => Math.max(18, geo.place(label.depth, label.lateral).y) - 12));
    const maxY = Math.max(...extents);
    top = Math.max(0, minY - 26);
    height = Math.min(geo.height, Math.max(maxY + 22, top + 170)) - top;
  }

  return (
    <svg
      className={`stage-svg ${live ? 'live' : 'idle'} ${orientation}`}
      viewBox={`0 ${top.toFixed(0)} ${geo.width} ${height.toFixed(0)}`}
      role="img"
      aria-label="Network topology: traffic flows from the attacker through the defenses to the servers"
    >

      {stage.edges.map((edge) => {
        const from = nodes.get(edge.from);
        const to = nodes.get(edge.to);
        if (!from || !to) return null;
        const a = anchor(from, orientation, 'out');
        const b = anchor(to, orientation, 'in');
        const path = `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} L ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        const dur = Math.max(0.9, length / 210);
        const count = live && !reducedMotion ? packetCount(edge) : 0;
        const colors = packetColors(edge, count);
        const dominant = [...edge.flows].sort((p, q) => q.units - p.units)[0];
        const stroke = live && edge.units > 0 ? FLOW_COLOR[dominant?.flow ?? 'http'] : undefined;
        const full = `${fmt(edge.units)} units`;
        const text = labelWidth(full) > length - 8 ? fmt(edge.units) : full;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const w = labelWidth(text);

        return (
          <g key={`${edge.id}-${orientation}`} className="edge">
            <path d={path} className={`edge-line ${live && edge.units <= 0 ? 'empty' : ''}`} style={stroke ? { stroke } : undefined} />
            {colors.map((color, i) => (
              <circle key={i} r={edge.hideLabel ? 3.5 : 5} className="packet" style={{ fill: color }}>
                <animateMotion dur={`${dur.toFixed(2)}s`} begin={`-${((i * dur) / count).toFixed(2)}s`} repeatCount="indefinite" path={path} />
              </circle>
            ))}
            {live && !edge.hideLabel && (
              <g className={`edge-label ${edge.units <= 0 ? 'zero' : ''}`} transform={`translate(${mid.x.toFixed(1)} ${mid.y.toFixed(1)})`}>
                <rect x={-w / 2} y={-12} width={w} height={24} rx={4} />
                <text textAnchor="middle" dy="4.5">{text}</text>
              </g>
            )}
          </g>
        );
      })}

      {live && stage.labels.map((label) => {
        const pos = geo.place(label.depth, label.lateral);
        const w = labelWidth(label.text);
        const x = clampX(pos.x, w);
        const y = orientation === 'h' ? Math.max(18, pos.y) : pos.y;
        return (
          <g key={label.id} className="edge-label fan" transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
            <rect x={-w / 2} y={-12} width={w} height={24} rx={4} />
            <text textAnchor="middle" dy="4.5">{label.text}</text>
          </g>
        );
      })}

      {stage.nodes.map((node) => {
        const { x, y } = geo.place(node.depth, node.lateral);
        const tone = live ? node.tone ?? 'neutral' : 'neutral';

        if (node.kind === 'swarm') {
          return (
            <g key={node.id} className="node swarm" transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
              <circle r={SWARM_R} />
              <Icon name="attacker" size={16} x={-8} y={-8} strokeWidth={1.6} className="swarm-icon" />
            </g>
          );
        }

        const hasLoad = node.load !== undefined;
        const overloaded = live && node.effect === 'overload';
        const effect = live ? node.effect : undefined;
        const badgeW = node.badge ? labelWidth(node.badge.text) : 0;
        const badgePos = orientation === 'h'
          ? { x: 0, y: BOX.h / 2 + 20, anchor: 'middle' as const }
          : { x: BOX.w / 2 + 10 + badgeW / 2, y: 0, anchor: 'middle' as const };
        if (orientation === 'v' && x + badgePos.x + badgeW / 2 > geo.width) badgePos.x = -(BOX.w / 2 + 10 + badgeW / 2);

        return (
          <g key={node.id} className={`node ${node.kind} tone-${tone} ${effect ? `fx-${effect}` : ''}`} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
            <rect className="node-box" x={-BOX.w / 2} y={-BOX.h / 2} width={BOX.w} height={BOX.h} rx={6} />
            <Icon
              name={overloaded ? 'zap' : ICON[node.kind]}
              size={22}
              x={-11}
              y={hasLoad ? -40 : -34}
              className={`node-icon ${overloaded ? 'overload-icon' : ''}`}
            />
            <text className="node-title" textAnchor="middle" y={hasLoad ? 4 : 12}>{node.title}</text>
            {node.detail && (() => {
              const shown = live ? node.detail : node.idleDetail ?? node.detail;
              const max = BOX.w - 16;
              const fits = shown.length * DETAIL_CHAR <= max;
              return (
                <text
                  className="node-detail"
                  textAnchor="middle"
                  y={hasLoad ? 20 : 30}
                  {...(fits ? {} : { textLength: max, lengthAdjust: 'spacingAndGlyphs' as const })}
                >
                  {shown}
                </text>
              );
            })()}
            {node.load !== undefined && (
              <g className="load-bar" transform={`translate(${-BOX.w / 2 + 14} ${BOX.h / 2 - 14})`}>
                <rect width={BOX.w - 28} height={6} rx={2} className="load-track" />
                <rect width={live ? Math.min(1, node.load / 100) * (BOX.w - 28) : 0} height={6} rx={2} className="load-fill" />
              </g>
            )}
            {effect === 'block' && (
              <g className="fx-marks" transform={`translate(${orientation === 'h' ? -BOX.w / 2 - 14 : 0} ${orientation === 'h' ? 0 : -BOX.h / 2 - 14})`}>
                <Icon name="x" size={20} x={-10} y={-10} strokeWidth={2.25} className="block-mark" />
              </g>
            )}
            {effect === 'drop' && (
              <g className="fx-marks" transform={`translate(${orientation === 'h' ? -BOX.w / 2 - 12 : 0} ${orientation === 'h' ? 0 : -BOX.h / 2 - 12})`}>
                <circle r="3" className="drop-mark" />
              </g>
            )}
            {live && node.badge && (
              <g className={`node-badge tone-${node.badge.tone}`} transform={`translate(${badgePos.x} ${badgePos.y})`}>
                <rect x={-badgeW / 2} y={-12} width={badgeW} height={24} rx={4} />
                <text textAnchor={badgePos.anchor} dy="4.5">{node.badge.text}</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
