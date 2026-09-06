/* ── TV mode (κάθετη τηλεόραση στο στούντιο) ─────────────────────────────
   Ενεργοποίηση: άνοιξε ΟΠΟΙΟΔΗΠΟΤΕ URL του app με ?tv=1 (μία φορά στην TV).
   Απενεργοποίηση: ?tv=0 ή το ✕ στο toolbar του Live Training.
   Το flag μένει στο localStorage, οπότε η TV θυμάται ότι είναι TV.        */

const KEY_ON  = 'cube_tv_mode';
const KEY_ROT = 'cube_tv_rot';          /* 'cw' | 'ccw' */

export const isTvMode = () => { try { return localStorage.getItem(KEY_ON) === '1'; } catch { return false; } };
export const setTvMode = (on) => { try { on ? localStorage.setItem(KEY_ON, '1') : localStorage.removeItem(KEY_ON); } catch {} };

export const getTvRotation = () => { try { return localStorage.getItem(KEY_ROT) === 'ccw' ? 'ccw' : 'cw'; } catch { return 'cw'; } };
export const setTvRotation = (rot) => { try { localStorage.setItem(KEY_ROT, rot === 'ccw' ? 'ccw' : 'cw'); } catch {} };

/* Στόχος για createPortal ώστε τα modals να μπαίνουν ΜΕΣΑ στο περιστρεφόμενο frame */
export const portalTarget = () => { try { return document.getElementById('portal-root') || document.body; } catch { return document.body; } };

/* ── ?tv=1 / ?tv=0 στο URL (τρέχει μία φορά στο load, side-effect κάτω) ── */
export function applyTvParamFromUrl() {
  try {
    const p = new URLSearchParams(window.location.search).get('tv');
    if (p === null) return;
    setTvMode(p === '1' || p === 'true');
    toast(p === '1' || p === 'true'
      ? '📺 TV mode ενεργό — η εφαρμογή θα γυρίσει σε portrait'
      : 'TV mode απενεργοποιήθηκε');
  } catch {}
}

function toast(msg) {
  try {
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText =
      'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:99999;' +
      'background:linear-gradient(135deg,#e0457b,#8b5cf6);color:#fff;font-weight:700;' +
      'font-size:14px;padding:11px 20px;border-radius:999px;box-shadow:0 6px 30px rgba(224,69,123,.45);' +
      'font-family:inherit;transition:opacity .5s;opacity:0;pointer-events:none';
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 600); }, 4000);
  } catch {}
}

/* ── Keep-awake: να μη σβήνει η οθόνη / screensaver της TV ──────────────
   1) Wake Lock API (Chromium 84+, το έχει ο webOS browser)
   2) Fallback: αόρατο <video> από canvas.captureStream() που παίζει συνεχώς */
let wakeLock = null, fbVideo = null, fbTimer = null, active = false;

async function requestLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
      return true;
    }
  } catch {}
  return false;
}

function startVideoFallback() {
  try {
    if (fbVideo || !('captureStream' in HTMLCanvasElement.prototype)) return;
    const c = document.createElement('canvas');
    c.width = 2; c.height = 2;
    const ctx = c.getContext('2d');
    let f = 0;
    fbTimer = setInterval(() => { ctx.fillStyle = (f = 1 - f) ? '#000' : '#010101'; ctx.fillRect(0, 0, 2, 2); }, 1000);
    fbVideo = document.createElement('video');
    fbVideo.muted = true; fbVideo.playsInline = true; fbVideo.setAttribute('playsinline', '');
    fbVideo.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:0;top:0';
    fbVideo.srcObject = c.captureStream(1);
    document.body.appendChild(fbVideo);
    fbVideo.play().catch(() => {});
  } catch {}
}

function onVisibility() {
  if (active && document.visibilityState === 'visible' && !wakeLock) requestLock();
}

export async function enableKeepAwake() {
  if (active) return;
  active = true;
  document.addEventListener('visibilitychange', onVisibility);
  const ok = await requestLock();
  if (!ok) startVideoFallback();
}

export function disableKeepAwake() {
  active = false;
  document.removeEventListener('visibilitychange', onVisibility);
  try { wakeLock?.release(); } catch {}
  wakeLock = null;
  if (fbTimer) { clearInterval(fbTimer); fbTimer = null; }
  if (fbVideo) { try { fbVideo.pause(); fbVideo.remove(); } catch {} fbVideo = null; }
}

/* side-effect: διάβασε το ?tv= μόλις φορτώσει το bundle */
if (typeof window !== 'undefined') applyTvParamFromUrl();
