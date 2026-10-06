import type { CSSProperties } from 'react';
import { Icon, type IconName } from './Icons';
import { REQUESTS, fmt, type Flow, type RequestId } from '../lib/simulation';

export function OptionList<T extends string>({ label, tag, options, value, onChange, disabled }: {
  label: string;
  tag?: string;
  options: { value: T; title: string; description: string; swatch: Flow }[];
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
              <strong><i className={`swatch flow-${option.swatch}`} />{option.title}</strong>
              <small>{option.description}</small>
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function Segmented({ label, options, value, onChange }: {
  label: string;
  options: { value: number; title: string; caption?: string }[];
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
            {option.caption && <small>{option.caption}</small>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function Slider({ label, min, max, value, onChange, disabled, note }: {
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

export const REQUEST_ICON: Record<RequestId, IconName> = { home: 'home', search: 'search', login: 'lock', report: 'report' };

export function RequestPicker({ value, onChange, revealed }: {
  value: RequestId;
  onChange: (value: RequestId) => void;
  revealed: RequestId[];
}) {
  return (
    <fieldset className="control">
      <legend className="section-label">Request type</legend>
      <div className="request-list" role="radiogroup" aria-label="Request type">
        {REQUESTS.map((request) => {
          const known = revealed.includes(request.id);
          const selected = value === request.id;
          return (
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              key={request.id}
              className={`request-card ${selected ? 'selected' : ''}`}
              onClick={() => onChange(request.id)}
            >
              <span className="request-icon"><Icon name={REQUEST_ICON[request.id]} size={20} /></span>
              <span className="request-text">
                <strong>{request.name}</strong>
                <small>{request.description}</small>
              </span>
              {known && (
                <span className="request-tag">{request.adminOnly ? 'rejected' : `${fmt(request.cost)} WU`}</span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
