import { useState, useEffect } from 'react';
import { exerciseVideoUrl, getExerciseGif } from '../lib/exerciseApi';

/* ── Βίντεο άσκησης (Cloudinary cube-exercises) ─────────────────────────────
   <ExerciseMedia name="Cable Row"/> → μικρό βίντεο σε loop· αν δεν υπάρχει
   βίντεο για την άσκηση (404), κρύβεται μόνο του.
   <ExerciseVideoOverlay name onClose/> → fullscreen προβολή με fallback
   στην εικόνα του free-exercise-db όταν λείπει το βίντεο.                   */

export default function ExerciseMedia({ name, style, className, onClick, rounded = 14 }) {
  const [failed, setFailed] = useState(false);
  const url = exerciseVideoUrl(name);
  useEffect(() => { setFailed(false); }, [url]);
  if (!url || failed) return null;
  return (
    <video key={url} src={url} autoPlay loop muted playsInline preload="metadata"
      onError={() => setFailed(true)} onClick={onClick} className={className}
      style={{ objectFit: 'cover', background: '#fff', borderRadius: rounded, display: 'block', ...style }} />
  );
}

export function ExerciseVideoOverlay({ name, onClose }) {
  const [failed, setFailed] = useState(false);
  const [img, setImg] = useState(null);
  const url = exerciseVideoUrl(name);
  useEffect(() => { setFailed(false); setImg(null); }, [name]);
  useEffect(() => {
    if (!failed) return;
    let alive = true;
    getExerciseGif(name).then(u => { if (alive) setImg(u || 'none'); });
    return () => { alive = false; };
  }, [failed, name]);
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(5,7,12,0.92)', backdropFilter: 'blur(6px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 20, cursor: 'pointer' }}>
      <p style={{ margin: '0 0 14px', color: '#fff', fontWeight: 800, fontSize: 'clamp(16px,4.5vw,22px)',
        letterSpacing: '-.01em', textAlign: 'center' }}>{name}</p>
      {!failed && url ? (
        <video key={url} src={url} autoPlay loop muted playsInline
          onError={() => setFailed(true)}
          style={{ width: 'min(92vw, 460px)', maxHeight: '64vh', objectFit: 'contain',
            background: '#fff', borderRadius: 20, boxShadow: '0 18px 60px rgba(0,0,0,.55)' }} />
      ) : img && img !== 'none' ? (
        <img src={img} alt={name}
          style={{ width: 'min(92vw, 460px)', maxHeight: '64vh', objectFit: 'contain',
            background: '#fff', borderRadius: 20, boxShadow: '0 18px 60px rgba(0,0,0,.55)' }} />
      ) : (
        <p style={{ color: 'rgba(255,255,255,.65)', fontSize: 14, margin: 0 }}>
          {img === 'none' ? 'Δεν υπάρχει βίντεο ή εικόνα για αυτή την άσκηση ακόμα.' : 'Φόρτωση…'}
        </p>
      )}
      <p style={{ margin: '16px 0 0', color: 'rgba(255,255,255,.5)', fontSize: 12 }}>Πάτησε οπουδήποτε για κλείσιμο</p>
    </div>
  );
}
