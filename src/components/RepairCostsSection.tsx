'use client';

import { useState, useEffect } from 'react';

interface RepairCost {
  id: string;
  repair_key: string;
  repair_name_he: string;
  repair_name_en: string;
  category: string;
  min_ils: number;
  max_ils: number;
  avg_ils?: number;
  applies_to: string;
  notes_he?: string;
  source_url?: string;
}

interface UserAgg {
  count: number;
  avg: number;
  min: number;
  max: number;
}

interface Props {
  makeSlug: string;
  modelSlug: string;
  makeNameHe: string;
  modelNameHe: string;
  category: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  service: '🔧 שירות תקופתי',
  engine: '⚙️ מנוע',
  brakes: '🛑 בלמים',
  suspension: '🔩 הגה ומתלה',
  electrical: '⚡ חשמל',
};

const WORKSHOP_LABELS: Record<string, string> = {
  dealer: 'יבואן מורשה',
  chain: 'רשת מוסכים',
  independent: 'מוסך עצמאי',
};

export default function RepairCostsSection({ makeSlug, modelSlug, makeNameHe, modelNameHe, category }: Props) {
  const [costs, setCosts] = useState<RepairCost[]>([]);
  const [userAgg, setUserAgg] = useState<Record<string, UserAgg>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    repair_key: '', repair_name_he: '', cost_ils: '', year: '', mileage: '', workshop_type: '', notes: '',
  });

  useEffect(() => {
    fetch(`/api/repair-costs?make=${makeSlug}&model=${modelSlug}&category=${category}`)
      .then(r => r.json())
      .then(data => { setCosts(data.costs ?? []); setUserAgg(data.userAgg ?? {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, [makeSlug, modelSlug, category]);

  const grouped = costs.reduce<Record<string, RepairCost[]>>((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {});

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
          year: form.year || null,
          mileage: form.mileage || null,
          workshop_type: form.workshop_type || null,
          notes: form.notes || null,
        }),
      });
      if (res.ok) { setSubmitted(true); setShowForm(false); }
    } finally { setSubmitting(false); }
  };

  if (loading) return null;
  if (costs.length === 0) return null;

  return (
    <section style={{ marginTop: 40, paddingTop: 28, borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
          🔧 עלויות תחזוקה ותיקונים
        </h2>
        <a href="https://www.midrag.co.il" target="_blank" rel="noopener noreferrer"
          style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
          מקור: midrag.co.il
        </a>
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>
        טווחי מחירים מייצגים לישראל — תלוי ביבואן, גיל הרכב וסוג המוסך.
        {category === 'suv' ? ' עלויות SUV גבוהות יותר מרכב משפחתי.' : ''}
      </p>

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {CATEGORY_LABELS[cat] ?? cat}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
            {items.map(item => {
              const ua = userAgg[item.repair_key];
              return (
                <div key={item.id} style={{
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '12px 14px',
                }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 4 }}>{item.repair_name_he}</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--brand-red)', marginBottom: 2 }}>
                    ₪{item.min_ils.toLocaleString('he-IL')}–₪{item.max_ils.toLocaleString('he-IL')}
                  </div>
                  {ua && ua.count >= 2 && (
                    <div style={{ fontSize: '0.75rem', color: '#16a34a', marginBottom: 4, fontWeight: 600 }}>
                      🇮🇱 דיווח {makeNameHe} {modelNameHe}: ₪{Math.round(ua.min).toLocaleString('he-IL')}–₪{Math.round(ua.max).toLocaleString('he-IL')} ({ua.count} דיווחים)
                    </div>
                  )}
                  {item.notes_he && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{item.notes_he}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* User submission */}
      <div style={{ marginTop: 20, padding: '14px 18px', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)' }}>
        {submitted ? (
          <div style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.875rem' }}>
            ✓ תודה! הדיווח שלך נשמר ויעזור לאחרים.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>שילמת על תיקון ל{makeNameHe} {modelNameHe}?</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>דווח לקהילה — עזור לאחרים לדעת מה לצפות</div>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid var(--accent)', background: 'transparent', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
              >
                {showForm ? 'ביטול' : '+ הוסף דיווח'}
              </button>
            </div>

            {showForm && (
              <form onSubmit={handleSubmit} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <select
                  required
                  value={form.repair_key}
                  onChange={e => {
                    const selected = costs.find(c => c.repair_key === e.target.value);
                    setForm(f => ({ ...f, repair_key: e.target.value, repair_name_he: selected?.repair_name_he ?? '' }));
                  }}
                  style={{ width: '100%', height: 40, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
                >
                  <option value="">— בחר סוג תיקון —</option>
                  {[...new Map(costs.map(c => [c.repair_key, c])).values()].map(c => (
                    <option key={c.repair_key} value={c.repair_key}>{c.repair_name_he}</option>
                  ))}
                  <option value="other">אחר</option>
                </select>
                {form.repair_key === 'other' && (
                  <input
                    required placeholder="שם התיקון"
                    value={form.repair_name_he}
                    onChange={e => setForm(f => ({ ...f, repair_name_he: e.target.value }))}
                    style={{ width: '100%', height: 40, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <input
                    required type="number" placeholder="עלות ב-₪" min={10} max={200000}
                    value={form.cost_ils}
                    onChange={e => setForm(f => ({ ...f, cost_ils: e.target.value }))}
                    style={{ height: 40, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
                  />
                  <input
                    type="number" placeholder="שנת הרכב"
                    value={form.year}
                    onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                    style={{ height: 40, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
                  />
                  <select
                    value={form.workshop_type}
                    onChange={e => setForm(f => ({ ...f, workshop_type: e.target.value }))}
                    style={{ height: 40, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
                  >
                    <option value="">סוג מוסך</option>
                    <option value="dealer">יבואן מורשה</option>
                    <option value="chain">רשת מוסכים</option>
                    <option value="independent">מוסך עצמאי</option>
                  </select>
                </div>
                <input
                  placeholder="הערות (אופציונלי) — מה כלל? מה לא?"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ width: '100%', height: 40, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
                <button
                  type="submit" disabled={submitting}
                  style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--brand-red)', color: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? 'שולח...' : 'שלח דיווח'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </section>
  );
}
