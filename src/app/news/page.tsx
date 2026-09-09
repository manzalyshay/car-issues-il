import type { Metadata } from 'next';
import { getLatestNews } from '@/lib/carNews';
import { ensureNewsTable } from '@/lib/carNews';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'חדשות רכב | CarIssues',
  description: 'חדשות רכב עדכניות מהעולם — בעברית',
};

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'לפני פחות משעה';
  if (h < 24) return `לפני ${h} שעות`;
  const d = Math.floor(h / 24);
  return `לפני ${d} ימים`;
}

const SOURCE_LABELS: Record<string, string> = {
  motor1: 'Motor1',
  caranddriver: 'Car and Driver',
  cartube: 'CarTube',
};

export default async function NewsPage() {
  await ensureNewsTable().catch(() => {});
  const news = await getLatestNews(30);

  return (
    <main className="max-w-4xl mx-auto px-4 py-8" dir="rtl">
      <h1 className="text-3xl font-bold mb-2">חדשות רכב</h1>
      <p className="text-gray-500 mb-8 text-sm">עיבוד ותרגום אוטומטי ממקורות בינלאומיים · מתעדכן כל 6 שעות</p>

      {news.length === 0 && (
        <div className="text-center text-gray-400 py-20">
          <p className="text-lg">אין חדשות עדיין</p>
          <p className="text-sm mt-2">הכרייה הראשונה תרוץ בקרוב</p>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {news.map((item) => (
          <a
            key={item.id}
            href={item.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow bg-white dark:bg-gray-800"
          >
            {item.image_url && (
              <div className="aspect-video overflow-hidden bg-gray-100 dark:bg-gray-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image_url}
                  alt={item.title_he ?? item.title_en ?? ''}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full px-2 py-0.5 font-medium">
                  {SOURCE_LABELS[item.source] ?? item.source}
                </span>
                <span>{timeAgo(item.published_at)}</span>
              </div>
              <h2 className="font-semibold text-base leading-snug mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">
                {item.title_he ?? item.title_en}
              </h2>
              {item.body_he && (
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed">
                  {item.body_he}
                </p>
              )}
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}
