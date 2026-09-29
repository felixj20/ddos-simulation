'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react';
import { NetworkStage } from './components/NetworkStage';
import { Icon, type IconName } from './components/Icons';
import { ScrollArea } from './components/ScrollArea';
import { TestLog } from './components/TestLog';
import { ThemeToggle } from './components/ThemeToggle';
import {
  BALANCER_BANDS,
  BOSS_COMBINATIONS,
  BOSS_INTENSITIES,
  BOSS_SOURCES,
  DEFAULT_CONFIGS,
  DISTRIBUTED,
  LEVELS,
  LIMITER_NORMAL_TRAFFIC,
  LIMITER_SERVER_CAPACITY,
  RATE_LIMIT,
  WEB_CAPACITY,
  logEntry,
  simulate,
  type Config,
  type LevelDef,
  type LevelId,
  type LogEntry,
  type OutcomeTone,
  type Protocol,
  type SourceMode,
  type StepAt,
} from './lib/simulation';

type View = LevelId | 'debrief';

const NO_PROGRESS: Record<LevelId, string[]> = { firewall: [], balancer: [], limiter: [], boss: [] };

const OUTCOME_ICON: Record<OutcomeTone, IconName> = { good: 'check', stopped: 'x', warn: 'alert', overload: 'zap' };
const STEP_ICON: Record<StepAt, IconName> = {
  source: 'attacker',
  users: 'users',
  firewall: 'firewall',
  limiter: 'limiter',
  balancer: 'balancer',
  server: 'server',
};

function isComplete(level: LevelDef, achieved: string[]) {
  return level.objectives.every((objective) => achieved.includes(objective.id));
}

