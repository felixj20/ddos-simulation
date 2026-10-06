export type LevelId = 'firewall' | 'balancer' | 'limiter' | 'vector' | 'cache' | 'compute' | 'defense';
export type SimLevelId = Exclude<LevelId, 'defense'>;
export type Protocol = 'udp' | 'http';
export type Vector = 'udp' | 'static' | 'dynamic';
export type RequestId = 'home' | 'search' | 'login' | 'report';
export type DefenseId = 'udp' | 'limit' | 'bot' | 'server' | 'http';
export type SourceMode = 'single' | 'distributed';
export type Flow = 'udp' | 'static' | 'http' | 'bot' | 'legit';
export type Tone = 'neutral' | 'good' | 'warn' | 'bad';
export type OutcomeTone = 'good' | 'stopped' | 'warn' | 'overload';

export interface Config {
  protocol: Protocol;
  intensity: number;
  sourceMode: SourceMode;
  sources: number;
  perSource: number;
  vector: Vector;
  request: RequestId;
  defenses: DefenseId[];
}

export type NodeKind = 'attacker' | 'swarm' | 'users' | 'firewall' | 'cache' | 'limiter' | 'balancer' | 'server';

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
  depthScale?: number;
}

export interface Resource {
  id: 'cpu' | 'memory' | 'network';
  label: string;
  percent: number;
  detail: string;
}

export interface ServerView {
  title: string;
  detail: string;
  requests: string;
  resources: Resource[];
  status: { tone: Tone; text: string };
}

export type Display = { kind: 'network'; stage: Stage } | { kind: 'server'; server: ServerView };

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
export type StepAt = 'source' | 'users' | 'firewall' | 'cache' | 'limiter' | 'balancer' | 'server';

export interface Step {
  at: StepAt;
  text: string;
}

export interface Simulation {
  display: Display;
  outcome: Outcome;
  steps: Step[];
  metrics: Metric[];
  achieved: string[];
}

export interface LevelDef {
  id: LevelId;
  tag: string;
  name: string;
  title?: string;
  goal: string;
  objectives: { id: string; label: string }[];
  aha: string;
  hint?: string;
}

export const RATE_LIMIT = 10;
export const WEB_CAPACITY = 100;
export const FIREWALL_TRAFFIC = 100;
export const LIMITER_SERVER_CAPACITY = 120;
export const LIMITER_NORMAL_TRAFFIC = 60;
export const DISTRIBUTED = { sources: 10, perSource: 8 };
export const VECTOR_SOURCES = [1, 5, 30];
export const INTENSITIES = [
  { id: 'LOW', units: 5 },
  { id: 'MEDIUM', units: 8 },
  { id: 'HIGH', units: 15 },
];
export const CACHE_SOURCES = [10, 20, 40, 70];
export const CACHE_HIT_RATE = 0.75;
export const CACHE_SERVERS = 3;
export const CACHE_CAPACITY = CACHE_SERVERS * WEB_CAPACITY;
export const CDN_ALARM = 400;

export const VECTORS: { id: Vector; name: string; description: string; flow: Flow; blocked: boolean }[] = [
  { id: 'udp', name: 'UDP flood', description: 'Raw packets, no web requests', flow: 'udp', blocked: true },
  { id: 'static', name: 'Static pages', description: 'Images and pages that look the same for everyone', flow: 'static', blocked: false },
  { id: 'dynamic', name: 'Dynamic pages', description: 'Search results and carts, built for each visitor', flow: 'http', blocked: false },
];

export const COMPUTE_SOURCES = 20;
export const COMPUTE_PER_SOURCE = 5;
export const COMPUTE_REQUESTS = COMPUTE_SOURCES * COMPUTE_PER_SOURCE;
export const COMPUTE_CAPACITY = 250;
export const COMPUTE_NETWORK = 38;
export const REJECT_COST = 0.1;

