import Link from 'next/link';
import { ru } from '@/lib/translations.ru';

export default function RuNotFound() {
  return (
    <div className="container" style={{ textAlign: 'center', paddingBlock: '80px 60px', direction: 'ltr' }}>
      <div style={{ fontSize: '3.5rem', marginBottom: 12 }} aria-hidden="true">🚗</div>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 10 }}>{ru.notFound.title}</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        На русском у нас пока есть проверка авто по номеру и самые популярные сравнения.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/ru" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>{ru.notFound.home} →</Link>
        <Link href="/ru/vehicle-lookup" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Проверка авто по номеру →</Link>
      </div>
    </div>
  );
}
