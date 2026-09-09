import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'מבצעי רכב | CarIssues',
  description: 'מבצעים והנחות על רכבים חדשים ויד שנייה בישראל',
};

export default function SalesPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-16 text-center" dir="rtl">
      <div style={{ fontSize: 64, marginBottom: 16 }}>🏷️</div>
      <h1 className="text-3xl font-bold mb-4">מבצעי רכב</h1>
      <p className="text-gray-500 text-lg mb-8">עמוד זה בפיתוח — בקרוב תוכלו למצא כאן מבצעים והנחות על רכבים</p>
      <a href="/cars" className="btn btn-primary" style={{ display: 'inline-block', padding: '12px 28px', borderRadius: 10, background: '#1b4f8a', color: '#fff', textDecoration: 'none', fontWeight: 700 }}>
        לכל הרכבים ←
      </a>
    </main>
  );
}
