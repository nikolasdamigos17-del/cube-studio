import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, X, Maximize2, GripVertical } from 'lucide-react';

/* ── size helpers ─────────────────────────────────────────────────────── */
export const SIZE_LABEL = { 1:'1×1', 2:'2×1', 4:'2×2' };
export const spanOf = (s) => s === 4 ? { gridColumn:'span 2', gridRow:'span 2' }
                          : s === 2 ? { gridColumn:'span 2' } : {};

/* A tiny wireframe of what a size looks like, drawn to scale. */
function SizeThumb({ size, active, tone }) {
  const w = size === 1 ? 26 : 56, h = size === 4 ? 56 : 26;
  return (
    <div style={{ width:60, height:60, display:'flex', alignItems:'center', justifyContent:'center',
      borderRadius:10, background: active ? `${tone}1f` : 'rgba(127,127,140,.12)',
      border:`1px solid ${active ? tone : 'transparent'}`, transition:'.15s' }}>
      <div style={{ width:w, height:h, borderRadius:5, background: active ? tone : 'rgba(127,127,140,.45)',
        display:'flex', flexDirection:'column', gap:3, padding:5, transition:'.15s' }}>
        <span style={{ height:4, width:'55%', borderRadius:2, background:'rgba(255,255,255,.75)' }}/>
        {size !== 1 && <span style={{ height:4, width:'85%', borderRadius:2, background:'rgba(255,255,255,.5)' }}/>}
        {size === 4 && <span style={{ marginTop:'auto', height:10, borderRadius:3, background:'rgba(255,255,255,.4)' }}/>}
      </div>
    </div>
  );
}

