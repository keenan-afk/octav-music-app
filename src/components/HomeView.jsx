import React, { useState, useEffect, useMemo } from 'react';
import { Play, Sparkles, Flame, Disc, Radio, TrendingUp, Music } from 'lucide-react';
import { TopFilterBar } from './TopFilterBar';
import { QuickJumpGrid } from './QuickJumpGrid';
import { HorizontalShelf } from './HorizontalShelf';
import { SmartArtwork } from './SmartArtwork';
import { useAuth } from '../context/AuthContext';
import { REAL_PLAYLISTS } from '../data/mockTracks';
import { searchMusic, fetchTrendingTracks, fetchNewReleases } from '../services/musicApi';

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
  const quickJumpItems = useMemo(() => {
    const sourceTracks =
      recentlyPlayed.length > 0
        ? recentlyPlayed.slice(0, 7)
        : trendingTracks.slice(0, 7);

    const likedCard = {
      id: 'pl-liked',
      title: 'Liked Songs',
      isLikedCollection: true,
      type: 'Playlist',
      tracks: likedTracks,
      cover: likedTracks[0]?.cover || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=300&q=80',
    };

    return [
      likedCard,
      ...sourceTracks.map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        cover: t.cover,
        type: 'Track',
        trackData: t,
      })),
    ];
  }, [recentlyPlayed, trendingTracks, likedTracks]);

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
        if (active && res.length > 0) {
          const filtered = res.filter((t) => t.id !== recommendationBase.id).slice(0, 8);
          setRecommendedTracks(filtered.length > 0 ? filtered : res.slice(0, 8));
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

      {/* Shelf 1 — "Last Session" (Shown in All or matching) */}
      {(isAll || isTrending) && (
        <div className="pt-2">
          <div className="px-4 pb-1 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
              {recentlyPlayed.length > 0 ? 'Last Session' : 'Quick Jump In'}
            </span>
          </div>
          <QuickJumpGrid
            items={quickJumpItems}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onSelectTrack={(item) => {
              const track = item.trackData || item;
              onSelectTrack(track, recentlyPlayed.length > 0 ? recentlyPlayed : trendingTracks);
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
                  onClick={() => onSelectTrack(track, trendingTracks)}
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
    </div>
  );
}

export default HomeView;

