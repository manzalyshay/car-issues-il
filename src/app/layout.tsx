import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/lib/authContext';
import NavigationProgress from '@/components/NavigationProgress';
import PageViewTracker from '@/components/PageViewTracker';

export const metadata: Metadata = {
  title: {
    default: 'CarIssues IL — בעיות רכב בישראל',
    template: '%s | CarIssues IL',
  },
  icons: {
    icon: '/logo.svg',
    apple: '/logo.svg',
  },
  description: 'המאגר הגדול ביותר בישראל לבעיות רכב, ביקורות, וחוות דעת. מצאו בעיות נפוצות לפי יצרן, דגם ושנה.',
  keywords: ['בעיות רכב', 'ריקול', 'ביקורות רכב', 'ישראל', 'car issues', 'israel'],
  authors: [{ name: 'CarIssues IL' }],
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    siteName: 'CarIssues IL',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
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
        <AuthProvider>
          <NavigationProgress />
          <PageViewTracker />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