/* ── the board ────────────────────────────────────────────────────────── */
export default function WidgetBoard({
  slots, saveSlots, WIDGETS, render, theme, rowHeight = 118, columns = 2, gap = 10,
  storageKey, defaults,
}) {
  const [edit, setEdit] = useState(false);
  const [sheet, setSheet] = useState(null);      // { i, mode:'size'|'swap' }
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const press = useRef(null);
  const moved = useRef(false);
  const cellRefs = useRef([]);

  const T = theme;   // { card, border, text, dim, accent, muted }

  /* long-press anywhere on the board enters edit mode */
  const startPress = (i) => (e) => {
    if (edit) return;
    moved.current = false;
    const pt = e.touches?.[0] || e;
    const sx = pt.clientX, sy = pt.clientY;
    press.current = { x:sx, y:sy, timer:setTimeout(() => {
      if (!moved.current) {
        setEdit(true);
        if (navigator.vibrate) navigator.vibrate(12);
      }
    }, 480) };
  };
  const movePress = (e) => {
    if (!press.current) return;
    const pt = e.touches?.[0] || e;
    if (Math.abs(pt.clientX - press.current.x) > 10 || Math.abs(pt.clientY - press.current.y) > 10) {
      moved.current = true;
      clearTimeout(press.current.timer);
      press.current = null;
    }
  };
  const endPress = () => { if (press.current) { clearTimeout(press.current.timer); press.current = null; } };

  /* drag to reorder (pointer based, works for touch and mouse) */
  const onDragStart = (i) => (e) => {
    if (!edit) return;
    e.preventDefault();
    setDragIdx(i); setOverIdx(i);
    const move = (ev) => {
      const pt = ev.touches?.[0] || ev;
      const el = document.elementFromPoint(pt.clientX, pt.clientY);
      const cell = el?.closest?.('[data-cell]');
      if (cell) {
        const k = Number(cell.getAttribute('data-cell'));
        if (!Number.isNaN(k)) setOverIdx(k);
      }
    };
    const up = () => {
      setDragIdx(cur => {
        setOverIdx(o => {
          if (cur != null && o != null && cur !== o) {
            const n = [...slots];
            const [moved] = n.splice(cur, 1);
            n.splice(o, 0, moved);
            saveSlots(n);
          }
          return null;
        });
        return null;
      });
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('touchmove', move, { passive:true });
    window.addEventListener('touchend', up);
  };

  const setSize = (i, size) => {
    const n = [...slots]; n[i] = { ...n[i], size }; saveSlots(n); setSheet(null);
  };
  const setWidget = (i, key) => {
    const allowed = WIDGETS[key].sizes;
    const n = [...slots];
    n[i] = { w:key, size: allowed.includes(n[i].size) ? n[i].size : allowed[0] };
    saveSlots(n); setSheet(null);
  };
  const remove = (i) => { const n = slots.filter((_, k) => k !== i); saveSlots(n.length ? n : defaults); };
  const add = () => {
    const unused = Object.keys(WIDGETS).find(k => !slots.some(s => s.w === k)) || Object.keys(WIDGETS)[0];
    saveSlots([...slots, { w:unused, size:WIDGETS[unused].sizes[0] }]);
  };

  /* leaving edit mode by tapping empty space */
  useEffect(() => {
    if (!edit) return;
    const onKey = (e) => e.key === 'Escape' && setEdit(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [edit]);

  const ctrl = {
    width:26, height:26, borderRadius:8, border:'none', cursor:'pointer',
    background:'rgba(0,0,0,.66)', color:'#fff', display:'flex',
    alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)',
  };

  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${columns},1fr)`,
        gridAutoRows:`${rowHeight}px`, gap, gridAutoFlow:'dense' }}>
        {slots.map((slot, i) => {
          const W = WIDGETS[slot.w];
          if (!W) return null;
          const isDrag = dragIdx === i;
          const isOver = overIdx === i && dragIdx != null && dragIdx !== i;
          return (
            <div key={i} data-cell={i}
              ref={el => (cellRefs.current[i] = el)}
              onPointerDown={startPress(i)} onPointerMove={movePress} onPointerUp={endPress}
              onPointerCancel={endPress} onContextMenu={e => edit && e.preventDefault()}
              style={{ position:'relative', ...spanOf(slot.size),
                background: W.bare ? 'transparent' : T.card,
                border: W.bare ? 'none' : `1px solid ${isOver ? T.accent : T.border}`,
                borderRadius:18, overflow: W.bare ? 'visible' : 'hidden',
                boxShadow: edit ? `0 0 0 2px ${T.accent}55` : 'none',
                opacity: isDrag ? .45 : 1,
                transform: isOver ? 'scale(1.03)' : 'none',
                transition:'transform .16s, opacity .16s, border-color .16s',
                animation: edit && !isDrag ? 'wgWiggle .32s ease-in-out infinite alternate' : 'none' }}>
              {render(slot.w, slot.size, edit)}

              {edit && (
                <>
                  <div onPointerDown={onDragStart(i)}
                    style={{ position:'absolute', left:6, top:6, zIndex:4, ...ctrl,
                      cursor:'grab', background:'rgba(0,0,0,.55)', touchAction:'none' }}>
                    <GripVertical style={{ width:13, height:13 }}/>
                  </div>
                  <div style={{ position:'absolute', top:6, right:6, display:'flex', gap:4, zIndex:4 }}>
                    {W.sizes.length > 1 && (
                      <button onClick={e => { e.stopPropagation(); setSheet({ i, mode:'size' }); }} style={ctrl}>
                        <Maximize2 style={{ width:13, height:13 }}/>
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); setSheet({ i, mode:'swap' }); }} style={ctrl}>
                      <span style={{ fontSize:13, fontWeight:800, lineHeight:1 }}>⇄</span>
                    </button>
                    <button onClick={e => { e.stopPropagation(); remove(i); }}
                      style={{ ...ctrl, background:'rgba(239,68,68,.92)' }}>
                      <X style={{ width:13, height:13 }}/>
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {edit && (
          <button onClick={add}
            style={{ borderRadius:18, border:`2px dashed ${T.border}`, background:'transparent',
              cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center',
              justifyContent:'center', gap:6, color:T.dim, minHeight:rowHeight }}>
            <span style={{ width:32, height:32, borderRadius:'50%', background:T.muted,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>+</span>
            <span style={{ fontSize:11, fontWeight:600 }}>Προσθήκη</span>
          </button>
        )}
      </div>

      {edit && (
        <button onClick={() => setEdit(false)}
          style={{ position:'fixed', top:'calc(12px + env(safe-area-inset-top))', right:14, zIndex:70,
            display:'flex', alignItems:'center', gap:7, padding:'10px 18px', borderRadius:999,
            border:'none', cursor:'pointer', fontSize:13, fontWeight:700,
            background:T.accent, color:'#fff', boxShadow:'0 6px 20px rgba(0,0,0,.4)' }}>
          <Check style={{ width:15, height:15 }}/> Τέλος
        </button>
      )}

      <style>{`@keyframes wgWiggle{from{transform:rotate(-.45deg)}to{transform:rotate(.45deg)}}
        @keyframes wgSheet{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes wgFade{from{opacity:0}to{opacity:1}}`}</style>

      {/* ── size / swap sheet ── */}
      {sheet && (() => {
        const slot = slots[sheet.i];
        const W = WIDGETS[slot.w];
        return (
          <>
            <div onClick={() => setSheet(null)}
              style={{ position:'fixed', inset:0, zIndex:80, background:'rgba(0,0,0,.55)',
                backdropFilter:'blur(3px)', animation:'wgFade .18s ease-out' }}/>
            <div style={{ position:'fixed', left:0, right:0, bottom:0, zIndex:81, background:T.card,
              borderTopLeftRadius:24, borderTopRightRadius:24, borderTop:`1px solid ${T.border}`,
              padding:'10px 16px calc(20px + env(safe-area-inset-bottom))',
              boxShadow:'0 -8px 40px rgba(0,0,0,.5)', animation:'wgSheet .26s cubic-bezier(.22,1,.36,1)',
              maxHeight:'82%', overflowY:'auto', color:T.text }}>
              <div style={{ width:38, height:4, borderRadius:4, background:T.dim,
                opacity:.4, margin:'4px auto 14px' }}/>

              {sheet.mode === 'size' ? (
                <>
                  <p style={{ fontSize:13, fontWeight:700, margin:'0 0 3px', textAlign:'center' }}>
                    Μέγεθος — {W.label}
                  </p>
                  <p style={{ fontSize:11, color:T.dim, margin:'0 0 16px', textAlign:'center' }}>
                    Διάλεξε πώς θα εμφανίζεται
                  </p>
                  <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                    {W.sizes.map(s => {
                      const active = slot.size === s;
                      return (
                        <button key={s} onClick={() => setSize(sheet.i, s)}
                          style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                            padding:'12px 14px', borderRadius:16, cursor:'pointer',
                            border:`1px solid ${active ? W.color : T.border}`,
                            background: active ? `${W.color}14` : 'transparent' }}>
                          <SizeThumb size={s} active={active} tone={W.color}/>
                          <span style={{ fontSize:12, fontWeight:700,
                            color: active ? W.color : T.text }}>{SIZE_LABEL[s]}</span>
                          <span style={{ fontSize:9.5, color:T.dim }}>
                            {s === 1 ? 'σύνοψη' : s === 2 ? 'με γράφημα' : 'πλήρες'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <p style={{ fontSize:13, fontWeight:700, margin:'0 0 3px', textAlign:'center' }}>
                    Άλλαξε widget
                  </p>
                  <p style={{ fontSize:11, color:T.dim, margin:'0 0 14px', textAlign:'center' }}>
                    Τι θα δείχνει αυτό το κουτί
                  </p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {Object.entries(WIDGETS).map(([key, w]) => {
                      const Icon = w.icon, cur = slot.w === key;
                      return (
                        <button key={key} onClick={() => setWidget(sheet.i, key)}
                          style={{ display:'flex', alignItems:'center', gap:10, padding:12, borderRadius:14,
                            border: cur ? `2px solid ${w.color}` : `1px solid ${T.border}`,
                            background: cur ? `${w.color}1f` : T.muted, cursor:'pointer', textAlign:'left' }}>
                          <span style={{ width:32, height:32, borderRadius:9, background:`${w.color}2e`,
                            display:'flex', alignItems:'center', justifyContent:'center', flex:'0 0 auto' }}>
                            <Icon style={{ width:17, height:17, color:w.color }}/>
                          </span>
                          <span style={{ minWidth:0 }}>
                            <span style={{ display:'block', fontSize:11.5, fontWeight:600, lineHeight:1.2 }}>{w.label}</span>
                            <span style={{ display:'block', fontSize:9, color:T.dim, marginTop:1 }}>
                              {w.sizes.map(s => SIZE_LABEL[s]).join(' · ')}
                            </span>
                          </span>
                          {cur && <Check style={{ width:14, height:14, color:w.color, marginLeft:'auto', flex:'0 0 auto' }}/>}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <button onClick={() => setSheet(null)}
                style={{ width:'100%', marginTop:16, padding:12, borderRadius:14, border:'none',
                  background:T.muted, color:T.dim, fontSize:14, fontWeight:600, cursor:'pointer' }}>
                Έτοιμο
              </button>
            </div>
          </>
        );
      })()}

      {!edit && (
        <p style={{ textAlign:'center', fontSize:10, color:T.dim, opacity:.6, margin:'12px 0 0' }}>
          Κράτα πατημένο ένα widget για επεξεργασία
        </p>
      )}
    </>
  );
}

/* Persisted slot state, shared by every board. */
export function useSlots(storageKey, defaults, WIDGETS) {
  const [slots, setSlots] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(storageKey));
      if (Array.isArray(s) && s.length) {
        const ok = s.filter(x => WIDGETS[x?.w]).map(x => ({
          w:x.w, size: WIDGETS[x.w].sizes.includes(x.size) ? x.size : WIDGETS[x.w].sizes[0] }));
        if (ok.length) return ok;
      }
    } catch (e) {}
    return defaults;
  });
  const save = useCallback((n) => {
    setSlots(n);
    try { localStorage.setItem(storageKey, JSON.stringify(n)); } catch (e) {}
  }, [storageKey]);
  return [slots, save];
}
