import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const R    = '#e63946';
const BG   = '#0a0b0f';
const TEXT = '#f0f2f5';
const MUTED = '#9ca3af';

export async function GET() {
  // 320x320 — correct upload size for FB & IG profile pictures.
  // All content is kept within the central ~240px safe zone so the
  // circular crop on both platforms doesn't cut off anything important.
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=320"/>
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@700;900&display=swap" rel="stylesheet"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Rubik', sans-serif;
      background: ${BG};
      width: 320px;
      height: 320px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  </style>
</head>
<body>

  <!-- Background grid -->
  <svg style="position:absolute;inset:0;width:100%;height:100%;opacity:0.04;" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
        <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#fff" stroke-width="0.5"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)"/>
  </svg>

  <!-- Diagonal red glow from top-left (matches fb-cover style) -->
  <div style="position:absolute;top:-120px;left:-80px;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgba(230,57,70,0.14) 0%,transparent 70%);pointer-events:none;"></div>

  <!-- Subtle center fill so text stays readable -->
  <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,rgba(230,57,70,0.06) 0%,transparent 60%);pointer-events:none;"></div>

  <!-- Centered content — safe within circle crop -->
  <div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;padding:0 40px;">

    <!-- Red pill badge -->
    <div style="background:${R}18;border:1px solid ${R}55;border-radius:99px;padding:5px 16px;">
      <span style="font-size:11px;font-weight:700;color:${R};letter-spacing:2px;text-transform:uppercase;">ביקורות רכב</span>
    </div>

    <!-- Brand name: two lines so it stays large and readable -->
    <div>
      <div style="font-size:52px;font-weight:900;color:${TEXT};line-height:1;letter-spacing:-1.5px;">CarIssues</div>
      <div style="font-size:32px;font-weight:900;color:${R};line-height:1;letter-spacing:-0.5px;margin-top:2px;">.co.il</div>
    </div>

    <!-- Short tagline -->
    <div style="font-size:11px;font-weight:700;color:${MUTED};letter-spacing:0.5px;">ביקורות · AI · ישראל</div>

  </div>

</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
