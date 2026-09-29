// Deterministic traffic-unit model for the four levels described in the
// Digicamp reference: Firewall, Load Balancer, Rate Limiter and Final Boss.

export type LevelId = 'firewall' | 'balancer' | 'limiter' | 'boss';
export type Protocol = 'udp' | 'http';
export type SourceMode = 'single' | 'distributed';
export type Flow = 'udp' | 'http' | 'legit';
export type Tone = 'neutral' | 'good' | 'warn' | 'bad';
export type OutcomeTone = 'good' | 'stopped' | 'warn' | 'overload';

export interface Config {
  protocol: Protocol;
  intensity: number;
  sourceMode: SourceMode;
  sources: number;
  perSource: number;
}

export type NodeKind = 'attacker' | 'swarm' | 'users' | 'firewall' | 'limiter' | 'balancer' | 'server';

export interface StageNode {
  id: string;
  kind: NodeKind;
  depth: number;
  lateral: number;
  title?: string;
  detail?: string;
  idleDetail?: string;
  badge?: { text: string; tone: Tone };
  tone?: Tone;
  load?: number;
  effect?: 'block' | 'drop' | 'overload';
}

export interface StageEdge {
  id: string;
  from: string;
  to: string;
  units: number;
  flows: { flow: Flow; units: number }[];
  hideLabel?: boolean;
}

export interface StageLabel {
  id: string;
  depth: number;
  lateral: number;
  text: string;
}

export interface Stage {
  nodes: StageNode[];
  edges: StageEdge[];
  labels: StageLabel[];
}

export interface Outcome {
  tone: OutcomeTone;
  title: string;
  subtitle?: string;
  detail: string;
}

export interface Metric {
  label: string;
  value: string;
  hint: string;
  tone?: Tone;
}

// Where in the network a trace step happens; the UI maps this to an icon.
export type StepAt = 'source' | 'users' | 'firewall' | 'limiter' | 'balancer' | 'server';

export interface Step {
  at: StepAt;
  text: string;
}

// Which layer decided the outcome of a run.
export type Verdict = 'firewall' | 'limiter' | 'capacity' | 'holds';

export interface Simulation {
  stage: Stage;
  outcome: Outcome;
  verdict: Verdict;
  steps: Step[];
  metrics: Metric[];
  achieved: string[];
}

export interface LevelDef {
  id: LevelId;
  tag: string;
  name: string;
  goal: string;
  objectives: { id: string; label: string }[];
  aha: string;
  hint: string;
}

export const RATE_LIMIT = 10;
export const WEB_CAPACITY = 100;
export const FIREWALL_TRAFFIC = 100;
export const LIMITER_SERVER_CAPACITY = 120;
export const LIMITER_NORMAL_TRAFFIC = 60;
export const DISTRIBUTED = { sources: 10, perSource: 8 };
export const BOSS_SOURCES = [1, 5, 30];
export const BOSS_INTENSITIES = [
  { id: 'LOW', units: 5 },
  { id: 'MEDIUM', units: 8 },
  { id: 'HIGH', units: 15 },
];

