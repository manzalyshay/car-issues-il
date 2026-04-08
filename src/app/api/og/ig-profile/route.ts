import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 1080×1080 Instagram profile picture — logo centered on dark background
export async function GET() {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://carissues.co.il';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=1080"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1080px;
      height: 1080px;
      background: #0a0b0f;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    img {
      width: 780px;
      height: auto;
      object-fit: contain;
    }
  </style>
</head>
<body>
  <img src="${SITE_URL}/logo-transparent.png" alt="CarIssues IL"/>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
