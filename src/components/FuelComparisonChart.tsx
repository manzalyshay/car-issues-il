'use client';
import { useState, useEffect } from 'react';

interface FuelEntry {
  makeSlug: string;
  modelSlug: string;
  nameHe: string;
  nameEn: string;
  fuel: number;
}

interface Props {
  makeSlug: string;
  modelSlug: string;
  isEn: boolean;
}

const PAGE_SIZE = 5; // cars on each side of current

export default function FuelComparisonChart({ makeSlug, modelSlug, isEn }: Props) {
  const [data, setData] = useState<FuelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0); // how many to shift the window

  useEffect(() => {
    fetch(`/api/fuel-comparison?make=${makeSlug}&model=${modelSlug}`)
      .then(r => r.json())
      .then(d => { setData(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [makeSlug, modelSlug]);

  if (loading) return (
    <div style={{ background: '#fff', border: '1px solid #e3e8ee', borderRadius: 14, padding: '20px', minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#aaa', fontSize: 13 }}>{isEn ? 'Loading…' : 'טוען…'}</span>
    </div>
  );
  if (!data.length) return null;

  const currentIdx = data.findIndex(d => d.makeSlug === makeSlug && d.modelSlug === modelSlug);
  if (currentIdx === -1) return null;

  const total = data.length;
  const rank = currentIdx + 1;

  // Window centered on current car + offset
  const center = currentIdx + offset;
  const start = Math.max(0, Math.min(center - PAGE_SIZE, total - PAGE_SIZE * 2 - 1));
  const end = Math.min(total, start + PAGE_SIZE * 2 + 1);
  const visible = data.slice(start, end);
  const maxFuel = Math.max(...data.map(d => d.fuel));

  const canUp = start > 0;
  const canDown = end < total;

  const btn = (onClick: () => void, disabled: boolean, label: string) => (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        background: 'none', border: '1px solid #d0d8e8', borderRadius: 8,
        padding: '4px 10px', cursor: disabled ? 'default' : 'pointer',
        color: disabled ? '#c0cad8' : '#2f6fb0', fontSize: 16, lineHeight: 1,
        opacity: disabled ? 0.4 : 1,
      }}
    >{label}</button>
  );

  return (
    <div style={{ background: '#fff', border: '1px solid #e3e8ee', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px 10px', background: '#f8fafc', borderBottom: '1px solid #e3e8ee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1c2733' }}>
          {isEn ? 'Fuel vs. Category' : 'צריכת דלק לעומת קטגוריה'}
        </span>
        <span style={{ fontSize: 11, color: '#8595a6' }}>
          {isEn ? `#${rank} of ${total} · L/100km` : `דירוג ${rank} מתוך ${total} · ל/100ק"מ`}
        </span>
      </div>

      {/* Bars */}
      <div style={{ padding: '10px 16px 6px' }}>
        {visible.map(entry => {
          const isCurrent = entry.makeSlug === makeSlug && entry.modelSlug === modelSlug;
          const barPct = (entry.fuel / maxFuel) * 100;
          const name = isEn ? entry.nameEn : entry.nameHe;
          return (
            <div key={`${entry.makeSlug}/${entry.modelSlug}`} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: isCurrent ? '5px 8px' : '3px 8px',
              margin: '1px -8px', borderRadius: 8,
              background: isCurrent ? '#eef4fc' : 'transparent',
              outline: isCurrent ? '2px solid #2f6fb0' : 'none',
              fontWeight: isCurrent ? 700 : 400,
            }}>
              <span style={{ fontSize: 12, color: isCurrent ? '#1c2733' : '#66788c', minWidth: 118, maxWidth: 118, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </span>
              <div style={{ flex: 1, height: isCurrent ? 16 : 11, background: '#f0f2f5', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${barPct}%`, height: '100%', background: isCurrent ? '#2f6fb0' : '#c8d4e8', borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: isCurrent ? '#2f6fb0' : '#8595a6', minWidth: 30, textAlign: 'end' }}>
                {entry.fuel.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Navigation arrows */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '6px 16px 12px' }}>
        {btn(() => setOffset(o => o - PAGE_SIZE), !canUp, isEn ? '↑ Better' : '↑ חסכוניים יותר')}
        <span style={{ fontSize: 11, color: '#8595a6' }}>
          {start + 1}–{end} / {total}
        </span>
        {btn(() => setOffset(o => o + PAGE_SIZE), !canDown, isEn ? '↓ Worse' : '↓ פחות חסכוניים')}
      </div>
    </div>
  );
}