export const REQUESTS: { id: RequestId; name: string; description: string; why: string; cost: number; memory: number; adminOnly?: boolean }[] = [
  { id: 'home', name: 'Homepage', description: 'The start page of the shop', why: 'The start page looks almost the same for everyone, so it is cheap to build.', cost: 0.5, memory: 22 },
  { id: 'search', name: 'Search', description: 'Looks for a word in every product', why: 'Every search goes through the whole product list.', cost: 1.5, memory: 41 },
  { id: 'login', name: 'Login', description: 'Checks a username and password', why: 'Passwords are hashed slowly on purpose, so stolen ones are hard to crack. Wrong passwords cost just as much.', cost: 3, memory: 30 },
  { id: 'report', name: 'Sales report', description: 'Builds a PDF from every order ever placed', why: 'The report is for admins only.', cost: 8, memory: 18, adminOnly: true },
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
    id: 'vector',
    tag: '04',
    name: 'Attack Vector',
    title: 'Stay under the radar',
    goal: `The rate limiter got stricter: any source that sends more than ${RATE_LIMIT} is banned. Bring the two servers down anyway.`,
    objectives: [
      { id: 'pass', label: 'Get past the firewall' },
      { id: 'cap', label: `Get more than ${WEB_CAPACITY * 2} units to the servers` },
    ],
    aha: 'A rate limiter judges every source on its own. Many quiet sources, each just under the limit, add up to more than the servers can take.',
    hint: `Sources × rate has to beat ${WEB_CAPACITY * 2}, and no single source may go over ${RATE_LIMIT}.`,
  },
  {
    id: 'cache',
    tag: '05',
    name: 'Cache & CDN',
    title: 'Slip past the CDN',
    goal: `A CDN now sits in front of three servers. It answers cached pages itself and raises the alarm when more than ${CDN_ALARM} units arrive.`,
    objectives: [
      { id: 'miss', label: 'Get past the cache' },
      { id: 'cap', label: `Get more than ${CACHE_CAPACITY} units to the servers` },
    ],
    aha: 'A CDN absorbs everything it can cache and watches for floods. Attackers go for pages it cannot cache, at a volume just low enough to stay under the alarm.',
    hint: `More than ${CACHE_CAPACITY} has to reach the servers, but no more than ${CDN_ALARM} may reach the CDN.`,
  },
  {
    id: 'compute',
    tag: '06',
    name: 'Expensive Requests',
    title: 'Find the weak spot',
    goal: `The traffic is fixed: ${COMPUTE_REQUESTS} requests per second, every source under the rate limit. You only pick which page they call.`,
    objectives: [
      { id: 'calm', label: 'Send requests the server can handle' },
      { id: 'overload', label: `Overload the CPU with the same ${COMPUTE_REQUESTS} requests` },
    ],
    aha: 'It is not just how many requests arrive, but how much work each one causes. Attackers look for expensive pages that anyone can call, like login or search.',
    hint: 'An expensive page only helps if the server lets you in.',
  },
  {
    id: 'defense',
    tag: '07',
    name: 'Final Defense',
    title: 'Hold the line',
    goal: 'Now you defend. Four waves, 4 points, and you can rebuild your defense before every wave.',
    objectives: [
      { id: 'w1', label: 'Hold wave 1' },
      { id: 'w2', label: 'Hold wave 2' },
      { id: 'w3', label: 'Hold wave 3' },
      { id: 'w4', label: 'Hold wave 4' },
    ],
    aha: 'No single defense held every wave. Each layer stopped one kind of traffic, and the last wave was not an attack at all. Sometimes the answer is more capacity, not more filtering.',
  },
];

const BASE_CONFIG: Config = {
  protocol: 'http',
  intensity: 100,
  sourceMode: 'single',
  sources: 1,
  perSource: 8,
  vector: 'udp',
  request: 'home',
  defenses: [],
};

