import React, { useRef, useState, useCallback } from 'react';

/**
 * Optical Liquid Glass Filter Engine
 * Global SVG filter providing microscopic liquid refraction displacement.
 */
export function LiquidGlassFilter() {
  return (
    <svg
      className="absolute top-0 left-0 w-0 h-0 pointer-events-none opacity-0 select-none overflow-hidden"
      aria-hidden="true"
      style={{ position: 'absolute', width: 0, height: 0 }}
    >
      <defs>
        <filter
          id="liquid-refraction"
          x="-10%"
          y="-10%"
          width="120%"
          height="120%"
          filterUnits="objectBoundingBox"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.018"
            numOctaves="2"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="5"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}

/**
 * Reusable LiquidSurface Component
 * Applies Apple iOS 26 / visionOS optical liquid glass properties:
 * - Edge-bending refraction + blur(36px) saturate(210%)
 * - Multi-stop specular rim lights
 * - Micro-interactive cursor / touch tracking sheen
 * - Precision border beveling
 */
export function LiquidSurface({
  children,
  className = '',
  contentClassName = '',
  style = {},
  interactiveSheen = true,
  rounded = 'rounded-2xl',
  border = true,
  onClick,
  as: Component = 'div',
  ...props
}) {
  const surfaceRef = useRef(null);
  const [isInteracting, setIsInteracting] = useState(false);

  const handlePointerMove = useCallback(
    (e) => {
      if (!interactiveSheen || !surfaceRef.current) return;
      const rect = surfaceRef.current.getBoundingClientRect();
      const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
      const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY);
      if (clientX != null && clientY != null) {
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        surfaceRef.current.style.setProperty('--mouse-x', `${x}px`);
        surfaceRef.current.style.setProperty('--mouse-y', `${y}px`);
      }
    },
    [interactiveSheen]
  );

  const handlePointerEnter = () => setIsInteracting(true);
  const handlePointerLeave = () => setIsInteracting(false);

  return (
    <Component
      ref={surfaceRef}
      onMouseMove={handlePointerMove}
      onTouchMove={handlePointerMove}
      onMouseEnter={handlePointerEnter}
      onMouseLeave={handlePointerLeave}
      onTouchStart={handlePointerEnter}
      onTouchEnd={handlePointerLeave}
      onClick={onClick}
      className={`relative overflow-hidden transition-all duration-300 ${rounded} ${
        border ? 'border border-white/[0.09]' : ''
      } ${className}`}
      style={{
        background:
          'linear-gradient(145deg, rgba(22, 22, 28, 0.68) 0%, rgba(10, 10, 14, 0.52) 100%)',
        backdropFilter:
          'url(#liquid-refraction) blur(36px) saturate(210%) brightness(1.06)',
        WebkitBackdropFilter:
          'url(#liquid-refraction) blur(36px) saturate(210%) brightness(1.06)',
        boxShadow:
          'inset 0 1px 0.5px 0 rgba(255, 255, 255, 0.45), inset 0 -1px 0.5px 0 rgba(255, 255, 255, 0.08), 0 16px 40px rgba(0, 0, 0, 0.7)',
        ...style,
      }}
      {...props}
    >
      {/* Specular Interactive Cursor/Touch Sheen Layer */}
      {interactiveSheen && (
        <div
          className="absolute inset-0 pointer-events-none rounded-[inherit] transition-opacity duration-300 z-0"
          style={{
            opacity: isInteracting ? 1 : 0,
            background:
              'radial-gradient(320px circle at var(--mouse-x, -200px) var(--mouse-y, -200px), rgba(255, 255, 255, 0.12), transparent 65%)',
          }}
        />
      )}

      {/* Surface content above reflection layer */}
      <div className={`relative z-10 w-full h-full ${contentClassName}`}>
        {children}
      </div>
    </Component>
  );
}

// Export both names for compatibility
export const LiquidPanel = LiquidSurface;

export default LiquidSurface;
