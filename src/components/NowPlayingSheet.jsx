import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ChevronDown,
  MoreVertical,
  Heart,
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Repeat1,
  Share2,
  Sparkles,
  Sliders,
  Check,
  Zap,
  ListMusic,
} from 'lucide-react';
import { LiquidSurface } from './LiquidGlassFilter';
import { SmartArtwork } from './SmartArtwork';
import gsap from 'gsap';

/**
 * Full-Screen "Now Playing" Sheet
 * Replicates Spotify iOS 1:1 Now Playing experience elevated with iOS 26 Liquid Glass:
 * - GSAP spring slide up/down animation (back.out(1.18) ~ tension: 300, friction: 30)
 * - Cover art spring breathing: scale-100 when playing, scale-90 when paused
 * - Precision liquid scrub bar with real-time drag/click and remaining timestamps
 * - Tactile oversized Liquid Glass Play/Pause button
 * - Time-synced lyrics card with active line highlight and click-to-seek
 * - Tapping Spatial Audio badge opens Web Audio 5-band EQ & Spatial Popover
 * - Three-dots (...) menu triggers ActionSheet
 * - "About the Artist" card with working Follow toggle
 */
export function NowPlayingSheet({
  isOpen,
  isExpanded,
  onClose,
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  progress,
  isLiked,
  isShuffle,
  setIsShuffle,
  repeatMode,
  setRepeatMode,
  onTogglePlayPause,
  onNextTrack,
  onPrevTrack,
  onSeekTo,
  onToggleLike,
  onOpenSpatialAudio,
  onOpenEQ,
  onOpenStudio,
  onOpenLyricsShare,
  onOpenArtist,
  onOpenQueue,
  loopA,
  loopB,
  onOpenActionSheet,
  onShowToast,
  formatTime,
  formatRemainingTime,
  activePlaylistTitle = 'Now Playing',
}) {
  const sheetRef = useRef(null);
  const coverRef = useRef(null);
  const heartRef = useRef(null);
  const progressBarRef = useRef(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const lyricsScrollRef = useRef(null);

  const activeOpen = Boolean(isOpen ?? isExpanded);

  // GSAP Spring Slide In / Out Animation (tension: 300, friction: 30 physics)
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    if (activeOpen) {
      sheet.style.display = 'flex';
      gsap.killTweensOf(sheet);
      gsap.fromTo(
        sheet,
        { y: '100%', opacity: 0.92 },
        {
          y: '0%',
          opacity: 1,
          duration: 0.54,
          ease: 'back.out(1.18)',
          force3D: true,
        }
      );
    } else {
      gsap.killTweensOf(sheet);
      gsap.to(sheet, {
        y: '100%',
        opacity: 0.92,
        duration: 0.38,
        ease: 'power3.in',
        force3D: true,
        onComplete: () => {
          if (sheet) sheet.style.display = 'none';
        },
      });
    }
  }, [activeOpen]);

  // Spring effect on cover art when playing / paused
  useEffect(() => {
    if (!coverRef.current) return;
    gsap.to(coverRef.current, {
      scale: isPlaying ? 1 : 0.9,
      duration: 0.55,
      ease: 'back.out(1.8)',
    });
  }, [isPlaying]);

  // Auto-scroll lyrics to active line
  useEffect(() => {
    if (!lyricsScrollRef.current || !currentTrack?.lyrics) return;
    const activeIndex = currentTrack.lyrics.findIndex((l, i) => {
      const nextTime = currentTrack.lyrics[i + 1]?.time ?? Infinity;
      return currentTime >= l.time && currentTime < nextTime;
    });

    if (activeIndex !== -1) {
      const element = lyricsScrollRef.current.children[activeIndex];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTime, currentTrack]);

  // Handle scrub bar drag & click
  const handleScrubMove = useCallback(
    (e) => {
      if (!progressBarRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
      if (clientX == null) return;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setScrubValue(ratio * duration);
    },
    [duration]
  );

  const handleScrubStart = (e) => {
    setIsScrubbing(true);
    handleScrubMove(e);
  };

  const handleScrubEnd = () => {
    if (isScrubbing) {
      onSeekTo(scrubValue);
      setIsScrubbing(false);
    }
  };

  const handleLikeClick = (e) => {
    e.stopPropagation();
    if (!currentTrack) return;
    onToggleLike(currentTrack.id);
    if (heartRef.current) {
      gsap.fromTo(
        heartRef.current,
        { scale: 0.65 },
        { scale: 1.35, duration: 0.35, ease: 'back.out(4)', yoyo: true, repeat: 1 }
      );
    }
  };

  const handleShareClick = async () => {
    if (!currentTrack) return;
    const shareText = `🎵 Listening to "${currentTrack.title}" by ${currentTrack.artist} on Octav`;
    if (navigator.share) {
      try {
        await navigator.share({ title: currentTrack.title, text: shareText, url: window.location.href });
        onShowToast?.('Shared successfully');
        return;
      } catch (e) {}
    }
    try {
      await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
      onShowToast?.('Song link copied to clipboard');
    } catch (e) {
      onShowToast?.(`Shared: ${currentTrack.title}`);
    }
  };

  const displayTime = isScrubbing ? scrubValue : currentTime;
  const currentRatio = duration > 0 ? displayTime / duration : 0;

  if (!currentTrack) return null;

  return (
    <div
      ref={sheetRef}
      className="absolute inset-0 z-50 flex flex-col overflow-hidden select-none bg-[#050507]"
      style={{
        transform: 'translateY(100%)',
        display: 'none',
      }}
      onMouseUp={handleScrubEnd}
      onTouchEnd={handleScrubEnd}
    >
      {/* Background Liquid Ambient Color Bleed */}
      <div
        className="absolute inset-0 pointer-events-none opacity-65 z-0"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${
            currentTrack?.palette?.primary || '#104e38'
          } 0%, ${currentTrack?.palette?.secondary || '#07241a'} 60%, #050507 100%)`,
          filter: 'blur(60px)',
        }}
      />

      {/* Pull-down pill handle for native iOS feel */}
      <div
        onClick={onClose}
        className="relative z-10 w-full flex justify-center pt-2.5 pb-1 cursor-pointer active:opacity-60 transition-opacity"
        title="Swipe or tap down to close"
      >
        <div className="w-10 h-1 bg-white/30 rounded-full hover:bg-white/50 transition-colors" />
      </div>

      {/* Top Header Bar */}
      <div className="relative z-10 pt-1 pb-2 px-5 flex items-center justify-between">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:text-white active:scale-90 transition-transform cursor-pointer"
          title="Minimize"
        >
          <ChevronDown className="w-7 h-7" />
        </button>

        <div className="flex flex-col items-center text-center">
          <span className="text-[10px] uppercase font-bold tracking-widest text-white/50">
            Playing from playlist
          </span>
          <span className="text-xs font-bold text-white tracking-tight line-clamp-1 max-w-[220px]">
            {activePlaylistTitle}
          </span>
        </div>

        <button
          onClick={() => onOpenActionSheet?.(currentTrack)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:text-white active:scale-90 transition-transform cursor-pointer"
          title="More options"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Main Scrollable Sheet Content */}
      <div className="relative z-10 flex-1 overflow-y-auto scrollbar-none px-6 pt-2 pb-16 flex flex-col items-center">
        {/* Cover Art Stage */}
        <div className="w-full max-w-[340px] aspect-square my-4 flex items-center justify-center">
          <div
            ref={coverRef}
            className="relative w-full h-full rounded-2xl overflow-hidden border border-white/[0.14] transition-shadow duration-500"
            style={{
              boxShadow: isPlaying
                ? 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.45), 0 30px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(30, 215, 96, 0.15)'
                : 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.3), 0 20px 40px rgba(0, 0, 0, 0.8)',
            }}
          >
            <SmartArtwork
              src={currentTrack?.cover}
              title={currentTrack?.title}
              artist={currentTrack?.artist}
              className="w-full h-full object-cover"
              alt={currentTrack?.title}
            />
            {/* Liquid Glaze Rim Sheen */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0%, transparent 60%)',
              }}
            />
          </div>
        </div>

        {/* Track Title, Artist & Like Button */}
        <div className="w-full max-w-[340px] flex items-center justify-between mb-4 mt-1">
          <div className="min-w-0 flex-1 pr-3">
            <h1 className="text-xl font-extrabold text-white truncate tracking-tight">
              {currentTrack?.title}
            </h1>
            <p
              onClick={() => onOpenArtist?.(currentTrack?.artist)}
              className="text-sm font-semibold text-white/60 hover:text-white hover:underline truncate mt-0.5 cursor-pointer transition-colors inline-block"
              title={`View ${currentTrack?.artist} profile`}
            >
              {currentTrack?.artist}
            </p>
          </div>

          <button
            ref={heartRef}
            onClick={handleLikeClick}
            className="p-2 text-white/70 hover:text-white active:scale-90 transition-transform cursor-pointer"
            title="Like this song"
          >
            <Heart
              className={`w-6 h-6 ${
                isLiked ? 'fill-[#1ed760] text-[#1ed760]' : 'text-white/80'
              }`}
            />
          </button>
        </div>

        {/* Interactive Liquid Scrub Bar */}
        <div className="w-full max-w-[340px] mb-4">
          <div
            ref={progressBarRef}
            onMouseDown={handleScrubStart}
            onTouchStart={handleScrubStart}
            onMouseMove={isScrubbing ? handleScrubMove : undefined}
            onTouchMove={isScrubbing ? handleScrubMove : undefined}
            className="group relative h-7 flex items-center cursor-pointer"
          >
            {/* Track Background */}
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden transition-all duration-150 group-hover:h-1.5">
              <div
                className="h-full bg-white group-hover:bg-[#1ed760] transition-colors rounded-full"
                style={{ width: `${currentRatio * 100}%` }}
              />
            </div>

            {/* A-B Section Looper Markers */}
            {loopA !== null && duration > 0 && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-3.5 bg-amber-400 rounded-sm shadow-[0_0_8px_rgba(251,191,36,0.9)] z-20 pointer-events-none flex items-center justify-center"
                style={{ left: `calc(${(loopA / duration) * 100}% - 5px)` }}
                title={`Loop A: ${formatTime(loopA)}`}
              >
                <span className="text-[7px] font-black text-black leading-none">A</span>
              </div>
            )}
            {loopB !== null && duration > 0 && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-3.5 bg-[#1ed760] rounded-sm shadow-[0_0_8px_rgba(30,215,96,0.9)] z-20 pointer-events-none flex items-center justify-center"
                style={{ left: `calc(${(loopB / duration) * 100}% - 5px)` }}
                title={`Loop B: ${formatTime(loopB)}`}
              >
                <span className="text-[7px] font-black text-black leading-none">B</span>
              </div>
            )}

            {/* Glowing Liquid Thumb */}
            <div
              className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] pointer-events-none transition-transform duration-100"
              style={{
                left: `calc(${currentRatio * 100}% - 7px)`,
                transform: isScrubbing ? 'scale(1.3)' : 'scale(1)',
              }}
            />
          </div>

          {/* Timestamps */}
          <div className="flex items-center justify-between text-[11px] font-semibold text-white/50 -mt-1 tracking-tight">
            <span>{formatTime(displayTime)}</span>
            <span>{formatRemainingTime(displayTime, duration)}</span>
          </div>
        </div>

        {/* Primary Playback Controls Row */}
        <div className="w-full max-w-[340px] flex items-center justify-between mb-8 px-1">
          {/* Shuffle Toggle */}
          <button
            onClick={() => {
              setIsShuffle((prev) => !prev);
              onShowToast?.(!isShuffle ? 'Shuffle enabled' : 'Shuffle disabled');
            }}
            className={`p-2 transition-colors relative active:scale-90 cursor-pointer ${
              isShuffle ? 'text-[#1ed760]' : 'text-white/60 hover:text-white'
            }`}
            title="Shuffle"
          >
            <Shuffle className="w-5 h-5" />
            {isShuffle && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#1ed760] rounded-full" />
            )}
          </button>

          {/* Previous Track */}
          <button
            onClick={onPrevTrack}
            className="p-2 text-white/90 hover:text-white active:scale-90 transition-all cursor-pointer"
            title="Previous"
          >
            <SkipBack className="w-7 h-7 fill-current" />
          </button>

          {/* Oversized Tactile Play/Pause Button */}
          <button
            onClick={onTogglePlayPause}
            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center active:scale-90 hover:scale-105 transition-all shadow-[0_6px_25px_rgba(255,255,255,0.35)] cursor-pointer"
            style={{
              boxShadow:
                'inset 0 1px 1px 0 rgba(255, 255, 255, 0.7), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.2), 0 10px 30px rgba(0, 0, 0, 0.6)',
            }}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 fill-current ml-1" />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={onNextTrack}
            className="p-2 text-white/90 hover:text-white active:scale-90 transition-all cursor-pointer"
            title="Next"
          >
            <SkipForward className="w-7 h-7 fill-current" />
          </button>

          {/* Repeat Toggle */}
          <button
            onClick={() => {
              if (repeatMode === 'off') {
                setRepeatMode('all');
                onShowToast?.('Repeat playlist enabled');
              } else if (repeatMode === 'all') {
                setRepeatMode('one');
                onShowToast?.('Repeat track enabled');
              } else {
                setRepeatMode('off');
                onShowToast?.('Repeat disabled');
              }
            }}
            className={`p-2 transition-colors relative active:scale-90 cursor-pointer ${
              repeatMode !== 'off' ? 'text-[#1ed760]' : 'text-white/60 hover:text-white'
            }`}
            title="Repeat"
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-5 h-5" />
            ) : (
              <Repeat className="w-5 h-5" />
            )}
            {repeatMode !== 'off' && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#1ed760] rounded-full" />
            )}
          </button>
        </div>

        {/* Secondary Bar: Spatial Audio Badge, Musician Jam Studio & Share */}
        <div className="w-full max-w-[340px] flex items-center justify-between pb-6 text-white/60 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div
              onClick={onOpenEQ || onOpenSpatialAudio}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#1ed760] hover:text-emerald-300 transition-colors cursor-pointer"
              title="Open 5-Band Master Equalizer & IEM Presets"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>5-Band EQ</span>
            </div>

            <button
              onClick={onOpenStudio}
              className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#1ed760]/15 text-[#1ed760] border border-[#1ed760]/30 hover:bg-[#1ed760]/25 active:scale-95 transition-all"
              title="Open Musician Jam Practice Studio"
            >
              <Zap className="w-3 h-3 fill-current" />
              <span>Jam Studio</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenEQ || onOpenSpatialAudio}
              className="p-1 text-white/60 hover:text-white active:scale-90 transition-transform cursor-pointer"
              title="5-Band Master Equalizer"
            >
              <Sliders className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenQueue}
              className="p-1 text-white/60 hover:text-white active:scale-90 transition-transform cursor-pointer"
              title="Up Next Queue"
            >
              <ListMusic className="w-4 h-4" />
            </button>
            <button
              onClick={handleShareClick}
              className="p-1 text-white/60 hover:text-white active:scale-90 transition-transform cursor-pointer"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Time-Synced Lyrics Card (Frosted Tinted Glass) */}
        <div className="w-full max-w-[340px] mt-6">
          <LiquidSurface
            className="p-5 rounded-2xl"
            style={{
              background:
                'linear-gradient(145deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.02) 100%)',
              backdropFilter: 'blur(32px) saturate(190%)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                Lyrics
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenLyricsShare}
                  className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 border border-white/15 active:scale-95 transition-all"
                  title="Create 9:16 Story Card"
                >
                  <Sparkles className="w-3 h-3 text-[#1ed760]" />
                  <span>Share Card</span>
                </button>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1ed760]/20 text-[#1ed760] border border-[#1ed760]/30">
                  Synced LRCLIB
                </span>
              </div>
            </div>

            <div
              ref={lyricsScrollRef}
              className="max-h-[190px] overflow-y-auto scrollbar-none flex flex-col gap-3.5 py-2"
            >
              {currentTrack?.lyrics && currentTrack.lyrics.length > 0 ? (
                currentTrack.lyrics.map((line, idx) => {
                  const nextTime = currentTrack.lyrics[idx + 1]?.time ?? Infinity;
                  const isLineActive = currentTime >= line.time && currentTime < nextTime;

                  return (
                    <p
                      key={idx}
                      onClick={() => onSeekTo(line.time)}
                      className={`text-base font-bold transition-all duration-300 cursor-pointer ${
                        isLineActive
                          ? 'text-white text-lg scale-[1.02] origin-left drop-shadow-[0_2px_10px_rgba(255,255,255,0.4)]'
                          : 'text-white/30 hover:text-white/60'
                      }`}
                    >
                      {line.text}
                    </p>
                  );
                })
              ) : (
                <p className="text-sm text-white/40 italic py-4 text-center">
                  Searching synchronized lyrics from LRCLIB...
                </p>
              )}
            </div>
          </LiquidSurface>
        </div>

        {/* About the Artist Glass Card (Clickable to Artist Profile) */}
        <div
          onClick={() => onOpenArtist?.(currentTrack?.artist)}
          className="w-full max-w-[340px] mt-4 mb-8 cursor-pointer group active:scale-[0.99] transition-transform"
          title={`View ${currentTrack?.artist} profile`}
        >
          <LiquidSurface className="rounded-2xl overflow-hidden border border-white/10 group-hover:border-white/20 transition-colors">
            <div className="relative h-28 w-full overflow-hidden">
              <SmartArtwork
                src={currentTrack?.cover}
                title={currentTrack?.title}
                artist={currentTrack?.artist}
                className="w-full h-full object-cover filter brightness-75 group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-transparent to-transparent" />
              <span className="absolute top-3 left-3 text-[11px] font-extrabold uppercase tracking-wider text-white">
                About the artist
              </span>
            </div>

            <div className="p-4 pt-1">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-extrabold text-white group-hover:text-[#1ed760] transition-colors">{currentTrack?.artist}</h3>
                  <p className="text-xs text-white/50 font-medium">
                    {currentTrack?.monthlyListeners || '3,410,200'} monthly listeners
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFollowing((prev) => !prev);
                    onShowToast?.(!isFollowing ? `Followed ${currentTrack?.artist}` : `Unfollowed ${currentTrack?.artist}`);
                  }}
                  className={`px-3.5 py-1 text-xs font-bold rounded-full border transition-all cursor-pointer ${
                    isFollowing
                      ? 'border-[#1ed760] bg-[#1ed760]/20 text-[#1ed760]'
                      : 'border-white/30 text-white hover:border-white active:scale-95'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
              <p className="text-xs text-white/60 leading-relaxed font-medium line-clamp-3">
                {currentTrack?.artistBio ||
                  `Explore full discography, top hits, and albums by ${currentTrack?.artist} on Octav.`}
              </p>
            </div>
          </LiquidSurface>
        </div>
      </div>
    </div>
  );
}

export default NowPlayingSheet;
