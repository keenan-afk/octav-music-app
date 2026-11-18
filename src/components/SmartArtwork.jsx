import React, { useState, useEffect } from 'react';
import { Disc, Music, User } from 'lucide-react';
import { safeTimeoutSignal, isArtistFuzzyMatch, fetchArtistPortrait } from '../services/musicApi';

// In-memory cache for auto-recovered artwork URLs
const artworkCache = new Map();

/**
 * SmartArtwork Component
 * Bulletproof album artwork & artist portrait resolver:
 * - Normalizes URLs (forcing https://)
 * - Strict verification: NEVER swaps artist photo with another person, NEVER swaps song cover with another track
 * - High-resolution Apple Music / Deezer portrait recovery
 * - Sleek dark liquid glass vinyl disc fallback with concentric specular rings (zero broken image icons)
 * - Supports 2x2 mosaic preview for custom playlists
 */
export function SmartArtwork({
  src,
  title = '',
  artist = '',
  className = '',
  alt = 'Artwork',
  mosaicCovers = null,
  rounded = 'rounded-lg',
  isArtist = false,
  style = {},
  ...props
}) {
  const isArtistQuery = isArtist || (title && artist && title.toLowerCase().trim() === artist.toLowerCase().trim()) || (!title && artist);
  const cacheKey = `${isArtistQuery ? 'artist' : 'song'}_${title}_${artist}`.trim().toLowerCase();
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
      // 1. If this is an ARTIST portrait: Query official artist catalog (Deezer)
      if (isArtistQuery) {
        const targetArtist = artist || title;
        const portrait = await fetchArtistPortrait(targetArtist);
        if (portrait) {
          artworkCache.set(cacheKey, portrait);
          setCurrentSrc(portrait);
          setHasError(false);
          setIsRecovering(false);
          return;
        }
      }

      // 2. If this is a SONG: Query Apple Music iTunes with strict artist AND title matching
      const targetTitle = (title || '').trim();
      const targetArtist = (artist || '').trim();
      const cleanTitle = targetTitle.toLowerCase().replace(/[^\w\s]/g, '').trim();

      const term = `${targetTitle} ${targetArtist}`.trim();
      const url = `https://itunes.apple.com/search?media=music&entity=song&limit=5&term=${encodeURIComponent(
        term
      )}`;

      const res = await fetch(url, { signal: safeTimeoutSignal(3500) });
      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];

        // STRICT MATCHING: Must match BOTH the artist AND the track title!
        // Never assign an artwork of a different song or a different artist!
        const match = results.find((item) => {
          const itemArtist = (item.artistName || '').toLowerCase().trim();
          const itemTitle = (item.trackName || '').toLowerCase().trim();
          const cleanItemTitle = itemTitle.replace(/[^\w\s]/g, '').trim();

          const artistMatches = targetArtist ? isArtistFuzzyMatch(itemArtist, targetArtist) : true;
          if (!artistMatches) return false;

          const titleMatches =
            !cleanTitle ||
            itemTitle === targetTitle.toLowerCase().trim() ||
            cleanItemTitle === cleanTitle ||
            cleanItemTitle.startsWith(cleanTitle) ||
            cleanTitle.startsWith(cleanItemTitle);

          return titleMatches;
        });

        if (match?.artworkUrl100) {
          const recovered = match.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg');
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

