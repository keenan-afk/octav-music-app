import React, { useRef, useEffect } from 'react';
import { Home, Search, Library, TrendingUp } from 'lucide-react';
import { LiquidSurface } from './LiquidGlassFilter';
import gsap from 'gsap';

/**
 * Bottom Floating Liquid Tab Dock
 * 4-Tab Liquid Glass Dock in exact order:
 * Home | Top Charts | Search | Your Library
 * With fluid sliding glass pill indicator on the active tab.
 */
export function FloatingTabDock({ activeTab, onSelectTab }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'charts', label: 'Top Charts', icon: TrendingUp },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'Your Library', icon: Library },
  ];

  const indicatorRef = useRef(null);
  const activeIndex = tabs.findIndex((t) => t.id === activeTab);

  useEffect(() => {
    if (indicatorRef.current && activeIndex !== -1) {
      gsap.to(indicatorRef.current, {
        xPercent: activeIndex * 100,
        duration: 0.35,
        ease: 'power3.out',
      });
    }
  }, [activeIndex]);

  return (
    <div className="absolute bottom-2 inset-x-3 z-40 select-none pointer-events-auto">
      <LiquidSurface
        rounded="rounded-full"
        className="h-16"
        contentClassName="relative w-full h-full"
        style={{
          background:
            'linear-gradient(145deg, rgba(22, 22, 28, 0.72) 0%, rgba(10, 10, 14, 0.58) 100%)',
          backdropFilter: 'url(#liquid-refraction) blur(36px) saturate(210%) brightness(1.06)',
          boxShadow:
            'inset 0 1px 0.8px 0 rgba(255, 255, 255, 0.45), inset 0 -1px 0.8px 0 rgba(255, 255, 255, 0.08), 0 20px 45px rgba(0, 0, 0, 0.85)',
        }}
      >
        {/* Sliding Fluid Liquid Pill Indicator */}
        <div className="absolute inset-y-1.5 left-1.5 w-[calc(25%-3px)] pointer-events-none z-0">
          <div
            ref={indicatorRef}
            className="w-full h-full rounded-full"
            style={{
              background:
                'linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.05) 100%)',
              boxShadow:
                'inset 0 1px 0.5px 0 rgba(255, 255, 255, 0.35), 0 4px 14px rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
            }}
          />
        </div>

        {/* 4-Column Grid for Perfectly Centered Tabs */}
        <div className="grid grid-cols-4 items-center justify-items-center w-full h-full relative z-10 px-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className="w-full h-full flex flex-col items-center justify-center gap-1 active:scale-90 transition-transform duration-150 cursor-pointer"
              >
                <Icon
                  className={`w-5 h-5 transition-colors duration-200 ${
                    isActive ? 'text-white' : 'text-white/50 hover:text-white/80'
                  }`}
                  strokeWidth={isActive ? 2.4 : 1.8}
                />
                <span
                  className={`text-[10px] font-bold tracking-tight transition-colors duration-200 ${
                    isActive ? 'text-white' : 'text-white/50'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </LiquidSurface>
    </div>
  );
}

export default FloatingTabDock;
