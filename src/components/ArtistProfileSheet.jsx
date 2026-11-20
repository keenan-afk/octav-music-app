import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  UserCheck,
  UserPlus,
  Share2,
} from 'lucide-react';
import { LiquidSurface } from './LiquidGlassFilter';
import { SmartArtwork } from './SmartArtwork';
import { fetchArtistDiscography } from '../services/musicApi';
import { syncUserDataToCloud } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import gsap from 'gsap';

const STORAGE_KEY_FOLLOWED = 'octav_followed_artists';
const LEGACY_STORAGE_KEY_FOLLOWED = 'vetra_followed_artists';

export function ArtistProfileSheet({
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
  const { user } = useAuth();
  const sheetRef = useRef(null);
  const [tracks, setTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [artistData, setArtistData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);

  // Followed artists state persisted in localStorage and synced to Supabase
  const [followedArtists, setFollowedArtists] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FOLLOWED) || localStorage.getItem(LEGACY_STORAGE_KEY_FOLLOWED);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const artistName = typeof artist === 'object' ? (artist?.name || artist?.title || '') : (artist || '');
  const isFollowing = followedArtists.includes(artistName);

  // Persist followed artists locally and sync to Supabase Cloud
  const toggleFollow = useCallback(() => {
    if (!artistName) return;
    setFollowedArtists((prev) => {
      let updated;
      if (prev.includes(artistName)) {
        updated = prev.filter((a) => a !== artistName);
        onShowToast?.(`Unfollowed ${artistName}`);
      } else {
        updated = [...prev, artistName];
        onShowToast?.(`Following ${artistName}`);
      }
      try {
        localStorage.setItem(STORAGE_KEY_FOLLOWED, JSON.stringify(updated));
        if (user?.id && user?.isSupabase) {
          syncUserDataToCloud({ followedArtists: updated });
        }
      } catch (e) {
        console.warn('Failed saving followed artists:', e);
      }
      return updated;
    });
  }, [artistName, onShowToast, user?.id, user?.isSupabase]);

  // GSAP Spring Slide-in / Slide-out Animation
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
          duration: 0.44,
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

  // Fetch artist top tracks and metadata
  useEffect(() => {
    if (!artist || !isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    fetchArtistDiscography(artist, region)
      .then((data) => {
        if (isMounted) {
          setArtistData(data.artist);
          setTracks(data.tracks || []);
          setAlbums(data.albums || []);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [artist, isOpen, region]);

  if (!artist && !isOpen) return null;

  const currentPlayingArtistTrack = tracks.some((t) => t.id === currentTrack?.id);
  const isThisArtistPlaying = currentPlayingArtistTrack && isPlaying;

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    if (isThisArtistPlaying) {
      onTogglePlayPause?.();
    } else {
      const targetTracks = isShuffle ? [...tracks].sort(() => Math.random() - 0.5) : tracks;
      onSelectTrack?.(targetTracks[0], targetTracks);
    }
  };

  const bannerCover = artistData?.cover || (typeof artist === 'object' ? artist?.cover : '') || (tracks[0]?.cover || '');

  return (
    <div
      ref={sheetRef}
      style={{ display: 'none' }}
      className="absolute inset-0 z-[60] flex flex-col bg-[#050507] text-white select-none overflow-hidden"
    >
      {/* Scrollable Container */}
      <div className="relative w-full h-full overflow-y-auto scrollbar-none pb-36">
        {/* Large Immersive Hero Banner */}
        <div className="relative w-full h-[360px] flex flex-col justify-between p-6 overflow-hidden">
          {/* Background Artwork with Gradient Fade */}
          <div className="absolute inset-0 z-0">
            <SmartArtwork
              src={bannerCover}
              title={artistName}
              artist={artistName}
              isArtist={true}
              className="w-full h-full object-cover filter brightness-[0.65] saturate-[1.2]"
            />
            {/* Ambient Multi-Stop Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-[#050507]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/40 to-transparent" />
          </div>

          {/* Top Navigation Bar */}
          <div className="relative z-10 flex items-center justify-between pt-2">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/90 hover:text-white hover:bg-black/60 active:scale-95 transition-all shadow-lg cursor-pointer"
              title="Close artist view"
            >
              <ChevronDown className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  onShowToast?.(`Copied ${artistName} link`);
                }}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/90 hover:text-white hover:bg-black/60 active:scale-95 transition-all shadow-lg cursor-pointer"
                title="Share Artist"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Artist Typography Title & Verified Badge */}
          <div className="relative z-10 flex flex-col gap-1.5 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white/80">
              <CheckCircle2 className="w-4 h-4 text-[#1ed760] fill-current" />
              <span>Verified Artist</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
              {artistData?.name || artistName}
            </h1>

            <p className="text-xs text-white/70 font-semibold tracking-tight">
              {artistData?.monthlyListeners || '3,842,910 monthly listeners'}
            </p>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Follow / Following Button */}
            <button
              onClick={toggleFollow}
              className={`py-2 px-5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 ${isFollowing
                  ? 'bg-transparent border-[#1ed760] text-[#1ed760]'
                  : 'bg-white text-black border-white hover:scale-105'
                }`}
            >
              {isFollowing ? (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Following</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Follow</span>
                </>
              )}
            </button>

            {/* Shuffle Mode Toggle */}
            <button
              onClick={() => {
                setIsShuffle((p) => !p);
                onShowToast?.(!isShuffle ? 'Artist shuffle enabled' : 'Artist shuffle disabled');
              }}
              className={`p-2.5 rounded-full transition-all active:scale-90 cursor-pointer ${isShuffle ? 'text-[#1ed760] bg-[#1ed760]/10' : 'text-white/60 hover:text-white'
                }`}
              title="Shuffle artist tracks"
            >
              <Shuffle className="w-5 h-5" />
            </button>
          </div>

          {/* Primary Play Button (Spotify Emerald Circle) */}
          <button
            onClick={handlePlayAll}
            disabled={tracks.length === 0}
            className="w-14 h-14 rounded-full bg-[#1ed760] text-black shadow-[0_10px_30px_rgba(30,215,96,0.4)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
            title="Play Artist"
          >
            {isThisArtistPlaying ? (
              <Pause className="w-6 h-6 fill-current text-black" />
            ) : (
              <Play className="w-6 h-6 fill-current text-black ml-1" />
            )}
          </button>
        </div>

        {/* Popular Tracks Header */}
        <div className="px-6 pt-5 pb-2">
          <h2 className="text-lg font-black tracking-tight text-white">Popular</h2>
        </div>

        {/* Tracks List */}
        <div className="px-3 flex flex-col">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-white/50">
              <Loader2 className="w-7 h-7 animate-spin text-[#1ed760]" />
              <span className="text-xs font-semibold">Loading artist catalog...</span>
            </div>
          ) : tracks.length > 0 ? (
            tracks.map((track, index) => {
              const isCurrent = currentTrack?.id === track.id || currentTrack?.title === track.title;
              const isLiked = likedTrackIds.has(track.id);

              return (
                <div
                  key={track.id || index}
                  onClick={() => onSelectTrack?.(track, tracks)}
                  className={`group flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer active:scale-[0.99] ${isCurrent ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                    }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-2">
                    {/* Track Rank Number */}
                    <span
                      className={`w-4 text-center text-xs font-bold font-mono shrink-0 ${isCurrent ? 'text-[#1ed760]' : 'text-white/40 group-hover:text-white/70'
                        }`}
                    >
                      {isCurrent && isPlaying ? (
                        <div className="flex items-end justify-center gap-[1px] h-3">
                          <span className="w-0.5 bg-[#1ed760] h-2.5 animate-pulse" />
                          <span className="w-0.5 bg-[#1ed760] h-3 animate-pulse delay-75" />
                          <span className="w-0.5 bg-[#1ed760] h-1.5 animate-pulse delay-150" />
                        </div>
                      ) : (
                        index + 1
                      )}
                    </span>

                    {/* Artwork */}
                    <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-neutral-900 border border-white/10 shadow-sm">
                      <SmartArtwork
                        src={track.cover}
                        title={track.title}
                        artist={track.artist}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Title & Streams */}
                    <div className="min-w-0 flex-1">
                      <h4
                        className={`text-sm font-bold truncate leading-tight ${isCurrent ? 'text-[#1ed760]' : 'text-white group-hover:text-white'
                          }`}
                      >
                        {track.title}
                      </h4>
                      <p className="text-xs text-white/50 truncate font-medium mt-0.5">
                        {track.album || track.artist}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Duration */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLike?.(track);
                      }}
                      className="p-1.5 text-white/40 hover:text-white active:scale-90 transition-transform cursor-pointer"
                      title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
                    >
                      <Heart
                        className={`w-4 h-4 ${isLiked ? 'fill-[#1ed760] text-[#1ed760]' : 'hover:text-white'
                          }`}
                      />
                    </button>

                    <span className="text-xs font-mono text-white/40 min-w-[34px] text-right">
                      {track.durationFormatted || '3:30'}
                    </span>

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
            })
          ) : (
            <div className="py-12 text-center text-white/40 text-xs">
              No top tracks found for this artist.
            </div>
          )}
        </div>

        {/* Albums & Singles Section */}
        {albums.length > 0 && (
          <div className="pt-6 pb-2">
            <div className="px-6 flex items-center justify-between mb-3">
              <h2 className="text-lg font-black tracking-tight text-white">Albums & Singles</h2>
              <span className="text-xs font-semibold text-white/50">{albums.length} releases</span>
            </div>

            <div className="flex gap-3 px-6 overflow-x-auto scrollbar-none pb-2 pt-0.5">
              {albums.map((album) => (
                <div
                  key={album.id}
                  onClick={() => {
                    onShowToast?.(`Album: ${album.title} (${album.releaseYear})`);
                  }}
                  className="flex-shrink-0 w-[136px] group cursor-pointer active:scale-95 transition-transform"
                >
                  <div
                    className="relative w-[136px] h-[136px] rounded-xl overflow-hidden mb-2 border border-white/[0.08]"
                    style={{
                      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                    }}
                  >
                    <SmartArtwork
                      src={album.cover}
                      title={album.title}
                      artist={album.artist}
                      isAlbum={true}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 pointer-events-none" />
                  </div>

                  <h3 className="text-xs font-bold text-white truncate leading-tight group-hover:text-[#1ed760] transition-colors">
                    {album.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-white/50 font-medium mt-0.5">
                    <span>{album.releaseYear}</span>
                    <span>•</span>
                    <span>{album.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* About the Artist Bio Card */}
        {artistData && (
          <div className="px-4 mt-8">
            <LiquidSurface className="p-5 rounded-3xl border border-white/10 flex flex-col gap-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                About the Artist
              </span>
              <p className="text-xs text-white/70 leading-relaxed">
                {artistName} is one of the most recognized voices in {artistData.genre || 'contemporary music'},
                loved by millions of listeners across {region === 'ID' ? 'Indonesia' : 'the world'}.
                Listen to their popular songs and full albums on Octav.
              </p>
              <div className="flex items-center gap-2 pt-2 border-t border-white/10 text-[11px] text-white/50">
                <span className="w-2 h-2 rounded-full bg-[#1ed760]" />
                <span>{artistData.monthlyListeners || 'Verified Profile'}</span>
              </div>
            </LiquidSurface>
          </div>
        )}
      </div>
    </div>
  );
}

export { ArtistProfileSheet as ArtistView };
export default ArtistProfileSheet;
