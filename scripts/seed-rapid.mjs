import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const raw = readFileSync('/workspace/car-issues-il/.env.local','utf8');
for (const line of raw.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g,'');
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';
const apiKey = process.env.MISTRAL_API_KEY;

const IL_KEYWORDS = ['ישראל','טפוז','carzone','drive.co.il','icar','פייסבוק'];
const isLocal = n => IL_KEYWORDS.some(k => n.toLowerCase().includes(k));

async function callMistral(prompt) {
  const r = await fetch(MISTRAL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({ model: 'mistral-small-latest', temperature: 0.4, max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(40000),
  });
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? '';
}

const bdPrompt = `אתה מומחה לביקורות רכב. עבור סקודה ראפיד (Skoda Rapid), כתוב סיכום קצר (2-3 משפטים) של מה שבעלי הרכב אומרים בכל אחד מהמקורות הבאים.

המקורות:
- CarZone ביקורות גולשים (ישראל)
- פורום טפוז מכוניות (ישראל)
- KBB - Kelley Blue Book (בינלאומי)
- Edmunds Owner Reviews (בינלאומי)
- ZigWheels Owner Reviews (בינלאומי)

לכל מקור: סיכום קצר בעברית, ציון 1-10.
כתוב רק על חוות דעת בעלי הרכב: נהיגה, אמינות, תחזוקה, נוחות, עלויות.
החזר JSON בלבד:
[{"source":"שם המקור","summary":"...","score":7}]`;

const summaryPrompt = `אתה עוזר לאתר ביקורות רכב ישראלי. סכם את חוות דעת בעלי הרכב על סקודה ראפיד (Skoda Rapid).

כתוב:
1. local_summary_he: 2-3 משפטים על מה הבעלים הישראלים חושבים
2. global_summary_he: 2-3 משפטים על מה הבעלים הבינלאומיים חושבים
3. local_score: ציון 1-10
4. global_score: ציון 1-10
5. pros: עד 4 יתרונות קצרים בעברית
6. cons: עד 4 חסרונות קצרים בעברית

כתוב עברית תקינה. אל תשתמש במילה קליטה לתיאור מזגן — כתוב מיזוג יעיל.
החזר JSON בלבד:
{"local_summary_he":"...","global_summary_he":"...","local_score":7,"global_score":7,"pros":[],"cons":[]}`;

const [bdText, summaryText] = await Promise.all([callMistral(bdPrompt), callMistral(summaryPrompt)]);

const bd = JSON.parse(bdText.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim());
const s  = JSON.parse(summaryText.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim());

const breakdown = bd
  .map(item => ({
    source: String(item.source ?? ''),
    flag: isLocal(String(item.source ?? '')) ? '🇮🇱' : '🌍',
    postCount: 0,
    score: item.score != null ? Number(item.score) : null,
    summary: String(item.summary ?? ''),
  }))
  .filter(b => b.source && b.summary.length > 20);

const scores = [s.local_score, s.global_score].filter(Boolean);
const topScore = scores.length ? scores.reduce((a,b) => a+b, 0) / scores.length : null;

const { error } = await sb.from('expert_reviews').insert({
  make_slug: 'skoda', model_slug: 'rapid', year: null,
  source_name: '', source_url: '', original_title: '',
  summary_he: s.local_summary_he ?? s.global_summary_he ?? '',
  local_summary_he: s.local_summary_he ?? null,
  global_summary_he: s.global_summary_he ?? null,
  local_score: s.local_score ?? null,
  global_score: s.global_score ?? null,
  top_score: topScore,
  pros: s.pros ?? [],
  cons: s.cons ?? [],
  local_post_count: 0,
  global_post_count: 0,
  sources_breakdown: breakdown,
  scraped_at: new Date().toISOString(),
});

if (error) console.error('DB error:', error.message);
else console.log('Done! breakdown:', breakdown.length, 'sources | pros:', s.pros?.length, '| cons:', s.cons?.length);
