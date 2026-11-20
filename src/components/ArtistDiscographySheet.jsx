import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  Shuffle,
  Heart,
  MoreVertical,
  CheckCircle2,
  Sparkles,
  Music2,
  X,
  Loader2,
} from 'lucide-react';
import { LiquidSurface } from './LiquidGlassFilter';
import { SmartArtwork } from './SmartArtwork';
import { fetchArtistDiscography } from '../services/musicApi';
import gsap from 'gsap';

/**
 * Artist Discography Sheet (iOS 26 Liquid Glass)
 * Opens when tapping the "Top Artist Result" Card in Search.
 * Displays artist hero, discography tracklist, Play All, Shuffle, and row actions.
 */
export function ArtistDiscographySheet({
  isOpen,
  onClose,
  artist,
  region = 'ID',
  currentTrack,
  isPlaying,
  onSelectTrack,
  onTogglePlayPause,
  likedTrackIds = new Set(),
  onToggleLike,
  onOpenActionSheet,
  onShowToast,
}) {
  const sheetRef = useRef(null);
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    if (isOpen) {
      sheet.style.display = 'flex';
      gsap.killTweensOf(sheet);
      gsap.fromTo(
        sheet,
        { y: '100%', opacity: 0.9 },
        {
          y: '0%',
          opacity: 1,
          duration: 0.45,
          ease: 'back.out(1.15)',
          force3D: true,
        }
      );
    } else {
      gsap.killTweensOf(sheet);
      gsap.to(sheet, {
        y: '100%',
        opacity: 0.9,
        duration: 0.32,
        ease: 'power3.in',
        force3D: true,
        onComplete: () => {
          if (sheet) sheet.style.display = 'none';
        },
      });
    }
  }, [isOpen]);

  // Fetch artist discography when artist changes
  useEffect(() => {
    if (!artist?.id || !isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    fetchArtistDiscography(artist.id, region)
      .then((data) => {
        if (isMounted) {
          setTracks(data.tracks || []);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [artist?.id, isOpen, region]);

  if (!artist && !isOpen) return null;

  const isCurrentArtistPlaying =
    isPlaying && tracks.some((t) => t.id === currentTrack?.id);

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    if (isCurrentArtistPlaying) {
      onTogglePlayPause?.();
    } else {
      onSelectTrack?.(tracks[0], tracks);
    }
  };

  const handleShufflePlay = () => {
    if (tracks.length === 0) return;
    const randomIndex = Math.floor(Math.random() * tracks.length);
    onSelectTrack?.(tracks[randomIndex], tracks);
  };

  return (
    <div
      ref={sheetRef}
      className="absolute inset-0 z-50 flex flex-col justify-end select-none pointer-events-auto bg-[#050507]"
      style={{
        transform: 'translateY(100%)',
        display: 'none',
      }}
    >
      {/* Dynamic Ambient Color Bleed */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 z-0"
        style={{
          background:
            'radial-gradient(circle at 50% 20%, #104e38 0%, #07241a 50%, #050507 90%)',
          filter: 'blur(70px)',
        }}
      />

      {/* Top Header Navigation */}
      <div className="relative z-10 px-4 pt-3 pb-2 flex items-center justify-between backdrop-blur-xl bg-[#050507]/60 border-b border-white/[0.05]">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] active:scale-90 transition-all cursor-pointer"
          title="Close"
        >
          <ChevronDown className="w-5 h-5" />
        </button>

        <span className="text-xs font-bold uppercase tracking-wider text-white/70 truncate max-w-[200px]">
          {artist?.name}
        </span>

        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] active:scale-90 transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="relative z-10 flex-1 overflow-y-auto scrollbar-none pb-36 px-4 pt-2">
        {/* Artist Hero Header */}
        <div className="flex flex-col items-center text-center pt-3 pb-6">
          {/* 130x130 Circular Glass Avatar */}
          <div
            className="relative w-32 h-32 rounded-full overflow-hidden mb-4 border-2 border-white/20 shadow-2xl"
            style={{
              boxShadow:
                '0 15px 35px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
            }}
          >
            <SmartArtwork
              src={artist?.cover}
              title={artist?.name}
              artist={artist?.name}
              className="w-full h-full object-cover"
              rounded="rounded-full"
            />
          </div>

          <div className="flex items-center gap-1.5 mb-1">
            <h1 className="text-2xl font-black text-white tracking-tight">{artist?.name}</h1>
            <CheckCircle2 className="w-5 h-5 text-[#1ed760] fill-[#1ed760]/20" />
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-white/50 mb-3">
            <span>Verified Artist</span>
            <span>•</span>
            <span>{artist?.genre || 'Pop / Rock'}</span>
            <span>•</span>
            <span>{region === 'ID' ? '🇮🇩 Indonesia Catalog' : '🌐 Global'}</span>
          </div>

          {/* Action Row: Play All, Shuffle & Follow */}
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={handlePlayAll}
              className="px-6 py-2.5 rounded-full bg-[#1ed760] hover:bg-[#1fdf64] active:scale-95 text-black font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-[#1ed760]/30 transition-all cursor-pointer"
            >
              {isCurrentArtistPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                  <span>Play All</span>
                </>
              )}
            </button>

            <button
              onClick={handleShufflePlay}
              className="w-10 h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 text-white flex items-center justify-center border border-white/[0.08] transition-all cursor-pointer"
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setIsFollowing((prev) => !prev);
                onShowToast?.(
                  !isFollowing ? `Followed ${artist?.name}` : `Unfollowed ${artist?.name}`
                );
              }}
              className={`px-4 py-2 rounded-full border text-xs font-bold transition-all cursor-pointer ${
                isFollowing
                  ? 'border-[#1ed760] bg-[#1ed760]/20 text-[#1ed760]'
                  : 'border-white/30 text-white hover:border-white active:scale-95'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          </div>
        </div>

        {/* Section Title */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-white/50">
            Popular Releases ({tracks.length})
          </h2>
          <span className="text-[11px] font-semibold text-[#1ed760] flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Popular Tracks
          </span>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-white/40">
            <Loader2 className="w-6 h-6 animate-spin text-[#1ed760]" />
            <span className="text-xs font-semibold">Loading discography...</span>
          </div>
        )}

        {/* Tracklist */}
        {!isLoading && (
          <div className="flex flex-col gap-1">
            {tracks.map((track, idx) => {
              const isSelected = currentTrack?.id === track.id;
              const isLiked = likedTrackIds.has(track.id);

              return (
                <div
                  key={track.id}
                  onClick={() => onSelectTrack?.(track, tracks)}
                  className={`group relative flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all duration-150 active:scale-[0.99] border ${
                    isSelected
                      ? 'bg-white/[0.08] border-white/[0.08]'
                      : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.03]'
                  }`}
                >
                  {/* Left: Index + Artwork + Title */}
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                    <span className="w-5 text-center text-xs font-bold text-white/40">
                      {isSelected && isPlaying ? (
                        <div className="flex items-end justify-center gap-[2px] h-3">
                          <span className="w-[2px] bg-[#1ed760] rounded-full animate-[bounce_0.6s_ease-in-out_infinite] h-2" />
                          <span className="w-[2px] bg-[#1ed760] rounded-full animate-[bounce_0.8s_ease-in-out_infinite] h-3" />
                        </div>
                      ) : (
                        idx + 1
                      )}
                    </span>

                    <SmartArtwork
                      src={track.cover}
                      title={track.title}
                      artist={track.artist}
                      className="w-11 h-11 rounded-lg object-cover flex-shrink-0 border border-white/[0.08] shadow-sm"
                    />

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-bold truncate leading-tight ${
                          isSelected ? 'text-[#1ed760]' : 'text-white'
                        }`}
                      >
                        {track.title}
                      </p>
                      <p className="text-xs text-white/50 truncate font-medium mt-0.5">
                        {track.album || track.artist}
                      </p>
                    </div>
                  </div>

                  {/* Right: Duration, Like & More */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-semibold text-white/40">
                      {track.durationFormatted}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLike?.(track);
                        onShowToast?.(isLiked ? 'Removed from Liked Songs' : 'Saved to Liked Songs');
                      }}
                      className="p-1.5 text-white/40 hover:text-white active:scale-90 transition-transform cursor-pointer"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isLiked ? 'fill-[#1ed760] text-[#1ed760]' : 'text-white/40'
                        }`}
                      />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenActionSheet?.(track);
                      }}
                      className="p-1.5 text-white/40 hover:text-white active:scale-90 transition-transform cursor-pointer"
                      title="More options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ArtistDiscographySheet;

