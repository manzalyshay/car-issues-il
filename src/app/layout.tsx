import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/lib/authContext';
import { LocaleProvider } from '@/lib/localeContext';
import NavigationProgress from '@/components/NavigationProgress';
import PageViewTracker from '@/components/PageViewTracker';

const HE_URL = 'https://carissues.co.il';
const EN_URL = 'https://carissues.net';

function isEnglishHost(host: string) {
  return host === 'carissues.net' || host === 'www.carissues.net' || host.startsWith('en.');
}

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get('host') ?? '';
  const isEn = isEnglishHost(host);
  const baseUrl = isEn ? EN_URL : HE_URL;

  return {
    title: {
      default: isEn ? 'CarIssues — Car Reviews, Problems & Reliability' : 'CarIssues IL — בעיות רכב וביקורות',
      template: '%s | CarIssues',
    },
    metadataBase: new URL(baseUrl),
    icons: { icon: '/favicon.svg', apple: '/favicon.svg' },
    description: isEn
      ? 'Real car owner reviews, common problems, recalls and reliability data — by make, model and year.'
      : "המאגר הגדול ביותר בישראל לבעיות רכב, ביקורות וחוות דעת. מצא בעיות נפוצות לפי יצרן, דגם ושנה.",
    keywords: isEn
      ? ['car reviews', 'car problems', 'car reliability', 'car recalls', 'car issues', 'owner reviews']
      : ['car issues israel', 'israel car reviews', 'car problems', 'recall israel', 'בעיות רכב', 'ביקורות רכב', 'ישראל'],
    authors: [{ name: 'CarIssues' }],
    openGraph: {
      type: 'website',
      locale: isEn ? 'en_US' : 'he_IL',
      alternateLocale: isEn ? 'he_IL' : 'en_US',
      siteName: 'CarIssues',
      url: baseUrl,
      images: [{ url: '/og-default.svg', width: 1200, height: 630, alt: 'CarIssues' }],
    },
    twitter: { card: 'summary_large_image' },
    alternates: {
      canonical: baseUrl,
      languages: { 'he': HE_URL, 'en': EN_URL },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const host = (await headers()).get('host') ?? '';
  const isEn = isEnglishHost(host);
  const baseUrl = isEn ? EN_URL : HE_URL;

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: 'CarIssues',
        url: baseUrl,
        logo: { '@type': 'ImageObject', url: `${baseUrl}/favicon.svg` },
        description: isEn
          ? 'Real car owner reviews, common problems, recalls and reliability data — by make, model and year.'
          : 'המאגר הגדול ביותר בישראל לבעיות רכב, ביקורות וחוות דעת',
      },
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: 'CarIssues',
        publisher: { '@id': `${baseUrl}/#organization` },
        inLanguage: isEn ? 'en' : 'he',
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${baseUrl}/cars?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <html lang={isEn ? 'en' : 'he'} dir={isEn ? 'ltr' : 'rtl'}>
      <head>
        <link rel="alternate" hrefLang="he" href={HE_URL} />
        <link rel="alternate" hrefLang="en" href={EN_URL} />
        <link rel="alternate" hrefLang="x-default" href={HE_URL} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800&family=Rubik:wght@300;400;500;600;700;800;900&family=Assistant:wght@400;600;700&family=Syne:wght@400;500;600;700;800&family=Bebas+Neue&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex flex-col min-h-screen">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <LocaleProvider>
          <AuthProvider>
            <NavigationProgress />
            <PageViewTracker />
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
