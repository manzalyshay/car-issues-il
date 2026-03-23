'use client';

import { useState, useRef } from 'react';
import StarRating from './StarRating';
import type { Review } from '@/data/reviews';
import { useAuth, displayName } from '@/lib/authContext';

interface Props {
  makeSlug: string;
  modelSlug: string;
  year: number;
  onSuccess: (review: Review) => void;
}

const CATEGORY_OPTIONS: { value: Review['category']; label: string }[] = [
  { value: 'mechanical', label: 'מכאני' },
  { value: 'electrical', label: 'חשמל ואלקטרוניקה' },
  { value: 'comfort',    label: 'נוחות וגמר' },
  { value: 'safety',     label: 'בטיחות' },
  { value: 'general',    label: 'כללי' },
];

const CLOUDINARY_CLOUD  = 'leash';
const CLOUDINARY_PRESET = 'leash_upload';
const CLOUDINARY_URL    = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`;

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_PRESET);
  const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('שגיאה בהעלאת תמונה');
  const data = await res.json();
  return data.secure_url as string;
}

export default function ReviewForm({ makeSlug, modelSlug, year, onSuccess }: Props) {
  const { user } = useAuth();

  const [authorName, setAuthorName] = useState('');
  const [rating, setRating]         = useState(5);
  const [title, setTitle]           = useState('');
  const [body, setBody]             = useState('');
  const [category, setCategory]     = useState<Review['category']>('general');
  const [mileage, setMileage]       = useState('');
  const [images, setImages]         = useState<string[]>([]);
  const [uploading, setUploading]   = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState(false);
  const fileInputRef                = useRef<HTMLInputElement>(null);

  const effectiveName = user ? displayName(user) : authorName;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (images.length + files.length > 4) {
      setError('ניתן להעלות עד 4 תמונות');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const urls = await Promise.all(files.map(uploadToCloudinary));
      setImages((prev) => [...prev, ...urls]);
    } catch {
      setError('שגיאה בהעלאת תמונה — נסה שוב');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveName.trim()) { setError('אנא הזן שם.'); return; }
    if (!title.trim() || !body.trim()) { setError('אנא מלא את כל השדות החובה.'); return; }

    setLoading(true);
    setError('');

    try {
      const resp = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          makeSlug, modelSlug, year,
          authorName: effectiveName.trim(),
          userId: user?.id,
          rating,
          title: title.trim(),
          body: body.trim(),
          category,
          mileage: mileage ? parseInt(mileage) : undefined,
          images,
        }),
      });

      if (!resp.ok) throw new Error('שגיאה בשמירת הביקורת');
      const data = await resp.json();
      setSuccess(true);
      onSuccess(data.review);
      setAuthorName(''); setTitle(''); setBody(''); setMileage('');
      setRating(5); setCategory('general'); setImages([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה לא ידועה');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="card" style={{ padding: 24, textAlign: 'center', background: 'rgba(34,197,94,.05)', borderColor: 'rgba(34,197,94,.2)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <h3 style={{ fontWeight: 700, marginBottom: 8, color: '#16a34a' }}>תודה על הביקורת!</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>הביקורת שלך עזרה למשתמשים אחרים לדעת על הרכב.</p>
        <button onClick={() => setSuccess(false)} className="btn btn-outline" style={{ marginTop: 16 }}>הוסף ביקורת נוספת</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: 28 }}>
      <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>✏️ כתוב ביקורת</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* Author — shown only for guests */}
        {!user && (
          <div>
            <label style={labelStyle}>שם <span style={{ color: 'var(--brand-red)' }}>*</span></label>
            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="שמך"
              maxLength={50}
              style={inputStyle}
              required
            />
          </div>
        )}

        {/* Category */}
        <div>
          <label style={labelStyle}>קטגוריה</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as Review['category'])} style={{ ...inputStyle, cursor: 'pointer' }}>
            {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Mileage */}
        <div>
          <label style={labelStyle}>קילומטרז׳ (אופציונלי)</label>
          <input
            type="number"
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
            placeholder="ק״מ"
            min={0}
            max={500000}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Rating */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>דירוג <span style={{ color: 'var(--brand-red)' }}>*</span></label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <StarRating rating={rating} size={28} interactive onChange={setRating} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{RATING_LABELS[rating]}</span>
        </div>
      </div>

      {/* Title */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>כותרת <span style={{ color: 'var(--brand-red)' }}>*</span></label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="סכם את הבעיה / החוויה בקצרה"
          maxLength={100}
          style={inputStyle}
          required
        />
      </div>

      {/* Body */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>
          ביקורת מפורטת <span style={{ color: 'var(--brand-red)' }}>*</span>
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginRight: 8 }}>({body.length}/2000)</span>
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="תאר את הבעיה, מתי הופיעה, מה נמצא בבדיקה, האם תוקנה..."
          maxLength={2000}
          rows={5}
          style={{ ...inputStyle, resize: 'vertical', height: 'auto', paddingTop: 10, paddingBottom: 10 }}
          required
        />
      </div>

      {/* Images */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>תמונות (אופציונלי, עד 4)</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: images.length ? 8 : 0 }}>
          {images.map((url, i) => (
            <div key={i} style={{ position: 'relative', width: 80, height: 80 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1.5px solid var(--border)' }} />
              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                style={{
                  position: 'absolute', top: -6, right: -6,
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'var(--brand-red)', color: '#fff',
                  border: 'none', cursor: 'pointer', fontSize: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>
          ))}
          {images.length < 4 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                width: 80, height: 80, borderRadius: 8,
                border: '1.5px dashed var(--border)',
                background: 'var(--bg-base)', cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 4, color: 'var(--text-muted)', fontSize: '0.75rem',
              }}
            >
              {uploading ? '...' : <><span style={{ fontSize: 22 }}>📷</span>הוסף</>}
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleImageChange}
        />
      </div>

      {error && <p style={{ color: 'var(--brand-red)', fontSize: '0.875rem', marginBottom: 12 }}>⚠️ {error}</p>}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={loading || uploading}
        style={{ width: '100%', height: 48, fontSize: '1rem' }}
      >
        {loading ? '...שומר' : 'פרסם ביקורת'}
      </button>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.8125rem', fontWeight: 600,
  color: 'var(--text-secondary)', marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%', height: 42, padding: '0 12px',
  border: '1.5px solid var(--border)', borderRadius: 10,
  background: 'var(--bg-base)', color: 'var(--text-primary)',
  fontSize: '0.9375rem', fontFamily: 'inherit', outline: 'none',
  transition: 'border-color 0.2s', direction: 'rtl',
};

const RATING_LABELS: Record<number, string> = {
  1: 'גרוע מאוד', 2: 'גרוע', 3: 'בינוני', 4: 'טוב', 5: 'מצוין',
};
