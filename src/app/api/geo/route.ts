// Visitor country from Cloudflare's edge header. Used client-side only (e.g. the
// "English version" banner) so the server HTML stays identical for every visitor.
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const country = req.headers.get('cf-ipcountry') ?? '';
  return Response.json(
    { country },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
