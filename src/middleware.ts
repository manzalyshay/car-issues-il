import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Server-side 301 redirect: /cars/compare?car1=make/model&car2=make/model
  // → /cars/compare/{sorted[0]}/{sorted[1]}
  // The client-side router.replace() was invisible to Google bots; this fixes the
  // "Alternate page with proper canonical tag" issue in GSC.
  if (pathname === '/cars/compare') {
    const car1 = searchParams.get('car1');
    const car2 = searchParams.get('car2');
    if (car1 && car2) {
      // Sort alphabetically so A/B and B/A always resolve to the same canonical URL
      const [s1, s2] = [car1, car2].sort();
      const url = req.nextUrl.clone();
      url.pathname = `/cars/compare/${s1}/${s2}`;
      url.search = '';
      return NextResponse.redirect(url, { status: 301 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/cars/compare'],
};
