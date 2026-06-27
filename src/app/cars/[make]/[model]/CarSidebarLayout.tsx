'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import CarVideosTab from '@/components/CarVideosTab';
import CarImagesTab from '@/components/CarImagesTab';
import TrimSpecsTab from '@/components/TrimSpecsTab';
import { useLocale } from '@/lib/localeContext';
import type { CarVideo } from '@/lib/youtubeVideos';
import type { CarImage } from '@/lib/carImages';

type Tab = 'reviews' | 'specs' | 'videos' | 'images';

interface Props {
  makeSlug: string;
  modelSlug: string;
  makeNameHe: string;
  modelNameHe: string;
  defaultYear?: number;
  children: React.ReactNode;
}

/* ── Section anchor IDs used by the main content ── */
const ANCHORS = ['reviews', 'specs', 'trims', 'recalls', 'repair', 'compare'] as const;

export default function CarSidebarLayout({ makeSlug, modelSlug, makeNameHe, modelNameHe, defaultYear, children }: Props) {
  const { t } = useLocale();
  const s = t.sidebar;
  const [tab, setTab] = useState<Tab>('reviews');
  const [videos, setVideos] = useState<CarVideo[] | null>(null);
  const [images, setImages] = useState<CarImage[] | null>(null);
  const [videosLoading, setVideosLoading] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('reviews');
  const navRef = useRef<HTMLDivElement>(null);

  /* Track scroll position to highlight active subnav item */
  useEffect(() => {
    const handler = () => {
      for (const id of [...ANCHORS].reverse()) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.getBoundingClientRect().top;
          if (top < 160) { setActiveSection(id); break; }
        }
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleTabClick = async (next: Tab) => {
    setTab(next);
    if (next === 'videos' && videos === null && !videosLoading) {
      setVideosLoading(true);
      try {
        const res = await fetch(`/api/car-media?make=${makeSlug}&model=${modelSlug}&type=videos`);
        setVideos(await res.json());
      } catch { setVideos([]); }
      finally { setVideosLoading(false); }
    }
    if (next === 'images' && images === null && !imagesLoading) {
      setImagesLoading(true);
      try {
        const res = await fetch(`/api/car-media?make=${makeSlug}&model=${modelSlug}&type=images`);
        setImages(await res.json());
      } catch { setImages([]); }
      finally { setImagesLoading(false); }
    }
  };

  const loadingPlaceholder = (
    <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
      {t.carTabs.loading}
    </div>
  );

  /* ── Subnav items — sections that scroll + media tabs ── */
  const subnavItems: { id: string; label: string; icon: string; isTab?: Tab; isAnchor?: boolean }[] = [
    { id: 'reviews', label: s.reviews, icon: '⭐', isAnchor: true },
    { id: 'specs',   label: s.specs,   icon: '📋', isAnchor: true },
    { id: 'trims',   label: t.nav.allMakes === 'All Makes' ? 'Trims' : 'גרסאות', icon: '🚗', isTab: 'specs' },
    { id: 'repair',  label: s.tco,     icon: '🔧', isAnchor: true },
    { id: 'recalls', label: s.issues,  icon: '⚠️', isAnchor: true },
    { id: 'videos',  label: s.videos,  icon: '🎬', isTab: 'videos' },
    { id: 'images',  label: s.images,  icon: '📷', isTab: 'images' },
  ];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 56 + 48 + 16; // header + subnav + buffer
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <div style={{ minHeight: 600 }}>

      {/* ── Sticky horizontal subnav ── */}
      <div className="car-subnav">
        <div className="car-subnav-inner container" ref={navRef}>
          {subnavItems.map(item => {
            // Anchor items only active when on reviews tab; tab items only active when that tab is selected
            const isActive = item.isTab
              ? (tab === item.isTab && !item.isAnchor)
              : (tab === 'reviews' && activeSection === item.id);
            return (
              <button
                key={item.id}
                className={`car-subnav-link${isActive ? ' active' : ''}`}
                onClick={() => {
                  if (item.isTab) { handleTabClick(item.isTab); }
                  if (item.isAnchor) {
                    if (tab !== 'reviews') {
                      setTab('reviews');
                      setTimeout(() => scrollToSection(item.id), 50);
                    } else {
                      scrollToSection(item.id);
                    }
                  }
                }}
              >
                <span style={{ fontSize: '0.85rem' }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}

          <div style={{ flex: 1 }} />

          {/* Quick compare + issues links */}
          <Link href={`/cars/compare?car1=${makeSlug}/${modelSlug}`}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 12px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textDecoration: 'none', whiteSpace: 'nowrap', borderInlineStart: '1px solid var(--border)', transition: 'color 0.15s' }}
            className="subnav-cta"
          >
            ⚖️ {s.compare}
          </Link>
        </div>
      </div>

      {/* ── Main content area ── */}
      <div style={{ padding: '28px 0 64px' }}>
        <div className="container">

          {/* Reviews tab content (the main children) */}
          {(tab === 'reviews') && (
            <div>
              {children}
            </div>
          )}

          {/* Specs tab */}
          {tab === 'specs' && (
            <div>
              <TrimSpecsTab makeSlug={makeSlug} modelSlug={modelSlug} makeNameHe={makeNameHe} modelNameHe={modelNameHe} defaultYear={defaultYear} />
            </div>
          )}

          {/* Videos tab */}
          {tab === 'videos' && (
            <div>
              {videosLoading ? loadingPlaceholder : <CarVideosTab initialVideos={videos || []} makeSlug={makeSlug} modelSlug={modelSlug} makeNameHe={makeNameHe} modelNameHe={modelNameHe} />}
            </div>
          )}

          {/* Images tab */}
          {tab === 'images' && (
            <div>
              {imagesLoading ? loadingPlaceholder : <CarImagesTab images={images || []} makeNameHe={makeNameHe} modelNameHe={modelNameHe} />}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .subnav-cta:hover { color: var(--accent) !important; }
        @media (max-width: 640px) {
          .car-subnav-inner { padding: 0 1rem; }
        }
      `}</style>
    </div>
  );
}
