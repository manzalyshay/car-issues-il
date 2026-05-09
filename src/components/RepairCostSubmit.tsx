'use client';

import { useState, useEffect } from 'react';

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
  repairOptions: RepairOption[];
}

export default function RepairCostSubmit({ makeSlug, modelSlug, makeNameHe, modelNameHe, repairOptions }: Props) {
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
            🇮🇱 דיווחי בעלי {makeNameHe} {modelNameHe}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(userAgg).map(([key, agg]) => {
              if (agg.count < 1) return null;
              const opt = repairOptions.find(r => r.repair_key === key);
              if (!opt) return null;
              return (
                <div key={key} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <strong>{opt.repair_name_he}:</strong> ₪{Math.round(agg.min).toLocaleString()}–₪{Math.round(agg.max).toLocaleString()}
                  {agg.count >= 2 && <span style={{ color: 'var(--text-muted)' }}> ({agg.count})</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submission CTA */}
      <div style={{ padding: '14px 18px', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)' }}>
        {submitted ? (
          <div style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.875rem' }}>✓ תודה! הדיווח שלך נשמר.</div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>שילמת על תיקון ל{makeNameHe} {modelNameHe}?</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>עזור לאחרים לדעת מה לצפות — דווח על העלות שלך</div>
              </div>
              <button onClick={() => setShowForm(!showForm)}
                style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                {showForm ? 'ביטול' : '+ הוסף דיווח'}
              </button>
            </div>
            {showForm && (
              <form onSubmit={handleSubmit} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <select required value={form.repair_key}
                  onChange={e => {
                    const sel = repairOptions.find(r => r.repair_key === e.target.value);
                    setForm(f => ({ ...f, repair_key: e.target.value, repair_name_he: sel?.repair_name_he ?? '' }));
                  }}
                  style={{ width: '100%', height: 40, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                  <option value="">— בחר סוג תיקון —</option>
                  {[...new Map(repairOptions.map(r => [r.repair_key, r])).values()].map(r => (
                    <option key={r.repair_key} value={r.repair_key}>{r.repair_name_he}</option>
                  ))}
                  <option value="other">אחר</option>
                </select>
                {form.repair_key === 'other' && (
                  <input required placeholder="שם התיקון" value={form.repair_name_he}
                    onChange={e => setForm(f => ({ ...f, repair_name_he: e.target.value }))}
                    style={{ width: '100%', height: 40, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <input required type="number" placeholder="עלות ב-₪" min={10} max={200000} value={form.cost_ils}
                    onChange={e => setForm(f => ({ ...f, cost_ils: e.target.value }))}
                    style={{ height: 40, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '0.875rem' }} />
                  <input type="number" placeholder="שנת הרכב" value={form.year}
                    onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                    style={{ height: 40, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '0.875rem' }} />
                  <select value={form.workshop_type} onChange={e => setForm(f => ({ ...f, workshop_type: e.target.value }))}
                    style={{ height: 40, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                    <option value="">סוג מוסך</option>
                    <option value="dealer">יבואן מורשה</option>
                    <option value="chain">רשת מוסכים</option>
                    <option value="independent">מוסך עצמאי</option>
                  </select>
                </div>
                <input placeholder="הערות (אופציונלי)" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ width: '100%', height: 40, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                <button type="submit" disabled={submitting}
                  style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--brand-red)', color: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'שולח...' : 'שלח דיווח'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
