import type { Metadata } from 'next';
import TcoCalculator from './TcoCalculator';

export const metadata: Metadata = {
  title: 'מחשבון עלות בעלות על רכב | CarIssues IL',
  description: 'כמה עולה להחזיק רכב בישראל לשנה? חשב דלק, ביטוח, טיפולים, פחת ורישוי — עלות החזקה מלאה לכל דגם.',
  alternates: { canonical: 'https://carissues.co.il/tco' },
  openGraph: {
    title: 'מחשבון עלות בעלות על רכב — כמה עולה לי הרכב לשנה?',
    description: 'חשב כמה עולה לך הרכב שלך באמת: דלק, ביטוח, טיפולים, פחת ורישוי.',
    url: 'https://carissues.co.il/tco',
  },
};

export default function TcoPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'בית', item: 'https://carissues.co.il' },
          { '@type': 'ListItem', position: 2, name: 'מחשבון עלות בעלות', item: 'https://carissues.co.il/tco' },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'כמה עולה להחזיק רכב בישראל לשנה?',
            acceptedAnswer: { '@type': 'Answer', text: 'עלות החזקת רכב ממוצע בישראל עומדת על ₪25,000–₪45,000 לשנה, כולל דלק, ביטוח מקיף, טיפולים שוטפים, רישוי ופחת.' },
          },
          {
            '@type': 'Question',
            name: 'מה הפחת השנתי על רכב בישראל?',
            acceptedAnswer: { '@type': 'Answer', text: 'פחת ממוצע של 15% בשנה הראשונה, 10% בשנים 2–5, ו-7% לאחר מכן. רכב חדש מאבד כ-30% מערכו בשלוש השנים הראשונות.' },
          },
          {
            '@type': 'Question',
            name: 'כמה עולה ביטוח מקיף לרכב בישראל?',
            acceptedAnswer: { '@type': 'Answer', text: 'ביטוח מקיף לרכב ממוצע בישראל עולה ₪3,000–₪8,000 לשנה, תלוי בגיל הנהג, וותק נהיגה, דגם הרכב ומיקום.' },
          },
        ],
      },
    ],
  };

  return (
    <div className="page-section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container" style={{ maxWidth: 860 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 'clamp(1.5rem,4vw,2rem)', fontWeight: 900, margin: '0 0 8px' }}>
            🚗 מחשבון עלות בעלות על רכב
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            כמה עולה לך הרכב באמת? חשב עלות החזקה שנתית — דלק, ביטוח, טיפולים, פחת ורישוי.
          </p>
        </div>
        <TcoCalculator />
      </div>
    </div>
  );
}
