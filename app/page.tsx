'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OptionList, RequestPicker, Segmented, Slider } from './components/Controls';
import { DefenseLevel } from './components/DefenseLevel';
import { Icon, type IconName } from './components/Icons';
import { AhaCard, Fact, Objectives, SetupCard, isComplete } from './components/LevelParts';
import { NetworkStage } from './components/NetworkStage';
import { ScrollArea } from './components/ScrollArea';
import { ServerDashboard } from './components/ServerDashboard';
import { ThemeToggle } from './components/ThemeToggle';
import {
  BALANCER_BANDS,
  CACHE_HIT_RATE,
  CACHE_SERVERS,
  CACHE_SOURCES,
  CDN_ALARM,
  COMPUTE_CAPACITY,
  COMPUTE_PER_SOURCE,
  COMPUTE_REQUESTS,
  COMPUTE_SOURCES,
  DEFAULT_CONFIGS,
  DISTRIBUTED,
  INTENSITIES,
  LEVELS,
  LIMITER_NORMAL_TRAFFIC,
  LIMITER_SERVER_CAPACITY,
  RATE_LIMIT,
  REQUESTS,
  VECTORS,
  VECTOR_SOURCES,
  WEB_CAPACITY,
  simulate,
  type Config,
  type DefenseId,
  type Flow,
  type LevelId,
  type OutcomeTone,
  type Protocol,
  type SimLevelId,
  type SourceMode,
  type StepAt,
  type Vector,
} from './lib/simulation';

type View = LevelId | 'debrief';

const NO_PROGRESS: Record<LevelId, string[]> = { firewall: [], balancer: [], limiter: [], vector: [], cache: [], compute: [], defense: [] };

const OUTCOME_ICON: Record<OutcomeTone, IconName> = { good: 'check', stopped: 'x', warn: 'alert', overload: 'zap' };
const STEP_ICON: Record<StepAt, IconName> = {
  source: 'attacker',
  users: 'users',
  firewall: 'firewall',
  cache: 'cache',
  limiter: 'limiter',
  balancer: 'balancer',
  server: 'server',
};

const CAPTIONS: Record<SimLevelId, { flow: Flow; label: string }[]> = {
  firewall: [{ flow: 'udp', label: 'UDP' }, { flow: 'http', label: 'HTTP' }],
  balancer: [{ flow: 'http', label: 'Attack traffic' }],
  limiter: [{ flow: 'http', label: 'Attack traffic' }, { flow: 'legit', label: 'Normal users' }],
  vector: [{ flow: 'udp', label: 'UDP' }, { flow: 'http', label: 'HTTP' }],
  cache: VECTORS.map((vector) => ({ flow: vector.flow, label: vector.name })),
  compute: [],
};

const NETWORK_TITLE: Partial<Record<LevelId, string>> = { vector: 'Target system', cache: 'Target system', compute: 'Server' };