export const LEVELS: LevelDef[] = [
  {
    id: 'firewall',
    tag: '01',
    name: 'Firewall',
    goal: 'A firewall uses rules to decide which traffic is allowed and which is blocked.',
    objectives: [
      { id: 'udp', label: 'Launch a UDP flood' },
      { id: 'http', label: 'Send HTTP requests' },
    ],
    aha: 'A firewall does not automatically protect against every attack. It can only block traffic for which a matching rule exists.',
    hint: 'Compare the attack type with the two firewall rules. Which rule matches?',
  },
  {
    id: 'balancer',
    tag: '02',
    name: 'Load Balancer',
    goal: 'A load balancer spreads incoming traffic across several servers, but it does not automatically increase the total capacity of the system.',
    objectives: [
      { id: 'relaxed', label: 'Keep both servers relaxed' },
      { id: 'max', label: 'Hit maximum capacity exactly' },
      { id: 'overload', label: 'Overload the servers' },
    ],
    aha: 'A load balancer does not create unlimited power. It only spreads the existing load across several servers.',
    hint: 'Each server can take 100 units. Watch what happens to each server as the total passes 200.',
  },
  {
    id: 'limiter',
    tag: '03',
    name: 'Rate Limiter',
    goal: 'A rate limiter caps traffic per source. Then find out why many distributed sources are an extra challenge.',
    objectives: [
      { id: 'single', label: 'Attack from a single source' },
      { id: 'distributed', label: 'Attack from distributed sources' },
    ],
    aha: 'A simple rate limiter looks at every source individually. Many sources together can therefore generate far more traffic.',
    hint: 'The limit applies per source. Does a single source gain anything from sending more?',
  },
  {
    id: 'boss',
    tag: '04',
    name: 'Final Boss',
    goal: 'Combine everything from the previous levels. The target system now has a firewall, a rate limiter and a load balancer.',
    objectives: [
      { id: 'pass', label: 'Get past the firewall' },
      { id: 'cap', label: 'Get more than 200 units to the servers' },
    ],
    aha: 'There is no single protection against DDoS attacks. Each layer solves a different problem, and only several layers together make a system resilient.',
    hint: 'The rate limiter limits every source individually. Which protocol gets past the firewall?',
  },
];

export const DEFAULT_CONFIGS: Record<LevelId, Config> = {
  firewall: { protocol: 'udp', intensity: 100, sourceMode: 'single', sources: 1, perSource: 8 },
  balancer: { protocol: 'http', intensity: 120, sourceMode: 'single', sources: 1, perSource: 8 },
  limiter: { protocol: 'http', intensity: 150, sourceMode: 'single', sources: 1, perSource: 8 },
  boss: { protocol: 'http', intensity: 80, sourceMode: 'single', sources: 1, perSource: 8 },
};

export const BALANCER_BANDS: { id: string; range: string; tone: 'good' | 'warn' | 'bad'; text: string; matches: (t: number) => boolean }[] = [
  { id: 'relaxed', range: '10–90', tone: 'good', text: 'Both servers relaxed', matches: (t: number) => t < 100 },
  { id: 'distribute', range: '100–150', tone: 'good', text: 'Load balancer spreads the traffic', matches: (t: number) => t >= 100 && t < 160 },
  { id: 'high', range: '160–190', tone: 'warn', text: 'High load', matches: (t: number) => t >= 160 && t < 200 },
  { id: 'max', range: '200', tone: 'warn', text: 'Maximum capacity reached', matches: (t: number) => t === 200 },
  { id: 'overload', range: '210–250', tone: 'bad', text: 'Servers overloaded', matches: (t: number) => t > 200 },
];

export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const pct = (n: number) => `${fmt(Math.round(n * 10) / 10)}%`;

function serverTone(loadPercent: number): Tone {
  if (loadPercent > 100) return 'bad';
  if (loadPercent >= 80) return 'warn';
  return 'good';
}

function webServers(depth: number, each: number, live = true): StageNode[] {
  return [1, 2].map((n) => ({
    id: `web${n}`,
    kind: 'server' as const,
    depth,
    lateral: n === 1 ? -0.55 : 0.55,
    title: `Web ${n}`,
    detail: `${fmt(each)} / ${WEB_CAPACITY}`,
    idleDetail: `max ${WEB_CAPACITY}`,
    load: each,
    tone: live ? serverTone(each) : 'neutral',
    effect: each > WEB_CAPACITY ? ('overload' as const) : undefined,
  }));
}

// Spreads `count` sources over a grid of `lanes` rows next to the start of the flow.
function swarm(count: number, lanes: number, from: number, to: number, units: number, target: string, flow: Flow) {
  const nodes: StageNode[] = [];
  const edges: StageEdge[] = [];
  for (let i = 0; i < count; i++) {
    const lane = i % lanes;
    const column = Math.floor(i / lanes);
    const lateral = lanes === 1 ? 0 : from + ((to - from) * lane) / (lanes - 1);
    nodes.push({ id: `src${i}`, kind: 'swarm', depth: column * 0.05, lateral });
    edges.push({ id: `src${i}-${target}`, from: `src${i}`, to: target, units, flows: [{ flow, units }], hideLabel: true });
  }
  return { nodes, edges, lastDepth: Math.floor((count - 1) / lanes) * 0.05 };
}

