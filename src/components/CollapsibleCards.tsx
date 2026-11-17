'use client';

import { useEffect } from 'react';

/**
 * Makes every titled card on the site collapsible, without touching each page.
 *
 * A "titled card" is a visual card (rounded, with a border or a shadowed background)
 * inside <main> whose first child is its title: an h2/h3, or a short header row that
 * holds one. Clicking the title (or Enter/Space on it) folds the card down to its
 * title. Cards nested inside another titled card are left alone, as are forms.
 *
 * The open/closed choice is saved in this browser's localStorage per page type and
 * section, so folding "FAQ" on one comparison folds it on every comparison. Only the
 * visitor's own browser is affected; nothing is sent anywhere. Everything renders open
 * on the server, so search engines and first-time visitors see the full page.
 *
 * Works on the server-rendered DOM by setting attributes only (no inserted nodes),
 * so React's own rendering of the cards is never disturbed.
 */

const STORAGE_KEY = 'carissues:collapsed-cards';
const CARD_ATTR = 'data-cc';          // on the card: "open" | "closed"
const HEAD_ATTR = 'data-cc-head';     // on the clickable title
const KEY_ATTR = 'data-cc-key';       // on the card: its storage key
/** URL segments that name a kind of page rather than a specific car, plate or slug. */
const STATIC_SEGMENTS = new Set(['cars', 'compare', 'issues', 'ru', 'vehicle-lookup', 'admin', 'profile', 'news', 'videos', 'en']);

// Kept here rather than in globals.css so the whole feature lives in one file.
const CSS = `
[data-cc-head] { position: relative; cursor: pointer; padding-inline-end: 30px; user-select: none; -webkit-user-select: none; }
[data-cc-head]::after {
  content: ''; position: absolute; inset-inline-end: 6px; top: 50%; width: 8px; height: 8px;
  border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; opacity: .55;
  transform: translateY(-30%) rotate(-135deg); transition: transform .18s, opacity .18s;
}
[data-cc="closed"] > [data-cc-head]::after { transform: translateY(-70%) rotate(45deg); }
[data-cc-head]:hover::after { opacity: .9; }
[data-cc-head]:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 6px; }
[data-cc="closed"] > :not(:first-child) { display: none !important; }
[data-cc="closed"] > :first-child { margin-bottom: 0 !important; }
`;

function readSaved(): Record<string, 1> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeSaved(saved: Record<string, 1>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch { /* private mode / storage blocked: the toggle still works for this visit */ }
}

/** "/cars/compare/kia/sportage/hyundai/tucson" -> "cars/compare/*\/*\/*\/*" */
function pageType(pathname: string): string {
  return pathname
    .split('/')
    .filter(Boolean)
    .map((s, i) => (i === 0 || STATIC_SEGMENTS.has(s) ? s : '*'))
    .join('/') || 'home';
}

function isVisualCard(el: HTMLElement): boolean {
  if (el.classList.contains('card')) return true;
  const cs = getComputedStyle(el);
  if (parseFloat(cs.borderTopLeftRadius) < 8) return false;
  const bordered = parseFloat(cs.borderTopWidth) > 0;
  const filled = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent';
  return bordered || (filled && cs.boxShadow !== 'none');
}

/** For a heading, the card it titles and the element that acts as its title, if any. */
function cardForHeading(h: HTMLElement): { card: HTMLElement; head: HTMLElement } | null {
  const parent = h.parentElement;
  if (!parent) return null;
  // Heading is the card's first child
  if (parent.firstElementChild === h && isVisualCard(parent)) return { card: parent, head: h };
  // Heading sits in a short header row (icon + title + small button) that opens the card
  const card = parent.parentElement;
  if (
    card &&
    card.firstElementChild === parent &&
    parent.children.length <= 4 &&
    parent.getBoundingClientRect().height < 120 &&
    isVisualCard(card)
  ) return { card, head: parent };
  return null;
}

function cardKey(card: HTMLElement, head: HTMLElement): string {
  const label = card.id || (head.textContent || '')
    .replace(/[\d\p{Extended_Pictographic}️⤢⚡]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return `${pageType(location.pathname)}::${label}`;
}

function setOpen(card: HTMLElement, open: boolean) {
  card.setAttribute(CARD_ATTR, open ? 'open' : 'closed');
  card.querySelector<HTMLElement>(`:scope > [${HEAD_ATTR}], :scope > * > [${HEAD_ATTR}]`)
    ?.setAttribute('aria-expanded', String(open));
}

function enhance(root: HTMLElement, saved: Record<string, 1>) {
  const heads = root.querySelectorAll<HTMLElement>('h2, h3');
  for (const h of heads) {
    if (h.closest('form')) continue;
    const found = cardForHeading(h);
    if (!found) continue;
    const { card, head } = found;
    if (card.hasAttribute(CARD_ATTR)) continue;
    if (card.parentElement?.closest(`[${CARD_ATTR}]`)) continue; // nested inside a collapsible card
    if (!card.textContent?.trim() || card.children.length < 2) continue; // nothing to fold
    const key = cardKey(card, head);
    card.setAttribute(KEY_ATTR, key);
    head.setAttribute(HEAD_ATTR, '');
    head.setAttribute('role', 'button');
    head.setAttribute('tabindex', '0');
    setOpen(card, !saved[key]);
  }
}

function toggle(head: HTMLElement) {
  const card = head.closest<HTMLElement>(`[${CARD_ATTR}]`);
  if (!card) return;
  const open = card.getAttribute(CARD_ATTR) !== 'open';
  setOpen(card, open);
  const key = card.getAttribute(KEY_ATTR);
  if (!key) return;
  const saved = readSaved();
  if (open) delete saved[key]; else saved[key] = 1;
  writeSaved(saved);
}

/** Open (without saving) a folded card that holds the element the URL hash points to. */
function revealHashTarget() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;
  const target = document.getElementById(id);
  const card = target?.closest<HTMLElement>(`[${CARD_ATTR}="closed"]`);
  if (card && card !== target) setOpen(card, true);
}

export default function CollapsibleCards() {
  useEffect(() => {
    const main = document.getElementById('main-content');
    if (!main) return;

    let saved = readSaved();
    enhance(main, saved);
    revealHashTarget();

    // Cards rendered later (client-loaded sections, tab switches, client navigation)
    let pending = 0;
    const observer = new MutationObserver(() => {
      if (pending) return;
      pending = window.setTimeout(() => {
        pending = 0;
        saved = readSaved();
        enhance(main, saved);
      }, 150);
    });
    observer.observe(main, { childList: true, subtree: true });

    const interactive = 'a, button, input, select, textarea, label, summary, [role="radio"], [role="tab"]';
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      const head = t?.closest<HTMLElement>(`[${HEAD_ATTR}]`);
      if (!head) return;
      // Buttons and links inside the title row keep their own behaviour
      const inner = t!.closest(interactive);
      if (inner && head.contains(inner)) return;
      if (window.getSelection()?.toString()) return; // selecting title text, not toggling
      toggle(head);
    };
    const onKey = (e: KeyboardEvent) => {
      const head = e.target as HTMLElement | null;
      if (!head?.hasAttribute?.(HEAD_ATTR)) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(head); }
    };
    main.addEventListener('click', onClick);
    main.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', revealHashTarget);
    return () => {
      observer.disconnect();
      window.clearTimeout(pending);
      main.removeEventListener('click', onClick);
      main.removeEventListener('keydown', onKey);
      window.removeEventListener('hashchange', revealHashTarget);
    };
  }, []);

  return <style>{CSS}</style>;
}
