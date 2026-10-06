import { RATE_LIMIT, WEB_CAPACITY, fmt, type DefenseId } from './simulation';

export const DEFENSE_POINTS = 4;
export const BASE_SERVERS = 2;
export const BOT_FILTER = 0.75;
export const CHALLENGE_DROPOUT = 0.05;
export const MAX_LOAD = 100;
export const MIN_SERVED = 90;
export const IMPACT_MS = 1800;

export interface Defense {
  id: DefenseId;
  name: string;
  cost: number;
  effect: string;
}

export const DEFENSES: Defense[] = [
  { id: 'udp', name: 'Block UDP', cost: 1, effect: 'Drops all UDP at the firewall' },
  { id: 'limit', name: 'Rate limit', cost: 1, effect: `Caps every address at ${RATE_LIMIT}` },
  { id: 'bot', name: 'Bot challenge', cost: 2, effect: 'Stops 3 in 4 bots, but 1 in 20 customers gives up' },
  { id: 'server', name: 'Extra server', cost: 2, effect: `+${WEB_CAPACITY} capacity` },
  { id: 'http', name: 'Block all HTTP', cost: 1, effect: 'Stops every web request' },
];

export type Part = 'udp' | 'single' | 'botnet' | 'users';
export type Traffic = Record<Part, number>;

export const PARTS: { id: Part; label: string }[] = [
  { id: 'udp', label: 'UDP flood' },
  { id: 'single', label: 'Loud address' },
  { id: 'botnet', label: 'Botnet' },
  { id: 'users', label: 'Customers' },
];

export interface Wave {
  name: string;
  intel: string;
  udp: number;
  single: number;
  bots: number;
  perBot: number;
  users: number;
}

export const WAVES: Wave[] = [
  {
    name: 'UDP flood',
    intel: '250 units of UDP per second are on their way. Your shop only speaks HTTP.',
    udp: 250, single: 0, bots: 0, perBot: 0, users: 60,
  },
  {
    name: 'Loud address',
    intel: 'The UDP flood keeps going. On top of it, one address starts sending 400 requests per second.',
    udp: 250, single: 400, bots: 0, perBot: 0, users: 60,
  },
  {
    name: 'Botnet',
    intel: 'Everything from before, plus 40 new addresses. Each one sends just 8 requests per second.',
    udp: 250, single: 400, bots: 40, perBot: 8, users: 60,
  },
  {
    name: 'TV crowd',
    intel: 'The attacker gives up. An hour later your shop is on TV, and 280 units of customers arrive at once.',
    udp: 0, single: 0, bots: 0, perBot: 0, users: 280,
  },
];

export type LayerId = 'firewall' | 'limiter' | 'bot';

export interface Layer {
  id: LayerId;
  name: string;
}

export interface LayerPass extends Layer {
  removed: number;
  after: Traffic;
}

export interface WaveResult {
  incoming: Traffic;
  layers: LayerPass[];
  atServers: Traffic;
  totalIncoming: number;
  totalAtServers: number;
  capacity: number;
  load: number;
  served: number;
  survived: boolean;
  reasons: string[];
}

export const sum = (traffic: Traffic) => traffic.udp + traffic.single + traffic.botnet + traffic.users;

export const WAVE_SCALE = Math.max(...WAVES.map((wave) => wave.udp + wave.single + wave.bots * wave.perBot + wave.users));

export function spentPoints(defenses: DefenseId[]) {
  return defenses.reduce((total, id) => total + (DEFENSES.find((defense) => defense.id === id)?.cost ?? 0), 0);
}

export function capacityFor(defenses: DefenseId[]) {
  return (BASE_SERVERS + (defenses.includes('server') ? 1 : 0)) * WEB_CAPACITY;
}

export function layersFor(defenses: DefenseId[]): Layer[] {
  const udp = defenses.includes('udp');
  const http = defenses.includes('http');
  const layers: Layer[] = [];
  if (udp || http) layers.push({ id: 'firewall', name: `Firewall: block ${[udp && 'UDP', http && 'all HTTP'].filter(Boolean).join(' + ')}` });
  if (defenses.includes('limit')) layers.push({ id: 'limiter', name: `Rate limit: ${RATE_LIMIT} / address` });
  if (defenses.includes('bot')) layers.push({ id: 'bot', name: 'Bot challenge' });
  return layers;
}

