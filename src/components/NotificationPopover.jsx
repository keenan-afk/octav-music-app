import React, { useRef, useEffect } from 'react';
import { X, Bell, Disc3, Radio, Sparkles } from 'lucide-react';
import { LiquidSurface } from './LiquidGlassFilter';
import { SmartArtwork } from './SmartArtwork';
import gsap from 'gsap';

export function NotificationPopover({
  isOpen,
  onClose,
  currentTrack,
  queue = [],
  onSelectTrack,
}) {
  const popoverRef = useRef(null);

  useEffect(() => {
    if (isOpen && popoverRef.current) {
      gsap.fromTo(
        popoverRef.current,
        { scale: 0.95, opacity: 0, y: -10 },
        { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const mockUpdates = [
    {
      id: 'update-1',
      title: 'Lossless Spatial Audio Enabled',
      subtitle: 'Lossless audio streaming engine active at 320kbps.',
      time: 'Just now',
      tag: 'System',
    },
    {
      id: 'update-2',
      title: 'Guns N\' Roses',
      subtitle: 'New remastered live recording available in Hi-Res.',
      time: '2h ago',
      tag: 'New Release',
    },
    {
      id: 'update-3',
      title: 'Time-Synced Lyrics Active',
      subtitle: 'Real-time word sync powered by LRCLIB database.',
      time: '1d ago',
      tag: 'Feature',
    },
  ];

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center pt-14 px-4 select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm -z-10 cursor-pointer"
      />

      <div ref={popoverRef} className="w-full max-w-[380px]">
        <LiquidSurface
          className="rounded-[28px] p-5 border border-white/[0.14] overflow-hidden max-h-[80vh] flex flex-col shadow-2xl"
          style={{
            background:
              'linear-gradient(145deg, rgba(26, 26, 36, 0.96) 0%, rgba(12, 12, 18, 0.94) 100%)',
            backdropFilter: 'url(#liquid-refraction) blur(40px) saturate(210%) brightness(1.08)',
            boxShadow:
              'inset 0 1px 1px 0 rgba(255, 255, 255, 0.5), 0 20px 50px rgba(0, 0, 0, 0.85)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-[#1ed760]/20 flex items-center justify-center text-[#1ed760]">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-extrabold text-white tracking-tight">What's New & Updates</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-y-auto scrollbar-none flex flex-col gap-4 pr-1">
            {/* Now Playing Widget */}
            {currentTrack && (
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1ed760] flex items-center gap-1.5">
                    <Disc3 className="w-3.5 h-3.5 animate-spin" /> Now Playing
                  </span>
                  <span className="text-[10px] font-semibold text-white/40">320kbps</span>
                </div>
                <div className="flex items-center gap-3">
                  <SmartArtwork
                    src={currentTrack.cover}
                    title={currentTrack.title}
                    artist={currentTrack.artist}
                    className="w-11 h-11 rounded-xl shadow-md border border-white/[0.1] flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white truncate">{currentTrack.title}</h4>
                    <p className="text-[11px] text-white/60 truncate font-medium mt-0.5">
                      {currentTrack.artist}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* System / Music Updates */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider px-1">
                Recent Highlights
              </span>
              {mockUpdates.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-[#1ed760] bg-[#1ed760]/10 px-2 py-0.5 rounded-full border border-[#1ed760]/20">
                      {item.tag}
                    </span>
                    <span className="text-[10px] text-white/40">{item.time}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white mt-1">{item.title}</h4>
                  <p className="text-[11px] text-white/60 font-medium mt-0.5 leading-snug">
                    {item.subtitle}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </LiquidSurface>
      </div>
    </div>
  );
}

export default NotificationPopover;

