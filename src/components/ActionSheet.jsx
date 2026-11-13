import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  ListPlus,
  PlaySquare,
  Clock,
  Gauge,
  Share2,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  Plus,
  User,
} from 'lucide-react';
import { LiquidSurface } from './LiquidGlassFilter';
import { SmartArtwork } from './SmartArtwork';
import gsap from 'gsap';

/**
 * iOS 26 Liquid Glass Action Sheet
 * Context menu triggered by three-dots (...) button everywhere.
 * Provides working actions:
 * 1. Add to Playlist (with nested sub-view + new playlist shortcut)
 * 2. Add / Remove from Liked Songs
 * 3. Play Next in Queue
 * 4. Sleep Timer (Off, 15m, 30m, 60m, End of Track)
 * 5. Playback Speed / Pitch (0.8x Slowed + Reverb, 1.0x Normal, 1.2x Nightcore)
 * 6. Share Track (copies link to clipboard + toast)
 */
export function ActionSheet({
  isOpen,
  onClose,
  track,
  isLiked = false,
  onToggleLike,
  onOpenArtist,
  onPlayNext,
  onAddToPlaylist,
  onOpenCreatePlaylist,
  customPlaylists = [],
  sleepTimerRemaining = null,
  onSetSleepTimer,
  playbackSpeed = 1.0,
  onChangePlaybackSpeed,
  onShowToast,
}) {
  const sheetRef = useRef(null);
  const [activeView, setActiveView] = useState('main'); // 'main' | 'playlists' | 'sleepTimer' | 'speed'

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    if (isOpen) {
      setActiveView('main');
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

  if (!track && !isOpen) return null;

  const handleShare = async () => {
    const shareText = `🎵 Listening to "${track.title}" by ${track.artist} on Octav`;
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: track.title,
          text: shareText,
          url: shareUrl,
        });
        onShowToast?.('Shared successfully');
        onClose();
        return;
      } catch (e) {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      onShowToast?.('Song link copied to clipboard');
    } catch (e) {
      onShowToast?.(`Shared: ${track.title} - ${track.artist}`);
    }
    onClose();
  };

  const handlePlayNext = () => {
    onPlayNext?.(track);
    onShowToast?.(`"${track.title}" will play next`);
    onClose();
  };

  const handleToggleLike = () => {
    onToggleLike?.(track);
    onShowToast?.(isLiked ? 'Removed from Liked Songs' : 'Saved to Liked Songs');
    onClose();
  };

  const handleSelectPlaylist = (playlistId, playlistTitle) => {
    const success = onAddToPlaylist?.(playlistId, track);
    if (success) {
      onShowToast?.(`Added to "${playlistTitle}"`);
    } else {
      onShowToast?.(`Already in "${playlistTitle}"`);
    }
    onClose();
  };

  const sleepTimerOptions = [
    { label: 'Off', minutes: 0 },
    { label: '15 Minutes', minutes: 15 },
    { label: '30 Minutes', minutes: 30 },
    { label: '45 Minutes', minutes: 45 },
    { label: '60 Minutes (1 Hour)', minutes: 60 },
    { label: 'End of Track', minutes: 'end' },
  ];

  const speedOptions = [
    { label: '0.8x • Slowed & Reverb', speed: 0.8 },
    { label: '1.0x • Normal Speed', speed: 1.0 },
    { label: '1.15x • Sped Up', speed: 1.15 },
    { label: '1.25x • Nightcore', speed: 1.25 },
  ];

  return (
    <div
      ref={sheetRef}
      className="absolute inset-0 z-50 flex flex-col justify-end select-none pointer-events-auto"
      style={{
        transform: 'translateY(100%)',
        display: 'none',
      }}
    >
      {/* Backdrop Dimmer */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm -z-10 cursor-pointer animate-in fade-in"
      />

      <LiquidSurface
        className="w-full rounded-t-[32px] p-5 pb-8 max-h-[85vh] overflow-y-auto scrollbar-none border-t border-white/[0.14]"
        style={{
          background:
            'linear-gradient(145deg, rgba(24, 24, 32, 0.94) 0%, rgba(12, 12, 18, 0.9) 100%)',
          backdropFilter: 'url(#liquid-refraction) blur(40px) saturate(220%) brightness(1.08)',
          boxShadow:
            'inset 0 1px 1px 0 rgba(255, 255, 255, 0.5), 0 -15px 45px rgba(0, 0, 0, 0.9)',
        }}
      >
        {/* Pull-down pill */}
        <div
          onClick={onClose}
          className="w-full flex justify-center -mt-2 pb-3 cursor-pointer active:opacity-60"
        >
          <div className="w-10 h-1 bg-white/30 rounded-full" />
        </div>

        {/* Selected Track Preview Header */}
        <div className="flex items-center gap-3.5 pb-4 mb-3 border-b border-white/[0.08]">
          <SmartArtwork
            src={track?.cover}
            title={track?.title}
            artist={track?.artist}
            className="w-12 h-12 rounded-xl flex-shrink-0 shadow-md border border-white/[0.1]"
          />

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-extrabold text-white truncate leading-tight">
              {track?.title}
            </h3>
            <p className="text-xs text-white/60 truncate font-semibold mt-0.5">
              {track?.artist}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white/70 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* VIEW: Main Action Sheet Menu */}
        {activeView === 'main' && (
          <div className="flex flex-col gap-1">
            {/* 1. Add to Playlist */}
            <button
              onClick={() => setActiveView('playlists')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.08] active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <ListPlus className="w-5 h-5 text-white/80 group-hover:text-[#1ed760] transition-colors" />
                <span className="text-sm font-bold text-white">Add to Playlist...</span>
              </div>
              <ChevronRight className="w-4 h-4 text-white/40" />
            </button>

            {/* 2. Like / Unlike */}
            <button
              onClick={handleToggleLike}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.08] active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <Heart
                  className={`w-5 h-5 transition-colors ${
                    isLiked ? 'fill-[#1ed760] text-[#1ed760]' : 'text-white/80'
                  }`}
                />
                <span className="text-sm font-bold text-white">
                  {isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
                </span>
              </div>
              {isLiked && <Check className="w-4 h-4 text-[#1ed760]" />}
            </button>

            {/* Go to Artist */}
            {track?.artist && (
              <button
                onClick={() => {
                  onClose();
                  onOpenArtist?.(track.artist);
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.08] active:scale-[0.99] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-white/80 group-hover:text-[#1ed760] transition-colors" />
                  <span className="text-sm font-bold text-white">Go to Artist</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </button>
            )}

            {/* 3. Play Next in Queue */}
            <button
              onClick={handlePlayNext}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.08] active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <PlaySquare className="w-5 h-5 text-white/80 group-hover:text-[#1ed760] transition-colors" />
                <span className="text-sm font-bold text-white">Play Next in Queue</span>
              </div>
            </button>

            {/* 4. Sleep Timer */}
            <button
              onClick={() => setActiveView('sleepTimer')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.08] active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-white/80 group-hover:text-[#1ed760] transition-colors" />
                <span className="text-sm font-bold text-white">Sleep Timer</span>
              </div>
              <div className="flex items-center gap-1.5">
                {sleepTimerRemaining && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#1ed760]/20 text-[#1ed760] border border-[#1ed760]/30">
                    {sleepTimerRemaining}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-white/40" />
              </div>
            </button>

            {/* 5. Playback Speed */}
            <button
              onClick={() => setActiveView('speed')}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.08] active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <Gauge className="w-5 h-5 text-white/80 group-hover:text-[#1ed760] transition-colors" />
                <span className="text-sm font-bold text-white">Playback Speed / Pitch</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white/50">{playbackSpeed}x</span>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </div>
            </button>

            {/* 6. Share Track */}
            <button
              onClick={handleShare}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.08] active:scale-[0.99] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <Share2 className="w-5 h-5 text-white/80 group-hover:text-[#1ed760] transition-colors" />
                <span className="text-sm font-bold text-white">Share Track</span>
              </div>
            </button>
          </div>
        )}

        {/* SUB-VIEW: Add to Playlist */}
        {activeView === 'playlists' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 pb-2 mb-1">
              <button
                onClick={() => setActiveView('main')}
                className="p-1 text-white/70 hover:text-white cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h4 className="text-sm font-extrabold text-white">Add to Playlist</h4>
            </div>

            {/* Quick New Playlist button */}
            <button
              onClick={() => {
                onClose();
                onOpenCreatePlaylist?.();
              }}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.99] transition-all cursor-pointer text-left border border-white/[0.06]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#1ed760] text-black flex items-center justify-center font-bold shadow-md">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-white block">New Playlist</span>
                <span className="text-xs text-white/50 font-medium">Create a custom mix</span>
              </div>
            </button>

            {/* User Custom Playlists List */}
            <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto scrollbar-none pt-1">
              {customPlaylists.length === 0 ? (
                <p className="text-xs text-white/40 py-4 text-center">
                  No custom playlists yet. Tap "New Playlist" to create one!
                </p>
              ) : (
                customPlaylists.map((pl) => {
                  const alreadyHasSong = pl.tracks?.some((t) => t.id === track?.id);
                  return (
                    <button
                      key={pl.id}
                      onClick={() => handleSelectPlaylist(pl.id, pl.title)}
                      className="flex items-center gap-3.5 p-2.5 rounded-xl hover:bg-white/10 transition-colors w-full overflow-hidden text-left group cursor-pointer"
                    >
                      {/* Strictly bounded 48x48px thumbnail */}
                      <div className="w-12 h-12 min-w-[48px] max-w-[48px] min-h-[48px] max-h-[48px] rounded-lg overflow-hidden shrink-0 bg-white/[0.06] border border-white/[0.08] relative">
                        <SmartArtwork
                          src={pl.cover}
                          mosaicCovers={pl.tracks?.map((t) => t.cover)}
                          className="w-full h-full object-cover"
                          rounded="rounded-lg"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-white truncate block">
                          {pl.title}
                        </span>
                        <span className="text-xs text-white/50 truncate block mt-0.5">
                          {pl.tracks?.length || 0} songs
                        </span>
                      </div>

                      <div className="shrink-0 pl-1">
                        {alreadyHasSong ? (
                          <div
                            className="w-7 h-7 rounded-full bg-[#1ed760]/20 flex items-center justify-center text-[#1ed760] border border-[#1ed760]/30 shadow-sm"
                            title="Already in playlist"
                          >
                            <Check className="w-4 h-4" />
                          </div>
                        ) : (
                          <div
                            className="w-7 h-7 rounded-full bg-white/[0.08] group-hover:bg-[#1ed760] group-hover:text-black flex items-center justify-center text-white/70 transition-all shadow-sm"
                            title="Add to playlist"
                          >
                            <Plus className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* SUB-VIEW: Sleep Timer */}
        {activeView === 'sleepTimer' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 pb-2 mb-1">
              <button
                onClick={() => setActiveView('main')}
                className="p-1 text-white/70 hover:text-white cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h4 className="text-sm font-extrabold text-white">Sleep Timer</h4>
            </div>

            <div className="flex flex-col gap-1">
              {sleepTimerOptions.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => {
                    onSetSleepTimer?.(opt.minutes);
                    if (opt.minutes === 0) {
                      onShowToast?.('Sleep timer turned off');
                    } else if (opt.minutes === 'end') {
                      onShowToast?.('Audio will pause at the end of track');
                    } else {
                      onShowToast?.(`Sleep timer set for ${opt.minutes} minutes`);
                    }
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.08] transition-all cursor-pointer"
                >
                  <span className="text-sm font-bold text-white">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SUB-VIEW: Playback Speed */}
        {activeView === 'speed' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 pb-2 mb-1">
              <button
                onClick={() => setActiveView('main')}
                className="p-1 text-white/70 hover:text-white cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h4 className="text-sm font-extrabold text-white">Playback Speed / Pitch</h4>
            </div>

            <div className="flex flex-col gap-1">
              {speedOptions.map((s) => {
                const isCurrent = playbackSpeed === s.speed;
                return (
                  <button
                    key={s.speed}
                    onClick={() => {
                      onChangePlaybackSpeed?.(s.speed);
                      onShowToast?.(`Playback speed set to ${s.speed}x`);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer ${
                      isCurrent ? 'bg-white/[0.1] text-[#1ed760]' : 'hover:bg-white/[0.06] text-white'
                    }`}
                  >
                    <span className="text-sm font-bold">{s.label}</span>
                    {isCurrent && <Check className="w-4 h-4 text-[#1ed760]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </LiquidSurface>
    </div>
  );
}

export default ActionSheet;

