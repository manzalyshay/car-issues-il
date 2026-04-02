/**
 * Seed trims for all car models using Gemini AI as the source.
 * Gemini is asked specifically about Israeli market trims as sold by local importers.
 *
 * Run with: npx tsx scripts/seed-trims-gemini.ts
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GEMINI_KEY   = process.env.GEMINI_API_KEY!;

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_KEY}`;

interface CarModel {
  make_slug: string;
  slug: string;
  name_en: string;
}

async function fetchAllModels(): Promise<CarModel[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/car_models?select=make_slug,slug,name_en&order=make_slug,slug`,
    {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    }
  );
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status} ${await res.text()}`);
  return res.json();
}

async function getTrimsFromGemini(batch: CarModel[]): Promise<Record<string, string[]>> {
  const carList = batch
    .map((m) => `- ${m.make_slug}/${m.slug} (${m.name_en})`)
    .join('\n');

  const prompt = `You are an expert on the Israeli car market. For each car model below, list the exact trim levels (גרסאות) sold in Israel by local importers.

Rules:
- Only list trims that are actually sold in Israel (not global trims that were never imported)
- Use the exact Hebrew-market trim names as used by the importer (e.g., "Urban", "Sport", "Luxury" etc.)
- If a model has many yearly variants, list the current/recent trims (2020-2024)
- If you're not confident about a specific model's Israeli trims, provide an empty array []
- Respond ONLY with a valid JSON object mapping "make_slug/model_slug" to an array of trim strings
- No markdown, no explanation, just raw JSON

Cars to look up:
${carList}

Expected format:
{
  "toyota/corolla": ["Urban", "Comfort", "Prestige", "GR Sport"],
  "mazda/cx5": ["Dynamic", "Exclusive-Line"],
  "unknown/model": []
}`;

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  // Strip markdown code fences if present
  const jsonText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  try {
    return JSON.parse(jsonText);
  } catch {
    console.error('Failed to parse Gemini response:', rawText.slice(0, 500));
    return {};
  }
}

async function updateTrims(makeSlug: string, modelSlug: string, trims: string[]): Promise<boolean> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/car_models?make_slug=eq.${makeSlug}&slug=eq.${modelSlug}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ trims }),
    }
  );
  return res.ok || res.status === 204;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  if (!SUPABASE_URL || !SERVICE_KEY || !GEMINI_KEY) {
    console.error('Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY');
    process.exit(1);
  }

  console.log('Fetching all car models from DB...');
  const models = await fetchAllModels();
  console.log(`Found ${models.length} models.\n`);

  // Process in batches of 15 to keep prompts manageable
  const batches = chunkArray(models, 15);
  const allTrims: Record<string, string[]> = {};

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Querying Gemini for batch ${i + 1}/${batches.length} (${batch.map((m) => `${m.make_slug}/${m.slug}`).join(', ')})...`);

    try {
      const trims = await getTrimsFromGemini(batch);
      Object.assign(allTrims, trims);
      const found = Object.keys(trims).filter((k) => trims[k].length > 0).length;
      console.log(`  → Got trims for ${found}/${batch.length} models`);
    } catch (err) {
      console.error(`  → Batch ${i + 1} failed:`, err);
    }

    // Rate limit: wait 1s between batches
    if (i < batches.length - 1) await sleep(1000);
  }

  console.log('\n--- Updating database ---');
  let updated = 0;
  let skipped = 0;
  let empty = 0;

  for (const model of models) {
    const key = `${model.make_slug}/${model.slug}`;
    const trims = allTrims[key];

    if (!trims || trims.length === 0) {
      console.log(`⚪ ${key}: no trims found`);
      empty++;
      continue;
    }

    const ok = await updateTrims(model.make_slug, model.slug, trims);
    if (ok) {
      console.log(`✓ ${key}: [${trims.join(', ')}]`);
      updated++;
    } else {
      console.error(`✗ ${key}: DB update failed`);
      skipped++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Empty/skipped: ${empty + skipped}`);

  // Show a summary of what Gemini returned
  console.log('\n--- Trim summary ---');
  for (const [key, trims] of Object.entries(allTrims)) {
    if (trims.length > 0) {
      console.log(`${key}: ${trims.join(' | ')}`);
    }
  }
}

run().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
