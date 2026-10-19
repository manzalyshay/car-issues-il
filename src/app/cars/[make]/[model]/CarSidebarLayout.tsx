'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import CarVideosTab from '@/components/CarVideosTab';
import CarImagesTab from '@/components/CarImagesTab';
import Car3DViewer from '@/components/Car3DViewer';
import TrimSpecsTab from '@/components/TrimSpecsTab';
import RecallsSection from '@/components/RecallsSection';
import { useLocale } from '@/lib/localeContext';
import type { CarVideo } from '@/lib/youtubeVideos';
import type { CarImage } from '@/lib/carImages';

type Tab = 'reviews' | 'specs' | 'safety' | 'videos' | 'images' | 'recalls';

interface Props {
  makeSlug: string;
  modelSlug: string;
  makeNameHe: string;
  modelNameHe: string;
  makeNameEn?: string;
  modelNameEn?: string;
  makeEn?: string;
  modelEn?: string;
  modelYears?: number[];
  defaultYear?: number;
  hasSpecs?: boolean;
  hasTrimEquipment?: boolean;
  hasImages?: boolean;
  hasVideos?: boolean;
  hasRepairCosts?: boolean;
  sketchfabModel?: { uid: string; name: string; author: string } | null;
  initialTab?: string;
  year?: number;
  safetyHe?: string | null;
  techComfortHe?: string | null;
  children: React.ReactNode;
}

/* ── Section anchor IDs used by the main content ── */
const ANCHORS = ['reviews', 'specs', 'trims', 'repair', 'compare'] as const;
const VALID_TABS: Tab[] = ['reviews', 'specs', 'safety', 'videos', 'images', 'recalls'];

function resolveTab(raw?: string): Tab {
  return VALID_TABS.includes(raw as Tab) ? raw as Tab : 'reviews';
}

export default function CarSidebarLayout({ makeSlug, modelSlug, makeNameHe, modelNameHe, makeNameEn, modelNameEn, makeEn, modelEn, modelYears, defaultYear, hasSpecs = true, hasTrimEquipment = false, hasImages = true, hasVideos = true, hasRepairCosts = true, sketchfabModel, initialTab, year, safetyHe, techComfortHe, children }: Props) {
  const hasSafety = hasTrimEquipment || !!(safetyHe || techComfortHe);
  const { t, locale } = useLocale();
  const s = t.sidebar;
  const pathname = usePathname();
  const [tab, setTab] = useState<Tab>(resolveTab(initialTab));
  const [videos, setVideos] = useState<CarVideo[] | null>(null);
  const [images, setImages] = useState<CarImage[] | null>(null);
  const [videosLoading, setVideosLoading] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('reviews');
  const [yearFilter, setYearFilter] = useState<number | undefined>(year);
  const navRef = useRef<HTMLDivElement>(null);

  const fetchMedia = (type: 'videos' | 'images', yr?: number) => {
    const qs = `/api/car-media?make=${makeSlug}&model=${modelSlug}&type=${type}${yr ? `&year=${yr}` : ''}`;
    if (type === 'videos') {
      setVideosLoading(true);
      fetch(qs).then(r => r.json()).then(setVideos).catch(() => setVideos([])).finally(() => setVideosLoading(false));
    } else {
      setImagesLoading(true);
      fetch(qs).then(r => r.json()).then(setImages).catch(() => setImages([])).finally(() => setImagesLoading(false));
    }
  };

  const handleYearFilter = (yr: number | undefined) => {
    setYearFilter(yr);
    if (tab === 'images') fetchMedia('images', yr);
    if (tab === 'videos') fetchMedia('videos', yr);
  };

  /* On mount: sync tab from URL (handles ISR-cached pages where searchParams was empty) */
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab') as Tab | null;
    if (!t || !VALID_TABS.includes(t) || t === tab) return;
    // This effect hydrates state from the URL on ISR-cached pages whose server render had no search params.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTab(t);
    if (t === 'videos' && videos === null && !videosLoading) {
      fetchMedia('videos', yearFilter);
    }
    if (t === 'images' && images === null && !imagesLoading) {
      fetchMedia('images', yearFilter);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Listen for year filter events from HeroYearPicker */
  useEffect(() => {
    const handler = (e: Event) => {
      const yr = (e as CustomEvent<number>).detail;
      handleYearFilter(yr);
    };
    window.addEventListener('car-year-filter', handler);
    return () => window.removeEventListener('car-year-filter', handler);
  }, [tab, videos, images, videosLoading, imagesLoading]); // eslint-disable-line react-hooks/exhaustive-deps

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
    // Sync tab to URL (shallow replace — no navigation)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (next === 'reviews') params.delete('tab');
      else params.set('tab', next);
      const query = params.toString();
      window.history.replaceState(null, '', query ? `${pathname}?${query}` : pathname);
    }
    if (next === 'videos' && videos === null && !videosLoading) {
      setVideosLoading(true);
      fetchMedia('videos', yearFilter);
    }
    if (next === 'images' && images === null && !imagesLoading) {
      setImagesLoading(true);
      fetchMedia('images', yearFilter);
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
    ...(hasSpecs ? [{ id: 'specs', label: s.specs, icon: '📋', isTab: 'specs' as Tab }] : []),
    ...(hasSafety ? [{ id: 'safety', label: locale === 'en' ? 'Safety' : 'בטיחות ואבזור', icon: '🛡️', isTab: 'safety' as Tab }] : []),
    ...(hasRepairCosts ? [{ id: 'repair', label: s.tco, icon: '🔧', isAnchor: true }] : []),
    { id: 'recalls', label: s.issues, icon: '⚠️', isTab: 'recalls' as Tab },
    ...(hasVideos ? [{ id: 'videos', label: s.videos, icon: '🎬', isTab: 'videos' as Tab }] : []),
    ...(hasImages ? [{ id: 'images', label: s.images, icon: '📷', isTab: 'images' as Tab }] : []),
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
            const isActive = item.isTab
              ? tab === item.isTab
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
              <TrimSpecsTab makeSlug={makeSlug} modelSlug={modelSlug} makeNameHe={makeNameHe} modelNameHe={modelNameHe} makeNameEn={makeNameEn} modelNameEn={modelNameEn} defaultYear={defaultYear} mode="specs" />
            </div>
          )}

          {/* Safety & Equipment tab — uses TrimSpecsTab in safety mode */}
          {tab === 'safety' && (
            <div>
              <TrimSpecsTab makeSlug={makeSlug} modelSlug={modelSlug} makeNameHe={makeNameHe} modelNameHe={modelNameHe} makeNameEn={makeNameEn} modelNameEn={modelNameEn} defaultYear={defaultYear} safetyHe={safetyHe} techComfortHe={techComfortHe} mode="safety" />
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
              {sketchfabModel && (
                <div style={{ marginBottom: 20 }}>
                  <Car3DViewer uid={sketchfabModel.uid} modelName={sketchfabModel.name} author={sketchfabModel.author} makeSlug={makeSlug} modelSlug={modelSlug} />
                </div>
              )}
              {imagesLoading ? loadingPlaceholder : <CarImagesTab images={images || []} makeNameHe={makeNameHe} modelNameHe={modelNameHe} />}
            </div>
          )}

          {/* Issues tab — recalls */}
          {tab === 'recalls' && makeEn && modelEn && (
            <div>
              <RecallsSection makeEn={makeEn} modelEn={modelEn} years={modelYears} />
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
