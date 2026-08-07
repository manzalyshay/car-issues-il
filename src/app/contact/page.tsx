import type { Metadata } from 'next';
import { getHostLocale, getBaseUrl } from '@/lib/hostLocale';
import ContactForm from './ContactForm';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getHostLocale();
  const base = getBaseUrl(locale);
  const langs = { he: 'https://carissues.co.il/contact', en: 'https://carissues.net/contact', 'x-default': 'https://carissues.net/contact' };
  return locale === 'en' ? {
    title: 'Contact Us',
    description: 'Contact the CarIssues team — questions, feedback, or report an issue.',
    alternates: { canonical: `${base}/contact`, languages: langs },
  } : {
    title: 'צור קשר',
    description: 'צור קשר עם צוות CarIssues — שאלות, משוב או דיווח על בעיה.',
    alternates: { canonical: `${base}/contact`, languages: langs },
  };
}

export default function ContactPage() {
  return <ContactForm />;
}
