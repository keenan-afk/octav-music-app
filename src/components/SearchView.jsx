import React, { useState, useEffect } from 'react';
import {
  Search as SearchIcon,
  X,
  Play,
  Heart,
  Loader2,
  Sparkles,
  TrendingUp,
  MoreVertical,
  CheckCircle2,
  ChevronRight,
  Globe,
} from 'lucide-react';
import { MOCK_GENRES } from '../data/mockTracks';
import { LiquidSurface } from './LiquidGlassFilter';
import { SmartArtwork } from './SmartArtwork';
import { searchMusic, fetchTrendingTracks } from '../services/musicApi';

/**
 * Spotify iOS 1:1 Search View with Region-Aware Discovery
 * Features:
 * - Liquid Glass Region Switcher Pill (🇮🇩 ID | 🌐 Global)
 * - Canonical Apple Music Index search (30 songs + 3 artists)
 * - Top Artist Result Liquid Glass Card with direct Discography trigger
 * - SmartArtwork auto-recovery on all search results
 * - 350ms debounced search
 * - Three-dots (...) menu triggering ActionSheet
 */
export function SearchView({
  region = 'ID',
  onToggleRegion,
  currentTrack,
  isPlaying,
  likedTrackIds,
  onSelectTrack,
  onToggleLike,
  onOpenPlaylist,
  onOpenActionSheet,
  onOpenArtist,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState([]);
  const [topArtist, setTopArtist] = useState(null);
  const [trendingTracks, setTrendingTracks] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch real trending tracks whenever region changes
  useEffect(() => {
    let isMounted = true;
    setIsLoadingTrending(true);

    fetchTrendingTracks(region)
      .then((data) => {
        if (isMounted) {
          setTrendingTracks(data);
          setIsLoadingTrending(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingTrending(false);
      });

    return () => {
      isMounted = false;
    };
  }, [region]);

  // 350ms debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchTerm.trim());
    }, 350);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Execute search when debouncedQuery or region changes
  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      setTopArtist(null);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    let isMounted = true;
    setIsSearching(true);
    setHasSearched(true);

    searchMusic(debouncedQuery, region)
      .then((data) => {
        if (isMounted) {
          setResults(data.tracks || data);
          setTopArtist(data.topArtist || null);
          setIsSearching(false);
        }
      })
      .catch((err) => {
        console.warn('Search query failed:', err);
        if (isMounted) {
          setResults([]);
          setTopArtist(null);
          setIsSearching(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery, region]);

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-none px-4 pt-3 pb-44 text-white">
      {/* Search Header with Region Switcher Pill */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-black tracking-tight">Search</h1>

        {/* Liquid Glass Region Switcher Pill */}
        <button
          onClick={onToggleRegion}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.14] active:scale-95 transition-all cursor-pointer group shadow-sm"
          style={{
            background:
              'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.03) 100%)',
            backdropFilter: 'blur(16px)',
          }}
          title={`Switch catalog region (Current: ${region === 'ID' ? 'Indonesia' : 'Global'})`}
        >
          <span className="text-xs font-black tracking-wide">
            {region === 'ID' ? '🇮🇩 ID' : '🌐 Global'}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#1ed760] group-hover:scale-125 transition-transform" />
        </button>
      </div>

      {/* Sticky Liquid Glass Search Input */}
      <div className="sticky top-0 z-20 pb-3 bg-[#050507]/40 backdrop-blur-md -mx-4 px-4 pt-1">
        <LiquidSurface
          rounded="rounded-2xl"
          className="w-full h-12"
          contentClassName="w-full h-full flex items-center px-4 gap-3"
          style={{
            background:
              'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.03) 100%)',
            boxShadow:
              'inset 0 1px 0.5px 0 rgba(255, 255, 255, 0.35), 0 8px 24px rgba(0, 0, 0, 0.5)',
          }}
        >
          {isSearching ? (
            <Loader2 className="w-5 h-5 text-[#1ed760] animate-spin flex-shrink-0" />
          ) : (
            <SearchIcon className="w-5 h-5 text-white/60 flex-shrink-0" />
          )}

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              region === 'ID'
                ? 'Sheila On 7, Dan, Dewa 19, Noah...'
                : 'Artists, songs, or albums...'
            }
            className="w-full min-w-0 flex-1 bg-transparent border-none outline-none text-sm font-semibold text-white placeholder-white/40 tracking-tight"
            autoFocus={false}
          />

          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setDebouncedQuery('');
              }}
              className="p-1.5 -mr-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer flex-shrink-0"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </LiquidSurface>
      </div>

      {/* Live Search Results */}
      {debouncedQuery ? (
        <div className="pt-1">
          {/* TOP ARTIST RESULT CARD */}
          {topArtist && !isSearching && (
            <div className="mb-4">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-white/50 mb-2 block">
                Top Artist Result
              </span>

              <div
                onClick={() => onOpenArtist?.(topArtist)}
                className="group relative flex items-center justify-between p-3.5 rounded-2xl cursor-pointer active:scale-[0.98] transition-all border border-white/[0.12]"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
                  backdropFilter: 'blur(20px)',
                  boxShadow:
                    'inset 0 1px 1px 0 rgba(255, 255, 255, 0.3), 0 12px 30px rgba(0, 0, 0, 0.5)',
                }}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-14 h-14 rounded-full overflow-hidden border border-white/20 shadow-md flex-shrink-0 bg-neutral-900">
                    <SmartArtwork
                      src={topArtist.cover}
                      title={topArtist.name}
                      artist={topArtist.name}
                      isArtist={true}
                      className="w-full h-full object-cover"
                      rounded="rounded-full"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-base font-extrabold text-white truncate group-hover:text-[#1ed760] transition-colors">
                        {topArtist.name}
                      </h3>
                      <CheckCircle2 className="w-4 h-4 text-[#1ed760] fill-[#1ed760]/20 flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-white/60 font-semibold">
                      <span className="px-2 py-0.5 rounded-full bg-white/[0.08] text-[10px] text-white/80">
                        Artist
                      </span>
                      <span>•</span>
                      <span>{topArtist.genre}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-[#1ed760] bg-[#1ed760]/10 px-3 py-1.5 rounded-full border border-[#1ed760]/25 group-hover:bg-[#1ed760] group-hover:text-black transition-all flex-shrink-0 ml-2">
                  <span>Discography</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          )}

          {/* Search Header Info */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white/50">
              {isSearching ? 'Searching catalog...' : `Songs (${results.length})`}
            </h2>
            {results.length > 0 && (
              <span className="text-[11px] font-semibold text-[#1ed760] flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {region === 'ID' ? 'Indonesia' : 'Global'}
              </span>
            )}
          </div>

          {/* Shimmer loading placeholder */}
          {isSearching && (
            <div className="flex flex-col gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="h-16 rounded-xl bg-white/[0.04] animate-pulse flex items-center px-3 gap-3"
                >
                  <div className="w-12 h-12 rounded-lg bg-white/10" />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="w-2/3 h-3.5 bg-white/10 rounded" />
                    <div className="w-1/3 h-2.5 bg-white/10 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isSearching && results.length === 0 && hasSearched && (
            <div className="py-16 text-center">
              <p className="text-base font-bold text-white mb-1">
                Couldn't find "{debouncedQuery}" in {region === 'ID' ? 'Indonesia' : 'Global'}
              </p>
              <p className="text-xs text-white/50 max-w-[260px] mx-auto leading-relaxed">
                Try tapping the region button above to search the {region === 'ID' ? 'Global' : 'Indonesia'} catalog or check spelling.
              </p>
            </div>
          )}

          {/* Results List */}
          {!isSearching && results.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {results.map((track) => {
                const isThisSelected = currentTrack?.id === track.id;
                const isLiked = likedTrackIds?.has(track.id);

                return (
                  <div
                    key={track.id}
                    onClick={() => {
                      if (isThisSelected) {
                        onTogglePlayPause?.();
                      } else {
                        onSelectTrack(track, results);
                      }
                    }}
                    className={`group relative flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all duration-150 active:scale-[0.99] border ${
                      isThisSelected
                        ? 'bg-white/[0.08] border-white/[0.08]'
                        : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.03]'
                    }`}
                  >
                    {/* Left: Artwork + Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-900 border border-white/[0.08] shadow-md">
                        <SmartArtwork
                          src={track.cover}
                          title={track.title}
                          artist={track.artist}
                          className="w-full h-full object-cover"
                          alt={track.title}
                        />
                        {isThisSelected && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="flex items-end gap-[2px] h-3.5">
                              <span
                                className={`w-[2.5px] bg-[#1ed760] rounded-full ${
                                  isPlaying
                                    ? 'animate-[bounce_0.6s_ease-in-out_infinite]'
                                    : 'h-1.5'
                                }`}
                              />
                              <span
                                className={`w-[2.5px] bg-[#1ed760] rounded-full ${
                                  isPlaying
                                    ? 'animate-[bounce_0.8s_ease-in-out_infinite]'
                                    : 'h-3'
                                }`}
                              />
                              <span
                                className={`w-[2.5px] bg-[#1ed760] rounded-full ${
                                  isPlaying
                                    ? 'animate-[bounce_0.5s_ease-in-out_infinite]'
                                    : 'h-2'
                                }`}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-bold truncate leading-tight ${
                            isThisSelected ? 'text-[#1ed760]' : 'text-white'
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

                    {/* Right: Duration, Like Heart & More Options */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-semibold text-white/40 hidden sm:inline">
                        {track.durationFormatted}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLike(track);
                        }}
                        className="p-1.5 text-white/40 hover:text-white active:scale-90 transition-transform cursor-pointer"
                        title={isLiked ? 'Unlike' : 'Like'}
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            isLiked
                              ? 'fill-[#1ed760] text-[#1ed760]'
                              : 'text-white/40'
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
      ) : (
        /* Empty State: Real Live Trending Tracks + Browse All Categories */
        <div>
          {/* Real Trending Songs from API */}
          {trendingTracks.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/60">
                  <TrendingUp className="w-3.5 h-3.5 text-[#1ed760]" />
                  <span>Trending in {region === 'ID' ? 'Indonesia' : 'Global'}</span>
                </div>
                <span className="text-[10px] text-white/40 font-semibold">
                  Tap to play
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                {trendingTracks.map((track) => {
                  const isThisSelected = currentTrack?.id === track.id;
                  const isLiked = likedTrackIds?.has(track.id);

                  return (
                    <div
                      key={track.id}
                      onClick={() => onSelectTrack(track, trendingTracks)}
                      className="group flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.04] cursor-pointer active:scale-[0.99] transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                        <SmartArtwork
                          src={track.cover}
                          title={track.title}
                          artist={track.artist}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-white/[0.08]"
                          alt={track.title}
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-bold truncate leading-tight ${
                              isThisSelected ? 'text-[#1ed760]' : 'text-white'
                            }`}
                          >
                            {track.title}
                          </p>
                          <p className="text-xs text-white/50 truncate font-medium mt-0.5">
                            {track.artist}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleLike(track);
                          }}
                          className="p-1.5 text-white/40 hover:text-white cursor-pointer"
                        >
                          <Heart
                            className={`w-4 h-4 ${
                              isLiked
                                ? 'fill-[#1ed760] text-[#1ed760]'
                                : 'text-white/40'
                            }`}
                          />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenActionSheet?.(track);
                          }}
                          className="p-1.5 text-white/40 hover:text-white cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-[#1ed760] group-hover:text-black transition-colors">
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Browse All Genres */}
          <div>
            <h2 className="text-base font-extrabold tracking-tight mb-3">
              Browse all
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {MOCK_GENRES.map((genre) => (
                <div
                  key={genre.id}
                  onClick={() => {
                    setSearchTerm(genre.title);
                  }}
                  className="relative h-24 rounded-2xl overflow-hidden p-3.5 cursor-pointer active:scale-95 transition-transform duration-200 border border-white/[0.08]"
                  style={{
                    backgroundColor: genre.color,
                    boxShadow:
                      'inset 0 1px 0.5px 0 rgba(255, 255, 255, 0.35), 0 8px 20px rgba(0, 0, 0, 0.45)',
                  }}
                >
                  <span className="text-sm font-black text-white leading-tight drop-shadow-sm">
                    {genre.title}
                  </span>

                  {/* Angled decorative vinyl groove badge */}
                  <div className="absolute -bottom-2 -right-3 w-16 h-16 rounded-full overflow-hidden transform rotate-[25deg] shadow-xl border border-white/20 bg-black/40 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-white/20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchView;
