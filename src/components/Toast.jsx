import React, { useEffect, useRef } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { LiquidSurface } from './LiquidGlassFilter';
import gsap from 'gsap';

/**
 * Single-Instance Liquid Glass Floating Toast
 * - Auto-dismisses strictly after 2500ms using a single timer
 * - Does not re-fire or loop on parent re-renders
 * - Fully clickable to manually dismiss on touch/click
 */
export function Toast({ toast, onDismiss }) {
  const toastRef = useRef(null);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!toast?.message) return;
    const el = toastRef.current;
    if (!el) return;

    gsap.killTweensOf(el);
    gsap.fromTo(
      el,
      { y: -24, opacity: 0, scale: 0.9 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.32,
        ease: 'back.out(1.4)',
      }
    );

    const timer = setTimeout(() => {
      gsap.to(el, {
        y: -16,
        opacity: 0,
        scale: 0.92,
        duration: 0.22,
        ease: 'power2.in',
        onComplete: () => {
          onDismissRef.current?.();
        },
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, [toast?.id]); // ONLY trigger on unique toast ID

  if (!toast?.message) return null;

  const handleManualDismiss = (e) => {
    e.stopPropagation();
    const el = toastRef.current;
    if (el) {
      gsap.to(el, {
        y: -16,
        opacity: 0,
        scale: 0.9,
        duration: 0.18,
        ease: 'power2.in',
        onComplete: () => onDismissRef.current?.(),
      });
    } else {
      onDismissRef.current?.();
    }
  };

  return (
    <div
      ref={toastRef}
      onClick={handleManualDismiss}
      className="absolute top-4 sm:top-5 left-1/2 -translate-x-1/2 z-[70] pointer-events-auto cursor-pointer select-none max-w-[340px] px-4 active:scale-95 transition-transform"
      title="Tap to dismiss"
    >
      <LiquidSurface
        className="px-4 py-2.5 rounded-full border border-white/[0.2] flex items-center gap-2.5 shadow-2xl"
        style={{
          background:
            'linear-gradient(145deg, rgba(28, 28, 36, 0.96) 0%, rgba(14, 14, 20, 0.94) 100%)',
          backdropFilter: 'blur(28px) saturate(190%) brightness(1.05)',
          boxShadow:
            'inset 0 1px 1px 0 rgba(255, 255, 255, 0.5), 0 12px 36px rgba(0, 0, 0, 0.85)',
        }}
      >
        <div className="w-5 h-5 rounded-full bg-[#1ed760]/20 flex items-center justify-center text-[#1ed760] flex-shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-bold text-white tracking-tight truncate max-w-[240px]">
          {toast.message}
        </span>
        <button
          onClick={handleManualDismiss}
          className="p-0.5 text-white/50 hover:text-white transition-colors ml-1 cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      </LiquidSurface>
    </div>
  );
}

export default Toast;
