/**
 * Client-side safety net for Sketchfab 3D embeds. A heavy model can exhaust GPU memory
 * and crash the whole tab (mostly on phones), so:
 *  1. Phones / low-memory devices never auto-load a model: the visitor taps to load it.
 *  2. Only one 3D viewer is live per tab: opening one unloads any other.
 *  3. Crash detection: a flag is kept in localStorage while a model is on screen and
 *     cleared when the page is hidden or the viewer unmounts. If the flag is still there
 *     on the next page load, the tab died while that model was showing: the model is
 *     blocked on this device and reported to /api/car-3d/crash, which hides it site-wide
 *     after reports from several visitors.
 */

const PENDING_KEY = 'car3d:pending';
const BLOCKED_KEY = 'car3d:blocked';
const ACTIVE_EVENT = 'car3d:active';
const PENDING_MAX_AGE_MS = 30 * 60 * 1000;

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}
function safeRemove(key: string) {
  try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
}

function readBlocked(): string[] {
  try {
    const v = JSON.parse(safeGet(BLOCKED_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch { return []; }
}

let crashChecked = false;
/** Runs once per page load: turns a leftover "pending" flag into a crash report. */
function checkPreviousCrash() {
  if (crashChecked || typeof window === 'undefined') return;
  crashChecked = true;
  const raw = safeGet(PENDING_KEY);
  if (!raw) return;
  safeRemove(PENDING_KEY);
  try {
    const { uid, ts } = JSON.parse(raw) as { uid?: string; ts?: number };
    if (!uid || typeof ts !== 'number' || Date.now() - ts > PENDING_MAX_AGE_MS) return;
    const blocked = readBlocked();
    if (!blocked.includes(uid)) safeSet(BLOCKED_KEY, JSON.stringify([...blocked, uid].slice(-50)));
    fetch('/api/car-3d/crash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* malformed flag */ }
}

/** True when this device previously crashed while showing this model. */
export function isBlockedOnDevice(uid: string): boolean {
  checkPreviousCrash();
  return readBlocked().includes(uid);
}

/** Phones, tablets and low-memory / data-saver devices: load 3D only on tap. */
export function shouldAutoload3D(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return false;
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4) return false;
  if (window.matchMedia?.('(pointer: coarse)').matches) return false;
  if (/mobi|iphone|ipad|android/i.test(nav.userAgent)) return false;
  return true;
}

/**
 * Mark a model as live on screen. Returns a cleanup function to call when the iframe
 * unmounts. The flag is cleared while the page is hidden (normal navigation, tab switch,
 * OS discarding a background tab) so only a crash in the foreground leaves it behind.
 */
export function trackLive(uid: string): () => void {
  const set = () => safeSet(PENDING_KEY, JSON.stringify({ uid, ts: Date.now() }));
  const clear = () => safeRemove(PENDING_KEY);
  const onVisibility = () => (document.visibilityState === 'hidden' ? clear() : set());
  set();
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', clear);
  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', clear);
    clear();
  };
}

/** Announce that viewer `id` is now live, so every other viewer unloads. */
export function claimActive(id: string) {
  window.dispatchEvent(new CustomEvent(ACTIVE_EVENT, { detail: id }));
}

/** Call `onDeactivate` whenever a different viewer claims the slot. */
export function onOtherActive(id: string, onDeactivate: () => void): () => void {
  const handler = (e: Event) => {
    if ((e as CustomEvent<string>).detail !== id) onDeactivate();
  };
  window.addEventListener(ACTIVE_EVENT, handler);
  return () => window.removeEventListener(ACTIVE_EVENT, handler);
}
