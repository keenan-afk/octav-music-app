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

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

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
    <div className="absolute inset-x-0 top-4 sm:top-5 z-[70] flex justify-center px-4 pointer-events-none">
      <div
        ref={toastRef}
        onClick={handleManualDismiss}
        className="pointer-events-auto cursor-pointer select-none max-w-full sm:max-w-[360px] active:scale-95 transition-transform"
        title="Tap to dismiss"
      >
        <LiquidSurface
          rounded="rounded-full"
          className="border border-white/[0.2] shadow-2xl"
          contentClassName="px-4 py-2.5 flex items-center gap-2.5"
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
          <span className="text-xs font-bold text-white tracking-tight truncate max-w-[230px] sm:max-w-[260px]">
            {toast.message}
          </span>
          <button
            onClick={handleManualDismiss}
            className="p-0.5 text-white/50 hover:text-white transition-colors ml-0.5 flex-shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </LiquidSurface>
      </div>
    </div>
  );
}

export default Toast;
