/**
 * Fetches Wikimedia images for new models and inserts into D1 car_images.
 * Does NOT require Supabase — writes directly to D1 via wrangler.
 *
 * Usage: node scripts/seed-images-new-models.mjs
 */
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';

// Models to fetch images for (new makes + missing models)
const TODO = [
  // New makes
  { make_slug: 'mini',        make_en: 'Mini',        model_slug: 'cooper',      model_en: 'Cooper' },
  { make_slug: 'mini',        make_en: 'Mini',        model_slug: 'countryman',  model_en: 'Countryman' },
  { make_slug: 'mini',        make_en: 'Mini',        model_slug: 'clubman',     model_en: 'Clubman' },
  { make_slug: 'mini',        make_en: 'Mini',        model_slug: 'mini-electric', model_en: 'Electric' },
  { make_slug: 'citroen',     make_en: 'Citroën',     model_slug: 'c3',          model_en: 'C3' },
  { make_slug: 'citroen',     make_en: 'Citroën',     model_slug: 'c4',          model_en: 'C4' },
  { make_slug: 'citroen',     make_en: 'Citroën',     model_slug: 'c5x',         model_en: 'C5 X' },
  { make_slug: 'citroen',     make_en: 'Citroën',     model_slug: 'berlingo',    model_en: 'Berlingo' },
  { make_slug: 'infiniti',    make_en: 'Infiniti',    model_slug: 'q50',         model_en: 'Q50' },
  { make_slug: 'infiniti',    make_en: 'Infiniti',    model_slug: 'qx50',        model_en: 'QX50' },
  { make_slug: 'infiniti',    make_en: 'Infiniti',    model_slug: 'qx60',        model_en: 'QX60' },
  { make_slug: 'genesis',     make_en: 'Genesis',     model_slug: 'g80',         model_en: 'G80' },
  { make_slug: 'genesis',     make_en: 'Genesis',     model_slug: 'gv70',        model_en: 'GV70' },
  { make_slug: 'genesis',     make_en: 'Genesis',     model_slug: 'gv80',        model_en: 'GV80' },
  { make_slug: 'polestar',    make_en: 'Polestar',    model_slug: 'polestar-2',  model_en: 'Polestar 2' },
  { make_slug: 'polestar',    make_en: 'Polestar',    model_slug: 'polestar-3',  model_en: 'Polestar 3' },
  { make_slug: 'lynk-co',    make_en: 'Lynk Co',     model_slug: '01',          model_en: '01' },
  { make_slug: 'lynk-co',    make_en: 'Lynk Co',     model_slug: '05',          model_en: '05' },
  { make_slug: 'haval',       make_en: 'Haval',       model_slug: 'jolion',      model_en: 'Jolion' },
  { make_slug: 'haval',       make_en: 'Haval',       model_slug: 'h6',          model_en: 'H6' },
  { make_slug: 'lamborghini', make_en: 'Lamborghini', model_slug: 'urus',        model_en: 'Urus' },
  { make_slug: 'lamborghini', make_en: 'Lamborghini', model_slug: 'huracan',     model_en: 'Huracán' },
  { make_slug: 'lamborghini', make_en: 'Lamborghini', model_slug: 'revuelto',    model_en: 'Revuelto' },
  { make_slug: 'isuzu',       make_en: 'Isuzu',       model_slug: 'd-max',       model_en: 'D-Max' },
  { make_slug: 'isuzu',       make_en: 'Isuzu',       model_slug: 'mu-x',        model_en: 'MU-X' },
  { make_slug: 'ssangyong',   make_en: 'SsangYong',   model_slug: 'tivoli',      model_en: 'Tivoli' },
  { make_slug: 'ssangyong',   make_en: 'SsangYong',   model_slug: 'rexton',      model_en: 'Rexton' },
  // Missing models in existing makes
  { make_slug: 'mercedes', make_en: 'Mercedes-Benz', model_slug: 'g-class', model_en: 'G-Class' },
  { make_slug: 'mercedes', make_en: 'Mercedes-Benz', model_slug: 'gle',     model_en: 'GLE' },
  { make_slug: 'mercedes', make_en: 'Mercedes-Benz', model_slug: 'gls',     model_en: 'GLS' },
  { make_slug: 'mercedes', make_en: 'Mercedes-Benz', model_slug: 's-class', model_en: 'S-Class' },
  { make_slug: 'mercedes', make_en: 'Mercedes-Benz', model_slug: 'eqa',     model_en: 'EQA' },
  { make_slug: 'mercedes', make_en: 'Mercedes-Benz', model_slug: 'eqe',     model_en: 'EQE' },
  { make_slug: 'mercedes', make_en: 'Mercedes-Benz', model_slug: 'eqs',     model_en: 'EQS' },
  { make_slug: 'audi', make_en: 'Audi', model_slug: 'a1',       model_en: 'A1' },
  { make_slug: 'audi', make_en: 'Audi', model_slug: 'a5',       model_en: 'A5' },
  { make_slug: 'audi', make_en: 'Audi', model_slug: 'a7',       model_en: 'A7' },
  { make_slug: 'audi', make_en: 'Audi', model_slug: 'q2',       model_en: 'Q2' },
  { make_slug: 'audi', make_en: 'Audi', model_slug: 'q7',       model_en: 'Q7' },
  { make_slug: 'audi', make_en: 'Audi', model_slug: 'q8',       model_en: 'Q8' },
  { make_slug: 'audi', make_en: 'Audi', model_slug: 'q4-etron', model_en: 'Q4 e-tron' },
  { make_slug: 'bmw', make_en: 'BMW', model_slug: 'series2', model_en: '2 Series' },
  { make_slug: 'bmw', make_en: 'BMW', model_slug: 'series4', model_en: '4 Series' },
  { make_slug: 'bmw', make_en: 'BMW', model_slug: 'x2',      model_en: 'X2' },
  { make_slug: 'bmw', make_en: 'BMW', model_slug: 'x4',      model_en: 'X4' },
  { make_slug: 'bmw', make_en: 'BMW', model_slug: 'x6',      model_en: 'X6' },
  { make_slug: 'bmw', make_en: 'BMW', model_slug: 'i4',      model_en: 'i4' },
  { make_slug: 'bmw', make_en: 'BMW', model_slug: 'ix',      model_en: 'iX' },
  { make_slug: 'bmw', make_en: 'BMW', model_slug: 'ix1',     model_en: 'iX1' },
  { make_slug: 'toyota',     make_en: 'Toyota',     model_slug: 'supra',    model_en: 'Supra' },
  { make_slug: 'toyota',     make_en: 'Toyota',     model_slug: 'gr86',     model_en: 'GR86' },
  { make_slug: 'volkswagen', make_en: 'Volkswagen', model_slug: 'arteon',   model_en: 'Arteon' },
  { make_slug: 'volkswagen', make_en: 'Volkswagen', model_slug: 'id5',      model_en: 'ID.5' },
  { make_slug: 'volkswagen', make_en: 'Volkswagen', model_slug: 'amarok',   model_en: 'Amarok' },
  { make_slug: 'hyundai',    make_en: 'Hyundai',    model_slug: 'ioniq-9',  model_en: 'Ioniq 9' },
  { make_slug: 'hyundai',    make_en: 'Hyundai',    model_slug: 'palisade', model_en: 'Palisade' },
  { make_slug: 'kia',        make_en: 'Kia',        model_slug: 'ev3',      model_en: 'EV3' },
  { make_slug: 'chevrolet',  make_en: 'Chevrolet',  model_slug: 'corvette', model_en: 'Corvette' },
  { make_slug: 'geely',      make_en: 'Geely',      model_slug: 'monjaro',  model_en: 'Monjaro' },
  { make_slug: 'chery',      make_en: 'Chery',      model_slug: 'omoda-fx', model_en: 'OMODA FX' },
];

