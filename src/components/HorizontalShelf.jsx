import React from 'react';
import { Play } from 'lucide-react';
import { SmartArtwork } from './SmartArtwork';

/**
 * Horizontal Carousel Shelf
 * Displays curated music shelves ('Jump back in', 'Made For You', etc.)
 * with 148x148 rounded-xl cover art, subtle optical glass rim reflections,
 * SmartArtwork auto-recovery, and tight 2-line muted captions.
 */
export function HorizontalShelf({ title, items, onSelectItem, onOpenArtist }) {
  return (
    <div className="py-3">
      {/* Section Header */}
      <div className="px-4 mb-2.5 flex items-baseline justify-between">
        <h2 className="text-lg font-extrabold text-white tracking-tight">{title}</h2>
        <span className="text-xs font-semibold text-white/50 hover:text-white cursor-pointer transition-colors">
          Show all
        </span>
      </div>

      {/* Horizontal Scroll Track */}
      <div className="flex gap-3 px-4 overflow-x-auto scrollbar-none pb-2 pt-0.5">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectItem(item)}
            className="group flex-shrink-0 w-[148px] cursor-pointer active:scale-95 transition-transform duration-200"
          >
            {/* 148x148 Rounded-XL Cover Art with Specular Rim Edge */}
            <div
              className="relative w-[148px] h-[148px] rounded-xl overflow-hidden mb-2 border border-white/[0.08]"
              style={{
                boxShadow:
                  'inset 0 1px 0.5px 0 rgba(255, 255, 255, 0.4), 0 12px 28px rgba(0, 0, 0, 0.65)',
              }}
            >
              <SmartArtwork
                src={item.cover}
                title={item.title}
                artist={item.artist || item.curator || item.subtitle}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                alt={item.title}
              />

              {/* Liquid Gloss Sheen Overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, transparent 50%, rgba(0, 0, 0, 0.4) 100%)',
                }}
              />

              {/* Floating Quick Play Button on Hover / Focus */}
              <div className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-[#1ed760] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-[0_6px_16px_rgba(30,215,96,0.45)]">
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </div>
            </div>

            {/* Title & 2-Line Subtitle */}
            <h3 className="text-xs font-bold text-white leading-tight line-clamp-1 group-hover:text-[#1ed760] transition-colors">
              {item.title}
            </h3>
            <p
              onClick={(e) => {
                const targetArtist = item.artist || item.curator;
                if (targetArtist && onOpenArtist) {
                  e.stopPropagation();
                  onOpenArtist(targetArtist);
                }
              }}
              className={`text-[11px] font-medium text-white/50 leading-snug line-clamp-2 mt-0.5 ${
                onOpenArtist && (item.artist || item.curator)
                  ? 'hover:text-white hover:underline cursor-pointer transition-colors'
                  : ''
              }`}
            >
              {item.subtitle || item.artist || item.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HorizontalShelf;
