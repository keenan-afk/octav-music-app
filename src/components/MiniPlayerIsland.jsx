import React, { useRef } from 'react';
import { Play, Pause, Heart, Cast, Laptop, ListMusic } from 'lucide-react';
import { LiquidSurface } from './LiquidGlassFilter';
import { SmartArtwork } from './SmartArtwork';
import gsap from 'gsap';

/**
 * Floating Liquid Mini-Player Island
 * Exact Spotify iOS floating bar sitting above the bottom tab bar (mx-2 h-14 rounded-2xl).
 * Features:
 * - Explicit Click-to-Expand Zone wrapping artwork, track title, and artist name
 * - SmartArtwork auto-recovery resolver
 * - All controls (Heart, Play/Pause, Cast, Spatial badge) call e.stopPropagation()
 * - Sleek 2px real-time emerald glowing progress line along bottom inner edge
 * - High-contrast optical glass tint + blur(36px) saturate(210%)
 */
export function MiniPlayerIsland({
  currentTrack,
  isPlaying,
  progress = 0,
  isLiked,
  onTogglePlayPause,
  onToggleLike,
  onExpandSheet,
  onOpenSpatialAudio,
  onOpenQueue,
}) {
  const heartRef = useRef(null);

  const handleLikeClick = (e) => {
    e.stopPropagation();
    onToggleLike(currentTrack.id);

    if (heartRef.current) {
      gsap.fromTo(
        heartRef.current,
        { scale: 0.7, rotation: -15 },
        { scale: 1.25, rotation: 0, duration: 0.4, ease: 'back.out(3)', yoyo: true, repeat: 1 }
      );
    }
  };

  const handlePlayClick = (e) => {
    e.stopPropagation();
    onTogglePlayPause();
  };

  const handleCastClick = (e) => {
    e.stopPropagation();
    if (onOpenSpatialAudio) onOpenSpatialAudio();
  };

  const handleSpatialClick = (e) => {
    e.stopPropagation();
    if (onOpenSpatialAudio) onOpenSpatialAudio();
  };

  if (!currentTrack) return null;

  return (
    <div className="absolute bottom-[78px] inset-x-2 z-40 select-none pointer-events-auto">
      <LiquidSurface
        onClick={onExpandSheet}
        className="h-14 rounded-2xl cursor-pointer active:scale-[0.99] transition-transform duration-150"
        style={{
          background:
            'linear-gradient(145deg, rgba(22, 22, 28, 0.82) 0%, rgba(10, 10, 14, 0.72) 100%)',
          backdropFilter: 'url(#liquid-refraction) blur(36px) saturate(210%) brightness(1.06)',
          boxShadow:
            'inset 0 1px 0.5px 0 rgba(255, 255, 255, 0.45), inset 0 -1px 0.5px 0 rgba(255, 255, 255, 0.08), 0 18px 45px rgba(0, 0, 0, 0.85)',
        }}
      >
        <div className="relative w-full h-full px-2.5 flex items-center justify-between">
          {/* Explicit Click-to-Expand Zone: 40x40 Artwork + Marquee Track Info */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              onExpandSheet();
            }}
            className="flex items-center gap-2.5 min-w-0 flex-1 pr-2 cursor-pointer group active:opacity-85 transition-opacity"
            title="Tap to expand Now Playing view"
          >
            {/* 40x40 Thumbnail with SmartArtwork */}
            <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-900 border border-white/[0.12] shadow-md group-hover:scale-105 transition-transform duration-300">
              <SmartArtwork
                src={currentTrack.cover}
                title={currentTrack.title}
                artist={currentTrack.artist}
                className="w-full h-full object-cover"
                alt={currentTrack.title}
              />
            </div>

            {/* Title & Artist with razor-sharp contrast */}
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="text-xs font-extrabold text-white truncate leading-tight drop-shadow-sm group-hover:text-[#1ed760] transition-colors">
                  {currentTrack.title}
                </span>
                <span className="text-white/40 text-[10px]">•</span>
                <span className="text-xs font-semibold text-white/70 truncate leading-tight">
                  {currentTrack.artist}
                </span>
              </div>

              {/* Tappable Audio Quality Badge */}
              <div
                onClick={handleSpatialClick}
                className="inline-flex items-center gap-1 text-[10px] text-[#1ed760] font-semibold mt-0.5 tracking-tight hover:text-emerald-300 transition-colors cursor-pointer"
                title="Tap to open 5-Band Equalizer & Spatial Audio"
              >
                <Laptop className="w-2.5 h-2.5" />
                <span>
                  {typeof localStorage !== 'undefined' &&
                  localStorage.getItem('octav_audio_quality')?.includes('96kbps')
                    ? 'Data Saver • 96kbps'
                    : 'Octav Master • 320kbps'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Controls Row (All stopPropagation to prevent accidental modal expansion) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Device Picker Icon */}
            <button
              onClick={handleCastClick}
              className="p-1.5 text-white/50 hover:text-white active:scale-90 transition-all cursor-pointer"
              title="Connect to a device / Spatial Audio"
            >
              <Cast className="w-4 h-4" />
            </button>

            {/* Up Next Queue Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenQueue?.();
              }}
              className="p-1.5 text-white/50 hover:text-white active:scale-90 transition-all cursor-pointer"
              title="Open Up Next Queue"
            >
              <ListMusic className="w-4 h-4" />
            </button>

            {/* Like Heart with GSAP Elastic Pop */}
            <button
              ref={heartRef}
              onClick={handleLikeClick}
              className="p-1.5 text-white/70 hover:text-white active:scale-90 transition-transform cursor-pointer"
              title={isLiked ? 'Remove from your Library' : 'Save to your Library'}
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  isLiked ? 'fill-[#1ed760] text-[#1ed760]' : 'text-white/80'
                }`}
              />
            </button>

            {/* Tactile Play / Pause Button */}
            <button
              onClick={handlePlayClick}
              className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center active:scale-85 hover:scale-105 transition-all shadow-[0_2px_12px_rgba(255,255,255,0.3)] cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>
          </div>
        </div>

        {/* Bottom inner edge: Sleek 2px real-time emerald glowing progress line */}
        <div className="absolute bottom-0 inset-x-0 h-[2px] overflow-hidden bg-white/10 z-20 pointer-events-none rounded-b-2xl">
          <div
            className="h-full bg-[#1ed760] transition-all duration-75 ease-linear"
            style={{
              width: `${Math.min(100, Math.max(0, (progress || 0) * 100))}%`,
              boxShadow: '0 0 10px #1ed760, 0 0 4px #1ed760',
            }}
          />
        </div>
      </LiquidSurface>
    </div>
  );
}

export default MiniPlayerIsland;
