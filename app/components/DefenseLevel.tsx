'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from './Icons';
import { AhaCard, Objectives, isComplete } from './LevelParts';
import { ScrollArea } from './ScrollArea';
import { WEB_CAPACITY, fmt, type DefenseId, type LevelDef } from '../lib/simulation';
import {
  DEFENSES,
  DEFENSE_POINTS,
  IMPACT_MS,
  MAX_LOAD,
  MIN_SERVED,
  PARTS,
  WAVES,
  WAVE_SCALE,
  capacityFor,
  layersFor,
  runWave,
  spentPoints,
  sum,
  type LayerId,
  type Traffic,
  type Wave,
  type WaveResult,
} from '../lib/defense';

type Phase =
  | { kind: 'plan'; wave: number }
  | { kind: 'impact'; wave: number }
  | { kind: 'held'; wave: number }
  | { kind: 'down'; wave: number }
  | { kind: 'won' };

type WaveState = 'upcoming' | 'current' | 'done' | 'failed';

const DEFENSE_ICON: Record<DefenseId, IconName> = { udp: 'firewall', limit: 'limiter', bot: 'bot', server: 'server', http: 'firewall' };
const LAYER_ICON: Record<LayerId, IconName> = { firewall: 'firewall', limiter: 'limiter', bot: 'bot' };
const LAST_WAVE = WAVES.length - 1;

const percent = (value: number) => `${Math.round(value)} %`;

function waveStates(phase: Phase): WaveState[] {
  return WAVES.map((_, i) => {
    switch (phase.kind) {
      case 'won': return 'done';
      case 'held': return i <= phase.wave ? 'done' : i === phase.wave + 1 ? 'current' : 'upcoming';
      case 'down': return i < phase.wave ? 'done' : i === phase.wave ? 'failed' : 'upcoming';
      default: return i < phase.wave ? 'done' : i === phase.wave ? 'current' : 'upcoming';
    }
  });
}

function upcomingWave(phase: Phase): number | null {
  switch (phase.kind) {
    case 'won': return null;
    case 'held': return phase.wave + 1;
    default: return phase.wave;
  }
}

function composition(wave: Wave) {
  return [
    wave.udp > 0 && `UDP ${wave.udp}`,
    wave.single > 0 && `one address ${wave.single}`,
    wave.bots > 0 && `${wave.bots} bots × ${wave.perBot}`,
    `customers ${wave.users}`,
  ].filter(Boolean).join(' · ');
}