function simulateFirewall(c: Config): Simulation {
  const blocked = c.protocol === 'udp';
  const name = blocked ? 'UDP' : 'HTTP';
  const delivered = blocked ? 0 : FIREWALL_TRAFFIC;
  const flow: Flow = c.protocol;

  return {
    stage: {
      nodes: [
        { id: 'attacker', kind: 'attacker', depth: 0, lateral: 0, title: 'Attacker', detail: `${name} traffic` },
        {
          id: 'firewall', kind: 'firewall', depth: 0.5, lateral: 0, title: 'Firewall', detail: 'UDP blocked',
          badge: blocked ? { text: 'BLOCKED', tone: 'bad' } : { text: 'ALLOWED', tone: 'good' },
          effect: blocked ? 'block' : undefined,
        },
        { id: 'server', kind: 'server', depth: 1, lateral: 0, title: 'Server', detail: `${delivered} units in`, idleDetail: 'online', tone: blocked ? 'good' : 'warn' },
      ],
      edges: [
        { id: 'a-f', from: 'attacker', to: 'firewall', units: FIREWALL_TRAFFIC, flows: [{ flow, units: FIREWALL_TRAFFIC }] },
        { id: 'f-s', from: 'firewall', to: 'server', units: delivered, flows: [{ flow, units: delivered }] },
      ],
      labels: [],
    },
    outcome: blocked
      ? { tone: 'stopped', title: 'Attack stopped', detail: 'The firewall has a rule that blocks UDP traffic. 0 traffic units reach the server.' }
      : { tone: 'good', title: 'Traffic reaches the server', detail: 'The firewall has no rule against HTTP, so every HTTP request is allowed through to the server.' },
    verdict: blocked ? 'firewall' : 'holds',
    steps: [
      { at: 'source', text: `The attacker sends ${FIREWALL_TRAFFIC} units of ${name} traffic.` },
      {
        at: 'firewall',
        text: blocked ? 'Rule BLOCK UDP matches, so all traffic is dropped.' : 'Rule ALLOW HTTP matches, so all traffic passes.',
      },
      { at: 'server', text: `The server receives ${delivered} traffic units.` },
    ],
    metrics: [
      { label: 'INCOMING', value: String(FIREWALL_TRAFFIC), hint: `units of ${name}` },
      { label: 'BLOCKED', value: String(FIREWALL_TRAFFIC - delivered), hint: blocked ? 'by rule BLOCK UDP' : 'no rule matched' },
      { label: 'AT SERVER', value: String(delivered), hint: 'traffic units', tone: blocked ? 'good' : 'warn' },
      { label: 'FIREWALL', value: blocked ? 'BLOCKED' : 'ALLOWED', hint: `${name} traffic`, tone: blocked ? 'bad' : 'good' },
    ],
    achieved: [c.protocol],
  };
}

