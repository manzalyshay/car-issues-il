'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useLocale } from '@/lib/localeContext';

export default function ContactPage() {
  const { t } = useLocale();
  const cp = t.contactPage;
  const subjectKeys = Object.keys(cp.subjects) as string[];

  const [form, setForm] = useState({ name: '', email: '', subject: subjectKeys[0] ?? 'general', message: '' });
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
    <div className="page-section">
      <div className="container" style={{ maxWidth: 620 }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{cp.home}</Link>
          <span>›</span>
          <span>{cp.breadcrumb}</span>
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 8 }}>{cp.title}</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 40 }}>{cp.subtitle}</p>

        {status === 'sent' ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontWeight: 800, marginBottom: 8 }}>{cp.sentTitle}</h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>{cp.sentBody}</p>
            <button
              onClick={() => { setForm({ name: '', email: '', subject: subjectKeys[0] ?? 'general', message: '' }); setStatus('idle'); }}
              className="btn btn-outline"
              style={{ marginTop: 24 }}
            >
              {cp.sendAnother}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: 6 }}>
                    {cp.labelName} <span style={{ color: 'var(--bad)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={set('name')}
                    placeholder={cp.placeholderName}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: 6 }}>
                    {cp.labelEmail} <span style={{ color: 'var(--bad)' }}>*</span>
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
                  {cp.labelSubject}
                </label>
                <select value={form.subject} onChange={set('subject')} style={inputStyle}>
                  {subjectKeys.map((k) => (
                    <option key={k} value={k}>{cp.subjects[k]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: 6 }}>
                  {cp.labelMessage} <span style={{ color: 'var(--bad)' }}>*</span>
                </label>
                <textarea
                  required
                  value={form.message}
                  onChange={set('message')}
                  rows={6}
                  placeholder={cp.placeholderMessage}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                />
              </div>

              {status === 'error' && (
                <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(200,71,47,.08)', border: '1px solid rgba(200,71,47,.25)', color: 'var(--bad)', fontSize: '0.875rem' }}>
                  {cp.errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="btn btn-primary"
                style={{ height: 48, fontSize: '1rem', fontWeight: 700 }}
              >
                {status === 'sending' ? cp.submitting : cp.submit}
              </button>
            </div>
          </form>
        )}

        {/* Info cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginTop: 24 }}>
          {cp.infoItems.map((item) => (
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
          <Link href="/terms" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none' }}>{cp.terms}</Link>
          <Link href="/" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none' }}>{cp.backHome}</Link>
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
  background: 'var(--bg)',
  color: 'var(--text)',
  fontSize: '0.9375rem',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};
