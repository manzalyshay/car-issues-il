'use client';

import { useState } from 'react';
import type { Recall } from '@/app/api/recalls/route';
import { useLocale } from '@/lib/localeContext';

type ZoneId = 'engine' | 'cabin' | 'rear' | 'brakes' | 'electrical';

const ZONE_LABELS: Record<ZoneId, { he: string; en: string; emoji: string }> = {
  engine:     { he: 'מנוע ומערכות הנעה', en: 'Engine & Drivetrain', emoji: '🔧' },
  brakes:     { he: 'בלמים, גלגלים ומתלים', en: 'Brakes, Wheels & Suspension', emoji: '🛑' },
  cabin:      { he: 'בטיחות תא נוסעים', en: 'Interior Safety', emoji: '💺' },
  electrical: { he: 'מערכת חשמל ואלקטרוניקה', en: 'Electrical & Electronics', emoji: '⚡' },
  rear:       { he: 'מבנה, גוף ומערכות אחוריות', en: 'Structure & Body', emoji: '🏗️' },
};

const ZONE_KEYWORDS: Record<ZoneId, string[]> = {
  engine: [
    'engine', 'cooling', 'fuel', 'power train', 'powertrain', 'exhaust', 'emission',
    'transmission', 'torque', 'turbo', 'injector', 'throttle', 'intake', 'propulsion',
    'motor', 'gasket', 'pump', 'carburetor', 'cylinder', 'piston', 'alternator belt',
    'serpentine', 'timing', 'valve', 'oil', 'coolant', 'radiator',
    'actuator', 'solenoid',
  ],
  brakes: [
    'brake', 'abs', 'antilock', 'caliper', 'rotor', 'drum', 'tire', 'wheel',
    'suspension', 'shock', 'strut', 'axle', 'hub', 'lug', 'bearing', 'pad',
    'rim', 'alignment', 'spring', 'control arm',
  ],
  cabin: [
    'air bag', 'airbag', 'seat belt', 'seatbelt', 'seat', 'door', 'window',
    'wiper', 'restraint', 'frontal', 'curtain', 'buckle', 'latch', 'deployment',
    'pretensioner', 'child', 'steering', 'visibility', 'instrument', 'dash',
    'occupant', 'driver', 'passenger',
  ],
  electrical: [
    'electrical', 'wiring', 'lighting', 'headlight', 'tail light', 'bulb', 'led',
    'battery', 'sensor', 'module', 'control unit', 'ecu', 'computer', 'camera',
    'radar', 'collision', 'back over', 'speed control', 'cruise', 'software',
    'switch', 'relay', 'fuse', 'horn', 'alarm', 'powertrain control', 'warning',
  ],
  rear: [
    'structure', 'frame', 'body', 'corrosion', 'weld', 'mount', 'hood', 'trunk',
    'hatch', 'roof', 'bumper', 'glass', 'mirror', 'liftgate', 'tailgate',
  ],
};

function classifyRecall(component: string, componentEn?: string): ZoneId {
  const lower = (componentEn || component).toLowerCase();
  const order: ZoneId[] = ['electrical', 'cabin', 'brakes', 'engine', 'rear'];
  for (const zone of order) {
    if (ZONE_KEYWORDS[zone].some(k => lower.includes(k))) return zone;
  }
  return 'rear';
}

function zoneColors(count: number, active: boolean) {
  if (count === 0) return {
    fill: active ? 'rgba(148,163,184,0.07)' : 'transparent',
    stroke: active ? 'rgba(148,163,184,0.5)' : 'rgba(148,163,184,0.2)',
    sw: active ? 1.5 : 0.8,
    badge: null as string | null,
  };
  const [f, s] = count <= 2
    ? ['rgba(245,158,11,0.13)', '#f59e0b']
    : count <= 5
    ? ['rgba(249,115,22,0.18)', '#f97316']
    : ['rgba(239,68,68,0.22)', '#ef4444'];
  return {
    fill: active ? f.replace(/[\d.]+\)$/, (m: string) => `${Math.min(parseFloat(m) * 2.2, 0.42)})`) : f,
    stroke: s,
    sw: active ? 2 : 1.5,
    badge: s,
  };
}

interface Props {
  recalls: Recall[];
}