export const DEFAULT_CONFIGS: Record<LevelId, Config> = {
  firewall: { ...BASE_CONFIG, protocol: 'udp' },
  balancer: { ...BASE_CONFIG, intensity: 120 },
  limiter: { ...BASE_CONFIG, intensity: 150 },
  vector: { ...BASE_CONFIG, intensity: 80 },
  cache: { ...BASE_CONFIG, sources: CACHE_SOURCES[0] },
  compute: BASE_CONFIG,
  defense: BASE_CONFIG,
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

const MAX_SWARM = 40;
const SERVER_LATERALS: Record<number, number[]> = { 2: [-0.55, 0.55], 3: [-0.85, 0, 0.85] };

function webServers(depth: number, count: number, each: number, live = true): StageNode[] {
  return SERVER_LATERALS[count].map((lateral, i) => ({
    id: `web${i + 1}`,
    kind: 'server' as const,
    depth,
    lateral,
    title: `Web ${i + 1}`,
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

function sourceGroup(count: number, perSource: number, target: string, flow: Flow) {
  if (count === 1) {
    return {
      nodes: [{ id: 'attacker', kind: 'attacker', depth: 0, lateral: 0, title: 'Attacker', detail: `${perSource} units` } as StageNode],
      edges: [{ id: `a-${target}`, from: 'attacker', to: target, units: perSource, flows: [{ flow, units: perSource }] }],
    };
  }
  const wide = count >= 10;
  return swarm(Math.min(count, MAX_SWARM), wide ? 10 : count, wide ? -0.95 : -0.8, wide ? 0.95 : 0.8, perSource, target, flow);
}

function fanLabel(count: number, perSource: number, depth: number): StageLabel[] {
  if (count === 1) return [];
  return [{ id: 'fan', depth, lateral: count >= 10 ? -1.12 : -0.98, text: `${count} × ${perSource} = ${count * perSource}` }];
}

function simulateFirewall(c: Config): Simulation {
  const blocked = c.protocol === 'udp';
  const name = blocked ? 'UDP' : 'HTTP';
  const delivered = blocked ? 0 : FIREWALL_TRAFFIC;
  const flow: Flow = c.protocol;

  return {
    display: { kind: 'network', stage: {
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
    } },
    outcome: blocked
      ? { tone: 'stopped', title: 'Attack stopped', detail: 'The firewall has a rule that blocks UDP traffic. 0 traffic units reach the server.' }
      : { tone: 'good', title: 'Traffic reaches the server', detail: 'The firewall has no rule against HTTP, so every HTTP request is allowed through to the server.' },
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
    display: { kind: 'network', stage: {
      nodes: [
        { id: 'attacker', kind: 'attacker', depth: 0, lateral: 0, title: 'Attacker', detail: `${total} units` },
        { id: 'lb', kind: 'balancer', depth: 0.5, lateral: 0, title: 'Load Balancer', detail: 'splits 50 / 50' },
        ...webServers(1, 2, each),
      ],
      edges: [
        { id: 'a-lb', from: 'attacker', to: 'lb', units: total, flows: [{ flow: 'http', units: total }] },
        { id: 'lb-w1', from: 'lb', to: 'web1', units: each, flows: [{ flow: 'http', units: each }] },
        { id: 'lb-w2', from: 'lb', to: 'web2', units: each, flows: [{ flow: 'http', units: each }] },
      ],
      labels: [],
    } },
    outcome: { tone, title: band.text, detail },
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
    display: { kind: 'network', stage: {
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
    } },
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

function simulateVector(c: Config): Simulation {
  const udp = c.protocol === 'udp';
  const name = udp ? 'UDP' : 'HTTP';
  const flow: Flow = c.protocol;
  const total = c.sources * c.perSource;
  const afterFirewall = udp ? 0 : total;
  const banned = !udp && c.perSource > RATE_LIMIT;
  const passed = banned ? 0 : afterFirewall;
  const each = passed / 2;
  const overloaded = each > WEB_CAPACITY;
  const everyone = c.sources === 1 ? 'the source' : `all ${c.sources} sources`;

  let outcome: Outcome;
  if (udp) {
    outcome = { tone: 'stopped', title: 'Blocked at the firewall', detail: `The firewall drops UDP. None of the ${total} units get any further.` };
  } else if (banned) {
    outcome = { tone: 'stopped', title: 'Banned', detail: `${c.perSource} per source is over the limit of ${RATE_LIMIT}, so the rate limiter banned ${everyone}.` };
  } else if (overloaded) {
    outcome = { tone: 'overload', title: 'Servers overloaded', detail: `No source goes over ${RATE_LIMIT}, so nobody gets banned. Together they bring ${passed} units to servers built for ${WEB_CAPACITY * 2}.` };
  } else if (each >= 50) {
    outcome = { tone: 'warn', title: 'High load, but it holds', detail: `${passed} units get through, ${pct(each)} per server. Not quite enough.` };
  } else {
    outcome = { tone: 'stopped', title: 'Barely noticed', detail: `Only ${passed} units reach the servers: ${pct(each)} load.` };
  }

  const steps: Step[] = [{ at: 'source', text: `${c.sources} × ${c.perSource} = ${total} units of ${name}.` }];
  if (udp) {
    steps.push({ at: 'firewall', text: 'Firewall: UDP is blocked, everything is dropped.' });
  } else {
    steps.push(
      { at: 'firewall', text: 'Firewall: HTTP is allowed.' },
      {
        at: 'limiter',
        text: banned
          ? `Rate limiter: ${c.perSource} > ${RATE_LIMIT}, ${everyone} banned.`
          : `Rate limiter: ${c.perSource} ≤ ${RATE_LIMIT}, nobody banned.`,
      },
    );
    if (!banned) {
      steps.push(
        { at: 'balancer', text: `Load balancer: ${fmt(each)} to each server.` },
        { at: 'server', text: `Load: ${pct(each)} per server${overloaded ? ', overloaded' : ''}.` },
      );
    }
  }

  const achieved: string[] = [];
  if (!udp) achieved.push('pass');
  if (overloaded) achieved.push('cap');

  const sources = sourceGroup(c.sources, c.perSource, 'fw', flow);

  return {
    display: { kind: 'network', stage: {
      nodes: [
        ...sources.nodes,
        {
          id: 'fw', kind: 'firewall', depth: 0.3, lateral: 0, title: 'Firewall', detail: 'UDP blocked',
          badge: udp ? { text: 'BLOCKED', tone: 'bad' } : { text: 'ALLOWED', tone: 'good' },
          effect: udp ? 'block' : undefined,
        },
        {
          id: 'rl', kind: 'limiter', depth: 0.52, lateral: 0, title: 'Rate Limiter', detail: `ban over ${RATE_LIMIT}`,
          badge: udp ? undefined : banned ? { text: `${c.sources} banned`, tone: 'bad' } : { text: 'under limit', tone: 'neutral' },
          tone: banned ? 'bad' : undefined,
        },
        { id: 'lb', kind: 'balancer', depth: 0.74, lateral: 0, title: 'Load Balancer', detail: 'splits 50 / 50' },
        ...webServers(1, 2, each, passed > 0),
      ],
      edges: [
        ...sources.edges,
        { id: 'fw-rl', from: 'fw', to: 'rl', units: afterFirewall, flows: [{ flow, units: afterFirewall }] },
        { id: 'rl-lb', from: 'rl', to: 'lb', units: passed, flows: [{ flow, units: passed }] },
        { id: 'lb-w1', from: 'lb', to: 'web1', units: each, flows: [{ flow, units: each }] },
        { id: 'lb-w2', from: 'lb', to: 'web2', units: each, flows: [{ flow, units: each }] },
      ],
      labels: fanLabel(c.sources, c.perSource, 0.17),
    } },
    outcome,
    steps,
    metrics: [
      { label: 'TOTAL TRAFFIC', value: String(total), hint: `${c.sources} × ${c.perSource} ${name}` },
      { label: 'STOPPED', value: String(total - passed), hint: udp ? 'by the firewall' : banned ? 'sources banned' : 'nothing stopped', tone: total - passed > 0 ? 'good' : 'neutral' },
      { label: 'AT SERVERS', value: String(passed), hint: `of ${WEB_CAPACITY * 2} capacity`, tone: serverTone(each) },
      { label: 'SERVER LOAD', value: pct(each), hint: 'per server', tone: passed > 0 ? serverTone(each) : 'good' },
    ],
    achieved,
  };
}

function simulateCache(c: Config): Simulation {
  const vector = VECTORS.find((item) => item.id === c.vector) ?? VECTORS[0];
  const flow = vector.flow;
  const kind = vector.name.toLowerCase();
  const total = c.sources * c.perSource;
  const atCdn = vector.blocked ? 0 : total;
  const alarm = atCdn > CDN_ALARM;
  const cached = !alarm && vector.id === 'static' ? atCdn * CACHE_HIT_RATE : 0;
  const afterCache = alarm ? 0 : atCdn - cached;
  const perSource = afterCache / c.sources;
  const banned = afterCache > 0 && perSource > RATE_LIMIT;
  const passed = banned ? 0 : afterCache;
  const each = passed / CACHE_SERVERS;
  const overloaded = each > WEB_CAPACITY;

  let outcome: Outcome;
  if (vector.blocked) {
    outcome = { tone: 'stopped', title: 'Blocked at the firewall', detail: `The firewall drops UDP. None of the ${total} units get any further.` };
  } else if (alarm) {
    outcome = { tone: 'stopped', title: 'Alarm raised', detail: `${total} units is over the CDN's alarm level of ${CDN_ALARM}. It now challenges every visitor, and bots can't pass.` };
  } else if (banned) {
    outcome = { tone: 'stopped', title: 'Banned', detail: `${c.perSource} per source is over the limit of ${RATE_LIMIT}, so the rate limiter banned all ${c.sources} sources.` };
  } else if (overloaded) {
    outcome = { tone: 'overload', title: 'Servers overloaded', detail: `The CDN can't cache ${kind}, and ${total} units stays under its alarm. ${fmt(passed)} units hit servers built for ${CACHE_CAPACITY}.` };
  } else if (cached > 0) {
    outcome = { tone: 'stopped', title: 'The cache soaks it up', detail: `The CDN answers ${fmt(cached)} of ${total} units from its cache. Only ${fmt(passed)} reach the servers.` };
  } else if (each >= 50) {
    outcome = { tone: 'warn', title: 'High load, but it holds', detail: `${fmt(passed)} units reach the servers, ${pct(each)} each. Not quite enough.` };
  } else {
    outcome = { tone: 'stopped', title: 'Barely noticed', detail: `Only ${fmt(passed)} units reach the servers: ${pct(each)} load.` };
  }

  const steps: Step[] = [{ at: 'source', text: `${c.sources} × ${c.perSource} = ${total} units of ${kind}.` }];
  if (vector.blocked) {
    steps.push({ at: 'firewall', text: 'Firewall: UDP is blocked, everything is dropped.' });
  } else {
    steps.push(
      { at: 'firewall', text: 'Firewall: HTTP is allowed.' },
      {
        at: 'cache',
        text: alarm
          ? `CDN: ${total} > ${CDN_ALARM}, alarm. Every request gets challenged.`
          : cached > 0
            ? `CDN: ${fmt(cached)} answered from the cache, ${fmt(afterCache)} pass.`
            : `CDN: nothing to cache, and ${total} ≤ ${CDN_ALARM}, so no alarm.`,
      },
    );
    if (!alarm) {
      steps.push({
        at: 'limiter',
        text: banned
          ? `Rate limiter: ${c.perSource} > ${RATE_LIMIT}, all ${c.sources} sources banned.`
          : `Rate limiter: ${fmt(perSource)} ≤ ${RATE_LIMIT}, nobody banned.`,
      });
    }
    if (passed > 0) {
      steps.push(
        { at: 'balancer', text: `Load balancer: ${fmt(each)} to each of the ${CACHE_SERVERS} servers.` },
        { at: 'server', text: `Load: ${pct(each)} per server${overloaded ? ', overloaded' : ''}.` },
      );
    }
  }

  const achieved: string[] = [];
  if (vector.id === 'dynamic' && !alarm) achieved.push('miss');
  if (overloaded) achieved.push('cap');

  const sources = sourceGroup(c.sources, c.perSource, 'fw', flow);

  return {
    display: { kind: 'network', stage: {
      depthScale: 1.25,
      nodes: [
        ...sources.nodes,
        {
          id: 'fw', kind: 'firewall', depth: 0.3, lateral: 0, title: 'Firewall', detail: 'UDP blocked',
          badge: vector.blocked ? { text: 'BLOCKED', tone: 'bad' } : { text: 'ALLOWED', tone: 'good' },
          effect: vector.blocked ? 'block' : undefined,
        },
        {
          id: 'cache', kind: 'cache', depth: 0.475, lateral: 0, title: 'Cache / CDN', detail: `alarm > ${CDN_ALARM}`,
          badge: vector.blocked
            ? undefined
            : alarm
              ? { text: 'ALARM', tone: 'bad' }
              : cached > 0 ? { text: `−${fmt(cached)} cached`, tone: 'good' } : { text: 'not cached', tone: 'warn' },
          tone: alarm ? 'bad' : undefined,
          effect: cached > 0 ? 'drop' : undefined,
        },
        {
          id: 'rl', kind: 'limiter', depth: 0.65, lateral: 0, title: 'Rate Limiter', detail: `ban over ${RATE_LIMIT}`,
          badge: afterCache <= 0 ? undefined : banned ? { text: `${c.sources} banned`, tone: 'bad' } : { text: 'under limit', tone: 'neutral' },
          tone: banned ? 'bad' : undefined,
        },
        { id: 'lb', kind: 'balancer', depth: 0.825, lateral: 0, title: 'Load Balancer', detail: 'splits 3 ways' },
        ...webServers(1, CACHE_SERVERS, each, passed > 0),
      ],
      edges: [
        ...sources.edges,
        { id: 'fw-cache', from: 'fw', to: 'cache', units: atCdn, flows: [{ flow, units: atCdn }] },
        { id: 'cache-rl', from: 'cache', to: 'rl', units: afterCache, flows: [{ flow, units: afterCache }] },
        { id: 'rl-lb', from: 'rl', to: 'lb', units: passed, flows: [{ flow, units: passed }] },
        ...[1, 2, 3].map((n) => ({ id: `lb-w${n}`, from: 'lb', to: `web${n}`, units: each, flows: [{ flow, units: each }] })),
      ],
      labels: fanLabel(c.sources, c.perSource, 0.21),
    } },
    outcome,
    steps,
    metrics: [
      { label: 'TOTAL TRAFFIC', value: String(total), hint: `${c.sources} × ${c.perSource}` },
      { label: 'AT THE CDN', value: String(atCdn), hint: `alarm above ${CDN_ALARM}`, tone: alarm ? 'bad' : 'neutral' },
      { label: 'AT SERVERS', value: fmt(passed), hint: `of ${CACHE_CAPACITY} capacity`, tone: serverTone(each) },
      { label: 'SERVER LOAD', value: pct(each), hint: 'per server', tone: passed > 0 ? serverTone(each) : 'good' },
    ],
    achieved,
  };
}

function simulateCompute(c: Config): Simulation {
  const request = REQUESTS.find((item) => item.id === c.request) ?? REQUESTS[0];
  const rejected = request.adminOnly === true;
  const cost = rejected ? REJECT_COST : request.cost;
  const work = COMPUTE_REQUESTS * cost;
  const cpu = (work / COMPUTE_CAPACITY) * 100;
  const overloaded = cpu > 100;
  const tone = serverTone(cpu);

  let outcome: Outcome;
  if (rejected) {
    outcome = {
      tone: 'stopped', title: 'Rejected at the door',
      detail: `${request.why} Without a login the server answers "401 Unauthorized" after a quick check: ${fmt(REJECT_COST)} work units per request.`,
    };
  } else if (overloaded) {
    outcome = {
      tone: 'overload', title: 'CPU overloaded', subtitle: 'Same traffic, far more work',
      detail: `${request.why} ${COMPUTE_REQUESTS} × ${fmt(cost)} = ${fmt(work)} work units per second, and the server manages ${COMPUTE_CAPACITY}.`,
    };
  } else {
    outcome = {
      tone: 'good', title: 'The server keeps up',
      detail: `${request.why} ${COMPUTE_REQUESTS} × ${fmt(cost)} = ${fmt(work)} of ${COMPUTE_CAPACITY} work units.`,
    };
  }

  return {
    display: {
      kind: 'server',
      server: {
        title: 'Web server',
        detail: `${COMPUTE_CAPACITY} work units / s`,
        requests: `${COMPUTE_SOURCES} × ${COMPUTE_PER_SOURCE} = ${COMPUTE_REQUESTS} requests / s`,
        resources: [
          { id: 'cpu', label: 'CPU', percent: cpu, detail: `${fmt(work)} / ${COMPUTE_CAPACITY} work units` },
          { id: 'memory', label: 'Memory', percent: request.memory, detail: 'plenty left' },
          { id: 'network', label: 'Network', percent: COMPUTE_NETWORK, detail: `${COMPUTE_REQUESTS} requests / s` },
        ],
        status: rejected
          ? { tone: 'good', text: 'Rejecting requests: 401' }
          : overloaded
            ? { tone: 'bad', text: 'CPU overloaded' }
            : { tone: 'good', text: 'Running normally' },
      },
    },
    outcome,
    steps: [
      { at: 'source', text: `${COMPUTE_SOURCES} × ${COMPUTE_PER_SOURCE} = ${COMPUTE_REQUESTS} ${request.name} requests per second.` },
      { at: 'limiter', text: `Rate limiter: ${COMPUTE_PER_SOURCE} ≤ ${RATE_LIMIT} per source, all pass.` },
      {
        at: 'server',
        text: rejected
          ? `No admin login: rejected after ${fmt(REJECT_COST)} work units each.`
          : `Each one costs ${fmt(cost)} work units: ${COMPUTE_REQUESTS} × ${fmt(cost)} = ${fmt(work)}.`,
      },
      { at: 'server', text: `CPU at ${pct(cpu)}${overloaded ? ', overloaded' : ''}.` },
    ],
    metrics: [
      { label: 'REQUESTS', value: `${COMPUTE_REQUESTS}/s`, hint: 'all under the rate limit' },
      { label: 'COST', value: `${fmt(cost)} WU`, hint: rejected ? 'rejected with 401' : `per ${request.name} request` },
      { label: 'WORK', value: `${fmt(work)}/${COMPUTE_CAPACITY}`, hint: 'work units per second', tone },
      { label: 'CPU', value: pct(cpu), hint: overloaded ? 'server overloaded' : 'of compute capacity', tone },
    ],
    achieved: [`seen-${request.id}`, overloaded ? 'overload' : 'calm'],
  };
}

export function simulate(level: SimLevelId, config: Config): Simulation {
  switch (level) {
    case 'firewall': return simulateFirewall(config);
    case 'balancer': return simulateBalancer(config);
    case 'limiter': return simulateLimiter(config);
    case 'vector': return simulateVector(config);
    case 'cache': return simulateCache(config);
    case 'compute': return simulateCompute(config);
  }
}

