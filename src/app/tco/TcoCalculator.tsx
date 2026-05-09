'use client';

import { useState } from 'react';
import Link from 'next/link';

const FUEL_PRICES = { petrol: 7.0, diesel: 6.8, hybrid: 5.2, electric: 0.7 };
const FUEL_LABELS: Record<string, string> = {
  petrol: 'בנזין',
  diesel: 'דיזל',
  hybrid: 'היברידי',
  electric: 'חשמלי',
};

const CATEGORY_DEFAULTS: Record<string, { consumption: number; insurance: number; service: number; registration: number }> = {
  city:     { consumption: 7.5,  insurance: 3800, service: 2500, registration: 1200 },
  family:   { consumption: 8.0,  insurance: 4500, service: 3000, registration: 1400 },
  suv:      { consumption: 9.5,  insurance: 5500, service: 3800, registration: 1800 },
  luxury:   { consumption: 10.5, insurance: 9000, service: 6000, registration: 2500 },
  electric: { consumption: 18,   insurance: 5000, service: 1200, registration: 1400 }, // kWh/100km
};

const DEPRECIATION_RATES = [0.18, 0.12, 0.10, 0.09, 0.08];

function fmt(n: number) {
  return Math.round(n).toLocaleString('he-IL');
}

export default function TcoCalculator() {
  const [carPrice, setCarPrice] = useState(120000);
  const [carAge, setCarAge] = useState(0);
  const [kmYear, setKmYear] = useState(18000);
  const [fuelType, setFuelType] = useState<'petrol' | 'diesel' | 'hybrid' | 'electric'>('petrol');
  const [category, setCategory] = useState<'city' | 'family' | 'suv' | 'luxury' | 'electric'>('family');
  const [consumption, setConsumption] = useState(8.0);
  const [insurance, setInsurance] = useState(4500);
  const [service, setService] = useState(3000);
  const [registration, setRegistration] = useState(1400);
  const [years, setYears] = useState(5);

  const handleCategoryChange = (cat: string) => {
    const d = CATEGORY_DEFAULTS[cat] ?? CATEGORY_DEFAULTS.family;
    setCategory(cat as typeof category);
    setConsumption(d.consumption);
    setInsurance(d.insurance);
    setService(d.service);
    setRegistration(d.registration);
    if (cat === 'electric') setFuelType('electric');
    else if (fuelType === 'electric') setFuelType('petrol');
  };

  // Annual costs
  const fuelCostPerUnit = FUEL_PRICES[fuelType];
  const fuelAnnual = fuelType === 'electric'
    ? (consumption / 100) * kmYear * fuelCostPerUnit  // kWh * price per kWh
    : (consumption / 100) * kmYear * fuelCostPerUnit; // liters * price per liter

  // Total over N years
  const rows: { year: number; depreciation: number; fuel: number; insurance: number; service: number; registration: number; total: number; cumulative: number }[] = [];
  let cumulative = 0;
  let currentValue = carPrice;

  for (let y = 1; y <= years; y++) {
    const rateIdx = Math.min(carAge + y - 1, DEPRECIATION_RATES.length - 1);
    const depr = currentValue * DEPRECIATION_RATES[rateIdx];
    currentValue -= depr;
    const yearTotal = depr + fuelAnnual + insurance + service + registration;
    cumulative += yearTotal;
    rows.push({ year: y, depreciation: depr, fuel: fuelAnnual, insurance, service, registration, total: yearTotal, cumulative });
  }

  const totalCost = rows[rows.length - 1]?.cumulative ?? 0;
  const avgMonthly = totalCost / (years * 12);

  const sectionStyle: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px', marginBottom: 20,
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8,
    background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6,
  };

  return (
    <div>
      {/* Inputs */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 18px' }}>⚙️ פרטי הרכב</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <label style={labelStyle}>קטגוריה</label>
            <select style={inputStyle} value={category} onChange={e => handleCategoryChange(e.target.value)}>
              <option value="city">עירוני / קטן</option>
              <option value="family">משפחתי / האצ׳בק</option>
              <option value="suv">SUV / קרוסאובר</option>
              <option value="luxury">יוקרה</option>
              <option value="electric">חשמלי</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>סוג דלק / הנעה</label>
            <select style={inputStyle} value={fuelType} onChange={e => setFuelType(e.target.value as typeof fuelType)}>
              {Object.entries(FUEL_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>מחיר הרכב (₪)</label>
            <input type="number" style={inputStyle} value={carPrice} min={20000} max={800000} step={5000}
              onChange={e => setCarPrice(Number(e.target.value))} />
          </div>
          <div>
            <label style={labelStyle}>גיל הרכב (שנים)</label>
            <input type="number" style={inputStyle} value={carAge} min={0} max={20}
              onChange={e => setCarAge(Number(e.target.value))} />
          </div>
          <div>
            <label style={labelStyle}>ק"מ לשנה</label>
            <input type="number" style={inputStyle} value={kmYear} min={5000} max={80000} step={1000}
              onChange={e => setKmYear(Number(e.target.value))} />
          </div>
          <div>
            <label style={labelStyle}>{fuelType === 'electric' ? 'צריכה (kWh/100ק"מ)' : 'צריכת דלק (ל/100ק"מ)'}</label>
            <input type="number" style={inputStyle} value={consumption} min={3} max={25} step={0.5}
              onChange={e => setConsumption(Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 18px' }}>💰 עלויות שנתיות (ניתנות לעריכה)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <label style={labelStyle}>ביטוח מקיף (₪/שנה)</label>
            <input type="number" style={inputStyle} value={insurance} min={1000} max={30000} step={100}
              onChange={e => setInsurance(Number(e.target.value))} />
          </div>
          <div>
            <label style={labelStyle}>טיפולים ותחזוקה (₪/שנה)</label>
            <input type="number" style={inputStyle} value={service} min={500} max={20000} step={100}
              onChange={e => setService(Number(e.target.value))} />
          </div>
          <div>
            <label style={labelStyle}>רישוי ובדיקות (₪/שנה)</label>
            <input type="number" style={inputStyle} value={registration} min={500} max={5000} step={100}
              onChange={e => setRegistration(Number(e.target.value))} />
          </div>
          <div>
            <label style={labelStyle}>תקופת חישוב (שנים)</label>
            <input type="number" style={inputStyle} value={years} min={1} max={10}
              onChange={e => setYears(Math.max(1, Math.min(10, Number(e.target.value))))} />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={{ background: 'linear-gradient(135deg, rgba(230,57,70,0.08), rgba(124,21,32,0.04))', border: '2px solid rgba(230,57,70,0.2)', borderRadius: 14, padding: '24px 28px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 16px', color: 'var(--brand-red)' }}>📊 סיכום עלות בעלות</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
          {[
            { label: `סה"כ ${years} שנים`, value: `₪${fmt(totalCost)}`, highlight: true },
            { label: 'עלות חודשית ממוצעת', value: `₪${fmt(avgMonthly)}`, highlight: true },
            { label: `דלק (שנה)`, value: `₪${fmt(fuelAnnual)}` },
            { label: 'פחת שנה 1', value: `₪${fmt(rows[0]?.depreciation ?? 0)}` },
            { label: 'ביטוח', value: `₪${fmt(insurance)}` },
            { label: 'טיפולים', value: `₪${fmt(service)}` },
          ].map(({ label, value, highlight }) => (
            <div key={label} style={{
              textAlign: 'center',
              background: highlight ? 'rgba(230,57,70,0.08)' : 'var(--bg-secondary)',
              border: `1px solid ${highlight ? 'rgba(230,57,70,0.2)' : 'var(--border)'}`,
              borderRadius: 10, padding: '12px 8px',
            }}>
              <div style={{ fontSize: highlight ? '1.3rem' : '1.1rem', fontWeight: 900, color: highlight ? 'var(--brand-red)' : 'var(--text-primary)' }}>{value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Year-by-year table */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 16px' }}>📅 פירוט שנה אחר שנה</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {['שנה', 'פחת', 'דלק', 'ביטוח', 'טיפולים', 'רישוי', "סה\"כ שנתי", 'מצטבר'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.year} style={{ borderBottom: '1px solid var(--border)', background: r.year % 2 === 0 ? 'var(--bg-secondary)' : 'transparent' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 700 }}>שנה {r.year}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--brand-red)' }}>₪{fmt(r.depreciation)}</td>
                  <td style={{ padding: '8px 10px' }}>₪{fmt(r.fuel)}</td>
                  <td style={{ padding: '8px 10px' }}>₪{fmt(r.insurance)}</td>
                  <td style={{ padding: '8px 10px' }}>₪{fmt(r.service)}</td>
                  <td style={{ padding: '8px 10px' }}>₪{fmt(r.registration)}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 700 }}>₪{fmt(r.total)}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--brand-red)' }}>₪{fmt(r.cumulative)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 12, marginBottom: 0 }}>
          * מחיר בנזין ₪{FUEL_PRICES.petrol}/ל, דיזל ₪{FUEL_PRICES.diesel}/ל, היברידי ₪{FUEL_PRICES.hybrid}/ל, חשמל ₪{FUEL_PRICES.electric}/kWh (הערכה ממוצעת).
          הפחת מחושב על ערך הרכב בתחילת כל שנה. בדיקת מחירי תיקונים: <Link href="/repairs" style={{ color: 'var(--text-muted)' }}>עלויות תיקון</Link>.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/cars" className="btn btn-primary" style={{ fontSize: '0.875rem' }}>
          השווה בין דגמים →
        </Link>
        <Link href="/repairs" className="btn btn-outline" style={{ fontSize: '0.875rem' }}>
          עלויות תיקון
        </Link>
      </div>
    </div>
  );
}
