'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { detectCountry } from '@/lib/vehicleLookup';

/** Plate input for the Russian pilot: opens /ru/vehicle-lookup/<plate>, which does the lookup. */
export default function RuPlateForm({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const uk = detectCountry(value) === 'uk';
    const cleaned = uk ? value.replace(/[\s-]/g, '').toUpperCase() : value.replace(/\D/g, '');
    if (!uk && (cleaned.length < 7 || cleaned.length > 8)) {
      setError('Введите номер из 7 или 8 цифр');
      return;
    }
    setError(null);
    setLoading(true);
    router.push(`/ru/vehicle-lookup/${encodeURIComponent(cleaned)}`);
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 520 }} aria-label="Проверка авто по номеру">
      <div style={{ display: 'flex', gap: 8 }}>
        <label htmlFor="ru-plate" style={{ position: 'absolute', left: -9999 }}>Номер автомобиля</label>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: 52, borderRadius: 10, background: '#fefce8', border: '2px solid #ca8a04', overflow: 'hidden', direction: 'ltr' }}>
          <span style={{ width: 30, alignSelf: 'stretch', background: '#003399', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>IL</span>
          <input
            id="ru-plate" value={value} autoFocus={autoFocus} inputMode="numeric" maxLength={10}
            onChange={(e) => setValue(e.target.value.toUpperCase())}
            placeholder="Введите номер"
            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: '1.1rem', fontWeight: 700, color: '#1a1a1a', letterSpacing: '0.08em', padding: '0 12px', fontFamily: 'monospace', textAlign: 'center' }}
          />
        </div>
        <button type="submit" disabled={loading || value.replace(/[\s-]/g, '').length < 2} style={{
          height: 52, padding: '0 22px', borderRadius: 10, border: 'none', background: loading ? '#94a3b8' : 'var(--accent)',
          color: '#fff', fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap', cursor: loading ? 'default' : 'pointer',
        }}>{loading ? 'Проверяем...' : 'Проверить'}</button>
      </div>
      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Например: 1234567 или 12-345-67</div>
      {error && <div role="alert" style={{ fontSize: '0.85rem', color: '#f87171', fontWeight: 600 }}>{error}</div>}
    </form>
  );
}