export function DefenseLevel({ level, defenses, onDefensesChange, achieved, onAchieve, onNext }: {
  level: LevelDef;
  defenses: DefenseId[];
  onDefensesChange: (defenses: DefenseId[]) => void;
  achieved: string[];
  onAchieve: (ids: string[]) => void;
  onNext: () => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: 'plan', wave: 0 });
  const [runDefenses, setRunDefenses] = useState<DefenseId[]>(defenses);
  const ahaRef = useRef<HTMLDivElement>(null);

  const spent = spentPoints(defenses);
  const complete = isComplete(level, achieved);
  const next = upcomingWave(phase);
  const hitting = phase.kind === 'impact';

  useEffect(() => {
    if (phase.kind !== 'impact') return;
    const { wave } = phase;
    const timer = window.setTimeout(() => {
      const result = runWave(WAVES[wave], runDefenses);
      onAchieve(result.survived ? [`seen-${wave + 1}`, `w${wave + 1}`] : [`seen-${wave + 1}`]);
      setPhase(!result.survived ? { kind: 'down', wave } : wave === LAST_WAVE ? { kind: 'won' } : { kind: 'held', wave });
    }, IMPACT_MS);
    return () => window.clearTimeout(timer);
  }, [phase, runDefenses, onAchieve]);

  useEffect(() => {
    if (phase.kind === 'won') ahaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [phase.kind]);

  function send(wave: number) {
    setRunDefenses(defenses);
    setPhase({ kind: 'impact', wave });
  }

  function toggle(id: DefenseId) {
    if (next === null) return;
    onDefensesChange(defenses.includes(id) ? defenses.filter((item) => item !== id) : [...defenses, id]);
    setPhase({ kind: 'plan', wave: next });
  }

  const result = phase.kind === 'plan' ? null : runWave(WAVES[phase.kind === 'won' ? LAST_WAVE : phase.wave], runDefenses);
  const shownDefenses = phase.kind === 'plan' ? defenses : runDefenses;

  const status = phase.kind === 'won'
    ? 'All waves held'
    : phase.kind === 'down'
      ? 'Service down'
      : phase.kind === 'held'
        ? `Wave ${phase.wave + 1} held`
        : phase.kind === 'impact'
          ? `Wave ${phase.wave + 1} hitting`
          : `Wave ${phase.wave + 1} up next`;

  const action: { label: string; icon: IconName; run: () => void } = phase.kind === 'won'
    ? { label: 'Play again', icon: 'restart', run: () => setPhase({ kind: 'plan', wave: 0 }) }
    : phase.kind === 'down'
      ? { label: `Try wave ${phase.wave + 1} again`, icon: 'restart', run: () => send(phase.wave) }
      : { label: hitting ? `Wave ${(next ?? 0) + 1} is hitting…` : `Send wave ${(next ?? 0) + 1}`, icon: 'play', run: () => send(next ?? 0) };

  return (
    <section className="simulator-grid">
      <aside className="panel config-panel">
        <ScrollArea>
          <div className="panel-heading">
            <p className="level-label">Final level</p>
            <h2>{level.title ?? level.name}</h2>
            <p className="goal">{level.goal}</p>
          </div>

          {next !== null && (
            <div className="setup-card intel" aria-live="polite">
              <p className="section-label">Wave {next + 1} of {WAVES.length}</p>
              <p>{WAVES[next].intel}</p>
            </div>
          )}

          <fieldset className="control" disabled={hitting || phase.kind === 'won'}>
            <legend className="section-label defense-legend">
              Defense points
              <span className="points" aria-label={`${DEFENSE_POINTS - spent} of ${DEFENSE_POINTS} points left`}>
                {Array.from({ length: DEFENSE_POINTS }, (_, i) => (
                  <Icon key={i} name="shield" size={15} className={i < spent ? 'point spent' : 'point'} />
                ))}
                <span>{DEFENSE_POINTS - spent} left</span>
              </span>
            </legend>
            <div className="defense-list">
              {DEFENSES.map((defense) => {
                const on = defenses.includes(defense.id);
                const affordable = on || spent + defense.cost <= DEFENSE_POINTS;
                return (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    key={defense.id}
                    className={`defense-card ${on ? 'selected' : ''}`}
                    disabled={!affordable}
                    onClick={() => toggle(defense.id)}
                  >
                    <span className="checkbox" aria-hidden="true">{on && <Icon name="check" size={12} strokeWidth={3} />}</span>
                    <span className="defense-text">
                      <strong><Icon name={DEFENSE_ICON[defense.id]} size={15} />{defense.name}</strong>
                      <small>{defense.effect}</small>
                    </span>
                    <span className="defense-cost" aria-label={`Costs ${defense.cost} ${defense.cost === 1 ? 'point' : 'points'}`}>
                      {Array.from({ length: defense.cost }, (_, i) => <Icon key={i} name="shield" size={14} />)}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <Objectives level={level} achieved={achieved} />
        </ScrollArea>

        <div className="config-foot">
          <button className="launch-button" onClick={action.run} disabled={hitting}>
            <Icon name={action.icon} size={14} />
            {action.label}
          </button>
        </div>
      </aside>

      <section className="panel network-panel">
        <div className="network-heading">
          <h2>Your network</h2>
          <span className={`live-status ${hitting ? 'on' : ''}`}><i />{status}</span>
        </div>

        <ScrollArea>
          <WaveTrack phase={phase} achieved={achieved} />
          <WaveBanner phase={phase} result={result} />
          <Pipeline defenses={shownDefenses} result={result} />

          <div className="gauges" aria-live="polite">
            <Gauge
              label="Server load"
              value={result?.load ?? null}
              rule={`must stay under ${MAX_LOAD} %`}
              tone={!result ? 'neutral' : result.load >= MAX_LOAD ? 'bad' : result.load >= 80 ? 'warn' : 'good'}
            />
            <Gauge
              label="Customers served"
              value={result?.served ?? null}
              rule={`at least ${MIN_SERVED} %`}
              marker={MIN_SERVED}
              tone={!result ? 'neutral' : result.served >= MIN_SERVED ? 'good' : 'bad'}
            />
          </div>

          {complete && <AhaCard ref={ahaRef} level={level} onNext={onNext} />}
        </ScrollArea>
      </section>
    </section>
  );
}

function WaveTrack({ phase, achieved }: { phase: Phase; achieved: string[] }) {
  const states = waveStates(phase);
  return (
    <ol className="wave-track" aria-label="Attack waves">
      {WAVES.map((wave, i) => {
        const state = states[i];
        const seen = achieved.includes(`seen-${i + 1}`);
        return (
          <li key={wave.name} className={`wave-chip ${state}`}>
            <span className="wave-mark">
              {state === 'done' ? <Icon name="check" size={12} strokeWidth={3} /> : state === 'failed' ? <Icon name="zap" size={12} strokeWidth={2.5} /> : i + 1}
            </span>
            <span>
              <strong>Wave {i + 1}</strong>
              <small>{seen ? wave.name : 'Unknown'}</small>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function WaveBanner({ phase, result }: { phase: Phase; result: WaveResult | null }) {
  if (!result) return null;
  switch (phase.kind) {
    case 'impact': {
      const wave = WAVES[phase.wave];
      return (
        <div className="wave-banner alert" role="status">
          <span className="analysis-icon"><Icon name="alert" size={16} strokeWidth={2} /></span>
          <div>
            <h3 className="alert-title">{wave.name}</h3>
            <p>{composition(wave)}</p>
            <p className="impact-note"><span className="spinner-dot" aria-hidden="true" />Hitting your defenses…</p>
          </div>
        </div>
      );
    }
    case 'held':
    case 'won':
      return (
        <div className="wave-banner survived" role="status">
          <span className="analysis-icon"><Icon name="check" size={16} strokeWidth={2.5} /></span>
          <div>
            <h3>{phase.kind === 'won' ? 'All four waves held' : `Wave ${phase.wave + 1} held`}</h3>
            <p>Load {percent(result.load)}, {percent(result.served)} of customers served.</p>
          </div>
        </div>
      );
    case 'down':
      return <ServiceDown result={result} wave={phase.wave} />;
    default:
      return null;
  }
}

function ServiceDown({ result, wave }: { result: WaveResult; wave: number }) {
  const overloaded = result.load >= MAX_LOAD;
  return (
    <div className="analysis outcome-overload service-down" role="status">
      <span className="analysis-icon"><Icon name="zap" size={18} strokeWidth={2} /></span>
      <div>
        <h3>Service down</h3>
        <p className="analysis-subtitle">
          {overloaded ? `Server load ${percent(result.load)}` : `Customers served ${percent(result.served)}`} in wave {wave + 1}
        </p>
        <ul className="reasons">
          {result.reasons.map((reason) => <li key={reason} className="reason">{reason}</li>)}
        </ul>
      </div>
    </div>
  );
}

function Pipeline({ defenses, result }: { defenses: DefenseId[]; result: WaveResult | null }) {
  const capacity = capacityFor(defenses);
  const capacityAt = `${(capacity / WAVE_SCALE) * 100}%`;
  const rows: { key: string; icon: IconName; name: string; traffic: Traffic | null; removed: number | null }[] = [
    { key: 'in', icon: 'attacker', name: 'Incoming', traffic: result?.incoming ?? null, removed: null },
    ...layersFor(defenses).map((layer, i) => ({
      key: layer.id,
      icon: LAYER_ICON[layer.id],
      name: layer.name,
      traffic: result?.layers[i]?.after ?? null,
      removed: result?.layers[i]?.removed ?? null,
    })),
    { key: 'servers', icon: 'server', name: `Servers: ${capacity / WEB_CAPACITY} × ${WEB_CAPACITY}`, traffic: result?.atServers ?? null, removed: null },
  ];

  return (
    <div className="pipeline">
      {rows.length === 2 && <p className="pipe-empty">No defenses yet: every unit goes straight to the servers.</p>}
      {rows.map((row) => {
        const servers = row.key === 'servers';
        const over = servers && result !== null && result.load >= MAX_LOAD;
        return (
          <div key={row.key} className={`pipe-row ${servers ? 'servers' : ''} ${over ? 'over' : ''}`}>
            <div className="pipe-head">
              <span className="pipe-icon"><Icon name={row.icon} size={16} /></span>
              <strong>{row.name}</strong>
              {row.removed !== null && row.removed > 0 && <span className="pipe-removed">−{fmt(row.removed)}</span>}
              <span className="pipe-total">
                {row.traffic ? fmt(sum(row.traffic)) : '–'}
                {servers && <small> / {capacity}</small>}
              </span>
            </div>
            <div className="pipe-bar">
              {PARTS.map((part) => (
                <i
                  key={part.id}
                  className={`part-${part.id}`}
                  style={{ width: `${row.traffic ? (row.traffic[part.id] / WAVE_SCALE) * 100 : 0}%` }}
                />
              ))}
              <span className="pipe-capacity" style={{ left: capacityAt }} />
            </div>
          </div>
        );
      })}
      <ul className="pipe-legend">
        {PARTS.map((part) => (
          <li key={part.id}><i className={`part-${part.id}`} />{part.label}</li>
        ))}
        <li><span className="legend-capacity" />Server capacity</li>
      </ul>
    </div>
  );
}

function Gauge({ label, value, rule, marker, tone }: {
  label: string;
  value: number | null;
  rule: string;
  marker?: number;
  tone: 'neutral' | 'good' | 'warn' | 'bad';
}) {
  return (
    <div className={`gauge state-${tone}`}>
      <div className="gauge-head">
        <small>{label}</small>
        <strong>{value === null ? '–' : percent(value)}</strong>
      </div>
      <span className={`gauge-bar ${value !== null && value > 100 ? 'over' : ''}`}>
        <i style={{ width: `${value === null ? 0 : Math.min(100, value)}%` }} />
        {marker !== undefined && <span className="gauge-marker" style={{ left: `${marker}%` }} />}
      </span>
      <span className="gauge-rule">{rule}</span>
    </div>
  );
}
