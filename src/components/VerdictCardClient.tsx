'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Issue {
  key: string;
  nameHe: string;
  nameEn: string;
  costRange: string;
  notes?: string;
}

interface Props {
  issues: Issue[];
  makeSlug: string;
  modelSlug: string;
  isEn: boolean;
  verdictText: string | null;
  makeNameHe: string;
  modelNameHe: string;
  makeNameEn: string;
  modelNameEn: string;
}

export default function VerdictCardClient({
  issues, makeSlug, modelSlug, isEn, verdictText,
}: Props) {
  const [openIssue, setOpenIssue] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'agree' | 'disagree' | null>(null);

  return (
    <>
      {/* ── Known Issues Accordion ── */}
      {issues.length > 0 && (
        <div style={{ padding: '16px clamp(16px,3vw,28px) 4px', borderTop: '1px solid #eef1f5' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1c2733', marginBottom: 8 }}>
            {isEn ? '🔧 Known Issues' : '🔧 בעיות ידועות'}
          </div>
          {issues.map((issue) => (
            <div key={issue.key} style={{
              border: '1px solid #e3e8ee', borderRadius: 10,
              marginBottom: 8, overflow: 'hidden',
            }}>
              <button
                onClick={() => setOpenIssue(openIssue === issue.key ? null : issue.key)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 12, padding: '12px 14px',
                  background: openIssue === issue.key ? '#f8fafc' : '#fff',
                  border: 'none', cursor: 'pointer',
                  textAlign: 'start', fontFamily: 'inherit',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: '#1c2733' }}>
                  🔧 {isEn ? (issue.nameEn || '') : issue.nameHe}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#d97706', background: '#fef3cd', padding: '2px 8px', borderRadius: 99 }}>
                    ₪{issue.costRange}
                  </span>
                  <span style={{
                    fontSize: 14, color: '#8595a6', display: 'inline-block',
                    transform: openIssue === issue.key ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}>⌄</span>
                </span>
              </button>
              {openIssue === issue.key && issue.notes && (
                <div style={{
                  padding: 14, borderTop: '1px solid #eef1f5',
                  fontSize: 13, color: '#4a5b6d', lineHeight: 1.6, fontStyle: 'italic',
                }}>
                  "{issue.notes}"
                </div>
              )}
            </div>
          ))}
          <Link
            href={`/cars/${makeSlug}/${modelSlug}/issues`}
            style={{ fontSize: 13, color: '#1b4f8a', fontWeight: 600, textDecoration: 'none' }}
          >
            {isEn ? 'View all reported issues →' : 'לכל הבעיות המדווחות ←'}
          </Link>
        </div>
      )}

      {/* ── Verdict text ── */}
      {verdictText && (
        <div style={{ padding: '6px clamp(16px,3vw,28px) 20px', borderTop: issues.length > 0 ? 'none' : '1px solid #eef1f5' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1c2733', marginBottom: 6 }}>
            {isEn ? 'Full Verdict' : 'ניתוח מלא'}
          </div>
          <p style={{ margin: 0, fontSize: 14, color: '#4a5b6d', maxWidth: '70ch', lineHeight: 1.65 }}>
            {verdictText}
          </p>
        </div>
      )}

      {/* ── Owner feedback ── */}
      <div style={{
        padding: '18px clamp(16px,3vw,28px)',
        background: '#f2f7fc', borderTop: '1px solid #e3e8ee',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center',
        justifyContent: 'space-between', gap: 14,
      }}>
        {feedback === null ? (
          <>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1c2733' }}>
              {isEn ? 'Does this match your experience?' : 'האם זה מתאים לניסיון שלך?'}
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setFeedback('agree')}
                style={{
                  border: '1px solid #dde3ea', background: '#fff',
                  borderRadius: 999, padding: '9px 18px', fontSize: 13.5,
                  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                👍 {isEn ? 'Yes' : 'כן'}
              </button>
              <button
                onClick={() => setFeedback('disagree')}
                style={{
                  border: '1px solid #dde3ea', background: '#fff',
                  borderRadius: 999, padding: '9px 18px', fontSize: 13.5,
                  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                👎 {isEn ? 'No' : 'לא'}
              </button>
            </div>
          </>
        ) : (
          <>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1c2733' }}>
              {isEn ? 'Thanks for your feedback!' : 'תודה על המשוב!'}
            </span>
            <Link
              href={`/cars/${makeSlug}/${modelSlug}#write-review`}
              style={{
                border: 'none', background: '#1b4f8a', color: '#fff',
                borderRadius: 999, padding: '10px 20px', fontSize: 13.5,
                fontWeight: 700, textDecoration: 'none', cursor: 'pointer',
              }}
            >
              {isEn ? 'Write a review →' : 'כתוב ביקורת ←'}
            </Link>
          </>
        )}
      </div>
    </>
  );
}