function simulateBalancer(c: Config): Simulation {
  const total = c.intensity;
  const each = total / 2;
  const band = BALANCER_BANDS.find((b) => b.matches(total)) ?? BALANCER_BANDS[0];
  const tone: OutcomeTone = band.tone === 'bad' ? 'overload' : band.tone;

  const detail = total > 200
    ? `Each server gets ${fmt(each)} units but can only handle ${WEB_CAPACITY}. Spreading the load does not add capacity.`
    : total === 200
      ? 'Both servers are at exactly 100%. There is no headroom left: one more unit and they tip over.'
      : `${total} units are split evenly: ${fmt(each)} units per server, ${pct(each)} load each.`;

  const achieved: string[] = [];
  if (band.id === 'relaxed') achieved.push('relaxed');
  if (total === 200) achieved.push('max');
  if (total > 200) achieved.push('overload');

  return {
    stage: {
      nodes: [
        { id: 'attacker', kind: 'attacker', depth: 0, lateral: 0, title: 'Attacker', detail: `${total} units` },
        { id: 'lb', kind: 'balancer', depth: 0.5, lateral: 0, title: 'Load Balancer', detail: 'splits 50 / 50' },
        ...webServers(1, each),
      ],
      edges: [
        { id: 'a-lb', from: 'attacker', to: 'lb', units: total, flows: [{ flow: 'http', units: total }] },
        { id: 'lb-w1', from: 'lb', to: 'web1', units: each, flows: [{ flow: 'http', units: each }] },
        { id: 'lb-w2', from: 'lb', to: 'web2', units: each, flows: [{ flow: 'http', units: each }] },
      ],
      labels: [],
    },
    outcome: { tone, title: band.text, detail },
    verdict: total > 200 ? 'capacity' : 'holds',
    steps: [
      { at: 'source', text: `${total} traffic units arrive at the load balancer.` },
      { at: 'balancer', text: `Split evenly: ${fmt(each)} to Web 1, ${fmt(each)} to Web 2.` },
      { at: 'server', text: `Each server handles max ${WEB_CAPACITY} units, so the load is ${pct(each)}.` },
      ...(total > 200 ? [{ at: 'server' as const, text: `${fmt(each)} > ${WEB_CAPACITY}: both servers are overloaded.` }] : []),
    ],
    metrics: [
      { label: 'INCOMING', value: String(total), hint: 'traffic units' },
      { label: 'PER SERVER', value: fmt(each), hint: `of ${WEB_CAPACITY} units` },
      { label: 'SERVER LOAD', value: pct(each), hint: 'Web 1 and Web 2', tone: serverTone(each) },
      { label: 'SYSTEM', value: `${total}/200`, hint: 'total capacity used', tone: serverTone(each) },
    ],
    achieved,
  };
}

