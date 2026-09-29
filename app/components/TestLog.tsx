import { Icon, type IconName } from './Icons';
import type { LogEntry, Verdict } from '../lib/simulation';

const DECIDER: Record<Verdict, { label: string; icon: IconName }> = {
  firewall: { label: 'Firewall', icon: 'firewall' },
  limiter: { label: 'Rate limiter', icon: 'limiter' },
  capacity: { label: 'Capacity exceeded', icon: 'zap' },
  holds: { label: 'No layer, system holds', icon: 'server' },
};

const TONE_ICON: Record<LogEntry['tone'], IconName> = {
  good: 'check',
  stopped: 'x',
  warn: 'alert',
  overload: 'zap',
};

const SEEN_LAYERS: { verdict: Verdict; label: string }[] = [
  { verdict: 'firewall', label: 'Firewall' },
  { verdict: 'limiter', label: 'Rate limiter' },
  { verdict: 'capacity', label: 'Capacity limit' },
];

export function TestLog({ entries, total }: { entries: LogEntry[]; total: number }) {
  const seen = new Set(entries.map((e) => e.verdict));

  return (
    <section className="test-log" aria-labelledby="test-log-title">
      <div className="test-log-head">
        <h3 id="test-log-title" className="test-log-title">Test log</h3>
        <p className="test-log-count">
          <span className="test-log-num">{entries.length}</span> of{' '}
          <span className="test-log-num">{total}</span> configurations tested
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="test-log-empty">Each attack you run is recorded here, so you can compare configurations.</p>
      ) : (
        <div className="test-log-scroll">
          <table className="test-log-table">
            <thead>
              <tr>
                <th scope="col">Protocol</th>
                <th scope="col" className="test-log-r">Sources × units</th>
                <th scope="col" className="test-log-r">Total</th>
                <th scope="col" className="test-log-r">At servers</th>
                <th scope="col" className="test-log-r">Server load</th>
                <th scope="col">Decided by</th>
                <th scope="col">Result</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const d = DECIDER[e.verdict];
                return (
                  <tr key={e.key}>
                    <td>
                      <span className={`test-log-proto test-log-proto-${e.protocol}`}>{e.protocol.toUpperCase()}</span>
                    </td>
                    <td className="test-log-r test-log-mono">{e.sources} × {e.perSource}</td>
                    <td className="test-log-r test-log-mono">{e.total}</td>
                    <td className="test-log-r test-log-mono">{e.atServers}</td>
                    <td className="test-log-r test-log-mono">{Math.round(e.loadPercent)}%</td>
                    <td>
                      <span className={`test-log-by${e.verdict === 'capacity' ? ' test-log-by-bad' : ''}`}>
                        <Icon name={d.icon} size={14} />
                        {d.label}
                      </span>
                    </td>
                    <td>
                      <span className={`test-log-result test-log-tone-${e.tone}`}>
                        <Icon name={TONE_ICON[e.tone]} size={14} />
                        {e.title}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ul className="test-log-seen" aria-label="Layers seen deciding an attack">
        {SEEN_LAYERS.map((l) => {
          const on = seen.has(l.verdict);
          return (
            <li key={l.verdict} className={`test-log-seen-item${on ? ' is-seen' : ''}`}>
              {on ? <Icon name="check" size={14} /> : <span className="test-log-seen-blank" aria-hidden="true" />}
              {l.label}
              <span className="test-log-sr">{on ? ' (seen)' : ' (not yet seen)'}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
