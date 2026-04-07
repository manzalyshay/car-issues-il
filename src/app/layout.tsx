import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/lib/authContext';
import NavigationProgress from '@/components/NavigationProgress';
import PageViewTracker from '@/components/PageViewTracker';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const BASE_URL = 'https://carissues.co.il';

export const metadata: Metadata = {
  title: {
    default: 'CarIssues IL — בעיות רכב בישראל',
    template: '%s | CarIssues IL',
  },
  metadataBase: new URL(BASE_URL),
  icons: { icon: '/icon.png', apple: '/icon.png' },
  description: 'המאגר הגדול ביותר בישראל לבעיות רכב, ביקורות, וחוות דעת. מצאו בעיות נפוצות לפי יצרן, דגם ושנה.',
  keywords: ['בעיות רכב', 'ריקול', 'ביקורות רכב', 'ישראל', 'car issues', 'israel', 'חוות דעת רכב', 'בעיות טכניות'],
  authors: [{ name: 'CarIssues IL' }],
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    siteName: 'CarIssues IL',
    url: BASE_URL,
    images: [{ url: '/og-default.svg', width: 1200, height: 630, alt: 'CarIssues IL' }],
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: BASE_URL },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organization`,
      name: 'CarIssues IL',
      url: BASE_URL,
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/favicon.svg` },
      description: 'המאגר הגדול ביותר בישראל לבעיות רכב, ביקורות וחוות דעת',
    },
    {
      '@type': 'WebSite',
      '@id': `${BASE_URL}/#website`,
      url: BASE_URL,
      name: 'CarIssues IL',
      publisher: { '@id': `${BASE_URL}/#organization` },
      inLanguage: 'he',
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${BASE_URL}/cars?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700;800;900&family=Assistant:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex flex-col min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <AuthProvider>
          <NavigationProgress />
          <PageViewTracker />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
