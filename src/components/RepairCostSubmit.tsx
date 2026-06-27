'use client';

import { useState, useEffect } from 'react';
import { useLocale } from '@/lib/localeContext';

interface UserAgg {
  count: number;
  avg: number;
  min: number;
  max: number;
}

interface RepairOption {
  repair_key: string;
  repair_name_he: string;
}

interface Props {
  makeSlug: string;
  modelSlug: string;
  makeNameHe: string;
  modelNameHe: string;
  makeNameEn?: string;
  modelNameEn?: string;
  repairOptions: RepairOption[];
}

export default function RepairCostSubmit({ makeSlug, modelSlug, makeNameHe, modelNameHe, makeNameEn, modelNameEn, repairOptions }: Props) {
  const { t, locale } = useLocale();
  const rc = t.repairCostSubmit;
  const isEn = locale === 'en';
  const carName = isEn ? `${makeNameEn ?? makeNameHe} ${modelNameEn ?? modelNameHe}` : `${makeNameHe} ${modelNameHe}`;

  const [userAgg, setUserAgg] = useState<Record<string, UserAgg>>({});
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    repair_key: '', repair_name_he: '', cost_ils: '', year: '', mileage: '', workshop_type: '', notes: '',
  });

  useEffect(() => {
    fetch(`/api/repair-costs?make=${makeSlug}&model=${modelSlug}`)
      .then(r => r.json())
      .then(data => setUserAgg(data.userAgg ?? {}))
      .catch(() => {});
  }, [makeSlug, modelSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.repair_key || !form.cost_ils) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/repair-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          make_slug: makeSlug, model_slug: modelSlug,
          repair_key: form.repair_key,
          repair_name_he: form.repair_name_he || form.repair_key,
          cost_ils: parseFloat(form.cost_ils),
          year: form.year || null, mileage: form.mileage || null,
          workshop_type: form.workshop_type || null, notes: form.notes || null,
        }),
      });
      if (res.ok) { setSubmitted(true); setShowForm(false); }
    } finally { setSubmitting(false); }
  };

  return (
    <div>
      {/* Overlay user community data on top of reference ranges */}
      {Object.keys(userAgg).length > 0 && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(22,163,74,0.07)', borderRadius: 8, border: '1px solid rgba(22,163,74,0.2)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#16a34a', marginBottom: 8 }}>
            🇮🇱 {rc.ownersOf} {carName}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(userAgg).map(([key, agg]) => {
              if (agg.count < 1) return null;
              const opt = repairOptions.find(r => r.repair_key === key);
              if (!opt) return null;
              return (
                <div key={key} style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <strong>{opt.repair_name_he}:</strong> ₪{Math.round(agg.min).toLocaleString()}–₪{Math.round(agg.max).toLocaleString()}
                  {agg.count >= 2 && <span style={{ color: 'var(--text-muted)' }}> ({agg.count})</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submission CTA */}
      <div style={{ padding: '14px 18px', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)' }}>
        {submitted ? (
          <div style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.875rem' }}>{rc.submitted}</div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{rc.question} {carName}{rc.questionSuffix}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{rc.helpOthers}</div>
              </div>
              <button onClick={() => setShowForm(!showForm)}
                style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                {showForm ? rc.cancel : rc.addReport}
              </button>
            </div>
            {showForm && (
              <form onSubmit={handleSubmit} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <select required value={form.repair_key}
                  onChange={e => {
                    const sel = repairOptions.find(r => r.repair_key === e.target.value);
                    setForm(f => ({ ...f, repair_key: e.target.value, repair_name_he: sel?.repair_name_he ?? '' }));
                  }}
                  style={{ width: '100%', height: 40, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: '0.875rem' }}>
                  <option value="">{rc.selectRepair}</option>
                  {[...new Map(repairOptions.map(r => [r.repair_key, r])).values()].map(r => (
                    <option key={r.repair_key} value={r.repair_key}>{r.repair_name_he}</option>
                  ))}
                  <option value="other">{rc.other}</option>
                </select>
                {form.repair_key === 'other' && (
                  <input required placeholder={rc.repairName} value={form.repair_name_he}
                    onChange={e => setForm(f => ({ ...f, repair_name_he: e.target.value }))}
                    style={{ width: '100%', height: 40, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <input required type="number" placeholder={rc.cost} min={10} max={200000} value={form.cost_ils}
                    onChange={e => setForm(f => ({ ...f, cost_ils: e.target.value }))}
                    style={{ height: 40, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: '0.875rem' }} />
                  <input type="number" placeholder={rc.carYear} value={form.year}
                    onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                    style={{ height: 40, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: '0.875rem' }} />
                  <select value={form.workshop_type} onChange={e => setForm(f => ({ ...f, workshop_type: e.target.value }))}
                    style={{ height: 40, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: '0.875rem' }}>
                    <option value="">{rc.garagePlaceholder}</option>
                    <option value="dealer">{rc.dealer}</option>
                    <option value="chain">{rc.chain}</option>
                    <option value="independent">{rc.independent}</option>
                  </select>
                </div>
                <input placeholder={rc.notes} value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ width: '100%', height: 40, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                <button type="submit" disabled={submitting}
                  style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? rc.submitting : rc.submit}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