const DELAY_MS = 400;
const TARGET = 12;

async function searchWikimedia(makeEn, modelEn) {
  const queries = [`${makeEn} ${modelEn}`, `${makeEn} ${modelEn} car`];
  const seen = new Set();
  const images = [];

  for (const q of queries) {
    if (images.length >= TARGET) break;
    const url = new URL('https://commons.wikimedia.org/w/api.php');
    url.searchParams.set('action', 'query');
    url.searchParams.set('generator', 'search');
    url.searchParams.set('gsrnamespace', '6');
    url.searchParams.set('gsrsearch', `${q} filetype:bitmap`);
    url.searchParams.set('gsrlimit', '30');
    url.searchParams.set('prop', 'imageinfo');
    url.searchParams.set('iiprop', 'url|size|extmetadata');
    url.searchParams.set('iiurlwidth', '800');
    url.searchParams.set('format', 'json');

    try {
      const res = await fetch(url.toString());
      if (!res.ok) continue;
      const data = await res.json();
      const pages = Object.values(data.query?.pages ?? {});

      for (const p of pages) {
        if (images.length >= TARGET) break;
        const ii = p.imageinfo?.[0];
        if (!ii) continue;
        const imgUrl = ii.thumburl ?? ii.url;
        if (!imgUrl || seen.has(imgUrl)) continue;

        const ext = data => data?.extmetadata ?? {};
        const license = ext(ii).LicenseShortName?.value ?? '';
        if (!['CC BY','CC BY-SA','CC0','Public domain'].some(l => license.includes(l))) continue;

        const w = ii.thumbwidth ?? ii.width ?? 0;
        const h = ii.thumbheight ?? ii.height ?? 0;
        if (w < 400 || h < 200) continue;

        seen.add(imgUrl);
        images.push({
          url: imgUrl,
          title: p.title?.replace('File:', '') ?? '',
          author: (ext(ii).Artist?.value ?? '').replace(/<[^>]+>/g, '').slice(0, 200),
          license: license.slice(0, 100),
          width: w,
          height: h,
        });
      }
    } catch (e) {
      process.stdout.write(`[wiki error: ${e.message}]`);
    }
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  return images;
}

function d1Insert(rows) {
  if (!rows.length) return;
  const sq = s => s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`;
  const lines = rows.map(r =>
    `(${sq(r.id)},${sq(r.make_slug)},${sq(r.model_slug)},${sq(r.url)},${sq(r.thumbnail_url)},${sq(r.title)},${sq(r.author)},${sq(r.license)},${sq('wikimedia')},${r.width ?? 'NULL'},${r.height ?? 'NULL'},'2025-01-01T00:00:00.000Z')`
  );

  const sql = `INSERT OR IGNORE INTO car_images (id,make_slug,model_slug,url,thumbnail_url,title,author,license,source,width,height,created_at) VALUES\n${lines.join(',\n')};`;
  const tmp = join(tmpdir(), `img_${Date.now()}.sql`);
  writeFileSync(tmp, sql, 'utf8');
  try {
    execSync(
      `bash -c 'source "$HOME/.nvm/nvm.sh" && nvm use 22 --silent && npx wrangler d1 execute DB --config wrangler.toml --remote --file "${tmp}" 2>&1'`,
      { stdio: 'pipe', cwd: '/workspace/car-issues-il' }
    );
  } catch (e) {
    console.error('D1 insert error:', e.stdout?.toString().slice(0, 200));
  } finally {
    try { unlinkSync(tmp); } catch {}
  }
}

let total = 0;
for (let i = 0; i < TODO.length; i++) {
  const { make_slug, make_en, model_slug, model_en } = TODO[i];
  process.stdout.write(`[${i+1}/${TODO.length}] ${make_en} ${model_en}... `);

  const imgs = await searchWikimedia(make_en, model_en);
  if (!imgs.length) {
    console.log('none');
    continue;
  }

  const rows = imgs.map(img => ({
    id: randomUUID(),
    make_slug,
    model_slug,
    thumbnail_url: img.url,
    ...img,
  }));

  d1Insert(rows);
  total += rows.length;
  console.log(`+${rows.length}`);
}

console.log(`\nDone. Total images: ${total}`);
