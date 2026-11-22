import React, { useState, useEffect, useMemo } from 'react';
import { Play, Sparkles, Flame, Disc, Radio, TrendingUp, Music } from 'lucide-react';
import { TopFilterBar } from './TopFilterBar';
import { QuickJumpGrid } from './QuickJumpGrid';
import { HorizontalShelf } from './HorizontalShelf';
import { SmartArtwork } from './SmartArtwork';
import { useAuth } from '../context/AuthContext';
import { REAL_PLAYLISTS } from '../data/mockTracks';
import { searchMusic, fetchTrendingTracks, fetchNewReleases } from '../services/musicApi';
import { getRecapEventStatus } from '../services/statsService';

const GREETING_PATTERNS = [
  "Hi there, {name}",
  "How's life, {name}?",
  "What's spinning today, {name}?",
  "Ready to jam, {name}?",
  "Good to see you, {name}",
  "Soundtrack for today, {name}",
];

export function HomeView({
  region = 'ID',
  onToggleRegion,
  currentTrack,
  isPlaying,
  likedTracks = [],
  recentlyPlayed = [],
  onSelectTrack,
  onOpenPlaylist,
  onProfileClick,
  onShowToast,
  onOpenArtist,
  onOpenRecap,
}) {
  const { user, effectiveDisplayName } = useAuth();
  const [activeFilter, setActiveFilter] = useState('All');

  // Conversational Greeting Header
  const greeting = useMemo(() => {
    const rawName = user?.displayName || effectiveDisplayName || '';
    const cleanName = rawName.trim().split(' ')[0] || 'there';
    const pattern = GREETING_PATTERNS[Math.floor(Math.random() * GREETING_PATTERNS.length)];
    return pattern.replace('{name}', cleanName);
  }, [user?.displayName, effectiveDisplayName]);

  // Trending Tracks (Regional Top Charts)
  const [trendingTracks, setTrendingTracks] = useState([]);

  useEffect(() => {
    let active = true;
    async function loadTrending() {
      try {
        const trending = await fetchTrendingTracks(region);
        if (active && trending.length > 0) {
          setTrendingTracks(trending);
        }
      } catch (err) {
        console.warn('Failed loading trending tracks:', err);
      }
    }
    loadTrending();
    return () => {
      active = false;
    };
  }, [region]);

  // Shelf 1: "Last Session" / Quick Jump Items
  // Strictly rendered ONLY when user actually has listening history or liked songs.
  // Brand new guests start with a completely clean home feed with zero fake history!
  const quickJumpItems = useMemo(() => {
    if (recentlyPlayed.length === 0 && likedTracks.length === 0) {
      return [];
    }

    const items = [];

    if (likedTracks.length > 0) {
      items.push({
        id: 'pl-liked',
        title: 'Liked Songs',
        isLikedCollection: true,
        type: 'Playlist',
        tracks: likedTracks,
        cover: likedTracks[0]?.cover || '',
      });
    }

    const limit = items.length > 0 ? 7 : 8;
    const actualRecents = recentlyPlayed.slice(0, limit);

    actualRecents.forEach((t) => {
      items.push({
        id: t.id,
        title: t.title,
        artist: t.artist,
        cover: t.cover,
        type: 'Track',
        trackData: t,
      });
    });

    return items;
  }, [recentlyPlayed, likedTracks]);

  // Shelf 2: "More Like [Track Name]" (Only for users with listening history)
  const recommendationBase = useMemo(() => {
    return recentlyPlayed.length > 0 ? recentlyPlayed[0] : null;
  }, [recentlyPlayed]);

  const [recommendedTracks, setRecommendedTracks] = useState([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);

  useEffect(() => {
    if (!recommendationBase) {
      setRecommendedTracks([]);
      return;
    }
    let active = true;
    async function loadRecommendations() {
      setIsLoadingRecs(true);
      try {
        const query = recommendationBase.artist || recommendationBase.title;
        const res = await searchMusic(query, region);
        const trackList = res?.tracks || (Array.isArray(res) ? res : []);
        if (active && trackList.length > 0) {
          const filtered = trackList.filter((t) => t.id !== recommendationBase.id).slice(0, 8);
          setRecommendedTracks(filtered.length > 0 ? filtered : trackList.slice(0, 8));
        }
      } catch (err) {
        console.warn('Failed loading recommendations:', err);
      } finally {
        if (active) setIsLoadingRecs(false);
      }
    }
    loadRecommendations();
    return () => {
      active = false;
    };
  }, [recommendationBase?.id, recommendationBase?.artist, region]);

  // Shelf 3: "New Releases"
  const [newReleases, setNewReleases] = useState([]);

  useEffect(() => {
    let active = true;
    async function loadReleases() {
      try {
        const releases = await fetchNewReleases(region);
        if (active && releases.length > 0) {
          setNewReleases(releases);
        }
      } catch (err) {
        console.warn('Failed loading new releases:', err);
      }
    }
    loadReleases();
    return () => {
      active = false;
    };
  }, [region]);



  // Shelf 5: "All-Time & Trending Hits" dynamically mapped from regional charts
  const allTimeHits = useMemo(() => {
    if (trendingTracks.length > 0) {
      return trendingTracks.map((t, idx) => ({
        id: `ath-${t.id || idx}`,
        title: t.title,
        artist: t.artist,
        cover: t.cover,
        subtitle: `${t.artist} • Chart Hit`,
        trackData: t,
      }));
    }
    return [];
  }, [trendingTracks]);

  // Dynamic Filter Modes
  const isAll = activeFilter === 'All';
  const isIndo = activeFilter === 'Indo Hits';
  const isRock = activeFilter === 'Rock';
  const isAcoustic = activeFilter === 'Acoustic';
  const isTrending = activeFilter === 'Trending';

  // Specific filtered track sets
  const rockTracks = useMemo(() => {
    return allTimeHits.filter((h) => {
      const art = h.artist?.toLowerCase() || '';
      return art.includes('rock') || art.includes('dewa') || art.includes('sheila') || art.includes('noah');
    });
  }, [allTimeHits]);

  const indoTracks = useMemo(() => {
    return allTimeHits.filter((h) => {
      return region === 'ID';
    });
  }, [allTimeHits, region]);

  const acousticTracks = useMemo(() => {
    return allTimeHits.filter((h) => {
      const tit = h.title?.toLowerCase() || '';
      return tit.includes('acoustic') || tit.includes('dan') || tit.includes('saat') || tit.includes('slow');
    });
  }, [allTimeHits]);

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-none pb-44">
      {/* Sticky Top Filter Bar with Region Switcher */}
      <TopFilterBar
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
        region={region}
        onToggleRegion={onToggleRegion}
        onProfileClick={onProfileClick}
      />

      {/* Randomized Conversational Greeting Header */}
      <div className="px-4 pt-4 pb-1">
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
          <span>{greeting}</span>
        </h1>
      </div>

      {/* Octav Monthly Recap Event Hero Card (Active ONLY during event window: day 25 -> day 2) */}
      {isAll && (() => {
        const recapEvent = getRecapEventStatus();
        if (!recapEvent.isActive) return null;

        return (
          <div className="px-4 pt-2 pb-1">
            <div
              onClick={onOpenRecap}
              className="relative overflow-hidden rounded-3xl p-4.5 cursor-pointer border border-[#1ed760]/40 hover:border-[#1ed760] active:scale-[0.99] transition-all shadow-[0_16px_40px_rgba(0,0,0,0.6)] group bg-[#090b10]"
              style={{
                background: 'linear-gradient(135deg, #0e1612 0%, #090a10 60%, #130e1c 100%)',
              }}
            >
              {/* Subtle Grain & Ambient Accent */}
              <div className="absolute top-0 right-0 w-44 h-44 bg-[#1ed760]/15 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
              <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between">
                <div className="flex flex-col gap-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#1ed760] text-black font-mono shadow-sm">
                      EVENT BULANAN
                    </span>
                    <span className="text-[10px] font-bold text-white/50 tracking-wider">
                      LIVE SEKARANG
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white tracking-tight leading-snug group-hover:text-[#1ed760] transition-colors mt-0.5">
                    {recapEvent.label} Recap
                  </h3>
                  <p className="text-xs text-white/60 leading-tight">
                    Waktu mendengar, artis rotasi utama, dan sound persona bulan ini siap dieksplor.
                  </p>
                </div>

                <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-2xl bg-[#1ed760] text-black shadow-[0_4px_20px_rgba(30,215,96,0.4)] group-hover:scale-110 active:scale-95 transition-all">
                  <Sparkles className="w-5 h-5 fill-current" />
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Shelf 1 — "Last Session" (Rendered ONLY if user actually has listening history or liked songs!) */}
      {(isAll || isTrending) && quickJumpItems.length > 0 && (
        <div className="pt-2">
          <div className="px-4 pb-1 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
              Last Session
            </span>
          </div>
          <QuickJumpGrid
            items={quickJumpItems}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onSelectTrack={(item) => {
              const track = item.trackData || item;
              onSelectTrack(track, recentlyPlayed);
            }}
            onOpenPlaylist={(item) => {
              onOpenPlaylist(item);
            }}
          />
        </div>
      )}

      {/* Dedicated Filtered Shelf for Rock */}
      {isRock && (
        <div className="py-2">
          <HorizontalShelf
            title="Rock & Metal Legends"
            items={rockTracks}
            onOpenArtist={onOpenArtist}
            onSelectItem={(item) => {
              if (item.trackData) onSelectTrack(item.trackData, rockTracks.map((r) => r.trackData));
            }}
          />
        </div>
      )}

      {/* Dedicated Filtered Shelf for Indo Hits */}
      {isIndo && (
        <div className="py-2">
          <HorizontalShelf
            title="Indonesian Masterpieces & Band Classics"
            items={indoTracks}
            onOpenArtist={onOpenArtist}
            onSelectItem={(item) => {
              if (item.trackData) onSelectTrack(item.trackData, indoTracks.map((r) => r.trackData));
            }}
          />
        </div>
      )}

      {/* Dedicated Filtered Shelf for Acoustic */}
      {isAcoustic && (
        <div className="py-2">
          <HorizontalShelf
            title="Acoustic, Unplugged & Chill Jam"
            items={acousticTracks}
            onOpenArtist={onOpenArtist}
            onSelectItem={(item) => {
              if (item.trackData) onSelectTrack(item.trackData, acousticTracks.map((r) => r.trackData));
            }}
          />
        </div>
      )}

      {/* Shelf 2 — "More Like [Track Name]" or Regional Trending Shelf */}
      {(isAll || isTrending) && (
        <div className="py-2">
          <div className="px-4 mb-2.5 flex items-baseline justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#1ed760]" />
              <h2 className="text-lg font-extrabold text-white tracking-tight">
                {recommendationBase
                  ? `More like ${recommendationBase.title}`
                  : region === 'ID'
                  ? 'Trending Now in Indonesia'
                  : 'Trending Worldwide'}
              </h2>
            </div>
            {recommendationBase && (
              <span
                onClick={() => onOpenArtist?.(recommendationBase.artist)}
                className="text-xs font-semibold text-white/50 hover:text-white cursor-pointer transition-colors"
              >
                Explore artist
              </span>
            )}
          </div>

          {((recommendationBase ? recommendedTracks : trendingTracks).length > 0) && (
            <div className="flex gap-3 px-4 overflow-x-auto scrollbar-none pb-2 pt-0.5">
              {(recommendationBase ? recommendedTracks : trendingTracks).map((track) => (
                <div
                  key={track.id}
                  onClick={() => onSelectTrack(track, recommendationBase ? recommendedTracks : trendingTracks)}
                  className="group flex-shrink-0 w-[148px] cursor-pointer active:scale-95 transition-transform duration-200"
                >
                  <div
                    className="relative w-[148px] h-[148px] rounded-xl overflow-hidden mb-2 border border-white/[0.08]"
                    style={{
                      boxShadow:
                        'inset 0 1px 0.5px 0 rgba(255, 255, 255, 0.4), 0 12px 28px rgba(0, 0, 0, 0.65)',
                    }}
                  >
                    <SmartArtwork
                      src={track.cover}
                      title={track.title}
                      artist={track.artist}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 pointer-events-none" />
                    <div className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-[#1ed760] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-[0_6px_16px_rgba(30,215,96,0.45)]">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                  <h3 className="text-xs font-bold text-white leading-tight line-clamp-1 group-hover:text-[#1ed760] transition-colors">
                    {track.title}
                  </h3>
                  <p
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenArtist?.(track.artist);
                    }}
                    className="text-[11px] font-medium text-white/50 hover:text-white hover:underline leading-snug line-clamp-1 mt-0.5 cursor-pointer transition-colors"
                  >
                    {track.artist}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shelf 3 — "New Releases" (Carousel) */}
      {(isAll || isIndo || isTrending) && newReleases.length > 0 && (
        <HorizontalShelf
          title={region === 'ID' ? 'New Releases in Indonesia' : 'Fresh Global Releases'}
          items={newReleases}
          onOpenArtist={onOpenArtist}
          onSelectItem={(item) => {
            if (item.trackData) {
              onSelectTrack(item.trackData, newReleases);
            } else {
              onOpenPlaylist({
                id: item.id,
                title: item.title,
                curator: item.artist,
                cover: item.cover,
                tracks: [],
              });
            }
          }}
        />
      )}

      {/* Shelf 4 — "Trending Songs" */}
      {(isAll || isTrending) && trendingTracks.length > 0 && (
        <div className="py-3 px-4">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-400" />
              <h2 className="text-lg font-extrabold text-white tracking-tight">Trending Songs</h2>
            </div>
            <span className="text-xs font-semibold text-white/50">Updated Hourly</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {trendingTracks.slice(0, 6).map((track) => {
              const isCurrent = currentTrack && currentTrack.id === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => {
                    if (isCurrent) {
                      onTogglePlayPause?.();
                    } else {
                      onSelectTrack(track, trendingTracks);
                    }
                  }}
                  className="group relative flex items-center h-16 rounded-xl overflow-hidden border border-white/[0.08] cursor-pointer active:scale-[0.98] transition-all bg-white/[0.04] hover:bg-white/[0.08] p-2 gap-2.5"
                >
                  <SmartArtwork
                    src={track.cover}
                    title={track.title}
                    artist={track.artist}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-bold truncate ${
                        isCurrent ? 'text-[#1ed760]' : 'text-white group-hover:text-[#1ed760]'
                      }`}
                    >
                      {track.title}
                    </p>
                    <p
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenArtist?.(track.artist);
                      }}
                      className="text-[10px] text-white/50 hover:text-white hover:underline truncate mt-0.5 cursor-pointer transition-colors"
                    >
                      {track.artist}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Shelf 5 — "All-Time Hits" */}
      {(isAll || isRock || isIndo) && (
        <HorizontalShelf
          title={region === 'ID' ? 'Indonesian & Global All-Time Hits' : 'All-Time Legendary Hits'}
          items={allTimeHits}
          onOpenArtist={onOpenArtist}
          onSelectItem={(item) => {
            if (item.trackData) {
              onSelectTrack(item.trackData, allTimeHits.map((h) => h.trackData));
            }
          }}
        />
      )}

      {/* Curated Playlists Shelf */}
      {(isAll || isRock || isIndo) && (
        <HorizontalShelf
          title="Featured Playlists"
          items={REAL_PLAYLISTS}
          onSelectItem={onOpenPlaylist}
        />
      )}

      {/* Footer Branding & Copyright by Keenan */}
      <div className="pt-10 pb-8 flex flex-col items-center justify-center gap-1.5 opacity-50 hover:opacity-90 transition-opacity">
        <span className="text-xs font-black tracking-widest uppercase text-white/70">Octav Music</span>
        <p className="text-[11px] font-semibold text-white/50 tracking-wider">
          Copyright © 2026 • Designed & Engineered by Keenan
        </p>
      </div>
    </div>
  );
}

export default HomeView;

