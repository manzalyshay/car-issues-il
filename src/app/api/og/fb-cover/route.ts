import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const R   = '#e63946';
const BG  = '#0a0b0f';
const CARD = '#13151c';
const BORDER = '#1e2130';
const TEXT = '#f0f2f5';
const MUTED = '#6b7280';

export async function GET() {
  return new NextResponse(null, { status: 404 });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _disabled_GET() {
  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=1640"/>
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700;900&display=swap" rel="stylesheet"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Rubik', sans-serif;
      background: ${BG};
      width: 1640px;
      height: 624px;
      overflow: hidden;
      position: relative;
    }
  </style>
</head>
<body>

  <!-- Background grid pattern -->
  <svg style="position:absolute;inset:0;width:100%;height:100%;opacity:0.04;" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
        <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#fff" stroke-width="0.5"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)"/>
  </svg>

  <!-- Red gradient accent — left edge -->
  <div style="position:absolute;top:0;right:0;width:6px;height:100%;background:linear-gradient(to bottom,${R},#7c1520);z-index:10;"></div>

  <!-- Diagonal red glow -->
  <div style="position:absolute;top:-200px;right:-100px;width:700px;height:700px;border-radius:50%;background:radial-gradient(circle,rgba(230,57,70,0.18) 0%,transparent 70%);pointer-events:none;"></div>

  <!-- Bottom red line -->
  <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(to left,${R},transparent 60%);"></div>

  <!-- Main layout -->
  <div style="position:relative;z-index:2;display:flex;align-items:center;justify-content:center;height:100%;padding:0 50px;gap:48px;">

    <!-- Left: Branding -->
    <div style="display:flex;flex-direction:column;justify-content:center;gap:14px;max-width:720px;">

      <!-- Badge -->
      <div style="display:inline-flex;align-items:center;gap:8px;background:${CARD};border:1px solid ${R}40;border-radius:99px;padding:6px 16px;width:fit-content;">
        <div style="width:8px;height:8px;border-radius:50%;background:${R};flex-shrink:0;"></div>
        <span style="font-size:13px;font-weight:700;color:${R};letter-spacing:1.5px;text-transform:uppercase;">ביקורות רכב</span>
      </div>

      <!-- Main title -->
      <div>
        <div style="font-size:76px;font-weight:900;color:${TEXT};line-height:1;letter-spacing:-1px;">CarIssues<span style="color:${R};">.</span>co.il</div>
        <div style="font-size:26px;font-weight:600;color:${MUTED};margin-top:10px;line-height:1.4;">ביקורות רכב אמיתיות מנהגים ישראלים · ניתוח AI</div>
      </div>

      <!-- URL tag -->
      <div style="font-size:16px;font-weight:700;color:${R};letter-spacing:0.5px;">carissues.co.il →</div>
    </div>

    <!-- Right: Stats cards -->
    <div style="display:flex;flex-direction:column;gap:14px;flex-shrink:0;">

      <div style="display:flex;gap:14px;">
        <div style="background:${CARD};border:1px solid ${BORDER};border-radius:16px;padding:20px 28px;text-align:center;min-width:160px;">
          <div style="font-size:42px;font-weight:900;color:${R};line-height:1;">🚗</div>
          <div style="font-size:14px;font-weight:700;color:${TEXT};margin-top:8px;">עשרות דגמים</div>
          <div style="font-size:12px;color:${MUTED};margin-top:3px;">עם ניתוח AI מלא</div>
        </div>
        <div style="background:${CARD};border:1px solid ${BORDER};border-radius:16px;padding:20px 28px;text-align:center;min-width:160px;">
          <div style="font-size:42px;font-weight:900;color:#f59e0b;line-height:1;">⭐</div>
          <div style="font-size:14px;font-weight:700;color:${TEXT};margin-top:8px;">ציונים אמיתיים</div>
          <div style="font-size:12px;color:${MUTED};margin-top:3px;">מנהגים מהקהילה</div>
        </div>
      </div>

      <div style="display:flex;gap:14px;">
        <div style="background:${CARD};border:1px solid ${BORDER};border-radius:16px;padding:20px 28px;text-align:center;min-width:160px;">
          <div style="font-size:42px;font-weight:900;color:#22c55e;line-height:1;">🤖</div>
          <div style="font-size:14px;font-weight:700;color:${TEXT};margin-top:8px;">סיכום AI</div>
          <div style="font-size:12px;color:${MUTED};margin-top:3px;">יתרונות וחסרונות</div>
        </div>
        <div style="background:${CARD};border:1px solid ${BORDER};border-radius:16px;padding:20px 28px;text-align:center;min-width:160px;">
          <div style="font-size:42px;font-weight:900;color:#a78bfa;line-height:1;">🎮</div>
          <div style="font-size:14px;font-weight:700;color:${TEXT};margin-top:8px;">מודל תלת מימד</div>
          <div style="font-size:12px;color:${MUTED};margin-top:3px;">לדגמים נבחרים</div>
        </div>
      </div>

    </div>
  </div>

</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
