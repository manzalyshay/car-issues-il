import { getServiceClient } from './adminAuth';
import { getAllMakes } from './carsDb';
import { findCarModel } from './sketchfab';

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

type PostType = 'top_rated' | 'worst_rated' | 'most_reviewed' | 'new_review' | 'comparison' | 'car_3d_summary';

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

    if (postType === 'top_rated') {
      const top = ranked.slice(0, 3);
      const cars = top.map((r, i) => {
        const info = lookup.get(r.key)!;
        return `${i + 1}. ${info.makeHe} ${info.modelHe} — ${r.combined.toFixed(1)}/10`;
      }).join('\n');
      content_he = `🏆 הרכבים הכי מדורגים בישראל השבוע:\n\n${cars}\n\nדירוג מבוסס על ביקורות אמיתיות של בעלי רכב בישראל + AI.\nפרטים: carissues.co.il/rankings`;
      content_en = `Top rated cars in Israel this week:\n${top.map((r, i) => { const info = lookup.get(r.key)!; return `${i + 1}. ${info.makeEn} ${info.modelEn} — ${r.combined.toFixed(1)}/10`; }).join('\n')}\ncarissues.co.il/rankings`;
      hashtags += ' #TopRated #BestCars';
    } else {
      // Pick randomly from bottom 5 for variety
      const pool = ranked.slice(0, 5);
      const pick = pool[Math.floor(Math.random() * pool.length)];
      const car = lookup.get(pick.key)!;
      const ratingCount = (reviewMap.get(pick.key) ?? []).length;
      content_he = `⚠️ ${car.makeHe} ${car.modelHe} — הרכב עם הדירוג הנמוך ביותר החודש\n\nציון משולב: ${pick.combined.toFixed(1)}/10\nמבוסס על ${ratingCount} ביקורות של בעלים בישראל.\n\nקרא את הביקורות: carissues.co.il/cars/${car.makeSlug}/${car.modelSlug}`;
      content_en = `${car.makeEn} ${car.modelEn} — lowest rated car this month (${pick.combined.toFixed(1)}/10)\ncarissues.co.il/cars/${car.makeSlug}/${car.modelSlug}`;
      hashtags += ` #${car.makeEn.replace(/\s/g, '')}`;
      metadata = { carSlug: `${car.makeSlug}/${car.modelSlug}` };
    }
  } else if (postType === 'new_review') {
    // Pick randomly from the 20 most recent reviews for variety
    const pool = (reviewData ?? []).slice(0, 20).filter(r => lookup.has(`${r.make_slug}/${r.model_slug}`));
    if (!pool.length) return null;
    const latest = pool[Math.floor(Math.random() * pool.length)];
    const info = lookup.get(`${latest.make_slug}/${latest.model_slug}`)!;
    const stars = '⭐'.repeat(Math.round(latest.rating));
    const excerpt = (latest.title || latest.body || '').slice(0, 100);
    content_he = `${stars} ביקורת: ${info.makeHe} ${info.modelHe}\n\n"${excerpt}..."\n\n— ${latest.author || 'בעל רכב'}\n\nקרא עוד: carissues.co.il/cars/${info.makeSlug}/${info.modelSlug}`;
    content_en = `Review: ${info.makeEn} ${info.modelEn} — ${latest.rating}/5 stars\ncarissues.co.il/cars/${info.makeSlug}/${info.modelSlug}`;
    hashtags += ` #${info.makeEn.replace(/\s/g, '')} #${info.modelEn.replace(/\s/g, '')}`;
    metadata = { carSlug: `${info.makeSlug}/${info.modelSlug}`, postType: 'new_review' };
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
    // Pick two random cars from top 10 most reviewed for variety
    const pool = [...reviewMap.entries()].filter(([k]) => lookup.has(k)).sort((a, b) => b[1].length - a[1].length).slice(0, 10);
    if (pool.length < 2) return null;
    const i1 = Math.floor(Math.random() * (pool.length - 1));
    const i2 = i1 + 1 + Math.floor(Math.random() * (pool.length - i1 - 1));
    const [k1, ratings1] = pool[i1];
    const [k2, ratings2] = pool[i2];
    const [c1, c2] = [lookup.get(k1)!, lookup.get(k2)!];
    const avg1 = ratings1.reduce((a, b) => a + b, 0) / ratings1.length;
    const avg2 = ratings2.reduce((a, b) => a + b, 0) / ratings2.length;
    content_he = `⚖️ ${c1.makeHe} ${c1.modelHe} מול ${c2.makeHe} ${c2.modelHe}\n\n${c1.makeHe} ${c1.modelHe}: ${avg1.toFixed(1)}/5 ⭐ (${ratings1.length} ביקורות)\n${c2.makeHe} ${c2.modelHe}: ${avg2.toFixed(1)}/5 ⭐ (${ratings2.length} ביקורות)\n\nהשוואה מלאה: carissues.co.il/cars/compare/${c1.makeSlug}/${c1.modelSlug}/${c2.makeSlug}/${c2.modelSlug}`;
    content_en = `${c1.makeEn} ${c1.modelEn} vs ${c2.makeEn} ${c2.modelEn}\ncarissues.co.il/cars/compare/${c1.makeSlug}/${c1.modelSlug}/${c2.makeSlug}/${c2.modelSlug}`;
    hashtags += ` #${c1.makeEn.replace(/\s/g, '')} #${c2.makeEn.replace(/\s/g, '')} #CarComparison`;
    metadata = { compareUrl: `/cars/compare/${c1.makeSlug}/${c1.modelSlug}/${c2.makeSlug}/${c2.modelSlug}` };
  }

  if (postType === 'car_3d_summary') {
    // Pick a car that has both an expert review score and a 3D model
    const candidates: { key: string; score: number }[] = [];
    for (const [key, score] of scoreMap) {
      if (lookup.has(key)) candidates.push({ key, score });
    }
    if (!candidates.length) return null;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const car = lookup.get(pick.key)!;

    // Check if 3D model exists
    const model3d = await findCarModel(car.makeSlug, car.modelSlug);
    const has3d = !!model3d;

    const scoreLabel = pick.score >= 8 ? '🔥 ציון גבוה במיוחד' : pick.score >= 6.5 ? '👍 ביקורות חיוביות' : '⚠️ שווה לדעת לפני שקונים';
    const hooks = [
      `בוא תראה מה נהגים חושבים על ה${car.makeHe} ${car.modelHe} — ${scoreLabel}`,
      `כמה שווה ה${car.makeHe} ${car.modelHe} באמת? נהגים דירגו אותה ${pick.score.toFixed(1)}/10`,
      `לפני שאתה קונה ${car.makeHe} ${car.modelHe} — קרא מה אומרים הנהגים`,
      `ה${car.makeHe} ${car.modelHe} קיבלה ${pick.score.toFixed(1)}/10 מנהגים אמיתיים. מה דעתך?`,
    ];
    const hook = hooks[Math.floor(Math.random() * hooks.length)];
    content_he = `${hook}${has3d ? '\n\n🎮 כולל מודל תלת מימד אינטראקטיבי' : ''}\n\nקרא את כל הביקורות וראה ניתוח מלא: carissues.co.il/cars/${car.makeSlug}/${car.modelSlug}`;
    content_en = `${car.makeEn} ${car.modelEn} — Full AI Summary${has3d ? ' + 3D Model' : ''} (${pick.score.toFixed(1)}/10)\ncarissues.co.il/cars/${car.makeSlug}/${car.modelSlug}`;
    hashtags += ` #${car.makeEn.replace(/\s/g, '')} #${car.modelEn.replace(/\s/g, '')} #AIReview`;
    metadata = { carSlug: `${car.makeSlug}/${car.modelSlug}` };
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
