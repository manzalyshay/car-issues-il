import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const R    = '#e63946';
const TEXT = '#0a0b0f';
const MUTED = '#6b7280';

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=480"/>
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700;900&display=swap" rel="stylesheet"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Rubik', sans-serif;
      background: #ffffff;
      width: 480px;
      height: 120px;
      overflow: hidden;
      display: flex;
      align-items: center;
    }
  </style>
</head>
<body>

  <!-- Left red accent bar -->
  <div style="width:4px;height:100%;background:linear-gradient(to bottom,${R},#7c1520);flex-shrink:0;"></div>

  <!-- Content -->
  <div style="display:flex;flex-direction:column;justify-content:center;padding:0 24px;gap:4px;">
    <div style="font-size:34px;font-weight:900;color:${TEXT};line-height:1;letter-spacing:-0.5px;">CarIssues<span style="color:${R};">.</span>co.il</div>
    <div style="font-size:12px;font-weight:600;color:${MUTED};letter-spacing:0.3px;">ביקורות רכב אמיתיות · ניתוח AI</div>
  </div>

</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
