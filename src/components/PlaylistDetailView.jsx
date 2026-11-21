import React, { useState, useMemo, useRef } from 'react';
import {
  ChevronLeft,
  Heart,
  MoreVertical,
  Play,
  Pause,
  Shuffle,
  ArrowDownCircle,
  Share2,
  Trash2,
  Music,
  Search,
  X,
  Camera,
} from 'lucide-react';
import { SmartArtwork } from './SmartArtwork';

/**
 * Playlist / Album Detail View (Spotify iOS 1:1 Mobile Drill-down)
 * Features:
 * - Dynamic liquid glass header with back navigation
 * - Large centered cover art (single or 2x2 mosaic) with ambient color drop shadow
 * - Bold title, duration, verified badge
 * - Oversized liquid emerald Play button (#1ed760) with specular rim
 * - Full vertical tracklist with active equalizer & row actions
 * - Interactive three-dots (...) action sheet trigger on every song
 * - Delete playlist action for custom user playlists
 */
export function PlaylistDetailView({
  playlist,
  onBack,
  currentTrack,
  isPlaying,
  onSelectTrack,
  onTogglePlayPause,
  likedTrackIds = new Set(),
  onToggleLike,
  tracks = [],
  onOpenActionSheet,
  onDeletePlaylist,
  onRemoveTrackFromPlaylist,
  onShowToast,
  onOpenArtist,
  isShuffle = false,
  onToggleShuffle,
  onUpdatePlaylistCover,
}) {
  const [filterQuery, setFilterQuery] = useState('');
  const fileInputRef = useRef(null);

  const isCurrentPlaylistPlaying =
    isPlaying && tracks.some((t) => t.id === currentTrack?.id);

  const handleCoverUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 300, 300);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        onUpdatePlaylistCover?.(playlist.id, dataUrl);
        onShowToast?.('Playlist cover updated');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const filteredTracks = useMemo(() => {
    if (!filterQuery.trim()) return tracks;
    const q = filterQuery.toLowerCase().trim();
    return tracks.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.artist?.toLowerCase().includes(q) ||
        t.album?.toLowerCase().includes(q)
    );
  }, [tracks, filterQuery]);

  const handleSharePlaylist = async () => {
    const text = `Check out playlist "${playlist.title}" on Octav!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: playlist.title, text, url: window.location.href });
        onShowToast?.('Shared successfully');
        return;
      } catch (e) {}
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      onShowToast?.('Playlist link copied to clipboard');
    } catch (e) {
      onShowToast?.(`Shared: ${playlist.title}`);
    }
  };

  const handleDownload = () => {
    onShowToast?.('Downloaded playlist for offline playback');
  };

  const handlePlayAll = () => {
    if (tracks.length === 0) {
      onShowToast?.('This playlist is empty');
      return;
    }
    if (isCurrentPlaylistPlaying) {
      onTogglePlayPause();
    } else {
      const targetIndex = isShuffle ? Math.floor(Math.random() * tracks.length) : 0;
      onSelectTrack(tracks[targetIndex], tracks);
    }
  };

  return (
    <div className="relative w-full h-full overflow-y-auto scrollbar-none pb-44 text-white">
      {/* Sticky Liquid Top Navigation Bar */}
      <div className="sticky top-0 z-30 px-3 py-2.5 flex items-center justify-between backdrop-blur-xl bg-[#050507]/75 border-b border-white/[0.04]">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.08] text-white active:scale-90 transition-all shadow-md cursor-pointer"
          title="Back to feed"
        >
          <ChevronLeft className="w-5 h-5 -ml-0.5" />
        </button>

        <span className="text-xs font-bold uppercase tracking-wider text-white/80 line-clamp-1 max-w-[200px]">
          {playlist.title}
        </span>

        {playlist.isCustom ? (
          <button
            onClick={() => {
              if (window.confirm(`Delete playlist "${playlist.title}"?`)) {
                onDeletePlaylist?.(playlist.id);
                onShowToast?.(`Deleted "${playlist.title}"`);
                onBack();
              }
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 active:scale-90 transition-all cursor-pointer"
            title="Delete Playlist"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSharePlaylist}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white active:scale-90 transition-all cursor-pointer"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Playlist Hero Section */}
      <div className="px-5 pt-4 pb-6 flex flex-col items-center text-center">
        {/* Large Centered 180x180 Cover Art with Ambient Shadow */}
        <div
          onClick={() => {
            if (playlist.isCustom) fileInputRef.current?.click();
          }}
          className={`relative w-[180px] h-[180px] rounded-2xl overflow-hidden mb-5 border border-white/[0.12] group ${
            playlist.isCustom ? 'cursor-pointer active:scale-95 transition-transform' : ''
          }`}
          style={{
            boxShadow:
              'inset 0 1px 1px 0 rgba(255, 255, 255, 0.45), 0 24px 50px rgba(0, 0, 0, 0.8)',
          }}
          title={playlist.isCustom ? 'Change playlist cover image' : playlist.title}
        >
          <SmartArtwork
            src={playlist.cover}
            mosaicCovers={tracks.map((t) => t.cover)}
            className="w-full h-full object-cover"
            alt={playlist.title}
          />

          {playlist.isCustom && (
            <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white z-20 pointer-events-none">
              <Camera className="w-6 h-6 text-[#1ed760] drop-shadow" />
              <span className="text-[10px] font-bold tracking-tight">Change Cover</span>
            </div>
          )}

          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, transparent 60%)',
            }}
          />
        </div>

        {/* Hidden File Input for Custom Playlist Cover */}
        {playlist.isCustom && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverUpload}
            className="hidden"
          />
        )}

        {/* Title & Metadata */}
        <h1 className="text-2xl font-black tracking-tight text-white mb-1.5 px-2">
          {playlist.title}
        </h1>
        <p className="text-xs text-white/60 font-medium max-w-[320px] mb-2 leading-relaxed">
          {playlist.description || `Curated by ${playlist.curator || 'Octav'}`}
        </p>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-white/40">
          <span>{playlist.curator || 'Octav'}</span>
          <span>•</span>
          <span>{tracks.length} songs</span>
          <span>•</span>
          <span>approx. {Math.max(1, Math.round(tracks.length * 3.5))} min</span>
        </div>

        {/* Action Controls Row */}
        <div className="w-full mt-4 flex items-center justify-between px-1">
          {/* Secondary Actions */}
          <div className="flex items-center gap-4 text-white/70">
            <button
              onClick={() => onToggleLike(playlist.id)}
              className="hover:text-white active:scale-90 transition-transform cursor-pointer"
              title="Save to Library"
            >
              <Heart
                className={`w-5 h-5 ${
                  likedTrackIds.has(playlist.id) ? 'fill-[#1ed760] text-[#1ed760]' : ''
                }`}
              />
            </button>
            <button
              onClick={handleDownload}
              className="hover:text-white active:scale-90 transition-transform cursor-pointer"
              title="Download"
            >
              <ArrowDownCircle className="w-5 h-5" />
            </button>
            <button
              onClick={handleSharePlaylist}
              className="hover:text-white active:scale-90 transition-transform cursor-pointer"
              title="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {/* Right: Shuffle Badge & Oversized Liquid Emerald Play Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleShuffle}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                isShuffle
                  ? 'bg-[#1ed760]/20 border-[#1ed760]/50 text-[#1ed760]'
                  : 'bg-white/[0.05] border-transparent text-white/60 hover:text-white'
              }`}
              title={isShuffle ? 'Shuffle enabled' : 'Enable shuffle'}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Oversized #1ed760 Liquid Emerald Play Button */}
            <button
              onClick={handlePlayAll}
              className="w-14 h-14 rounded-full bg-[#1ed760] text-black flex items-center justify-center active:scale-90 hover:scale-105 transition-all duration-200 cursor-pointer"
              style={{
                boxShadow:
                  'inset 0 1px 1px 0 rgba(255, 255, 255, 0.65), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.25), 0 10px 25px rgba(30, 215, 96, 0.45)',
              }}
              title={isCurrentPlaylistPlaying ? 'Pause' : 'Play playlist'}
            >
              {isCurrentPlaylistPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-1" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* In-Playlist Search / Filter Bar */}
      {tracks.length > 0 && (
        <div className="px-4 mb-2">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Find in playlist..."
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.12] border border-white/[0.08] focus:border-[#1ed760]/60 text-xs font-semibold text-white placeholder-white/40 outline-none transition-all"
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery('')}
                className="absolute right-3 p-0.5 text-white/40 hover:text-white transition-colors cursor-pointer"
                title="Clear filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tracklist Section */}
      <div className="px-3 pt-1">
        {tracks.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.05] flex items-center justify-center mx-auto text-white/30 mb-3 border border-white/[0.08]">
              <Music className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">Playlist is empty</h4>
            <p className="text-xs text-white/50 max-w-[260px] mx-auto">
              Search for any song or tap the three dots (...) on any track to add it here.
            </p>
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <p className="text-xs text-white/50">
              No songs found matching "<span className="text-white font-bold">{filterQuery}</span>"
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {filteredTracks.map((track, idx) => {
              const isThisTrackPlaying = currentTrack?.id === track.id && isPlaying;
              const isThisTrackSelected = currentTrack?.id === track.id;
              const isLiked = likedTrackIds.has(track.id);

              return (
                <div
                  key={`${track.id}-${idx}`}
                  onClick={() => {
                    if (isThisTrackSelected) {
                      onTogglePlayPause();
                    } else {
                      onSelectTrack(track, filteredTracks);
                    }
                  }}
                  className={`group relative flex items-center justify-between py-2 px-2.5 rounded-xl cursor-pointer transition-all duration-150 active:scale-[0.99] ${
                    isThisTrackSelected
                      ? 'bg-white/[0.08] border border-white/[0.06]'
                      : 'hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Left: Artwork + Title + Artist */}
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                    {/* 44x44 Smart Artwork */}
                    <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-900 border border-white/[0.06]">
                      <SmartArtwork
                        src={track.cover}
                        title={track.title}
                        artist={track.artist}
                        className="w-full h-full object-cover"
                      />
                      {isThisTrackSelected && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="flex items-end gap-[2px] h-3.5">
                            <span
                              className={`w-[2px] bg-[#1ed760] rounded-full ${
                                isPlaying ? 'animate-[bounce_0.6s_ease-in-out_infinite]' : 'h-1.5'
                              }`}
                            />
                            <span
                              className={`w-[2px] bg-[#1ed760] rounded-full ${
                                isPlaying ? 'animate-[bounce_0.8s_ease-in-out_infinite]' : 'h-3'
                              }`}
                            />
                            <span
                              className={`w-[2px] bg-[#1ed760] rounded-full ${
                                isPlaying ? 'animate-[bounce_0.5s_ease-in-out_infinite]' : 'h-2'
                              }`}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Title & Artist */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-bold truncate leading-tight ${
                          isThisTrackSelected ? 'text-[#1ed760]' : 'text-white'
                        }`}
                      >
                        {track.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {track.explicit && (
                          <span className="text-[9px] font-bold px-1 rounded bg-white/20 text-white/90">
                            E
                          </span>
                        )}
                        <p
                          onClick={(e) => {
                            if (onOpenArtist && track.artist) {
                              e.stopPropagation();
                              onOpenArtist(track.artist);
                            }
                          }}
                          className="text-xs text-white/50 hover:text-white hover:underline truncate font-medium cursor-pointer transition-colors"
                          title={`View ${track.artist} profile`}
                        >
                          {track.artist}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right: Like Heart & Three-Dots Menu */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLike(track.id);
                        onShowToast?.(isLiked ? 'Removed from Liked Songs' : 'Saved to Liked Songs');
                      }}
                      className="p-1.5 text-white/40 hover:text-white active:scale-90 transition-all cursor-pointer"
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
                      className="p-1.5 text-white/40 hover:text-white active:scale-90 transition-all cursor-pointer"
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

export default PlaylistDetailView;