function simulateLimiter(c: Config): Simulation {
  const distributed = c.sourceMode === 'distributed';
  const attack = distributed ? DISTRIBUTED.sources * DISTRIBUTED.perSource : c.intensity;
  const passed = distributed ? attack : Math.min(c.intensity, RATE_LIMIT);
  const dropped = attack - passed;
  const atServer = LIMITER_NORMAL_TRAFFIC + passed;
  const load = (atServer / LIMITER_SERVER_CAPACITY) * 100;
  const overloaded = atServer > LIMITER_SERVER_CAPACITY;

  const sources = distributed
    ? swarm(DISTRIBUTED.sources, 5, -0.95, 0.25, DISTRIBUTED.perSource, 'rl', 'http')
    : {
        nodes: [{ id: 'attacker', kind: 'attacker', depth: 0, lateral: -0.45, title: 'Attacker', detail: `${attack} units` } as StageNode],
        edges: [{ id: 'a-rl', from: 'attacker', to: 'rl', units: attack, flows: [{ flow: 'http' as Flow, units: attack }] }],
        lastDepth: 0,
      };

  const achieved: string[] = [];
  if (!distributed) achieved.push('single');
  if (distributed) achieved.push('distributed');

  return {
    stage: {
      nodes: [
        ...sources.nodes,
        { id: 'users', kind: 'users', depth: 0, lateral: 0.7, title: 'Normal users', detail: `${LIMITER_NORMAL_TRAFFIC} units` },
        {
          id: 'rl', kind: 'limiter', depth: 0.5, lateral: 0, title: 'Rate Limiter', detail: `max ${RATE_LIMIT} / source`,
          badge: dropped > 0 ? { text: `−${dropped} dropped`, tone: 'warn' } : { text: 'all under limit', tone: 'neutral' },
          effect: dropped > 0 ? 'drop' : undefined,
        },
        {
          id: 'server', kind: 'server', depth: 1, lateral: 0, title: 'Server', detail: `${atServer} / ${LIMITER_SERVER_CAPACITY}`, idleDetail: `max ${LIMITER_SERVER_CAPACITY}`,
          load, tone: serverTone(load), effect: overloaded ? 'overload' : undefined,
        },
      ],
      edges: [
        ...sources.edges,
        { id: 'u-rl', from: 'users', to: 'rl', units: LIMITER_NORMAL_TRAFFIC, flows: [{ flow: 'legit', units: LIMITER_NORMAL_TRAFFIC }] },
        {
          id: 'rl-s', from: 'rl', to: 'server', units: atServer,
          flows: [{ flow: 'legit', units: LIMITER_NORMAL_TRAFFIC }, { flow: 'http', units: passed }],
        },
      ],
      labels: distributed
        ? [{ id: 'fan', depth: 0.25, lateral: -0.35, text: `${DISTRIBUTED.sources} × ${DISTRIBUTED.perSource} = ${attack} units` }]
        : [],
    },
    outcome: distributed
      ? {
          tone: 'overload', title: 'Server overloaded',
          subtitle: 'Normal users are denied service',
          detail: `Each source sends only ${DISTRIBUTED.perSource} units, which is under the limit of ${RATE_LIMIT}, so no source is limited. Together they send ${DISTRIBUTED.sources} × ${DISTRIBUTED.perSource} = ${attack} units. Add the ${LIMITER_NORMAL_TRAFFIC} units of normal traffic and you get ${atServer}, more than the server's ${LIMITER_SERVER_CAPACITY}.`,
        }
      : {
          tone: 'good', title: 'The server stays available',
          detail: `The rate limiter lets only ${passed} of ${attack} units through from this source.${c.intensity > 150 ? ' More intensity gives a single source no advantage.' : ''} Server load: ${atServer} / ${LIMITER_SERVER_CAPACITY}.`,
        },
    verdict: overloaded ? 'capacity' : 'limiter',
    steps: distributed
      ? [
          { at: 'source', text: `${DISTRIBUTED.sources} sources send ${DISTRIBUTED.perSource} units each.` },
          { at: 'limiter', text: `${DISTRIBUTED.perSource} < ${RATE_LIMIT} per source, so nothing is limited and ${attack} units pass.` },
          { at: 'users', text: `Plus ${LIMITER_NORMAL_TRAFFIC} units of normal traffic.` },
          { at: 'server', text: `${atServer} units > capacity of ${LIMITER_SERVER_CAPACITY}: overloaded.` },
        ]
      : [
          { at: 'source', text: `One source sends ${attack} units.` },
          { at: 'limiter', text: `Capped at ${RATE_LIMIT} per source: ${passed} pass, ${dropped} dropped.` },
          { at: 'users', text: `Plus ${LIMITER_NORMAL_TRAFFIC} units of normal traffic.` },
          { at: 'server', text: `${atServer} of ${LIMITER_SERVER_CAPACITY} units, ${pct(load)} load.` },
        ],
    metrics: [
      { label: 'ATTACK', value: String(attack), hint: distributed ? `${DISTRIBUTED.sources} × ${DISTRIBUTED.perSource} units` : 'units, 1 source' },
      { label: 'DROPPED', value: String(dropped), hint: 'by the rate limiter', tone: dropped > 0 ? 'good' : 'neutral' },
      { label: 'AT SERVER', value: `${atServer}/${LIMITER_SERVER_CAPACITY}`, hint: `incl. ${LIMITER_NORMAL_TRAFFIC} normal`, tone: serverTone(load) },
      { label: 'SERVER LOAD', value: pct(load), hint: overloaded ? 'users denied' : 'users served', tone: serverTone(load) },
    ],
    achieved,
  };
}

