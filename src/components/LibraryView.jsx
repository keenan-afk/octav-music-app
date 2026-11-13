import React, { useState, useMemo } from 'react';
import { Search, Plus, ArrowDownUp, Pin, Heart, Clock, Play, ListMusic, User, Disc } from 'lucide-react';
import { SmartArtwork } from './SmartArtwork';
import { useAuth } from '../context/AuthContext';

/**
 * Spotify iOS 1:1 Your Library View
 * Features:
 * - Persisted "Liked Songs" collection (localStorage)
 * - User Custom Playlists (creation, 2x2 mosaic preview, delete, add tracks)
 * - "Recently Played" history
 * - Filter capsules (Playlists, Artists, Albums, Downloaded)
 * - Quick inline search in library
 * - Tap to open and play directly
 */
export function LibraryView({
  playlists = [],
  customPlaylists = [],
  likedTracks = [],
  recentlyPlayed = [],
  currentTrack,
  isPlaying,
  onOpenPlaylist,
  onSelectTrack,
  onOpenCreatePlaylist,
  onProfileClick,
}) {
  const [activeFilter, setActiveFilter] = useState('Playlists');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const filters = ['Playlists', 'Artists', 'Albums', 'Downloaded'];

  const likedSongsPlaylist = useMemo(() => ({
    id: 'pl-liked-collection',
    title: 'Liked Songs',
    subtitle: `Playlist • ${likedTracks.length} songs`,
    type: 'Playlist',
    isLikedCollection: true,
    cover: likedTracks[0]?.cover || '',
    trackCount: likedTracks.length,
    curator: 'You',
    description: 'All your favorite songs saved permanently in liquid obsidian.',
    isPinned: true,
    tracks: likedTracks,
  }), [likedTracks]);

  // Combined playlists
  const allPlaylists = useMemo(() => {
    return [
      ...customPlaylists.map((cp) => ({
        ...cp,
        subtitle: `Playlist • ${cp.tracks?.length || 0} songs`,
        type: 'Playlist',
      })),
      ...playlists,
    ];
  }, [customPlaylists, playlists]);

  // Unique artists from liked tracks & playlists
  const artistsList = useMemo(() => {
    const map = new Map();
    [...likedTracks, ...(playlists.flatMap((p) => p.tracks || []))].forEach((t) => {
      if (t?.artist && !map.has(t.artist)) {
        map.set(t.artist, {
          id: `artist-${t.artist}`,
          title: t.artist,
          subtitle: 'Artist',
          cover: t.cover,
          tracks: [t],
        });
      }
    });
    return Array.from(map.values());
  }, [likedTracks, playlists]);

  // Filtered display items based on capsule and search
  const displayedItems = useMemo(() => {
    let items = [];
    if (activeFilter === 'Playlists') {
      items = allPlaylists;
    } else if (activeFilter === 'Artists') {
      items = artistsList;
    } else if (activeFilter === 'Albums') {
      items = playlists;
    } else {
      // Downloaded
      items = allPlaylists.slice(0, 2);
    }

    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.title?.toLowerCase().includes(q) ||
        item.curator?.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q)
    );
  }, [activeFilter, allPlaylists, artistsList, playlists, searchQuery]);

  const { user, isAuthenticated } = useAuth();

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-none px-4 pt-3 pb-44 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onProfileClick}
            className="relative w-8 h-8 rounded-full overflow-hidden border border-white/20 hover:border-white/50 active:scale-95 transition-all shadow-sm bg-neutral-800 flex items-center justify-center cursor-pointer"
            title={isAuthenticated ? `${user.displayName} (Synced)` : "Open Profile"}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt={user.displayName} className="w-full h-full object-cover rounded-full" />
            ) : (
              <User className="w-4 h-4 text-white/80" />
            )}
            <span
              className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-[#050507] ${
                isAuthenticated ? 'bg-[#1ed760]' : 'bg-white/40'
              }`}
            />
          </button>
          <h1 className="text-xl font-extrabold tracking-tight">Your Library</h1>
        </div>

        <div className="flex items-center gap-2 text-white/70">
          <button
            onClick={() => setIsSearchOpen((prev) => !prev)}
            className="p-1.5 hover:text-white active:scale-90 transition-transform cursor-pointer"
            title="Search in library"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={onOpenCreatePlaylist}
            className="p-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-[#1ed760] active:scale-90 transition-transform cursor-pointer"
            title="Create playlist"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Optional Search Bar */}
      {isSearchOpen && (
        <div className="mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your library..."
            autoFocus
            className="w-full px-3.5 py-2 rounded-xl bg-white/[0.08] border border-white/[0.12] text-xs font-semibold text-white placeholder-white/40 focus:outline-none focus:border-[#1ed760]/60 transition-all"
          />
        </div>
      )}

      {/* Filter Capsules */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none mb-4 pb-1">
        {filters.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'bg-white/[0.08] text-white/80 hover:bg-white/[0.12] border border-white/[0.06]'
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {/* Sort Row */}
      <div className="flex items-center justify-between text-xs font-semibold text-white/60 mb-2.5">
        <div className="flex items-center gap-1 hover:text-white cursor-pointer">
          <ArrowDownUp className="w-3.5 h-3.5" />
          <span>Recents</span>
        </div>
        <span className="text-[11px] text-white/40">
          {customPlaylists.length + playlists.length} playlists • {likedTracks.length} saved
        </span>
      </div>

      {/* Playlists & Collections List */}
      <div className="flex flex-col gap-1.5">
        {/* Liked Songs Special Pinned Row (shown on 'Playlists' filter) */}
        {activeFilter === 'Playlists' && (
          <div
            onClick={() => onOpenPlaylist(likedSongsPlaylist)}
            className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] active:scale-[0.99] transition-all cursor-pointer border border-white/[0.04]"
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Gradient Heart 48x48 */}
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 border border-white/[0.1] shadow-md"
                style={{
                  background:
                    'linear-gradient(135deg, #450af5 0%, #8e8ee5 50%, #c4efd9 100%)',
                }}
              >
                <Heart className="w-6 h-6 fill-white text-white drop-shadow-sm" />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">Liked Songs</p>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-white/50 font-medium">
                  <Pin className="w-3 h-3 fill-[#1ed760] text-[#1ed760]" />
                  <span>Playlist • {likedTracks.length} songs</span>
                </div>
              </div>
            </div>

            <div className="p-2 text-white/40 hover:text-white">
              <Play className="w-4 h-4 fill-current" />
            </div>
          </div>
        )}

        {/* Displayed Items (Custom + Curated Playlists or Artists) */}
        {displayedItems.map((item) => (
          <div
            key={item.id}
            onClick={() => onOpenPlaylist(item)}
            className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.06] active:scale-[0.99] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              {item.isCustom ? (
                <div className="w-12 h-12 rounded-lg flex-shrink-0 border border-white/[0.08] shadow-sm overflow-hidden bg-neutral-900">
                  <SmartArtwork
                    src={item.cover}
                    mosaicCovers={item.tracks?.map((t) => t.cover)}
                    className="w-full h-full object-cover"
                    alt={item.title}
                  />
                </div>
              ) : (
                <SmartArtwork
                  src={item.cover}
                  title={item.title}
                  artist={item.curator || item.subtitle}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-white/[0.06] shadow-sm"
                  alt={item.title}
                />
              )}

              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{item.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-white/50 font-medium">
                  {item.isPinned && (
                    <Pin className="w-3 h-3 fill-[#1ed760] text-[#1ed760]" />
                  )}
                  <span>{item.subtitle || `${item.tracks?.length || 0} songs`}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Empty state when no custom playlists and filtered */}
        {displayedItems.length === 0 && (
          <div className="py-8 text-center text-white/40 text-xs">
            No items found matching "{searchQuery}"
          </div>
        )}

        {/* Recently Played History */}
        {recentlyPlayed.length > 0 && activeFilter === 'Playlists' && !searchQuery && (
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/50 mb-2.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Recently Played</span>
            </div>

            <div className="flex flex-col gap-1">
              {recentlyPlayed.slice(0, 5).map((track, idx) => (
                <div
                  key={`${track.id}-${idx}`}
                  onClick={() => onSelectTrack(track, recentlyPlayed)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.06] active:scale-[0.99] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <SmartArtwork
                      src={track.cover}
                      title={track.title}
                      artist={track.artist}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-white/[0.06]"
                    />
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-bold truncate ${
                          currentTrack?.id === track.id ? 'text-[#1ed760]' : 'text-white'
                        }`}
                      >
                        {track.title}
                      </p>
                      <p className="text-[11px] text-white/50 truncate font-medium">
                        {track.artist}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold text-white/40">
                    {track.durationFormatted || '3:45'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LibraryView;
