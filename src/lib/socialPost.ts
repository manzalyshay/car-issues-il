import { getServiceClient } from './adminAuth';
import { getAllMakes } from './carsDb';

export interface SocialPost {
  id?: string;
  platform: 'all' | 'facebook' | 'twitter' | 'telegram' | 'instagram';
  content_he: string;
  content_en: string;
  hashtags: string;
  scheduled_for: string;
  status: 'pending' | 'posted' | 'failed';
  metadata: Record<string, unknown>;
}

type PostType = 'top_rated' | 'worst_rated' | 'most_reviewed' | 'new_review' | 'comparison';

export async function generateDailyPost(forceType?: PostType): Promise<SocialPost | null> {
  const sb = getServiceClient();
  const makes = await getAllMakes();
  const lookup = new Map<string, { makeHe: string; modelHe: string; makeEn: string; modelEn: string; makeSlug: string; modelSlug: string }>();
  for (const make of makes)
    for (const model of make.models)
      lookup.set(`${make.slug}/${model.slug}`, { makeHe: make.nameHe, modelHe: model.nameHe, makeEn: make.nameEn, modelEn: model.nameEn, makeSlug: make.slug, modelSlug: model.slug });

  const [{ data: expertData }, { data: reviewData }] = await Promise.all([
    sb.from('expert_reviews').select('make_slug,model_slug,top_score').is('year', null).not('top_score', 'is', null),
    sb.from('reviews').select('make_slug,model_slug,rating,title,body,author').order('created_at', { ascending: false }).limit(50),
  ]);

  // Pick post type based on day of week
  const dayTypes: PostType[] = ['top_rated', 'new_review', 'worst_rated', 'most_reviewed', 'comparison', 'top_rated', 'new_review'];
  const postType = forceType ?? dayTypes[new Date().getDay()];

  // Build score map
  const scoreMap = new Map<string, number>();
  for (const row of expertData ?? []) scoreMap.set(`${row.make_slug}/${row.model_slug}`, row.top_score);
  const reviewMap = new Map<string, number[]>();
  for (const row of reviewData ?? []) {
    const key = `${row.make_slug}/${row.model_slug}`;
    if (!reviewMap.has(key)) reviewMap.set(key, []);
    reviewMap.get(key)!.push(row.rating);
  }

  let content_he = '';
  let content_en = '';
  let hashtags = '#רכב #ישראל #CarIssuesIL #ביקורותרכב';
  let metadata: Record<string, unknown> = {};

  if (postType === 'top_rated' || postType === 'worst_rated') {
    const ranked: { key: string; combined: number }[] = [];
    for (const [key] of lookup) {
      const score = scoreMap.get(key) ?? null;
      const ratings = reviewMap.get(key) ?? [];
      const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
      const scores: number[] = [];
      if (score != null) scores.push(score);
      if (avg != null) scores.push(avg * 2);
      if (!scores.length) continue;
      ranked.push({ key, combined: scores.reduce((a, b) => a + b) / scores.length });
    }
    ranked.sort((a, b) => postType === 'top_rated' ? b.combined - a.combined : a.combined - b.combined);
    const top = ranked.slice(0, 3);

    if (postType === 'top_rated') {
      const cars = top.map((r, i) => {
        const info = lookup.get(r.key)!;
        return `${i + 1}. ${info.makeHe} ${info.modelHe} — ${r.combined.toFixed(1)}/10`;
      }).join('\n');
      content_he = `🏆 הרכבים הכי מדורגים בישראל השבוע:\n\n${cars}\n\nדירוג מבוסס על ביקורות אמיתיות של בעלי רכב בישראל + AI.\nפרטים: carissues.co.il/rankings`;
      content_en = `Top rated cars in Israel this week:\n${top.map((r, i) => { const info = lookup.get(r.key)!; return `${i + 1}. ${info.makeEn} ${info.modelEn} — ${r.combined.toFixed(1)}/10`; }).join('\n')}\ncarissues.co.il/rankings`;
      hashtags += ' #TopRated #BestCars';
    } else {
      const car = lookup.get(top[0].key)!;
      const ratingCount = (reviewMap.get(top[0].key) ?? []).length;
      content_he = `⚠️ ${car.makeHe} ${car.modelHe} — הרכב עם הדירוג הנמוך ביותר החודש\n\nציון משולב: ${top[0].combined.toFixed(1)}/10\nמבוסס על ${ratingCount} ביקורות של בעלים בישראל.\n\nקרא את הביקורות: carissues.co.il/cars/${car.makeSlug}/${car.modelSlug}`;
      content_en = `${car.makeEn} ${car.modelEn} — lowest rated car this month (${top[0].combined.toFixed(1)}/10)\ncarissues.co.il/cars/${car.makeSlug}/${car.modelSlug}`;
      hashtags += ` #${car.makeEn.replace(/\s/g, '')}`;
      metadata = { carSlug: `${car.makeSlug}/${car.modelSlug}` };
    }
  } else if (postType === 'new_review') {
    const latest = reviewData?.[0];
    if (!latest) return null;
    const info = lookup.get(`${latest.make_slug}/${latest.model_slug}`);
    if (!info) return null;
    const stars = '⭐'.repeat(Math.round(latest.rating));
    const excerpt = (latest.title || latest.body || '').slice(0, 100);
    content_he = `${stars} ביקורת חדשה: ${info.makeHe} ${info.modelHe}\n\n"${excerpt}..."\n\n— ${latest.author || 'בעל רכב'}\n\nקרא עוד: carissues.co.il/cars/${info.makeSlug}/${info.modelSlug}`;
    content_en = `New review: ${info.makeEn} ${info.modelEn} — ${latest.rating}/5 stars\ncarissues.co.il/cars/${info.makeSlug}/${info.modelSlug}`;
    hashtags += ` #${info.makeEn.replace(/\s/g, '')} #${info.modelEn.replace(/\s/g, '')}`;
    metadata = { carSlug: `${info.makeSlug}/${info.modelSlug}` };
  } else if (postType === 'most_reviewed') {
    const sorted = [...reviewMap.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 3);
    const cars = sorted.map((r, i) => {
      const info = lookup.get(r[0])!;
      return `${i + 1}. ${info.makeHe} ${info.modelHe} — ${r[1].length} ביקורות`;
    }).join('\n');
    content_he = `📊 הרכבים עם הכי הרבה ביקורות בישראל:\n\n${cars}\n\nשתף את הניסיון שלך: carissues.co.il`;
    content_en = `Most reviewed cars in Israel:\n${sorted.map((r, i) => { const info = lookup.get(r[0])!; return `${i + 1}. ${info.makeEn} ${info.modelEn} — ${r[1].length} reviews`; }).join('\n')}\ncarissues.co.il`;
    hashtags += ' #CarReviews';
  } else if (postType === 'comparison') {
    const ranked = [...reviewMap.entries()].filter(([k]) => lookup.has(k)).sort((a, b) => b[1].length - a[1].length);
    if (ranked.length < 2) return null;
    const [k1, k2] = [ranked[0][0], ranked[1][0]];
    const [c1, c2] = [lookup.get(k1)!, lookup.get(k2)!];
    const avg1 = ranked[0][1].reduce((a, b) => a + b, 0) / ranked[0][1].length;
    const avg2 = ranked[1][1].reduce((a, b) => a + b, 0) / ranked[1][1].length;
    content_he = `⚖️ ${c1.makeHe} ${c1.modelHe} מול ${c2.makeHe} ${c2.modelHe}\n\n${c1.makeHe} ${c1.modelHe}: ${avg1.toFixed(1)}/5 ⭐ (${ranked[0][1].length} ביקורות)\n${c2.makeHe} ${c2.modelHe}: ${avg2.toFixed(1)}/5 ⭐ (${ranked[1][1].length} ביקורות)\n\nהשוואה מלאה: carissues.co.il/cars/compare/${c1.makeSlug}/${c1.modelSlug}/${c2.makeSlug}/${c2.modelSlug}`;
    content_en = `${c1.makeEn} ${c1.modelEn} vs ${c2.makeEn} ${c2.modelEn}\ncarissues.co.il/cars/compare/${c1.makeSlug}/${c1.modelSlug}/${c2.makeSlug}/${c2.modelSlug}`;
    hashtags += ` #${c1.makeEn.replace(/\s/g, '')} #${c2.makeEn.replace(/\s/g, '')} #CarComparison`;
    metadata = { compareUrl: `/cars/compare/${c1.makeSlug}/${c1.modelSlug}/${c2.makeSlug}/${c2.modelSlug}` };
  }

  if (!content_he) return null;

  const post: SocialPost = {
    platform: 'all',
    content_he,
    content_en,
    hashtags,
    scheduled_for: new Date().toISOString(),
    status: 'pending',
    metadata: { ...metadata, postType },
  };

  // Save to DB
  const { data, error } = await sb.from('social_posts').insert(post).select().single();
  if (error) { console.error('social_posts insert error:', error); return post; }
  return { ...post, id: data.id };
}
