/**
 * Push pre-translated reviews to D1.
 */
import { execSync } from 'child_process';

const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const DB_NAME  = 'car-issues-db';

function d1Run(sql) {
  const out = execSync(
    `CLOUDFLARE_API_TOKEN=${CF_TOKEN} npx wrangler d1 execute ${DB_NAME} --remote --json --command ${JSON.stringify(sql)} 2>/dev/null`,
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
  );
  return out;
}

function esc(s) { return (s ?? '').replace(/'/g, "''"); }

const translations = [
  {
    id: '71ab3ce3-ad8f-4197-9514-48ea2fa53151',
    title_en: '',
    body_en: "Great car, but once the warranty expires, servicing and parts become expensive. There's plastic that breaks easily in the trunk.",
  },
  {
    id: '99436800-13a0-4a77-9326-cd4a9e78fa56',
    title_en: '8 Years With This Car',
    body_en: "Toyota Yaris 2014 — zero issues, timely servicing. Fuel consumption in city traffic: 1:14, on the highway: 1:17 — hard to believe. Very economical, comfortable, good seats but not ideal for those with back problems.\nRecommended for couples with 2 kids and daily commuting.",
  },
  {
    id: '914a5fe9-749e-4017-aff4-4d476b93ebd1',
    title_en: 'Powerful Engine',
    body_en: 'Powerful engine, but the interior feels very basic. At high speeds outside the city it gets very noisy.',
  },
  {
    id: '86492563-168c-4fa9-8ecf-c559e4998f58',
    title_en: 'GT Trim — Clutch Issues',
    body_en: "Bought the car brand new. From 60K km there are jerks when accelerating from traffic lights. Clutch problems — I found out I'm not the only one. A serious issue that requires ongoing attention.",
  },
  {
    id: '18257381-035c-4d66-83e3-47c95d99f89c',
    title_en: '',
    body_en: 'Unexplained engine noise starting from the first 10K km. Customer service refuses to look into it, and the warranty garage says everything is fine. The noise gets worse over time.',
  },
  {
    id: 'f1b70fe0-5fff-4281-ad99-993b37b1faf6',
    title_en: 'Sunroof Problems',
    body_en: "Recurring sunroof issues that keep coming back, and I've found I'm not alone. Expensive maintenance for something quite common.",
  },
  {
    id: 'fcbd2fc5-d79e-41c7-962a-cef9acc3f061',
    title_en: 'Economical, Spacious and Reliable',
    body_en: "Huge, roomy trunk that makes it very practical for family or daily use. Good fuel economy and overall running costs are fairly reasonable.\nHighly recommend the 1.4 turbo engine.",
  },
  {
    id: '6afbcb2f-8c70-42d6-9155-7c70234b96ad',
    title_en: 'Stiff Steering',
    body_en: 'Kuga Titanium 2014 — the steering is very hard to turn. What could be causing this??',
  },
  {
    id: 'c545f112-6108-476d-91e1-593c3f6c9650',
    title_en: '',
    body_en: 'Beautifully designed, reliable, quiet and fuel-efficient.',
  },
  {
    id: 'fd9444ae-a82c-4f0d-88c1-b6155fef179c',
    title_en: 'Excellent, Very Economical',
    body_en: 'Very economical, beautiful, spacious, reliable.\nHighly recommended.',
  },
  {
    id: 'f2450cf0-2a19-4f77-936d-3d7e4d8ef94d',
    title_en: 'Expected More for This Price',
    body_en: "Android integration is poor and the iPhone keeps disconnecting. Password connection issues lead to further problems. In short, a problem that doesn't exist in other cars.",
  },
  {
    id: 'ac96a10b-188b-4795-a84d-dcbee812f04f',
    title_en: 'Small SUV with Outstanding Performance',
    body_en: 'Toyota has always impressed with their long-term reliability, so when this car went on sale I rushed to buy it — and I was not disappointed. Advanced safety systems, 6 airbags, excellent road grip, panoramic roof. Simply outstanding!',
  },
  {
    id: '6f695ce8-6aca-460e-968f-b718872f6139',
    title_en: 'Efficient and Economical',
    body_en: 'Efficient and economical hybrid engine — recommended.',
  },
  {
    id: 'bc5a34bd-5f14-4c2a-8dff-9382b603c04f',
    title_en: 'Great Car, Good Ground Clearance',
    body_en: 'A great car with surprisingly decent off-road capability, and excellent for city driving too! Very easy to park in tight spaces. Compact!',
  },
  {
    id: 'd840cb62-7e21-4bcb-bf96-f670193c4d72',
    title_en: 'Engine Overheating',
    body_en: 'I was stuck in a traffic jam on an incline. After about 5 minutes of stop-and-go with heavy braking, I smelled burning and had to pull over. A warning light came on too. It took about 20 minutes for the engine to cool down.',
  },
  {
    id: 'e9d6636c-f84f-4bf6-a146-39e56fe37117',
    title_en: 'Reliable and Economical Car',
    body_en: 'An amazing car — extremely fuel-efficient, worth every shekel, and extremely reliable. In short: highly recommended.',
  },
  {
    id: '465e9024-c8cd-4b0d-adfc-db9a11cfdf28',
    title_en: 'Worth the Price',
    body_en: 'For the price you get a car loaded with tech features, but the multimedia system responds very slowly and sometimes freezes.',
  },
  {
    id: '18469739-c377-493b-886d-ed88ec90eb05',
    title_en: 'Nice Car But...',
    body_en: 'Noisy engine, the turbo fails on many models. Unreliable engine.',
  },
  {
    id: 'ea3cee00-6150-44c4-ab06-a752bd28aee7',
    title_en: 'False TPMS Sensor Alerts',
    body_en: 'The sensors sometimes say you need to add air. Resetting the sensor afterwards is a bit complicated.\nOther than that, an excellent car.',
  },
  {
    id: '1f6002b4-d873-4f36-a26a-0e9acd457ec2',
    title_en: 'Lurches When Moving Off',
    body_en: "My son bought me this car last year. It's large and comfortable, but there's a noticeable lurch when you start pressing the accelerator. When coming to a stop you need to be careful — only press the gas very gently, otherwise there's a significant jerk forward.",
  },
  {
    id: '7ba57048-60fa-4731-843b-a53d1d3b6d2d',
    title_en: 'Israeli Driver Review',
    body_en: 'Really reliable! Insanely economical — something like 1:18 — recommended.',
  },
  {
    id: 'd4613da2-5466-446f-b397-3a06c5d8b844',
    title_en: '',
    body_en: 'Very reliable! Lacks storage space inside the car.',
  },
  {
    id: 'f5f5c88e-2578-4090-8487-cb418dd381b0',
    title_en: 'Comfortable Car',
    body_en: "I've had this car for several years and I'm very happy with it. Extremely reliable with almost no issues. One of its biggest advantages is that it's compact and easy to maneuver, which makes parking much simpler — especially living in Tel Aviv.",
  },
  {
    id: '5b8c9a16-0025-48da-890c-53276bea9ff9',
    title_en: 'Road Noise',
    body_en: 'Wind noise, you can hear the road. Not fully sealed.\nBut it is an agile car.',
  },
  {
    id: 'd2c0b749-98e7-49c8-b907-51fd01d2ea72',
    title_en: 'Water Sensor Failure',
    body_en: "Failed quickly, keeps showing it needs to be refilled. I disconnected it manually. Replacement would cost 800 NIS just for the part.",
  },
  {
    id: 'c8996337-fcf1-4d51-a210-3cdca8a57447',
    title_en: 'Great Car But Drinks a Lot of Fuel',
    body_en: 'Spacious and luxurious but a real fuel guzzler.',
  },
  {
    id: '46b47af2-9e5c-463a-845a-865868afafab',
    title_en: 'Agile and Economical, Problems Later On',
    body_en: 'Great car, very compact, practical, agile and fast! Really enjoyed it, but recently problems started. Had to replace the catalytic converter which led to other issues.\nEngine warning light came on for emissions.',
  },
  {
    id: '75cd0c6e-fca2-464f-b646-6e060c658e81',
    title_en: 'Spacious and Reliable Car',
    body_en: 'Among the best in its class — can last for years.',
  },
  {
    id: 'e50aa903-d5d7-4243-8612-541c94febcd0',
    title_en: 'Luxurious',
    body_en: 'A luxurious car but drinks fuel.',
  },
  {
    id: 'ab976fdb-65ee-494e-8271-de1716d154ae',
    title_en: 'CVT Gearbox Unpleasant to Drive',
    body_en: 'The car looks good but the CVT transmission is really noticeable when decelerating.',
  },
];

async function main() {
  console.log(`Pushing ${translations.length} translations to D1...\n`);
  let ok = 0, failed = 0;
  for (const t of translations) {
    process.stdout.write(`${t.id.slice(0, 8)}... `);
    try {
      const sql = `UPDATE reviews SET title_en = '${esc(t.title_en)}', body_en = '${esc(t.body_en)}' WHERE id = '${t.id}'`;
      d1Run(sql);
      console.log('✓');
      ok++;
    } catch (e) {
      console.log(`✗ (${e.message.slice(0, 60)})`);
      failed++;
    }
  }
  console.log(`\nDone: ${ok} updated, ${failed} failed.`);
}

main().catch(console.error);
