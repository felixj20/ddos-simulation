import { Icon, type IconName } from './Icons';
import type { Resource, ServerView, Tone } from '../lib/simulation';

const RESOURCE_ICON: Record<Resource['id'], IconName> = { cpu: 'cpu', memory: 'memory', network: 'network' };
const STATUS_ICON: Record<Tone, IconName> = { good: 'check', warn: 'alert', bad: 'zap', neutral: 'server' };
const PACKETS = 8;

function resourceTone(percent: number): Tone {
  if (percent > 100) return 'bad';
  if (percent >= 80) return 'warn';
  return 'good';
}

export function ServerDashboard({ server, live }: { server: ServerView; live: boolean }) {
  const status = live ? server.status : { tone: 'neutral' as const, text: 'Waiting for requests' };
  return (
    <div className={`server-frame ${live ? 'running' : ''}`}>
      <div className="request-lane">
        <span className="request-lane-label"><Icon name="attacker" size={15} />{server.requests}</span>
        <span className="request-lane-track" aria-hidden="true">
          {live && Array.from({ length: PACKETS }, (_, i) => (
            <i key={i} style={{ animationDelay: `${(-i * 1.6) / PACKETS}s` }} />
          ))}
        </span>
      </div>

      <div className={`server-card state-${status.tone}`}>
        <div className="server-card-head">
          <span className="server-card-icon"><Icon name="server" size={22} /></span>
          <div>
            <strong>{server.title}</strong>
            <small>{server.detail}</small>
          </div>
        </div>

        <dl className="resource-list">
          {server.resources.map((resource) => {
            const tone = live ? resourceTone(resource.percent) : 'neutral';
            return (
              <div key={resource.id} className={`resource state-${tone}`}>
                <dt><Icon name={RESOURCE_ICON[resource.id]} size={16} />{resource.label}</dt>
                <dd>
                  <span className={`resource-bar ${live && resource.percent > 100 ? 'over' : ''}`}>
                    <i style={{ width: `${live ? Math.min(100, resource.percent) : 0}%` }} />
                  </span>
                  <strong>{live ? `${Math.round(resource.percent)} %` : '–'}</strong>
                  <small>{live ? resource.detail : 'idle'}</small>
                </dd>
              </div>
            );
          })}
        </dl>

        <p className="server-status" role="status">
          <Icon name={STATUS_ICON[status.tone]} size={16} strokeWidth={2} />
          {status.text}
        </p>
      </div>
    </div>
  );
}
