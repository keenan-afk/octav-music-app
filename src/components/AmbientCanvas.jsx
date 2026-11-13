import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Dynamic Ambient Color Bleed Canvas
 * Renders 3 ultra-blurred organic color orbs extracted from the current track's artwork palette.
 * Morphs colors smoothly over 1.2s using GSAP power2.out and drifts gently in an infinite sine wave loop.
 */
export function AmbientCanvas({ currentTrack }) {
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);
  const orb3Ref = useRef(null);
  const floatTimelineRef = useRef(null);

  // Initialize infinite organic floating motion
  useEffect(() => {
    const orb1 = orb1Ref.current;
    const orb2 = orb2Ref.current;
    const orb3 = orb3Ref.current;

    if (!orb1 || !orb2 || !orb3) return;

    // Set initial positions and sizes
    gsap.set(orb1, { x: 0, y: 0, scale: 1 });
    gsap.set(orb2, { x: 0, y: 0, scale: 1 });
    gsap.set(orb3, { x: 0, y: 0, scale: 1 });

    const tl1 = gsap.to(orb1, {
      x: 35,
      y: 45,
      scale: 1.15,
      duration: 7,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    });

    const tl2 = gsap.to(orb2, {
      x: -30,
      y: -40,
      scale: 1.2,
      duration: 8.5,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    });

    const tl3 = gsap.to(orb3, {
      x: 25,
      y: -35,
      scale: 1.1,
      duration: 6.2,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    });

    floatTimelineRef.current = [tl1, tl2, tl3];

    return () => {
      tl1.kill();
      tl2.kill();
      tl3.kill();
    };
  }, []);

  // Smoothly morph colors over 1.2s when currentTrack changes
  useEffect(() => {
    if (!currentTrack || !currentTrack.palette) return;

    const { primary, secondary, accent } = currentTrack.palette;

    if (orb1Ref.current) {
      gsap.to(orb1Ref.current, {
        backgroundColor: primary,
        duration: 1.2,
        ease: 'power2.out',
      });
    }

    if (orb2Ref.current) {
      gsap.to(orb2Ref.current, {
        backgroundColor: secondary,
        duration: 1.2,
        ease: 'power2.out',
      });
    }

    if (orb3Ref.current) {
      gsap.to(orb3Ref.current, {
        backgroundColor: accent,
        duration: 1.2,
        ease: 'power2.out',
      });
    }
  }, [currentTrack]);

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0"
      style={{
        background: '#050507',
      }}
    >
      {/* Audio-Reactive Container Driven by --bass-pulse */}
      <div className="bass-reactive-ambient w-full h-full relative">
        {/* 3 Organic Liquid Color Orbs */}
        <div
          ref={orb1Ref}
          className="absolute w-[280px] h-[280px] rounded-full"
          style={{
            top: '-20px',
            left: '-20px',
            backgroundColor: currentTrack?.palette?.primary || '#104e38',
            filter: 'blur(90px) saturate(210%)',
            opacity: 0.65,
            transform: 'translate3d(0, 0, 0)',
            willChange: 'transform, background-color',
          }}
        />

        <div
          ref={orb2Ref}
          className="absolute w-[320px] h-[320px] rounded-full"
          style={{
            top: '35%',
            right: '-40px',
            backgroundColor: currentTrack?.palette?.secondary || '#07241a',
            filter: 'blur(90px) saturate(210%)',
            opacity: 0.55,
            transform: 'translate3d(0, 0, 0)',
            willChange: 'transform, background-color',
          }}
        />

        <div
          ref={orb3Ref}
          className="absolute w-[260px] h-[260px] rounded-full"
          style={{
            bottom: '10%',
            left: '10%',
            backgroundColor: currentTrack?.palette?.accent || '#1ed760',
            filter: 'blur(90px) saturate(210%)',
            opacity: 0.45,
            transform: 'translate3d(0, 0, 0)',
            willChange: 'transform, background-color',
          }}
        />
      </div>

      {/* Subtle obsidian vignette to ensure high-craft contrast */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, transparent 40%, rgba(5, 5, 7, 0.65) 100%)',
        }}
      />
    </div>
  );
}

export default AmbientCanvas;