export default function Home() {
  const [view, setView] = useState<View>('firewall');
  const [configs, setConfigs] = useState(DEFAULT_CONFIGS);
  const [live, setLive] = useState(false);
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const [achieved, setAchieved] = useState(NO_PROGRESS);
  const [bossLog, setBossLog] = useState<LogEntry[]>([]);

  const level = LEVELS.find((item) => item.id === view);
  const config = level ? configs[level.id] : null;
  const sim = useMemo(() => (level && config ? simulate(level.id, config) : null), [level, config]);
  const configKey = level ? `${level.id}:${JSON.stringify(config)}` : '';
  const analysisReady = live && settledKey === configKey;

  // Once traffic settles on a configuration, show the analysis and record objectives.
  useEffect(() => {
    if (!live || !sim || !level || !config) return;
    const timer = window.setTimeout(() => {
      setSettledKey(configKey);
      setAchieved((previous) => {
        const merged = Array.from(new Set([...previous[level.id], ...sim.achieved]));
        return merged.length === previous[level.id].length ? previous : { ...previous, [level.id]: merged };
      });
      if (level.id === 'boss') {
        const entry = logEntry(config);
        setBossLog((previous) => (previous.some((item) => item.key === entry.key) ? previous : [...previous, entry]));
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [live, sim, level, config, configKey]);

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
    setBossLog([]);
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
          <p>Play the attacker and see what each layer of protection stops, and where it gives out.</p>
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
              <span className="step-name">Debrief</span>
            </button>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main className="content">
        {level && config && sim ? (
          <section className="simulator-grid" key={level.id}>
            <aside className="panel config-panel">
              <ScrollArea>
                <div className="panel-heading">
                  <p className="level-label">{level.id === 'boss' ? 'Final level' : `Level ${levelIndex + 1} of 4`}</p>
                  <h2>{level.id === 'boss' ? 'Find the attack vector' : level.name}</h2>
                  <p className="goal">{level.goal}</p>
                </div>

                <LevelSetup id={level.id} />

                <LevelControls
                  id={level.id}
                  config={config}
                  onChange={updateConfig}
                  sourceUnlocked={achieved.limiter.includes('single')}
                />

                <p className="hint">
                  <Icon name="info" size={14} />
                  <span><b>Hint:</b> {level.hint}</span>
                </p>

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
                <h2>{level.id === 'boss' ? 'Target system' : 'Network'}</h2>
                <span className={`live-status ${live ? 'on' : ''}`}><i />{live ? 'Traffic live' : 'Ready'}</span>
              </div>

              <ScrollArea>
                <div className={`stage-frame ${live ? 'running' : ''}`}>
                  <NetworkStage stage={sim.stage} live={live} />
                  <div className="stage-caption">
                    {level.id === 'firewall' || level.id === 'boss' ? (
                      <>
                        <span><i className="udp-dot" /> UDP</span>
                        <span><i className="http-dot" /> HTTP</span>
                      </>
                    ) : (
                      <span><i className="http-dot" /> Attack traffic</span>
                    )}
                    {level.id === 'limiter' && <span><i className="legit-dot" /> Normal users</span>}
                  </div>
                </div>

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

                {level.id === 'boss' && <TestLog entries={bossLog} total={BOSS_COMBINATIONS} />}

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

function SetupCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="setup-card">
      <p className="section-label">{title}</p>
      {children}
    </div>
  );
}

function Fact({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div><dt><Icon name={icon} size={14} />{label}</dt><dd>{value}</dd></div>
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
    case 'boss':
      return (
        <SetupCard title="Target system">
          <dl className="facts">
            <Fact icon="firewall" label="Firewall" value="UDP blocked" />
            <Fact icon="limiter" label="Rate limiter" value={`max. ${RATE_LIMIT} / source`} />
            <Fact icon="balancer" label="Load balancer" value={`2 × max. ${WEB_CAPACITY}`} />
            <div className="total"><dt>Total capacity</dt><dd>{WEB_CAPACITY * 2} units</dd></div>
          </dl>
          <p className="task">Find a traffic configuration that gets past every protection mechanism and brings <b>more than {WEB_CAPACITY * 2} units</b> to the servers.</p>
        </SetupCard>
      );
  }
}

function LevelControls({ id, config, onChange, sourceUnlocked }: {
  id: LevelId;
  config: Config;
  onChange: (patch: Partial<Config>) => void;
  sourceUnlocked: boolean;
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
    case 'boss':
      return (
        <>
          <OptionList<Protocol>
            label="1. Protocol"
            value={config.protocol}
            onChange={(protocol) => onChange({ protocol })}
            options={[
              { value: 'udp', title: 'UDP', description: 'Blocked by the firewall', swatch: 'udp' },
              { value: 'http', title: 'HTTP', description: 'Allowed by the firewall, reaches the rate limiter', swatch: 'http' },
            ]}
          />
          <Segmented
            label="2. Number of sources"
            value={config.sources}
            onChange={(sources) => onChange({ sources })}
            options={BOSS_SOURCES.map((count) => ({ value: count, title: `${count}`, caption: `max. ${count * RATE_LIMIT} pass` }))}
          />
          <Segmented
            label="3. Traffic per source"
            value={config.perSource}
            onChange={(perSource) => onChange({ perSource })}
            options={BOSS_INTENSITIES.map((item) => ({
              value: item.units,
              title: item.id,
              caption: item.units > RATE_LIMIT ? `${item.units} units → ${RATE_LIMIT}` : `${item.units} units`,
            }))}
          />
          <div className="formula">
            <span>Total traffic</span>
            <strong>{config.sources} × {config.perSource} = {config.sources * config.perSource} units</strong>
          </div>
        </>
      );
  }
}

function OptionList<T extends string>({ label, tag, options, value, onChange, disabled }: {
  label: string;
  tag?: string;
  options: { value: T; title: string; description: string; swatch: 'udp' | 'http' }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="control" disabled={disabled}>
      <legend className="section-label">{label}{tag && <span className="new-tag">{tag}</span>}</legend>
      <div className="option-list" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className={`option ${value === option.value ? 'selected' : ''}`}
            key={option.value}
            onClick={() => onChange(option.value)}
          >
            <span className="radio" aria-hidden="true" />
            <span className="option-text">
              <strong><i className={`swatch ${option.swatch}`} />{option.title}</strong>
              <small>{option.description}</small>
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Segmented({ label, options, value, onChange }: {
  label: string;
  options: { value: number; title: string; caption: string }[];
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <fieldset className="control">
      <legend className="section-label">{label}</legend>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            type="button"
            role="radio"
            aria-checked={value === option.value}
            key={option.value}
            className={value === option.value ? 'selected' : ''}
            onClick={() => onChange(option.value)}
          >
            <strong>{option.title}</strong>
            <small>{option.caption}</small>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Slider({ label, min, max, value, onChange, disabled, note }: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  note?: string;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className={`control slider ${disabled ? 'disabled' : ''}`}>
      <div className="slider-head">
        <label className="section-label" htmlFor={`slider-${label}`}>{label}</label>
        <output htmlFor={`slider-${label}`}>{value} <small>units</small></output>
      </div>
      <input
        id={`slider-${label}`}
        type="range"
        min={min}
        max={max}
        step={10}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ '--fill': `${fill}%` } as CSSProperties}
      />
      <div className="slider-scale"><span>{min}</span><span>Traffic units</span><span>{max}</span></div>
      {note && <p className="slider-note">{note}</p>}
    </div>
  );
}

function Objectives({ level, achieved }: { level: LevelDef; achieved: string[] }) {
  const count = level.objectives.filter((objective) => achieved.includes(objective.id)).length;
  return (
    <div className="objectives">
      <div className="objectives-head">
        <p className="section-label">{level.id === 'boss' ? 'Goal' : 'Objectives'}</p>
        <span>{count} / {level.objectives.length}</span>
      </div>
      <ul>
        {level.objectives.map((objective) => {
          const done = achieved.includes(objective.id);
          return (
            <li key={objective.id} className={done ? 'done' : ''}>
              <span className="check">{done && <Icon name="check" size={12} strokeWidth={3} />}</span>
              {objective.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AhaCard({ ref, level, onNext }: { ref: Ref<HTMLDivElement>; level: LevelDef; onNext: () => void }) {
  return (
    <div className="aha-card" ref={ref}>
      <h3>{level.id === 'boss' ? 'You found the attack vector' : 'What you just discovered'}</h3>
      <p>{level.aha}</p>
      {level.id === 'limiter' && (
        <div className="ddos-explainer">
          <p>That is what the second <b>D</b> in DDoS stands for:</p>
          <div className="acronym">
            <span><b>D</b>istributed</span>
            <span><b>D</b>enial</span>
            <span><b>o</b>f</span>
            <span><b>S</b>ervice</span>
          </div>
          <p>The traffic does not come from one source, but from many distributed sources.</p>
        </div>
      )}
      {level.id === 'boss' && (
        <p className="aha-note">
          The solution: <b>HTTP</b> gets past the firewall, and <b>30 sources</b> sending <b>8 units</b> each stay under the
          rate limit, so nothing is cut: 30 × 8 = 240 units reach the load balancer, more than the 200 units both servers can handle together.
        </p>
      )}
      <button className="primary-button" onClick={onNext}>
        {level.id === 'boss' ? 'Open debrief' : 'Next level'}
        <Icon name="arrow-right" size={14} />
      </button>
    </div>
  );
}

const LAYERS: { icon: IconName; name: string; job: string; limit: string }[] = [
  { icon: 'firewall', name: 'Firewall', job: 'Blocks certain types of traffic', limit: 'Only helps if a matching rule exists.' },
  { icon: 'limiter', name: 'Rate limiter', job: 'Limits traffic per source', limit: 'Many small sources stay under the limit.' },
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
        </div>
      </div>

      <div className="debrief-side">
        <div className="panel insight">
          <h2>There is no single protection against DDoS attacks.</h2>
          <p>A firewall, a rate limiter and a load balancer each solve a different problem.</p>
          <p className="insight-strong">Only several layers of protection together make a system more resilient.</p>
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
