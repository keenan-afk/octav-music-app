import React from 'react';
import { X, ChevronUp, ChevronDown, Trash2, ListMusic, Play, Disc } from 'lucide-react';
import { SmartArtwork } from './SmartArtwork';

/**
 * QueueSheet
 * Interactive "Up Next" Queue Manager Sheet:
 * - Highlights current "Now Playing" track with animated waveform
 * - Upcoming tracks with Move Up, Move Down, and Remove buttons
 * - Clear Queue action
 * - Seamless Liquid Glass backdrop
 */
export function QueueSheet({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
  queue = [],
  onSelectTrack,
  onMoveTrack,
  onRemoveTrack,
  onClearQueue,
}) {
  if (!isOpen) return null;

  // Determine true upcoming tracks (tracks after current playing song, or all other queue tracks)
  const currentIdx = queue.findIndex((t) => t.id === currentTrack?.id);
  const nextTracks = currentIdx >= 0 ? queue.slice(currentIdx + 1) : queue.filter((t) => t.id !== currentTrack?.id);

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center pointer-events-auto select-none">
      {/* Dimmed Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity cursor-pointer"
      />

      {/* Floating Bottom Liquid Glass Sheet */}
      <div
        className="relative w-full max-w-[430px] max-h-[85vh] overflow-hidden rounded-t-[36px] text-white z-10 border-t border-x border-white/15 shadow-[0_-20px_50px_rgba(0,0,0,0.85)] flex flex-col"
        style={{
          background: 'linear-gradient(180deg, rgba(22, 22, 30, 0.96) 0%, rgba(10, 10, 14, 0.98) 100%)',
          backdropFilter: 'blur(30px) saturate(190%)',
        }}
      >
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-[#1ed760]" />
            <h2 className="text-base font-extrabold tracking-tight text-white">Up Next Queue</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto scrollbar-none px-5 py-4 flex flex-col gap-5 flex-1">
          {/* NOW PLAYING SECTION */}
          {currentTrack && (
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-2 block">
                Now Playing
              </span>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.08] border border-[#1ed760]/30 shadow-md">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <SmartArtwork
                    src={currentTrack.cover}
                    title={currentTrack.title}
                    artist={currentTrack.artist}
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-white/20"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-[#1ed760] truncate">{currentTrack.title}</h4>
                    <p className="text-[11px] text-white/60 truncate">{currentTrack.artist}</p>
                  </div>
                </div>

                {/* Animated Equalizer */}
                <div className="flex items-end gap-1 h-4 flex-shrink-0 ml-2">
                  <span
                    className={`w-1 bg-[#1ed760] rounded-full ${
                      isPlaying ? 'animate-[bounce_0.6s_ease-in-out_infinite]' : 'h-2'
                    }`}
                  />
                  <span
                    className={`w-1 bg-[#1ed760] rounded-full ${
                      isPlaying ? 'animate-[bounce_0.8s_ease-in-out_infinite]' : 'h-3.5'
                    }`}
                  />
                  <span
                    className={`w-1 bg-[#1ed760] rounded-full ${
                      isPlaying ? 'animate-[bounce_0.5s_ease-in-out_infinite]' : 'h-1.5'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* NEXT IN QUEUE SECTION */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/40">
                Next In Queue ({nextTracks.length})
              </span>
              {nextTracks.length > 0 && (
                <button
                  onClick={onClearQueue}
                  className="text-[11px] font-bold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                >
                  Clear Queue
                </button>
              )}
            </div>

            {nextTracks.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-2 bg-white/[0.02] rounded-2xl border border-white/[0.05]">
                <Disc className="w-8 h-8 text-white/20 animate-spin-slow" />
                <p className="text-xs text-white/40 font-medium">Queue is empty</p>
                <span className="text-[10px] text-white/30">
                  Tap '...' on any song to add to queue or enjoy Auto-Radio
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {nextTracks.map((track, idx) => {
                  const globalIdx = queue.findIndex((t) => t.id === track.id);

                  return (
                    <div
                      key={`${track.id}-${idx}`}
                      onClick={() => onSelectTrack(track, queue)}
                      className="group flex items-center justify-between p-2 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] active:scale-[0.99] border border-white/[0.06] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <SmartArtwork
                          src={track.cover}
                          title={track.title}
                          artist={track.artist}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-white/10"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-white group-hover:text-[#1ed760] truncate transition-colors">
                            {track.title}
                          </h4>
                          <p className="text-[10px] text-white/50 truncate">{track.artist}</p>
                        </div>
                      </div>

                      {/* Interactive Move Up / Down & Remove */}
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          disabled={idx === 0}
                          onClick={() => {
                            const fromGlobal = queue.findIndex((t) => t.id === track.id);
                            const toGlobal = queue.findIndex((t) => t.id === nextTracks[idx - 1].id);
                            if (fromGlobal !== -1 && toGlobal !== -1) {
                              onMoveTrack(fromGlobal, toGlobal);
                            }
                          }}
                          className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 active:scale-90 transition-all disabled:opacity-20 cursor-pointer"
                          title="Move up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === nextTracks.length - 1}
                          onClick={() => {
                            const fromGlobal = queue.findIndex((t) => t.id === track.id);
                            const toGlobal = queue.findIndex((t) => t.id === nextTracks[idx + 1].id);
                            if (fromGlobal !== -1 && toGlobal !== -1) {
                              onMoveTrack(fromGlobal, toGlobal);
                            }
                          }}
                          className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 active:scale-90 transition-all disabled:opacity-20 cursor-pointer"
                          title="Move down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onRemoveTrack(track.id)}
                          className="p-1 rounded-md text-white/40 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all cursor-pointer"
                          title="Remove from queue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QueueSheet;

