import React from 'react';
import { Heart } from 'lucide-react';
import { SmartArtwork } from './SmartArtwork';

/**
 * 2x4 Quick-Jump Recents Grid
 * Spotify iOS signature 8 compact items (h-14 rounded-lg).
 * Features:
 * - Iconic Spotify purple-indigo liquid glass gradient card with glowing white Heart for 'Liked Songs'
 * - 7 unique high-resolution artwork covers for all other items resolved with SmartArtwork
 * - Active animated equalizer bars when playing
 */
export function QuickJumpGrid({
  items,
  currentTrack,
  isPlaying,
  onSelectTrack,
  onOpenPlaylist,
}) {
  return (
    <div className="grid grid-cols-2 gap-2 px-4 py-2">
      {items.slice(0, 8).map((item) => {
        const isCurrentSong = currentTrack && item.id === currentTrack.id;
        const isLikedCard = item.isLikedCollection || item.id === 'pl-liked';

        return (
          <div
            key={item.id}
            onClick={() => {
              if (item.type === 'Playlist' || item.type === 'Album') {
                onOpenPlaylist(item);
              } else {
                onSelectTrack(item);
              }
            }}
            className="group relative flex items-center h-14 rounded-lg overflow-hidden border border-white/[0.08] cursor-pointer active:scale-[0.98] transition-all duration-200"
            style={{
              background:
                'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.015) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              boxShadow:
                'inset 0 1px 0.5px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0.5px 0 rgba(255, 255, 255, 0.04), 0 8px 20px rgba(0, 0, 0, 0.4)',
            }}
          >
            {/* Left 56x56 Artwork or Liked Songs Gradient */}
            {isLikedCard ? (
              <div
                className="relative w-14 h-14 flex-shrink-0 flex items-center justify-center overflow-hidden"
                style={{
                  background:
                    'linear-gradient(135deg, #450af5 0%, #8e8ee5 50%, #c4efd9 100%)',
                  boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.45)',
                }}
              >
                <Heart className="w-6 h-6 fill-white text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.65)]" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/25 pointer-events-none" />
              </div>
            ) : (
              <div className="relative w-14 h-14 flex-shrink-0 bg-neutral-900 overflow-hidden">
                <SmartArtwork
                  src={item.cover}
                  title={item.title}
                  artist={item.artist || item.curator}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  alt={item.title}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/30 pointer-events-none" />
              </div>
            )}

            {/* Title & Equalizer Metadata */}
            <div className="flex-1 min-w-0 px-2.5 py-1 flex items-center justify-between">
              <p
                className={`text-xs font-bold leading-snug line-clamp-2 transition-colors ${
                  isCurrentSong ? 'text-[#1ed760]' : 'text-white/95 group-hover:text-white'
                }`}
              >
                {item.title}
              </p>

              {/* Animated Equalizer Indicator if currently playing */}
              {isCurrentSong && (
                <div
                  className="flex items-end gap-[2px] h-3.5 flex-shrink-0 ml-1.5"
                  title="Playing"
                >
                  <span
                    className={`w-[2.5px] bg-[#1ed760] rounded-full ${
                      isPlaying
                        ? 'animate-[bounce_0.6s_ease-in-out_infinite]'
                        : 'h-1.5'
                    }`}
                    style={{
                      height: isPlaying ? undefined : '6px',
                      animationDelay: '0ms',
                    }}
                  />
                  <span
                    className={`w-[2.5px] bg-[#1ed760] rounded-full ${
                      isPlaying
                        ? 'animate-[bounce_0.8s_ease-in-out_infinite]'
                        : 'h-3'
                    }`}
                    style={{
                      height: isPlaying ? undefined : '12px',
                      animationDelay: '150ms',
                    }}
                  />
                  <span
                    className={`w-[2.5px] bg-[#1ed760] rounded-full ${
                      isPlaying
                        ? 'animate-[bounce_0.5s_ease-in-out_infinite]'
                        : 'h-2'
                    }`}
                    style={{
                      height: isPlaying ? undefined : '8px',
                      animationDelay: '300ms',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Subtle Hover Ambient Sheen */}
            <div className="absolute inset-0 bg-white/[0.04] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200" />
          </div>
        );
      })}
    </div>
  );
}

export default QuickJumpGrid;