function simulateBoss(c: Config): Simulation {
  const udp = c.protocol === 'udp';
  const name = udp ? 'UDP' : 'HTTP';
  const flow: Flow = c.protocol;
  const total = c.sources * c.perSource;
  const afterFirewall = udp ? 0 : total;
  const perSourcePassed = Math.min(c.perSource, RATE_LIMIT);
  const passed = udp ? 0 : c.sources * perSourcePassed;
  const dropped = afterFirewall - passed;
  const each = passed / 2;

  const sources = c.sources === 1
    ? {
        nodes: [{ id: 'attacker', kind: 'attacker', depth: 0, lateral: 0, title: 'Attacker', detail: `${c.perSource} units` } as StageNode],
        edges: [{ id: 'a-fw', from: 'attacker', to: 'fw', units: total, flows: [{ flow, units: total }] }],
      }
    : swarm(c.sources, c.sources >= 10 ? 10 : c.sources, c.sources >= 10 ? -0.95 : -0.8, c.sources >= 10 ? 0.95 : 0.8, c.perSource, 'fw', flow);

  let outcome: Outcome;
  if (udp) {
    outcome = { tone: 'stopped', title: 'Traffic stopped', detail: `Firewall blocked UDP traffic. All ${total} units are dropped before they reach anything else.` };
  } else if (each > WEB_CAPACITY) {
    outcome = {
      tone: 'overload', title: 'System Capacity Exceeded',
      detail: c.perSource <= RATE_LIMIT
        ? `Every source stays under the rate limit (${c.perSource} < ${RATE_LIMIT}), so nothing gets limited. Together ${c.sources} × ${c.perSource} = ${passed} units reach the load balancer. That is ${fmt(each)} per server, but each server handles only ${WEB_CAPACITY}.`
        : `The rate limiter caps every source at ${RATE_LIMIT} units, but ${c.sources} sources still add up to ${c.sources} × ${RATE_LIMIT} = ${passed} units. That is ${fmt(each)} per server, more than the ${WEB_CAPACITY} each can handle.`,
    };
  } else if (each === WEB_CAPACITY) {
    outcome = { tone: 'warn', title: 'Maximum capacity reached', detail: 'Both servers are at exactly 100%.' };
  } else if (each >= 50) {
    outcome = {
      tone: 'warn', title: 'High load, but the system holds',
      detail: `${passed} units pass every layer: ${fmt(each)} units per server (${pct(each)} load). Close, but still under capacity.`,
    };
  } else {
    outcome = {
      tone: 'stopped', title: 'Attack ineffective', subtitle: 'System stays available',
      detail: dropped > 0
        ? `The rate limiter caps each source individually: only ${passed} of ${total} units pass. Server load: ${pct(each)}.`
        : `Only ${passed} units reach the servers: ${pct(each)} load each. Far too little to matter.`,
    };
  }

  const achieved: string[] = [];
  if (!udp) achieved.push('pass');
  if (!udp && each > WEB_CAPACITY) achieved.push('cap');

  const plural = c.sources === 1 ? 'source' : 'sources';
  const steps: Step[] = [{ at: 'source', text: `${c.sources} ${plural} × ${c.perSource} units = ${total} units of ${name} traffic.` }];
  if (udp) {
    steps.push(
      { at: 'firewall', text: `Firewall: rule BLOCK UDP matches, so all ${total} units are blocked.` },
      { at: 'server', text: '0 units reach the servers.' },
    );
  } else {
    steps.push(
      { at: 'firewall', text: `Firewall: HTTP is allowed, so ${total} units pass.` },
      {
        at: 'limiter',
        text: c.perSource > RATE_LIMIT
          ? `Rate limiter: each source is capped from ${c.perSource} to ${RATE_LIMIT}. ${dropped} dropped, ${passed} pass.`
          : `Rate limiter: ${c.perSource} per source is under the limit of ${RATE_LIMIT}. Nothing is limited, ${passed} pass.`,
      },
      { at: 'balancer', text: `Load balancer: ${fmt(each)} to Web 1, ${fmt(each)} to Web 2.` },
      { at: 'server', text: `Each server handles max ${WEB_CAPACITY}, so the load is ${pct(each)}${each > WEB_CAPACITY ? ': overloaded' : ''}.` },
    );
  }
  const verdict: Verdict = udp ? 'firewall' : each > WEB_CAPACITY ? 'capacity' : dropped > 0 ? 'limiter' : 'holds';

  return {
    stage: {
      nodes: [
        ...sources.nodes,
        {
          id: 'fw', kind: 'firewall', depth: 0.3, lateral: 0, title: 'Firewall', detail: 'UDP blocked',
          badge: udp ? { text: 'BLOCKED', tone: 'bad' } : { text: 'ALLOWED', tone: 'good' },
          effect: udp ? 'block' : undefined,
        },
        {
          id: 'rl', kind: 'limiter', depth: 0.52, lateral: 0, title: 'Rate Limiter', detail: `max ${RATE_LIMIT} / source`,
          badge: udp ? undefined : dropped > 0 ? { text: `−${dropped} dropped`, tone: 'warn' } : { text: 'under limit', tone: 'neutral' },
          effect: dropped > 0 ? 'drop' : undefined,
        },
        { id: 'lb', kind: 'balancer', depth: 0.74, lateral: 0, title: 'Load Balancer', detail: 'splits 50 / 50' },
        ...webServers(1, each, !udp),
      ],
      edges: [
        ...sources.edges,
        { id: 'fw-rl', from: 'fw', to: 'rl', units: afterFirewall, flows: [{ flow, units: afterFirewall }] },
        { id: 'rl-lb', from: 'rl', to: 'lb', units: passed, flows: [{ flow, units: passed }] },
        { id: 'lb-w1', from: 'lb', to: 'web1', units: each, flows: [{ flow, units: each }] },
        { id: 'lb-w2', from: 'lb', to: 'web2', units: each, flows: [{ flow, units: each }] },
      ],
      labels: c.sources > 1 ? [{ id: 'fan', depth: 0.17, lateral: c.sources >= 10 ? -1.12 : -0.98, text: `${c.sources} × ${c.perSource} = ${total}` }] : [],
    },
    outcome,
    verdict,
    steps,
    metrics: [
      { label: 'TOTAL TRAFFIC', value: String(total), hint: `${c.sources} × ${c.perSource} ${name}` },
      { label: 'FILTERED', value: String(total - passed), hint: `firewall ${total - afterFirewall} · limiter ${dropped}`, tone: total - passed > 0 ? 'good' : 'neutral' },
      { label: 'AT SERVERS', value: String(passed), hint: `of 200 capacity`, tone: serverTone(each) },
      { label: 'SERVER LOAD', value: pct(each), hint: 'per web server', tone: udp ? 'good' : serverTone(each) },
    ],
    achieved,
  };
}

