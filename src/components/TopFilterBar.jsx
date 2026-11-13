import React from 'react';
import { Bell } from 'lucide-react';
import { LiquidSurface } from './LiquidGlassFilter';
import { useAuth } from '../context/AuthContext';

/**
 * Sticky Liquid Top Filter Bar
 * Spotify iOS 1:1 user avatar + filter capsules ('All', 'Music', 'Podcasts') + Region Switcher
 * Wrapped in Apple iOS 26 tactile liquid glass capsules.
 */
export function TopFilterBar({
  activeFilter,
  onSelectFilter,
  region = 'ID',
  onToggleRegion,
  onOpenNotifications,
  onProfileClick,
}) {
  const filters = region === 'ID' ? ['All', 'Indo Hits', 'Rock', 'Acoustic'] : ['All', 'Trending', 'Rock', 'Acoustic'];
  const { user, isAuthenticated, effectiveAvatar, effectiveDisplayName } = useAuth();
  const [imgErr, setImgErr] = React.useState(false);

  const getInitials = (name) => {
    if (!name) return 'O';
    const clean = name.trim().replace(/^@/, '');
    const parts = clean.split(/[\s_.-]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return clean.slice(0, 2).toUpperCase();
  };

  const displayName = user?.displayName || effectiveDisplayName || 'Listener';
  const avatarSrc = user?.avatar || effectiveAvatar || (typeof localStorage !== 'undefined' && localStorage.getItem('octav_guest_avatar')) || '';

  return (
    <div className="sticky top-0 z-30 pt-3 pb-2 px-4 flex items-center justify-between pointer-events-auto backdrop-blur-md bg-[#050507]/40 border-b border-white/[0.04]">
      {/* Left: User Avatar & Filter Capsules */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
        {/* User Profile Avatar with Presence Ring */}
        <button
          onClick={onProfileClick}
          className="relative flex-shrink-0 w-8 h-8 rounded-full overflow-hidden p-0.5 group active:scale-95 transition-transform cursor-pointer"
          title={isAuthenticated ? `${displayName} (Synced)` : "Account Profile"}
        >
          <div
            className={`absolute inset-0 rounded-full ${
              isAuthenticated
                ? 'bg-gradient-to-tr from-[#1ed760] via-emerald-400 to-teal-300 opacity-90'
                : 'bg-white/20'
            }`}
          />
          {avatarSrc && !imgErr ? (
            <img
              src={avatarSrc}
              alt={displayName}
              onError={() => setImgErr(true)}
              className="relative z-10 w-full h-full object-cover rounded-full border border-black/40"
            />
          ) : (
            <div className="relative z-10 w-full h-full flex items-center justify-center rounded-full bg-gradient-to-br from-[#1ed760] to-emerald-700 text-black font-black text-[10px] tracking-tight border border-black/40">
              {getInitials(displayName)}
            </div>
          )}
          <span
            className={`absolute bottom-0 right-0 z-20 w-2.5 h-2.5 border-2 border-[#050507] rounded-full ${
              isAuthenticated ? 'bg-[#1ed760]' : 'bg-white/40'
            }`}
          />
        </button>

        {/* Filter Capsules */}
        <div className="flex items-center gap-1.5">
          {filters.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => onSelectFilter(filter)}
                className={`relative px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-300 active:scale-95 cursor-pointer ${
                  isActive
                    ? 'text-black font-bold shadow-[0_0_16px_rgba(30,215,96,0.35)]'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                {isActive ? (
                  // Active Spotify Emerald Pill with Optical Specular Highlight
                  <div
                    className="absolute inset-0 rounded-full bg-[#1ed760] transition-all"
                    style={{
                      boxShadow:
                        'inset 0 1px 1px 0 rgba(255, 255, 255, 0.6), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.2), 0 4px 14px rgba(30, 215, 96, 0.4)',
                    }}
                  />
                ) : (
                  // Liquid Glass Capsule
                  <div
                    className="absolute inset-0 rounded-full border border-white/[0.09] transition-all"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.02) 100%)',
                      backdropFilter: 'blur(16px)',
                      boxShadow:
                        'inset 0 1px 0.5px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 0.5px 0 rgba(255, 255, 255, 0.05)',
                    }}
                  />
                )}
                <span className="relative z-10">{filter}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Region Switcher & Notifications */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Sleek Liquid Glass Region Switcher Pill */}
        <button
          onClick={onToggleRegion}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/[0.14] active:scale-95 transition-all cursor-pointer group shadow-sm bg-white/[0.06] hover:bg-white/[0.12]"
          title={`Switch catalog region (Current: ${region === 'ID' ? 'Indonesia' : 'Global'})`}
        >
          <span className="text-[11px] font-black text-white tracking-wide">
            {region === 'ID' ? '🇮🇩 ID' : '🌐 Global'}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#1ed760] group-hover:scale-125 transition-transform" />
        </button>

        {/* Notifications Bell */}
        <button
          onClick={onOpenNotifications}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white active:scale-95 transition-all cursor-pointer relative bg-white/[0.04] hover:bg-white/[0.08]"
          title="What's New & Updates"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#1ed760]" />
        </button>
      </div>
    </div>
  );
}

export default TopFilterBar;
