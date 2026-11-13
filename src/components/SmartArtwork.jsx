import React, { useState, useEffect } from 'react';
import { Disc, Music } from 'lucide-react';

// In-memory cache for auto-recovered artwork URLs
const artworkCache = new Map();

/**
 * SmartArtwork Component
 * Bulletproof album artwork resolver:
 * - Normalizes URLs (forcing https://)
 * - Auto-recovers broken images via Apple iTunes Search API (600x600 resolution)
 * - Sleek dark liquid glass vinyl disc fallback with concentric specular rings (zero broken image icons)
 * - Supports 2x2 mosaic preview for custom playlists
 */
export function SmartArtwork({
  src,
  title = '',
  artist = '',
  className = '',
  alt = 'Album Artwork',
  mosaicCovers = null,
  rounded = 'rounded-lg',
  style = {},
  ...props
}) {
  const cacheKey = `${title}_${artist}`.trim().toLowerCase();
  const initialSrc = src ? src.replace(/^http:\/\//i, 'https://') : (artworkCache.get(cacheKey) || '');

  const [currentSrc, setCurrentSrc] = useState(initialSrc);
  const [hasError, setHasError] = useState(!initialSrc);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    const formatted = src ? src.replace(/^http:\/\//i, 'https://') : (artworkCache.get(cacheKey) || '');
    setCurrentSrc(formatted);
    setHasError(!formatted);
  }, [src, cacheKey]);

  const handleError = async () => {
    // Prevent repeated loops if already tried
    if (isRecovering) {
      setHasError(true);
      return;
    }

    if (artworkCache.has(cacheKey)) {
      const cached = artworkCache.get(cacheKey);
      if (cached && cached !== currentSrc) {
        setCurrentSrc(cached);
        setHasError(false);
        return;
      }
    }

    if (!title && !artist) {
      setHasError(true);
      return;
    }

    setIsRecovering(true);

    try {
      const term = `${title} ${artist}`.trim();
      const url = `https://itunes.apple.com/search?media=music&entity=song&limit=1&term=${encodeURIComponent(
        term
      )}`;

      const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const data = await res.json();
        if (data.results?.[0]?.artworkUrl100) {
          const recovered = data.results[0].artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg');
          artworkCache.set(cacheKey, recovered);
          setCurrentSrc(recovered);
          setHasError(false);
          setIsRecovering(false);
          return;
        }
      }
    } catch (e) {
      // Fall through to vinyl disc fallback
    }

    setIsRecovering(false);
    setHasError(true);
  };

  // 2x2 Mosaic View for Playlists (only when custom src is not provided)
  if (!src && Array.isArray(mosaicCovers) && mosaicCovers.length > 0) {
    const validCovers = mosaicCovers.filter(Boolean).slice(0, 4);

    if (validCovers.length >= 4) {
      return (
        <div
          className={`grid grid-cols-2 grid-rows-2 w-full h-full overflow-hidden ${rounded} ${className}`}
          style={style}
          {...props}
        >
          {validCovers.map((c, i) => (
            <img
              key={i}
              src={c.replace(/^http:\/\//i, 'https://')}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ))}
        </div>
      );
    } else if (validCovers.length > 0) {
      return (
        <div className={`w-full h-full overflow-hidden ${rounded} ${className}`} style={style} {...props}>
          <img
            src={validCovers[0].replace(/^http:\/\//i, 'https://')}
            alt={alt}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      );
    }
  }

  // Broken or Loading Fallback: Liquid Glass Vinyl Disc
  if (hasError || !currentSrc) {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden bg-[#111116] border border-white/[0.08] ${rounded} ${className}`}
        style={{
          boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 8px 20px rgba(0,0,0,0.6)',
          ...style,
        }}
        {...props}
      >
        {/* Concentric Vinyl Grooves */}
        <div className="absolute inset-1 rounded-full border border-white/[0.05]" />
        <div className="absolute inset-3 rounded-full border border-white/[0.04]" />
        <div className="absolute inset-5 rounded-full border border-white/[0.03]" />

        {/* Center Spindle & Music Icon */}
        <div className="relative z-10 flex flex-col items-center justify-center text-white/40">
          <Disc className="w-5 h-5 animate-[spin_10s_linear_infinite]" />
        </div>

        {/* Liquid Glaze Rim Sheen */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, transparent 60%, rgba(0, 0, 0, 0.4) 100%)',
          }}
        />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${rounded} ${className}`} style={style}>
      <img
        src={currentSrc}
        alt={alt || title}
        onError={handleError}
        className="w-full h-full object-cover"
        loading="lazy"
        {...props}
      />
    </div>
  );
}

export default SmartArtwork;

