import type { TrimSpecWithYear } from '@/lib/trimSpecsDb';
import type { ExpertReview } from '@/lib/expertReviews';

interface Props {
  trimSpecs: TrimSpecWithYear[];
  expertReview: ExpertReview | null;
  avgRating: number | null;
  reviewCount: number;
  recallCount: number;
  makeNameHe: string;
  modelNameHe: string;
  makeNameEn: string;
  modelNameEn: string;
  category: string;
  isEn: boolean;
}

interface FaqItem {
  q: string;
  a: string;
}

function range(vals: number[], toFixed = 0): string {
  const mn = Math.min(...vals);
  const mx = Math.max(...vals);
  if (mn === mx) return toFixed > 0 ? mn.toFixed(toFixed) : String(mn);
  return `${toFixed > 0 ? mn.toFixed(toFixed) : mn}–${toFixed > 0 ? mx.toFixed(toFixed) : mx}`;
}

function buildFaqs(props: Props): FaqItem[] {
  const {
    trimSpecs, expertReview, avgRating, reviewCount, recallCount,
    makeNameHe, modelNameHe, makeNameEn, modelNameEn, category, isEn,
  } = props;

  const carHe = `${makeNameHe} ${modelNameHe}`;
  const carEn = `${makeNameEn} ${modelNameEn}`;
  const car = isEn ? carEn : carHe;

  const catHe: Record<string, string> = { suv: 'SUV', crossover: 'קרוסאובר', sedan: 'סדאן', hatchback: "האצ'בק", minivan: 'מיניוואן', van: 'ואן', coupe: 'קופה', convertible: 'קבריולט', sports: 'ספורט', pickup: 'טנדר', electric: 'חשמלי' };
  const catLabel = catHe[category] || category.toUpperCase();

  const faqs: FaqItem[] = [];

  // ── HP ──────────────────────────────────────────────────────────────────────
  const hpVals = trimSpecs.map(t => t.engineHp).filter((v): v is number => v != null);
  if (hpVals.length) {
    const val = range(hpVals);
    faqs.push(isEn
      ? { q: `How much horsepower does the ${carEn} have?`, a: `The ${carEn} is available with ${val} HP depending on trim level.` }
      : { q: `כמה כוחות סוס יש ל${carHe}?`, a: `ל${carHe} יש ${val} כ"ס בהתאם לגרסה.` }
    );
  }

  // ── 0–100 ────────────────────────────────────────────────────────────────────
  const accVals = trimSpecs.map(t => t.acceleration).filter((v): v is number => v != null);
  if (accVals.length) {
    const val = range(accVals, 1);
    faqs.push(isEn
      ? { q: `What is the 0–100 km/h acceleration of the ${carEn}?`, a: `The ${carEn} accelerates from 0 to 100 km/h in ${val} seconds.` }
      : { q: `כמה שניות לוקח ל${carHe} מ-0 ל-100 קמ"ש?`, a: `ה${carHe} מאיץ מ-0 ל-100 קמ"ש ב-${val} שניות.` }
    );
  }

  // ── Fuel / Energy ────────────────────────────────────────────────────────────
  const electricTrims = trimSpecs.filter(t => t.engineType === 'electric' && t.fuelConsumption != null && t.fuelConsumption > 0);
  const fuelTrims = trimSpecs.filter(t => t.engineType !== 'electric' && t.fuelConsumption != null && t.fuelConsumption! >= 3.0);
  if (electricTrims.length) {
    const vals = electricTrims.map(t => t.fuelConsumption!);
    const val = range(vals, 1);
    faqs.push(isEn
      ? { q: `What is the energy consumption of the ${carEn}?`, a: `The ${carEn} consumes ${val} kWh/100km on average.` }
      : { q: `מה צריכת החשמל של ה${carHe}?`, a: `צריכת החשמל של ה${carHe} היא ${val} קוט״ש/100 ק"מ בממוצע.` }
    );
  }
  if (fuelTrims.length) {
    const l100Vals = fuelTrims.map(t => t.fuelConsumption!);
    const kmLVals = l100Vals.map(v => parseFloat((100 / v).toFixed(1)));
    const val = range(kmLVals, 1);
    faqs.push(isEn
      ? { q: `What is the fuel consumption of the ${carEn}?`, a: `The ${carEn} averages ${val} km/L.` }
      : { q: `מה צריכת הדלק של ה${carHe}?`, a: `צריכת הדלק של ה${carHe} היא ${val} ק"מ/ל׳ בממוצע.` }
    );
  }

  // ── Cargo ────────────────────────────────────────────────────────────────────
  const cargoVals = trimSpecs.map(t => t.cargoLiters).filter((v): v is number => v != null);
  if (cargoVals.length) {
    const val = range(cargoVals);
    faqs.push(isEn
      ? { q: `What is the trunk/cargo size of the ${carEn}?`, a: `The ${carEn} has a cargo capacity of ${val} liters.` }
      : { q: `מה גודל תא המטען של ה${carHe}?`, a: `נפח תא המטען של ה${carHe} הוא ${val} ליטר.` }
    );
  }

  // ── Price ────────────────────────────────────────────────────────────────────
  const priceVals = trimSpecs.map(t => t.priceIls).filter((v): v is number => v != null && v >= 50000);
  if (priceVals.length) {
    const mn = Math.min(...priceVals);
    const mx = Math.max(...priceVals);
    const fmtHe = (v: number) => `₪${v.toLocaleString('he-IL')}`;
    const fmtEn = (v: number) => `₪${Math.round(v / 1000)}K`;
    const priceStr = mn === mx
      ? (isEn ? fmtEn(mn) : fmtHe(mn))
      : (isEn ? `${fmtEn(mn)}–${fmtEn(mx)}` : `${fmtHe(mn)} עד ${fmtHe(mx)}`);
    faqs.push(isEn
      ? { q: `What is the price of the ${carEn} in Israel?`, a: `The ${carEn} is priced between ${priceStr} in Israel.` }
      : { q: `מה המחיר של ה${carHe} בישראל?`, a: `מחיר ה${carHe} בישראל נע בין ${priceStr}.` }
    );
  }

  // ── Recommended ──────────────────────────────────────────────────────────────
  if (avgRating !== null && reviewCount >= 3) {
    const score = (avgRating * 2).toFixed(1);
    const recommended = avgRating >= 3.8;
    faqs.push(isEn
      ? {
          q: `Is the ${carEn} a reliable car?`,
          a: recommended
            ? `Yes — the ${carEn} is rated ${score}/10 by ${reviewCount} reviewers on this site.`
            : `The ${carEn} has a mixed reputation, rated ${score}/10 by ${reviewCount} reviewers. Check the reviews section for details.`,
        }
      : {
          q: `האם ה${carHe} רכב אמין?`,
          a: recommended
            ? `כן — ה${carHe} קיבל ציון ${score}/10 מתוך ${reviewCount} ביקורות באתר.`
            : `ל${carHe} יש ביקורות מעורבות — ציון ${score}/10 מתוך ${reviewCount} ביקורות. מומלץ לעיין בחוות הדעת לפרטים.`,
        }
    );
  }

  // ── Common problems ──────────────────────────────────────────────────────────
  const cons = isEn ? expertReview?.consEn : expertReview?.cons;
  if (cons && cons.length >= 2) {
    const top = cons.slice(0, 3).join(isEn ? '; ' : '; ');
    const hasOwnerReviews = reviewCount > 0;
    faqs.push(isEn
      ? { q: `What are the common problems with the ${carEn}?`, a: hasOwnerReviews ? `Common owner complaints include: ${top}.` : `Known drawbacks include: ${top}.` }
      : { q: `מה הבעיות הנפוצות של ה${carHe}?`, a: hasOwnerReviews ? `תלונות נפוצות של בעלים כוללות: ${top}.` : `חסרונות ידועים כוללים: ${top}.` }
    );
  }

  // ── Family suitability ───────────────────────────────────────────────────────
  const familyCats = ['suv', 'minivan', 'van', 'crossover'];
  const notFamilyCats = ['coupe', 'convertible', 'sports'];
  const isFamily = familyCats.includes(category);
  const notFamily = notFamilyCats.includes(category);
  const minCargo = cargoVals.length ? Math.min(...cargoVals) : null;

  if (isFamily || notFamily || minCargo !== null) {
    let answer: string;
    if (isEn) {
      const smallCargo = minCargo !== null && minCargo < 200;
      if (isFamily && !smallCargo) answer = `Yes, the ${carEn} is well-suited for families with children thanks to its spacious ${category} body style${minCargo ? ` and ${minCargo}+ liters of trunk space` : ''}.`;
      else if (isFamily && smallCargo) answer = `The ${carEn} is a ${category} but has only ${minCargo} liters of trunk space, which may be tight for families. Best suited for couples or small families.`;
      else if (notFamily) answer = `The ${carEn} is a ${category} and is less practical for families with children. Consider a larger SUV or sedan.`;
      else answer = `The ${carEn} can work for a family — it has ${minCargo} liters of trunk space. Check the full specs for passenger and cargo dimensions.`;
    } else {
      const smallCargo = minCargo !== null && minCargo < 200;
      if (isFamily && !smallCargo) answer = `כן, ה${carHe} מתאים למשפחות עם ילדים הודות למבנה ה-${catLabel} המרווח${minCargo ? ` ו-${minCargo} ליטר תא מטען ומעלה` : ''}.`;
      else if (isFamily && smallCargo) answer = `ה${carHe} הוא ${catLabel} אבל עם תא מטען של ${minCargo} ליטר בלבד, מה שעלול להיות צפוף למשפחות. מתאים יותר לזוגות או משפחות קטנות.`;
      else if (notFamily) answer = `ה${carHe} הוא ${catLabel} ופחות פרקטי למשפחות עם ילדים. מומלץ לשקול SUV או סדאן מרווח יותר.`;
      else answer = `ה${carHe} יכול להתאים למשפחה — יש לו ${minCargo} ליטר תא מטען. מומלץ לבדוק את נתוני המרווח המלאים.`;
    }
    faqs.push(isEn
      ? { q: `Is the ${carEn} suitable for a family with children?`, a: answer }
      : { q: `האם ה${carHe} מתאים למשפחה עם ילדים?`, a: answer }
    );
  }

  // ── Recalls ──────────────────────────────────────────────────────────────────
  faqs.push(isEn
    ? {
        q: `Have there been any recalls for the ${carEn}?`,
        a: recallCount > 0
          ? `Yes — there are ${recallCount} recorded recall(s) for the ${carEn}. See the Recalls section on this page for details.`
          : `No recalls have been recorded for the ${carEn} in our database. Always check the manufacturer's official recall portal for the latest information.`,
      }
    : {
        q: `האם היו קריאות חזרה ל${carHe}?`,
        a: recallCount > 0
          ? `כן — נמצאו ${recallCount} קריאות חזרה ל${carHe}. ראו את סעיף הקריאות חזרה בדף זה לפרטים.`
          : `לא נמצאו קריאות חזרה ל${carHe} במסד הנתונים שלנו. מומלץ לבדוק בפורטל הרשמי של היצרן.`,
      }
  );

  return faqs;
}

