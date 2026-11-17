import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getHostLocale } from '@/lib/hostLocale';
import PlateCheckLanding, { plateCheckMetadata } from '@/components/PlateCheckLanding';

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  return plateCheckMetadata('disabled-tag');
}

export default async function Page() {
  // Israeli-plate checks exist on the Hebrew site only
  if ((await getHostLocale()) === 'en') redirect('/');
  return <PlateCheckLanding kind="disabled-tag" />;
}
