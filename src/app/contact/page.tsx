'use client';

import Link from 'next/link';
import { useState } from 'react';

const SUBJECT_OPTIONS = [
  { value: 'general', label: 'שאלה כללית' },
  { value: 'content_removal', label: 'בקשת הסרת תוכן' },
  { value: 'bug', label: 'דיווח על תקלה טכנית' },
  { value: 'review_issue', label: 'בעיה בביקורת' },
  { value: 'other', label: 'אחר' },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: 'general', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div style={{ padding: '48px 0 80px' }}>
      <div className="container" style={{ maxWidth: 620 }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>בית</Link>
          <span>›</span>
          <span>צור קשר</span>
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 8 }}>צור קשר</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 40 }}>
          יש לך שאלה, דיווח על בעיה, או בקשה להסיר תוכן? נשמח לשמוע ממך.
        </p>

        {status === 'sent' ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontWeight: 800, marginBottom: 8 }}>הפנייה נשלחה!</h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
              תודה על פנייתך. נחזור אליך בתוך 5 ימי עסקים.
            </p>
            <button
              onClick={() => { setForm({ name: '', email: '', subject: 'general', message: '' }); setStatus('idle'); }}
              className="btn btn-outline"
              style={{ marginTop: 24 }}
            >
              שלח פנייה נוספת
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: 6 }}>
                    שם מלא <span style={{ color: 'var(--brand-red)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={set('name')}
                    placeholder="ישראל ישראלי"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: 6 }}>
                    כתובת אימייל <span style={{ color: 'var(--brand-red)' }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={set('email')}
                    placeholder="you@example.com"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: 6 }}>
                  נושא הפנייה
                </label>
                <select value={form.subject} onChange={set('subject')} style={inputStyle}>
                  {SUBJECT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: 6 }}>
                  תוכן הפנייה <span style={{ color: 'var(--brand-red)' }}>*</span>
                </label>
                <textarea
                  required
                  value={form.message}
                  onChange={set('message')}
                  rows={6}
                  placeholder="תאר את בעייתך בפירוט..."
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                />
              </div>

              {status === 'error' && (
                <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(230,57,70,.08)', border: '1px solid rgba(230,57,70,.25)', color: 'var(--brand-red)', fontSize: '0.875rem' }}>
                  שגיאה בשליחה — נסה שוב מאוחר יותר.
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="btn btn-primary"
                style={{ height: 48, fontSize: '1rem', fontWeight: 700 }}
              >
                {status === 'sending' ? '⏳ שולח...' : '📨 שלח פנייה'}
              </button>
            </div>
          </form>
        )}

        {/* Info cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginTop: 24 }}>
          {INFO_ITEMS.map((item) => (
            <div key={item.title} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: 2 }}>{item.title}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Link href="/terms" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none' }}>תנאי שימוש</Link>
          <Link href="/" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none' }}>חזרה לדף הבית</Link>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 42,
  padding: '0 12px',
  border: '1.5px solid var(--border)',
  borderRadius: 8,
  background: 'var(--bg-base)',
  color: 'var(--text-primary)',
  fontSize: '0.9375rem',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

const INFO_ITEMS = [
  { icon: '⏱️', title: 'זמן תגובה', desc: 'עד 5 ימי עסקים לכל פנייה' },
  { icon: '🗑️', title: 'הסרת תוכן', desc: '3 ימי עסקים לבקשות הסרה' },
  { icon: '🔒', title: 'פרטיות', desc: 'הפנייה שלך נשמרת בסודיות מלאה' },
];