export default function Home() {
  const [view, setView] = useState<View>('firewall');
  const [configs, setConfigs] = useState(DEFAULT_CONFIGS);
  const [live, setLive] = useState(false);
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const [achieved, setAchieved] = useState(NO_PROGRESS);

  const level = LEVELS.find((item) => item.id === view);
  const simLevel: SimLevelId | null = level && level.id !== 'defense' ? level.id : null;
  const config = level ? configs[level.id] : null;
  const sim = useMemo(() => (simLevel && config ? simulate(simLevel, config) : null), [simLevel, config]);
  const configKey = level ? `${level.id}:${JSON.stringify(config)}` : '';
  const analysisReady = live && settledKey === configKey;

  const record = useCallback((id: LevelId, ids: string[]) => {
    setAchieved((previous) => {
      const merged = Array.from(new Set([...previous[id], ...ids]));
      return merged.length === previous[id].length ? previous : { ...previous, [id]: merged };
    });
  }, []);
  const recordDefense = useCallback((ids: string[]) => record('defense', ids), [record]);

  // Once traffic settles on a configuration, show the analysis and record objectives.
  useEffect(() => {
    if (!live || !sim || !level) return;
    const timer = window.setTimeout(() => {
      setSettledKey(configKey);
      record(level.id, sim.achieved);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [live, sim, level, configKey, record]);

  function selectView(next: View) {
    setView(next);
    setLive(false);
    setSettledKey(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateConfig(patch: Partial<Config>) {
    if (!level) return;
    setConfigs((previous) => ({ ...previous, [level.id]: { ...previous[level.id], ...patch } }));
  }

  function restart() {
    setConfigs(DEFAULT_CONFIGS);
    setAchieved(NO_PROGRESS);
    selectView('firewall');
  }

  // Bring the aha card into view the moment a level is solved (not when revisiting a solved level).
  const complete = level ? isComplete(level, achieved[level.id]) : false;
  const ahaRef = useRef<HTMLDivElement>(null);
  const previous = useRef({ view, complete });
  useEffect(() => {
    if (previous.current.view === view && complete && !previous.current.complete) {
      ahaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    previous.current = { view, complete };
  }, [view, complete]);

  const levelIndex = LEVELS.findIndex((item) => item.id === view);
  const nextView: View = levelIndex >= 0 && levelIndex < LEVELS.length - 1 ? LEVELS[levelIndex + 1].id : 'debrief';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <h1>DDoS Defense Simulator</h1>
        </div>
        <div className="topbar-nav">
          <nav className="stepper" aria-label="Choose level">
            {LEVELS.map((item, index) => {
              const done = isComplete(item, achieved[item.id]);
              const current = view === item.id;
              return (
                <button
                  key={item.id}
                  className={`step ${current ? 'current' : ''} ${done ? 'done' : ''}`}
                  onClick={() => selectView(item.id)}
                  aria-current={current ? 'step' : undefined}
                  aria-label={`Level ${index + 1}: ${item.name}`}
                  title={item.name}
                >
                  <span className="step-mark">{done ? <Icon name="check" size={12} strokeWidth={2.5} /> : index + 1}</span>
                  <span className="step-name">{item.name}</span>
                </button>
              );
            })}
            <button
              className={`step ${view === 'debrief' ? 'current' : ''}`}
              onClick={() => selectView('debrief')}
              aria-current={view === 'debrief' ? 'step' : undefined}
            >
              <span className="step-name debrief-name">Debrief</span>
            </button>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main className="content">
        {level?.id === 'defense' && config ? (
          <DefenseLevel
            level={level}
            defenses={config.defenses}
            onDefensesChange={(defenses: DefenseId[]) => updateConfig({ defenses })}
            achieved={achieved.defense}
            onAchieve={recordDefense}
            onNext={() => selectView(nextView)}
          />
        ) : level && config && sim ? (
          <section className="simulator-grid" key={level.id}>
            <aside className="panel config-panel">
              <ScrollArea>
                <div className="panel-heading">
                  <p className="level-label">Level {levelIndex + 1} of {LEVELS.length}</p>
                  <h2>{level.title ?? level.name}</h2>
                  <p className="goal">{level.goal}</p>
                </div>

                <LevelSetup id={level.id} />

                <LevelControls
                  id={level.id}
                  config={config}
                  onChange={updateConfig}
                  sourceUnlocked={achieved.limiter.includes('single')}
                  achieved={achieved[level.id]}
                />

                {level.hint && (
                  <p className="hint">
                    <Icon name="info" size={14} />
                    <span><b>Hint:</b> {level.hint}</span>
                  </p>
                )}

                <Objectives level={level} achieved={achieved[level.id]} />
              </ScrollArea>

              <div className="config-foot">
                <button className={`launch-button ${live ? 'stop' : ''}`} onClick={() => setLive(!live)}>
                  <Icon name={live ? 'stop' : 'play'} size={14} />
                  {live ? 'Stop traffic' : 'Launch attack'}
                </button>
                <p className="live-hint">
                  {live ? 'Traffic is live. Change a setting and watch the system react.' : 'All traffic is simulated in your browser.'}
                </p>
              </div>
            </aside>

            <section className="panel network-panel">
              <div className="network-heading">
                <h2>{NETWORK_TITLE[level.id] ?? 'Network'}</h2>
                <span className={`live-status ${live ? 'on' : ''}`}><i />{live ? 'Traffic live' : 'Ready'}</span>
              </div>

              <ScrollArea>
                {sim.display.kind === 'network' ? (
                  <div className={`stage-frame ${live ? 'running' : ''}`}>
                    <NetworkStage stage={sim.display.stage} live={live} />
                    <div className="stage-caption">
                      {simLevel && CAPTIONS[simLevel].map((item) => (
                        <span key={item.label}><i className={`dot flow-${item.flow}`} /> {item.label}</span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <ServerDashboard server={sim.display.server} live={live} />
                )}

                <div className="stats-grid" aria-live="polite">
                  {sim.metrics.map((metric) => (
                    <div key={metric.label}>
                      <small>{metric.label}</small>
                      <strong className={live ? `tone-${metric.tone ?? 'neutral'}` : ''}>{live ? metric.value : '–'}</strong>
                      <span>{live ? metric.hint : 'waiting for traffic'}</span>
                    </div>
                  ))}
                </div>

                {!live ? (
                  <div className="analysis idle">
                    <span className="analysis-icon"><Icon name="play" size={16} /></span>
                    <div><h3>Ready when you are</h3><p>Pick your settings and press <strong>Launch attack</strong> to send traffic through the system.</p></div>
                  </div>
                ) : !analysisReady ? (
                  <div className="analysis pending" role="status">
                    <span className="analysis-icon spinner" />
                    <div><h3>Analyzing traffic…</h3><p>Following every unit through the network.</p></div>
                  </div>
                ) : (
                  <div className={`analysis outcome-${sim.outcome.tone}`} role="status">
                    <span className="analysis-icon"><Icon name={OUTCOME_ICON[sim.outcome.tone]} size={18} strokeWidth={2} /></span>
                    <div>
                      <h3>{sim.outcome.title}</h3>
                      {sim.outcome.subtitle && <p className="analysis-subtitle">{sim.outcome.subtitle}</p>}
                      <p>{sim.outcome.detail}</p>
                      <ol className="trace">
                        {sim.steps.map((step, index) => (
                          <li key={index}>
                            <Icon name={STEP_ICON[step.at]} size={15} />
                            <span>{step.text}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}

                {complete && (
                  <AhaCard ref={ahaRef} level={level} onNext={() => selectView(nextView)} />
                )}
              </ScrollArea>
            </section>
          </section>
        ) : (
          <Debrief achieved={achieved} onRestart={restart} onOpen={selectView} />
        )}
      </main>
    </div>
  );
}

function LevelSetup({ id }: { id: LevelId }) {
  switch (id) {
    case 'firewall':
      return (
        <SetupCard title="Firewall rules">
          <ul className="rules">
            <li><span className="rule block">BLOCK</span><code>UDP</code></li>
            <li><span className="rule allow">ALLOW</span><code>HTTP</code></li>
          </ul>
        </SetupCard>
      );
    case 'balancer':
      return (
        <SetupCard title="Capacity">
          <dl className="facts">
            <Fact icon="server" label="Web 1" value={`${WEB_CAPACITY} units`} />
            <Fact icon="server" label="Web 2" value={`${WEB_CAPACITY} units`} />
            <div className="total"><dt>Total</dt><dd>{WEB_CAPACITY * 2} units</dd></div>
          </dl>
        </SetupCard>
      );
    case 'limiter':
      return (
        <SetupCard title="Starting situation">
          <dl className="facts">
            <Fact icon="server" label="Server capacity" value={`${LIMITER_SERVER_CAPACITY} units / s`} />
            <Fact icon="users" label="Normal traffic" value={`${LIMITER_NORMAL_TRAFFIC} units / s`} />
            <Fact icon="limiter" label="Rate limit" value={`max. ${RATE_LIMIT} / source / s`} />
          </dl>
        </SetupCard>
      );
    case 'vector':
      return (
        <SetupCard title="Target">
          <dl className="facts">
            <Fact icon="firewall" label="Firewall" value="UDP blocked" />
            <Fact icon="limiter" label="Rate limiter" value={`over ${RATE_LIMIT} / source → ban`} />
            <Fact icon="server" label="Servers" value={`2 × ${WEB_CAPACITY}`} />
          </dl>
        </SetupCard>
      );
    case 'cache':
      return (
        <SetupCard title="Target">
          <dl className="facts">
            <Fact icon="firewall" label="Firewall" value="UDP blocked" />
            <Fact icon="cache" label="CDN cache" value={`${CACHE_HIT_RATE * 100} % of static`} />
            <Fact icon="alert" label="CDN alarm" value={`above ${CDN_ALARM} / s`} />
            <Fact icon="limiter" label="Rate limiter" value={`over ${RATE_LIMIT} / source → ban`} />
            <Fact icon="server" label="Servers" value={`${CACHE_SERVERS} × ${WEB_CAPACITY}`} />
          </dl>
        </SetupCard>
      );
    case 'compute':
      return (
        <SetupCard title="Setup">
          <dl className="facts">
            <Fact icon="attacker" label="Traffic (fixed)" value={`${COMPUTE_SOURCES} × ${COMPUTE_PER_SOURCE} = ${COMPUTE_REQUESTS} / s`} />
            <Fact icon="cpu" label="Server CPU" value={`${COMPUTE_CAPACITY} work units / s`} />
          </dl>
        </SetupCard>
      );
    case 'defense':
      return null;
  }
}

function LevelControls({ id, config, onChange, sourceUnlocked, achieved }: {
  id: LevelId;
  config: Config;
  onChange: (patch: Partial<Config>) => void;
  sourceUnlocked: boolean;
  achieved: string[];
}) {
  switch (id) {
    case 'firewall':
      return (
        <OptionList<Protocol>
          label="Attack type"
          value={config.protocol}
          onChange={(protocol) => onChange({ protocol })}
          options={[
            { value: 'udp', title: 'UDP flood', description: 'Connectionless packets', swatch: 'udp' },
            { value: 'http', title: 'HTTP requests', description: 'Ordinary web page requests', swatch: 'http' },
          ]}
        />
      );
    case 'balancer': {
      const band = BALANCER_BANDS.find((item) => item.matches(config.intensity));
      return (
        <>
          <Slider label="Attack intensity" min={10} max={250} value={config.intensity} onChange={(intensity) => onChange({ intensity })} />
          <p className="section-label">Reaction</p>
          <table className="band-table">
            <tbody>
              {BALANCER_BANDS.map((item) => (
                <tr key={item.id} className={item === band ? 'current' : ''}>
                  <td>{item.range}</td>
                  <td><span className={`band-mark ${item.tone}`} aria-hidden="true" />{item.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      );
    }
    case 'limiter': {
      const distributed = config.sourceMode === 'distributed';
      return (
        <>
          <Slider
            label="Attack intensity"
            min={10}
            max={500}
            value={config.intensity}
            onChange={(intensity) => onChange({ intensity })}
            disabled={distributed}
            note={distributed ? `Distributed: ${DISTRIBUTED.sources} sources × ${DISTRIBUTED.perSource} units` : undefined}
          />
          <div className={`locked-group ${sourceUnlocked ? 'unlocked' : 'locked'}`}>
            <OptionList<SourceMode>
              label="Attack source"
              tag={sourceUnlocked ? 'New' : undefined}
              value={config.sourceMode}
              onChange={(sourceMode) => onChange({ sourceMode })}
              disabled={!sourceUnlocked}
              options={[
                { value: 'single', title: 'Single source', description: 'One attacker, one address', swatch: 'http' },
                { value: 'distributed', title: 'Distributed sources', description: `${DISTRIBUTED.sources} simulated sources`, swatch: 'http' },
              ]}
            />
            {!sourceUnlocked && (
              <p className="lock-note"><Icon name="lock" size={14} />Unlocks once you have attacked from a single source.</p>
            )}
          </div>
        </>
      );
    }
    case 'vector':
      return (
        <>
          <OptionList<Protocol>
            label="Protocol"
            value={config.protocol}
            onChange={(protocol) => onChange({ protocol })}
            options={[
              { value: 'udp', title: 'UDP', description: 'Raw packets, no web requests', swatch: 'udp' },
              { value: 'http', title: 'HTTP', description: 'Ordinary web requests', swatch: 'http' },
            ]}
          />
          <SourcesAndRate config={config} onChange={onChange} sources={VECTOR_SOURCES} />
        </>
      );
    case 'cache':
      return (
        <>
          <OptionList<Vector>
            label="Attack type"
            value={config.vector}
            onChange={(vector) => onChange({ vector })}
            options={VECTORS.map((vector) => ({ value: vector.id, title: vector.name, description: vector.description, swatch: vector.flow }))}
          />
          <SourcesAndRate config={config} onChange={onChange} sources={CACHE_SOURCES} />
        </>
      );
    case 'compute':
      return (
        <RequestPicker
          value={config.request}
          onChange={(request) => onChange({ request })}
          revealed={REQUESTS.filter((request) => achieved.includes(`seen-${request.id}`)).map((request) => request.id)}
        />
      );
    case 'defense':
      return null;
  }
}

function SourcesAndRate({ config, onChange, sources }: {
  config: Config;
  onChange: (patch: Partial<Config>) => void;
  sources: number[];
}) {
  return (
    <>
      <Segmented
        label="Sources"
        value={config.sources}
        onChange={(count) => onChange({ sources: count })}
        options={sources.map((count) => ({ value: count, title: `${count}` }))}
      />
      <Segmented
        label="Units per source"
        value={config.perSource}
        onChange={(perSource) => onChange({ perSource })}
        options={INTENSITIES.map((item) => ({ value: item.units, title: item.id, caption: `${item.units} units` }))}
      />
      <div className="formula">
        <span>Total</span>
        <strong>{config.sources} × {config.perSource} = {config.sources * config.perSource} units</strong>
      </div>
    </>
  );
}

const LAYERS: { icon: IconName; name: string; job: string; limit: string }[] = [
  { icon: 'firewall', name: 'Firewall', job: 'Blocks certain types of traffic', limit: 'Only helps if a matching rule exists.' },
  { icon: 'cache', name: 'Cache / CDN', job: 'Answers static requests by itself', limit: 'Dynamic requests still reach the servers.' },
  { icon: 'limiter', name: 'Rate limiter', job: 'Limits traffic per source', limit: 'Many small sources stay under the limit.' },
  { icon: 'bot', name: 'Bot challenge', job: 'Filters out most bot traffic', limit: 'Some bots still get through.' },
  { icon: 'balancer', name: 'Load balancer', job: 'Spreads the load', limit: 'Adds no capacity; it only distributes it.' },
];

function Debrief({ achieved, onRestart, onOpen }: {
  achieved: Record<LevelId, string[]>;
  onRestart: () => void;
  onOpen: (view: View) => void;
}) {
  return (
    <section className="debrief-grid">
      <div className="panel debrief-diagram">
        <h2>All layers of protection</h2>
        <div className="layer-stack">
          <div className="layer-source">
            <span className="swarm-row" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((n) => <Icon key={n} name="attacker" size={20} />)}
            </span>
            <strong>Distributed traffic</strong>
          </div>
          {LAYERS.map((layer) => (
            <div className="layer-item" key={layer.name}>
              <span className="layer-link" aria-hidden="true" />
              <div className="layer">
                <span className="layer-icon"><Icon name={layer.icon} size={22} /></span>
                <div>
                  <strong>{layer.name}</strong>
                  <span>{layer.job}</span>
                  <small>Limit: {layer.limit}</small>
                </div>
              </div>
            </div>
          ))}
          <span className="layer-link" aria-hidden="true" />
          <div className="layer-servers">
            <span><Icon name="server" size={16} />Web 1</span>
            <span><Icon name="server" size={16} />Web 2</span>
          </div>
          <p className="layer-servers-note">
            <Icon name="cpu" size={14} />Expensive requests can max out the CPU even at low traffic.
          </p>
        </div>
      </div>

      <div className="debrief-side">
        <div className="panel insight">
          <h2>There is no single DDoS protection.</h2>
          <p>Firewalls stop some traffic. Rate limits stop other traffic. Distributed attacks can bypass simple limits.</p>
          <p className="insight-strong">Effective defense requires multiple layers.</p>
        </div>

        <div className="panel recap">
          <h2>Your findings</h2>
          <ul>
            {LEVELS.map((level, index) => {
              const done = isComplete(level, achieved[level.id]);
              return (
                <li key={level.id} className={done ? 'done' : ''}>
                  <button onClick={() => onOpen(level.id)}>
                    <span className="recap-tag">{done ? <Icon name="check" size={13} strokeWidth={2.5} /> : index + 1}</span>
                    <span>
                      <strong>{level.name}</strong>
                      <small>{done ? level.aha : 'Not solved yet. Open the level to discover it.'}</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button className="launch-button" onClick={onRestart}>
            <Icon name="restart" size={14} />
            Restart from level 1
          </button>
        </div>
      </div>
    </section>
  );
}
