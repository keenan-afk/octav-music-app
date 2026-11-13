import React, { useState, useEffect } from 'react';
import { Play, Pause, MoreVertical, Flame, TrendingUp, Sparkles, Heart } from 'lucide-react';
import { SmartArtwork } from './SmartArtwork';
import { fetchTopCharts } from '../services/musicApi';

/**
 * TopChartsView
 * Official Top 50 Ranked Charts with:
 * - Segmented Liquid Glass Switcher (Indonesia Top 50 vs Global Top 50)
 * - #1 Spotlight Ambient Hero Card
 * - Bold Editorial Ranked Tracklist (01 to 50)
 * - Instant Play, Like & Action Sheet triggers
 */
export function TopChartsView({
  region = 'ID',
  currentTrack,
  isPlaying,
  likedTrackIds = new Set(),
  onSelectTrack,
  onTogglePlayPause,
  onToggleLike,
  onOpenActionSheet,
  onOpenArtist,
}) {
  const [chartMode, setChartMode] = useState('local'); // 'local' (ID) | 'global' (US)
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const activeRegionCode = chartMode === 'local' ? 'ID' : 'US';

  useEffect(() => {
    let active = true;
    async function loadCharts() {
      setIsLoading(true);
      try {
        const list = await fetchTopCharts(activeRegionCode, 50);
        if (active) {
          setTracks(list);
        }
      } catch (err) {
        console.warn('TopCharts load error:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadCharts();
    return () => {
      active = false;
    };
  }, [activeRegionCode]);

  const topTrack = tracks[0];
  const isTopPlaying = topTrack && currentTrack?.id === topTrack.id && isPlaying;

  const handlePlayChart = () => {
    if (tracks.length > 0) {
      onSelectTrack(tracks[0], tracks);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-none pb-44 select-none">
      {/* Sticky Header with Title & Segmented Switcher */}
      <div className="sticky top-0 z-30 pt-3 pb-2 px-4 backdrop-blur-md bg-[#050507]/60 border-b border-white/[0.04]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#1ed760]" />
            <h1 className="text-xl font-black tracking-tight text-white">Top Charts</h1>
          </div>

          <button
            onClick={handlePlayChart}
            disabled={tracks.length === 0}
            className="py-1.5 px-4 rounded-full bg-[#1ed760] hover:bg-[#1bc456] text-black text-xs font-extrabold flex items-center gap-1.5 shadow-[0_4px_16px_rgba(30,215,96,0.35)] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play Chart</span>
          </button>
        </div>

        {/* Liquid Glass Segmented Switcher */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/[0.06] border border-white/[0.08]">
          <button
            onClick={() => setChartMode('local')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              chartMode === 'local'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <span>🇮🇩 Indonesia Top 50</span>
          </button>
          <button
            onClick={() => setChartMode('global')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              chartMode === 'global'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <span>🌍 Global Top 50</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#1ed760] border-t-transparent animate-spin" />
          <span className="text-xs text-white/50 font-medium">Loading official Top 50...</span>
        </div>
      ) : (
        <>
          {/* #1 Spotlight Hero Card */}
          {topTrack && (
            <div className="px-4 pt-4 pb-2">
              <div
                onClick={() => onSelectTrack(topTrack, tracks)}
                className="relative w-full rounded-3xl p-5 overflow-hidden border border-white/20 shadow-2xl cursor-pointer group active:scale-[0.99] transition-transform"
                style={{
                  background:
                    'linear-gradient(150deg, rgba(28,28,36,0.92) 0%, rgba(10,10,14,0.96) 100%)',
                }}
              >
                {/* Ambient Blurred Artwork Glow */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-40 blur-2xl scale-125"
                  style={{
                    backgroundImage: `url(${topTrack.cover})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />

                <div className="relative z-10 flex items-center gap-4">
                  {/* #1 Badge + Artwork */}
                  <div className="relative flex-shrink-0">
                    <SmartArtwork
                      src={topTrack.cover}
                      title={topTrack.title}
                      artist={topTrack.artist}
                      className="w-20 h-20 rounded-2xl object-cover border border-white/20 shadow-lg"
                    />
                    <div className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-[#1ed760] text-black font-black text-xs flex items-center justify-center shadow-lg border-2 border-[#050507]">
                      #1
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#1ed760] uppercase tracking-wider mb-1">
                      <Flame className="w-3.5 h-3.5" />
                      <span>Chart Leader</span>
                    </div>
                    <h2 className="text-base font-black text-white truncate leading-tight group-hover:text-[#1ed760] transition-colors">
                      {topTrack.title}
                    </h2>
                    <p
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenArtist?.(topTrack.artist);
                      }}
                      className="text-xs text-white/70 truncate mt-0.5 hover:underline cursor-pointer"
                    >
                      {topTrack.artist}
                    </p>
                  </div>

                  {/* Play Action */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentTrack?.id === topTrack.id) {
                        onTogglePlayPause?.();
                      } else {
                        onSelectTrack(topTrack, tracks);
                      }
                    }}
                    className="w-12 h-12 rounded-full bg-[#1ed760] text-black flex items-center justify-center shadow-[0_6px_20px_rgba(30,215,96,0.45)] group-hover:scale-105 active:scale-95 transition-all flex-shrink-0 cursor-pointer"
                  >
                    {isTopPlaying ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Ranked Tracklist */}
          <div className="px-4 pt-3 flex flex-col gap-1">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06] text-[10px] font-bold text-white/40 uppercase tracking-wider">
              <span>Rank & Track</span>
              <span>Actions</span>
            </div>

            {tracks.map((track, idx) => {
              const rankNum = idx + 1;
              const formattedRank = rankNum < 10 ? `0${rankNum}` : `${rankNum}`;
              const isCurrent = currentTrack && currentTrack.id === track.id;
              const isItemPlaying = isCurrent && isPlaying;
              const isLiked = likedTrackIds.has(track.id);

              return (
                <div
                  key={`${track.id}-${idx}`}
                  onClick={() => onSelectTrack(track, tracks)}
                  className={`group flex items-center justify-between p-2 rounded-2xl cursor-pointer transition-all active:scale-[0.99] ${
                    isCurrent ? 'bg-white/[0.1] border border-[#1ed760]/30' : 'hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Rank Number & Trend Indicator */}
                    <div className="w-8 flex flex-col items-center justify-center flex-shrink-0">
                      <span
                        className={`text-sm font-black font-mono tracking-tighter ${
                          rankNum <= 3 ? 'text-[#1ed760]' : 'text-white/60'
                        }`}
                      >
                        {formattedRank}
                      </span>
                      <span
                        className={`text-[9px] font-extrabold ${
                          track.trend === '▲' || track.trend === 'HOT'
                            ? 'text-emerald-400'
                            : track.trend === 'NEW'
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}
                      >
                        {track.trend}
                      </span>
                    </div>

                    {/* Artwork */}
                    <SmartArtwork
                      src={track.cover}
                      title={track.title}
                      artist={track.artist}
                      className="w-11 h-11 rounded-xl object-cover flex-shrink-0 border border-white/[0.08]"
                    />

                    {/* Metadata */}
                    <div className="min-w-0 flex-1">
                      <h4
                        className={`text-xs font-bold truncate leading-snug ${
                          isCurrent ? 'text-[#1ed760]' : 'text-white group-hover:text-[#1ed760]'
                        }`}
                      >
                        {track.title}
                      </h4>
                      <p
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenArtist?.(track.artist);
                        }}
                        className="text-[11px] text-white/50 truncate hover:text-white cursor-pointer"
                      >
                        {track.artist}
                      </p>
                    </div>
                  </div>

                  {/* Right: Like Button & Context Menu */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLike?.(track);
                      }}
                      className="p-1.5 rounded-full hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                      title={isLiked ? 'Unlike' : 'Like'}
                    >
                      <Heart
                        className={`w-4 h-4 transition-colors ${
                          isLiked
                            ? 'fill-[#1ed760] text-[#1ed760]'
                            : 'text-white/40 hover:text-white'
                        }`}
                      />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenActionSheet?.(track);
                      }}
                      className="p-1.5 rounded-full hover:bg-white/10 active:scale-90 transition-all text-white/40 hover:text-white cursor-pointer"
                      title="More options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default TopChartsView;

