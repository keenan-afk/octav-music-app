import React from 'react';

/**
 * High-Performance Ambient Backdrop
 * Uses native CSS hardware-accelerated radial gradients.
 * Zero JavaScript animation loops = Zero CPU/GPU drain on mobile devices.
 */
export function AmbientCanvas({ currentTrack }) {
  const primary = currentTrack?.palette?.primary || '#104e38';
  const secondary = currentTrack?.palette?.secondary || '#07241a';

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0 transition-colors duration-1000"
      style={{
        backgroundColor: '#050507',
        backgroundImage: `
          radial-gradient(circle at 20% 15%, ${primary}40 0%, transparent 50%),
          radial-gradient(circle at 85% 65%, ${secondary}30 0%, transparent 60%)
        `,
      }}
    >
      {/* Subtle obsidian vignette to ensure high contrast */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, transparent 40%, rgba(5, 5, 7, 0.7) 100%)',
        }}
      />
    </div>
  );
}

export default AmbientCanvas;
