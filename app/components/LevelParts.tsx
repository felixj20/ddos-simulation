import type { ReactNode, Ref } from 'react';
import { Icon, type IconName } from './Icons';
import { LEVELS, type LevelDef, type LevelId } from '../lib/simulation';

export function isComplete(level: LevelDef, achieved: string[]) {
  return level.objectives.every((objective) => achieved.includes(objective.id));
}

export function SetupCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="setup-card">
      <p className="section-label">{title}</p>
      {children}
    </div>
  );
}

export function Fact({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div><dt><Icon name={icon} size={14} />{label}</dt><dd>{value}</dd></div>
  );
}

export function Objectives({ level, achieved }: { level: LevelDef; achieved: string[] }) {
  const count = level.objectives.filter((objective) => achieved.includes(objective.id)).length;
  return (
    <div className="objectives">
      <div className="objectives-head">
        <p className="section-label">{level.id === 'vector' ? 'Goal' : 'Objectives'}</p>
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

const AHA_TITLE: Partial<Record<LevelId, string>> = {
  vector: 'You stayed under the radar',
  cache: 'You slipped past the CDN',
  compute: 'You found the weak spot',
  defense: 'You held the line',
};

export function AhaCard({ ref, level, onNext }: { ref: Ref<HTMLDivElement>; level: LevelDef; onNext: () => void }) {
  const last = level.id === LEVELS[LEVELS.length - 1].id;
  return (
    <div className="aha-card" ref={ref}>
      <h3>{AHA_TITLE[level.id] ?? 'What you just discovered'}</h3>
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
      {level.id === 'vector' && (
        <p className="aha-note">
          <b>30 sources × 8 units = 240.</b> Not one of them goes over 10, so nobody gets banned, and 240 is more than the two servers can take.
        </p>
      )}
      {level.id === 'cache' && (
        <p className="aha-note">
          <b>Dynamic pages</b> skip the cache. <b>40 × 8 = 320</b> or <b>70 × 5 = 350</b> beats the servers&apos; 300 and stays under the alarm at 400.
        </p>
      )}
      {level.id === 'compute' && (
        <p className="aha-note">
          The same 100 requests cost <b>50 work units</b> on the homepage and <b>300</b> on the login. The report would cost even more,
          but without an admin login it never gets that far.
        </p>
      )}
      {level.id === 'defense' && (
        <p className="aha-note">
          Waves 1 to 3 need <b>Block UDP</b>, the <b>rate limit</b> and the <b>bot challenge</b> together. For the TV crowd you swap
          filters for an <b>extra server</b>.
        </p>
      )}
      <button className="primary-button" onClick={onNext}>
        {last ? 'Open debrief' : 'Next level'}
        <Icon name="arrow-right" size={14} />
      </button>
    </div>
  );
}