function filter(layer: LayerId, traffic: Traffic, wave: Wave, defenses: DefenseId[]): Traffic {
  switch (layer) {
    case 'firewall': {
      const http = defenses.includes('http');
      return {
        udp: defenses.includes('udp') ? 0 : traffic.udp,
        single: http ? 0 : traffic.single,
        botnet: http ? 0 : traffic.botnet,
        users: http ? 0 : traffic.users,
      };
    }
    case 'limiter':
      return {
        ...traffic,
        single: Math.min(traffic.single, RATE_LIMIT),
        botnet: wave.bots > 0 ? wave.bots * Math.min(traffic.botnet / wave.bots, RATE_LIMIT) : 0,
      };
    case 'bot':
      return {
        ...traffic,
        single: traffic.single * (1 - BOT_FILTER),
        botnet: traffic.botnet * (1 - BOT_FILTER),
        users: traffic.users * (1 - CHALLENGE_DROPOUT),
      };
  }
}

function explain(wave: Wave, defenses: DefenseId[], at: Traffic, capacity: number, overloaded: boolean): string[] {
  const reasons: { size: number; text: string }[] = [];
  if (defenses.includes('http')) {
    reasons.push({ size: Infinity, text: 'Block all HTTP stopped every web request, your customers included.' });
  }
  if (!overloaded) return reasons.map((reason) => reason.text);
  if (at.udp > 0) {
    reasons.push({ size: at.udp, text: `${wave.udp} units of UDP got through. Nothing blocks UDP.` });
  }
  if (at.single > RATE_LIMIT) {
    reasons.push({
      size: at.single,
      text: defenses.includes('bot')
        ? `The bot challenge caught most of the loud address, but ${fmt(at.single)} units still got through. Nothing capped it.`
        : `One address sent ${wave.single} units and nothing capped it.`,
    });
  }
  if (at.botnet > 0 && !defenses.includes('bot')) {
    reasons.push({
      size: at.botnet,
      text: defenses.includes('limit')
        ? `${wave.bots} addresses × ${wave.perBot} = ${fmt(at.botnet)} units. Each one stays under the limit of ${RATE_LIMIT}, so the rate limit let them all through.`
        : `${wave.bots} addresses × ${wave.perBot} = ${fmt(at.botnet)} units, and nothing filtered them.`,
    });
  }
  if (wave.udp + wave.single + wave.bots === 0) {
    reasons.push({ size: at.users, text: `These were customers, not attackers. ${fmt(at.users)} units don't fit on ${capacity} capacity.` });
    if (at.users < wave.users) {
      reasons.push({ size: 0, text: `The bot challenge also turned away ${fmt(wave.users - at.users)} of them.` });
    }
  }
  return reasons.sort((a, b) => b.size - a.size).map((reason) => reason.text);
}

export function runWave(wave: Wave, defenses: DefenseId[]): WaveResult {
  const incoming: Traffic = { udp: wave.udp, single: wave.single, botnet: wave.bots * wave.perBot, users: wave.users };
  const layers: LayerPass[] = [];
  let traffic = incoming;
  for (const layer of layersFor(defenses)) {
    const after = filter(layer.id, traffic, wave, defenses);
    layers.push({ ...layer, removed: sum(traffic) - sum(after), after });
    traffic = after;
  }

  const capacity = capacityFor(defenses);
  const totalAtServers = sum(traffic);
  const load = (totalAtServers / capacity) * 100;
  const share = load <= 100 ? 1 : capacity / totalAtServers;
  const served = (traffic.users / incoming.users) * share * 100;
  const survived = load < MAX_LOAD && served >= MIN_SERVED;

  return {
    incoming,
    layers,
    atServers: traffic,
    totalIncoming: sum(incoming),
    totalAtServers,
    capacity,
    load,
    served,
    survived,
    reasons: survived ? [] : explain(wave, defenses, traffic, capacity, load >= MAX_LOAD),
  };
}