export default function CarDiagramRecalls({ recalls }: Props) {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const [activeZone, setActiveZone] = useState<ZoneId | null>(null);

  // Group recalls by zone
  const byZone: Record<ZoneId, Recall[]> = { engine: [], cabin: [], rear: [], brakes: [], electrical: [] };
  for (const r of recalls) byZone[classifyRecall(r.component, r.componentEn)].push(r);

  const z = (zone: ZoneId) => zoneColors(byZone[zone].length, activeZone === zone);

  const zoneHandlers = (zone: ZoneId) => ({
    onMouseEnter: () => setActiveZone(zone),
    onMouseLeave: () => setActiveZone(null),
    onClick: () => setActiveZone(prev => prev === zone ? null : zone),
    style: { cursor: byZone[zone].length > 0 ? 'pointer' : 'default' } as React.CSSProperties,
  });

  const active = activeZone;
  const activeRecalls = active ? byZone[active] : [];
  const activeMeta = active ? ZONE_LABELS[active] : null;

  const totalZonesWithRecalls = (Object.keys(byZone) as ZoneId[]).filter(z => byZone[z].length > 0).length;

  if (recalls.length === 0) return null;

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Header */}
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
        {isEn ? `${recalls.length} recalls across ${totalZonesWithRecalls} system${totalZonesWithRecalls !== 1 ? 's' : ''} — hover to explore`
               : `${recalls.length} ריקולים ב-${totalZonesWithRecalls} מערכות — רחף לפרטים`}
      </div>

      {/* SVG Diagram */}
      <svg
        viewBox="0 0 540 200"
        style={{ width: '100%', maxWidth: 540, display: 'block', overflow: 'visible', margin: '0 auto' }}
        aria-label={isEn ? 'Car recall zones diagram' : 'תרשים אזורי ריקול ברכב'}
      >
        {/* ── ZONE FILLS (drawn first, behind car outline) ── */}

        {/* Engine zone: front bumper → A-pillar */}
        <path
          d="M 28,148 L 28,118 L 50,108 L 108,84 L 148,76 L 148,148 Z"
          fill={z('engine').fill} stroke={z('engine').stroke} strokeWidth={z('engine').sw}
          strokeLinejoin="round"
          {...zoneHandlers('engine')}
        />

        {/* Cabin zone: A-pillar → C-pillar */}
        <path
          d="M 148,148 L 148,76 L 172,52 L 192,48 L 350,48 L 372,52 L 400,76 L 400,148 Z"
          fill={z('cabin').fill} stroke={z('cabin').stroke} strokeWidth={z('cabin').sw}
          strokeLinejoin="round"
          {...zoneHandlers('cabin')}
        />

        {/* Rear zone: C-pillar → rear bumper */}
        <path
          d="M 400,148 L 400,76 L 445,94 L 493,110 L 508,126 L 512,140 L 508,148 Z"
          fill={z('rear').fill} stroke={z('rear').stroke} strokeWidth={z('rear').sw}
          strokeLinejoin="round"
          {...zoneHandlers('rear')}
        />

        {/* Brakes/suspension: both wheel areas */}
        <circle cx={129} cy={170} r={36}
          fill={z('brakes').fill} stroke={z('brakes').stroke} strokeWidth={z('brakes').sw}
          {...zoneHandlers('brakes')}
        />
        <circle cx={399} cy={170} r={36}
          fill={z('brakes').fill} stroke={z('brakes').stroke} strokeWidth={z('brakes').sw}
          {...zoneHandlers('brakes')}
        />

        {/* Electrical: roof strip hit area */}
        <rect x={148} y={48} width={252} height={28} rx={6}
          fill={z('electrical').fill} stroke={z('electrical').stroke} strokeWidth={z('electrical').sw}
          {...zoneHandlers('electrical')}
        />

        {/* ── CAR OUTLINE (on top — pointer-events none) ── */}

        {/* Main body silhouette */}
        <path
          d={`M 28,148 L 28,118 L 50,108 L 108,84 L 148,76
              L 172,52 L 192,48 L 350,48 L 372,52 L 400,76
              L 445,94 L 493,110 L 508,126 L 512,140 L 508,148
              L 435,148 A 45,45 0 0,1 363,148
              L 165,148 A 45,45 0 0,1 93,148
              L 28,148 Z`}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinejoin="round"
          style={{ opacity: 0.25, color: '#64748b' }}
          pointerEvents="none"
        />

        {/* Windows */}
        <g stroke="currentColor" strokeWidth={1} fill="rgba(147,197,253,0.07)"
          pointerEvents="none" style={{ opacity: 0.55, color: '#94a3b8' }}>
          {/* Windshield */}
          <path d="M 152,76 L 174,52 L 192,48 L 250,48 L 250,76 Z" />
          {/* Front door window */}
          <path d="M 250,76 L 250,48 L 308,48 L 308,76 Z" />
          {/* Rear window */}
          <path d="M 308,76 L 308,48 L 350,48 L 372,52 L 396,76 Z" />
        </g>

        {/* B-pillar */}
        <line x1={250} y1={48} x2={250} y2={148}
          stroke="#94a3b8" strokeWidth={1.5} opacity={0.25} pointerEvents="none" />

        {/* Headlight */}
        <rect x={28} y={110} width={5} height={16} rx={2}
          fill="#fef08a" opacity={0.6} pointerEvents="none" />

        {/* Taillight */}
        <rect x={507} y={119} width={5} height={20} rx={2}
          fill="#fca5a5" opacity={0.6} pointerEvents="none" />

        {/* Wheels (pointer-events none — zones handle the interaction) */}
        <g pointerEvents="none">
          {[129, 399].map(cx => (
            <g key={cx}>
              <circle cx={cx} cy={170} r={27} fill="#1e293b" stroke="#475569" strokeWidth={1.5} />
              <circle cx={cx} cy={170} r={13} fill="none" stroke="#64748b" strokeWidth={1} />
              <circle cx={cx} cy={170} r={4} fill="#475569" />
              {/* Spokes */}
              {[0, 60, 120, 180, 240, 300].map(angle => {
                const rad = (angle * Math.PI) / 180;
                return (
                  <line key={angle}
                    x1={cx + Math.cos(rad) * 5} y1={170 + Math.sin(rad) * 5}
                    x2={cx + Math.cos(rad) * 12} y2={170 + Math.sin(rad) * 12}
                    stroke="#64748b" strokeWidth={1}
                  />
                );
              })}
            </g>
          ))}
        </g>

        {/* Ground line */}
        <line x1={20} y1={197} x2={520} y2={197}
          stroke="#94a3b8" strokeWidth={1} opacity={0.18} pointerEvents="none" />

        {/* ── RECALL COUNT BADGES ── */}
        {(Object.entries(byZone) as [ZoneId, Recall[]][]).map(([zone, zRecalls]) => {
          if (zRecalls.length === 0) return null;
          const badgeColor = zoneColors(zRecalls.length, false).badge!;
          // Badge anchor per zone
          const anchors: Record<ZoneId, [number, number]> = {
            engine:     [80,  105],
            cabin:      [274,  93],
            rear:       [454, 105],
            brakes:     [264, 168],
            electrical: [274,  61],
          };
          const [bx, by] = anchors[zone];
          return (
            <g key={zone} pointerEvents="none">
              <circle cx={bx} cy={by} r={12} fill={badgeColor} />
              <text x={bx} y={by + 4} textAnchor="middle" fill="white"
                fontSize={10} fontWeight="bold" fontFamily="sans-serif">
                {zRecalls.length}
              </text>
            </g>
          );
        })}

        {/* Electrical zone label (⚡ on roof) */}
        {byZone.electrical.length === 0 && (
          <text x={274} y={68} textAnchor="middle" fontSize={10}
            fill="#94a3b8" opacity={0.4} pointerEvents="none" fontFamily="sans-serif">
            ⚡
          </text>
        )}
      </svg>

      {/* ── INFO PANEL ── */}
      <div style={{
        marginTop: 12,
        minHeight: 72,
        borderRadius: 12,
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        background: active ? 'var(--surface-2)' : 'var(--bg-muted)',
        padding: '12px 16px',
        transition: 'border-color 0.2s, background 0.2s',
      }}>
        {active && activeMeta ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: '1.1rem' }}>{activeMeta.emoji}</span>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                {isEn ? activeMeta.en : activeMeta.he}
              </span>
              <span style={{
                marginInlineStart: 4, fontSize: '0.72rem', fontWeight: 700,
                background: zoneColors(activeRecalls.length, false).badge ?? 'var(--accent)',
                color: '#fff', borderRadius: 999, padding: '1px 8px',
              }}>
                {activeRecalls.length} {isEn ? 'recalls' : 'ריקולים'}
              </span>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {activeRecalls.slice(0, 5).map(r => (
                <li key={r.id} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }}>›</span>
                  <span>{r.component}{r.year ? ` (${r.year})` : ''}</span>
                </li>
              ))}
              {activeRecalls.length > 5 && (
                <li style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingInlineStart: 14 }}>
                  {isEn ? `+${activeRecalls.length - 5} more` : `+${activeRecalls.length - 5} נוספים`}
                </li>
              )}
            </ul>
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', paddingTop: 8 }}>
            {isEn ? 'Hover or tap a zone to see which systems have recalls'
                   : 'רחף מעל אזור ברכב לפרטי הריקולים לפי מערכת'}
          </div>
        )}
      </div>
    </div>
  );
}
