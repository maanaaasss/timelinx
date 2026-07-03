import React, { useState, useCallback, useEffect } from 'react';
import { Layers, Undo2, Magnet, Palette, Film, X, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';

const STEPS = [
  { icon: <Layers size={18} />,   title: '12 Editing Tools',      color: 'var(--track-video)',    badge: 'Tools',
    desc: 'Selection, Razor, Ripple/Roll Trim, Slip, Slide, Hand — accessible from the toolbar or keyboard shortcuts V C T R S Y H.' },
  { icon: <Undo2 size={18} />,    title: 'Frame-Accurate Undo',   color: 'var(--accent)',         badge: 'History',
    desc: 'Every operation is stored in a compressed history stack. ⌘Z to undo, ⌘⇧Z to redo — no state corruption.' },
  { icon: <Magnet size={18} />,   title: 'Smart Snap',            color: 'var(--tl-snap-color)',  badge: 'Snap',
    desc: 'Clips snap to adjacent clip edges, markers, and the playhead. Amber indicators show when snap engages.' },
  { icon: <Palette size={18} />,  title: '3 Theme Presets',       color: 'var(--track-image)',    badge: 'Themes',
    desc: 'Dark Pro, Light, and High Contrast — switch live in the top bar. Each is a full CSS preset file.' },
  { icon: <Film size={18} />,     title: 'Drag & Drop Media',     color: 'var(--track-audio)',    badge: 'Media',
    desc: 'Drag assets from the Media panel onto any track to insert at the precise drop frame.' },
] as const;

export function FeatureTour({
  onOpenShortcuts,
  onOpenPalette,
}: {
  onOpenShortcuts?: () => void;
  onOpenPalette?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [seen] = useState(() => {
    try { return localStorage.getItem('tl-tour-seen') === '1'; } catch { return false; }
  });

  useEffect(() => {
    if (!seen) {
      const t = setTimeout(() => setOpen(true), 1400);
      return () => clearTimeout(t);
    }
  }, [seen]);

  const close = useCallback(() => {
    setOpen(false);
    try { localStorage.setItem('tl-tour-seen', '1'); } catch {}
  }, []);

  const next = useCallback(() => {
    if (step === STEPS.length - 1) { close(); return; }
    setStep((s) => s + 1);
  }, [step, close]);

  const prev = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, close, next, prev]);

  const cur = STEPS[step];

  return (
    <>
      <button
        className="tour-trigger"
        onClick={() => { setOpen(true); setStep(0); }}
        title="Feature Tour"
      >
        <HelpCircle size={13} />
        Tour
      </button>

      {open && (
        <div className="tour-backdrop">
          <div className="tour-card">
            <div className="tour-head">
              <span
                className="tour-badge"
                style={{
                  color: cur.color,
                  background: `color-mix(in srgb, ${cur.color} 14%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${cur.color} 28%, transparent)`,
                }}
              >
                {cur.badge}
              </span>
              <span className="tour-counter">{step + 1} / {STEPS.length}</span>
              <button className="tour-x" onClick={close}><X size={13} /></button>
            </div>

            <div className="tour-body">
              <div
                className="tour-icon"
                style={{
                  color: cur.color,
                  background: `color-mix(in srgb, ${cur.color} 12%, transparent)`,
                }}
              >
                {cur.icon}
              </div>
              <div>
                <h3 className="tour-title">{cur.title}</h3>
                <p className="tour-desc">{cur.desc}</p>
              </div>
            </div>

            <div className="tour-dots">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  className={`tour-dot${i === step ? ' active' : ''}`}
                  onClick={() => setStep(i)}
                />
              ))}
            </div>

            <div className="tour-foot">
              <button className="tour-btn tour-btn-secondary" onClick={prev} disabled={step === 0}>
                <ChevronLeft size={12} /> Prev
              </button>
              <div className="tour-quick-links">
                {onOpenShortcuts && (
                  <button className="tour-quick-link" onClick={() => { close(); onOpenShortcuts(); }}>
                    Shortcuts
                  </button>
                )}
                {onOpenPalette && (
                  <button className="tour-quick-link" onClick={() => { close(); onOpenPalette(); }}>
                    ⌘K
                  </button>
                )}
              </div>
              <button className="tour-btn tour-btn-primary" onClick={next}>
                {step === STEPS.length - 1 ? 'Done' : <>Next <ChevronRight size={12} /></>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