export function simulate(level: LevelId, config: Config): Simulation {
  switch (level) {
    case 'firewall': return simulateFirewall(config);
    case 'balancer': return simulateBalancer(config);
    case 'limiter': return simulateLimiter(config);
    case 'boss': return simulateBoss(config);
  }
}

// One row of the Final Boss test log: a configuration and which layer decided it.
export interface LogEntry {
  key: string;
  protocol: Protocol;
  sources: number;
  perSource: number;
  total: number;
  atServers: number;
  loadPercent: number;
  verdict: Verdict;
  tone: OutcomeTone;
  title: string;
}

export function logEntry(c: Config): LogEntry {
  const sim = simulateBoss(c);
  const total = c.sources * c.perSource;
  const atServers = c.protocol === 'udp' ? 0 : c.sources * Math.min(c.perSource, RATE_LIMIT);
  return {
    key: `${c.protocol}-${c.sources}-${c.perSource}`,
    protocol: c.protocol,
    sources: c.sources,
    perSource: c.perSource,
    total,
    atServers,
    loadPercent: (atServers / 2 / WEB_CAPACITY) * 100,
    verdict: sim.verdict,
    tone: sim.outcome.tone,
    title: sim.outcome.title,
  };
}

// Every combination the Final Boss controls allow (2 protocols × 3 source counts × 3 intensities).
export const BOSS_COMBINATIONS = (['udp', 'http'] as Protocol[]).length * BOSS_SOURCES.length * BOSS_INTENSITIES.length;
