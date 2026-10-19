'use client';

import { useState, useMemo } from 'react';
import type { TrimSpecWithYear } from '@/lib/trimSpecsDb';

interface Props {
  trimSpecs: TrimSpecWithYear[];
  isEn: boolean;
  /** When on a year page: the year the user is viewing. Used to show a note if data is from a different year. */
  requestedYear?: number;
}

export default function TrimPerfStrip({ trimSpecs, isEn, requestedYear }: Props) {
  const years = useMemo(() => {
    const ys = [...new Set(trimSpecs.map(t => t.modelYear).filter((y): y is number => y != null))];
    return ys.sort((a, b) => b - a);
  }, [trimSpecs]);

  const [selectedYear, setSelectedYear] = useState<number | null>(years[0] ?? null);
  const [selectedTrimId, setSelectedTrimId] = useState<string | null>(null);

  const trimsForYear = useMemo(
    () => trimSpecs.filter(t => t.modelYear === selectedYear),
    [trimSpecs, selectedYear],
  );

  function handleYearChange(y: number) {
    setSelectedYear(y);
    setSelectedTrimId(null);
  }

  const activeTrim = selectedTrimId ? trimsForYear.find(t => t.id === selectedTrimId) ?? null : null;

  const stats = useMemo(() => {
    const pool = activeTrim ? [activeTrim] : trimsForYear;
    if (!pool.length) return [];

    const result: { label: string; value: string; unit: string }[] = [];

    const hpVals = pool.map(t => t.engineHp).filter((v): v is number => v != null);
    if (hpVals.length) {
      const mn = Math.min(...hpVals), mx = Math.max(...hpVals);
      result.push({ label: isEn ? 'HP' : 'כ"ס', value: mn === mx || !!activeTrim ? `${mn}` : `${mn}–${mx}`, unit: 'HP' });
    }

    const accVals = pool.map(t => t.acceleration).filter((v): v is number => v != null);
    if (accVals.length) {
      const mn = Math.min(...accVals), mx = Math.max(...accVals);
      result.push({ label: '0–100', value: activeTrim ? mn.toFixed(1) : `${mn.toFixed(1)}–${mx.toFixed(1)}`, unit: isEn ? 'sec' : 'שנ׳' });
    }

    const topVals = pool.map(t => t.topSpeedKmh).filter((v): v is number => v != null);
    if (topVals.length) {
      const mx = Math.max(...topVals);
      result.push({ label: isEn ? 'Top' : 'מקס׳', value: `${mx}`, unit: isEn ? 'km/h' : 'קמ"ש' });
    }

    const fcPool = pool.filter(t => t.fuelConsumption != null && t.fuelConsumption > 0);
    if (fcPool.length) {
      const electricPool = fcPool.filter(t => t.engineType === 'electric');
      const fuelPool = fcPool.filter(t => t.engineType !== 'electric');
      // Show electric consumption in kWh/100km
      if (electricPool.length) {
        const src = activeTrim && electricPool.find(t => t.id === activeTrim.id) ? [activeTrim] : electricPool;
        const mn = Math.min(...src.map(t => t.fuelConsumption!));
        const mx = Math.max(...src.map(t => t.fuelConsumption!));
        const val = activeTrim ? (activeTrim.fuelConsumption ?? mn).toFixed(1) : mn === mx ? mn.toFixed(1) : `${mn.toFixed(1)}–${mx.toFixed(1)}`;
        result.push({ label: isEn ? 'Energy' : 'חשמל', value: val, unit: isEn ? 'kWh/100km' : 'קוט״ש/100ק"מ' });
      }
      // Show non-electric consumption in km/L (converted from stored L/100km)
      if (fuelPool.length) {
        const src = activeTrim && fuelPool.find(t => t.id === activeTrim.id) ? [activeTrim] : fuelPool;
        const l100Vals = src.map(t => t.fuelConsumption!).filter(v => v >= 3.0);
        const finalSrc = l100Vals.length ? l100Vals : src.map(t => t.fuelConsumption!);
        const toKmL = (v: number) => parseFloat((100 / v).toFixed(1));
        const kmLVals = finalSrc.map(toKmL);
        const mn = Math.min(...kmLVals), mx = Math.max(...kmLVals);
        const val = activeTrim && fuelPool.find(t => t.id === activeTrim.id)
          ? toKmL(activeTrim.fuelConsumption!).toFixed(1)
          : mn === mx ? mn.toFixed(1) : `${mn.toFixed(1)}–${mx.toFixed(1)}`;
        result.push({ label: isEn ? 'Fuel' : 'דלק', value: val, unit: isEn ? 'km/L' : 'ק"מ/ל׳' });
      }
    }

    const torqVals = pool.map(t => t.torqueNm).filter((v): v is number => v != null);
    if (torqVals.length) {
      const mx = Math.max(...torqVals);
      result.push({ label: isEn ? 'Torque' : 'מומנט', value: `${mx}`, unit: 'N·m' });
    }

    const cargoVals = pool.map(t => t.cargoLiters).filter((v): v is number => v != null);
    if (cargoVals.length) {
      const mn = Math.min(...cargoVals), mx = Math.max(...cargoVals);
      result.push({ label: isEn ? 'Cargo' : 'תא מטען', value: mn === mx || !!activeTrim ? `${mn}` : `${mn}–${mx}`, unit: 'L' });
    }

    const priceVals = pool.map(t => t.priceIls).filter((v): v is number => v != null && v >= 50000);
    if (priceVals.length) {
      const mn = Math.min(...priceVals), mx = Math.max(...priceVals);
      const fmt = (v: number) => `₪${Math.round(v / 1000)}K`;
      result.push({ label: isEn ? 'Price' : 'מחיר', value: mn === mx || !!activeTrim ? fmt(mn) : `${fmt(mn)}–${fmt(mx)}`, unit: '' });
    }

    return result;
  }, [activeTrim, trimsForYear, isEn]);

  if (!trimSpecs.length) return null;

  const selStyle: React.CSSProperties = {
    border: '1px solid #d0d8e8', borderRadius: 7, padding: '4px 8px',
    fontSize: 12, color: '#1c2733', background: '#fff', cursor: 'pointer',
    fontFamily: 'inherit', outline: 'none',
  };

  // Note: show which year's data is displayed, and warn if it's a fallback
  const dataYear = selectedYear;
  const isFallback = requestedYear != null && dataYear != null && dataYear !== requestedYear;
  const sourceNote = dataYear != null
    ? (isFallback
        ? (isEn ? `No data for ${requestedYear} — showing ${dataYear}` : `אין נתונים ל-${requestedYear} — מוצג ${dataYear}`)
        : (isEn ? `Data for ${dataYear}` : `נתוני ${dataYear}`))
    : null;

  return (
    <div style={{ padding: '12px clamp(16px,3vw,28px)', borderBottom: '1px solid #eef1f5', background: '#fafbfc' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#8595a6', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            {isEn ? 'Performance' : 'נתוני ביצועים'}
          </span>
          {sourceNote && (
            <span style={{
              fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
              background: isFallback ? '#fff3cd' : '#e8f0fe',
              color: isFallback ? '#92620a' : '#1b4f8a',
            }}>
              {sourceNote}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {years.length > 1 && (
            <select
              value={selectedYear ?? ''}
              onChange={e => handleYearChange(Number(e.target.value))}
              style={selStyle}
              aria-label={isEn ? 'Select year' : 'בחר שנה'}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          {trimsForYear.length > 0 && (
            <select
              value={selectedTrimId ?? ''}
              onChange={e => setSelectedTrimId(e.target.value || null)}
              style={{ ...selStyle, maxWidth: 220 }}
              aria-label={isEn ? 'Select trim' : 'בחר טרים'}
            >
              <option value="">{isEn ? `All trims (${trimsForYear.length})` : `כל הטרימים (${trimsForYear.length})`}</option>
              {trimsForYear.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {stats.map(({ label, value, unit }) => (
          <div key={label} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            background: '#fff', border: '1px solid #e3e8ee', borderRadius: 10,
            padding: '8px 14px', minWidth: 72,
          }}>
            <span style={{ fontSize: 11, color: '#8595a6', fontWeight: 600, marginBottom: 2 }}>{label}</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#1c2733', lineHeight: 1.1 }}>{value}</span>
            {unit && <span style={{ fontSize: 10.5, color: '#a0adb8', marginTop: 1 }}>{unit}</span>}
          </div>
        ))}
        {!stats.length && (
          <span style={{ fontSize: 13, color: '#a0adb8' }}>{isEn ? 'No spec data available' : 'אין נתוני מפרט'}</span>
        )}
      </div>
    </div>
  );
}
