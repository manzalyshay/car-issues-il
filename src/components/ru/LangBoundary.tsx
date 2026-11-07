'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * The root layout (header, footer, <html lang/dir>) is rendered once and kept across
 * client-side navigations. It differs between the Russian pilot (/ru) and the rest of the
 * site, so when a link crosses that boundary, reload the page to get the right layout.
 */
export default function LangBoundary({ serverIsRu }: { serverIsRu: boolean }) {
  const pathname = usePathname();
  useEffect(() => {
    const isRu = pathname === '/ru' || pathname.startsWith('/ru/');
    if (isRu !== serverIsRu) window.location.reload();
  }, [pathname, serverIsRu]);
  return null;
}