export default function ModelFaq(props: Props) {
  const { isEn } = props;
  const faqs = buildFaqs(props);
  if (faqs.length === 0) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <section style={{ marginTop: 28, marginBottom: 8 }} dir={isEn ? 'ltr' : 'rtl'}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div style={{
        background: '#fff', border: '1px solid #e3e8ee', borderRadius: 18,
        overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        <div style={{
          padding: '14px clamp(16px,3vw,28px)', background: '#f8fafc',
          borderBottom: '1px solid #e3e8ee',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 16 }}>❓</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#1c2733', letterSpacing: '-0.01em' }}>
            {isEn ? 'Frequently Asked Questions' : 'שאלות נפוצות'}
          </span>
        </div>

        <div>
          {faqs.map(({ q, a }, i) => (
            <details
              key={i}
              style={{ borderBottom: i < faqs.length - 1 ? '1px solid #eef1f5' : 'none' }}
            >
              <summary style={{
                padding: '13px clamp(16px,3vw,28px)',
                cursor: 'pointer',
                fontSize: 14, fontWeight: 700, color: '#1c2733',
                listStyle: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                userSelect: 'none',
              }}>
                <span>{q}</span>
                <span style={{ fontSize: 18, color: '#8595a6', flexShrink: 0, fontWeight: 400 }}>+</span>
              </summary>
              <div style={{
                padding: '0 clamp(16px,3vw,28px) 14px',
                fontSize: 13.5, color: '#4a5b6d', lineHeight: 1.65,
              }}>
                {a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
