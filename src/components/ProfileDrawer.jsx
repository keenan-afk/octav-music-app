import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Heart,
  ListMusic,
  Globe,
  Clock,
  Trash2,
  Check,
  ChevronRight,
  Sparkles,
  Edit2,
  Headphones,
  Sliders,
  ShieldCheck,
  LogOut,
  LogIn,
  Camera,
} from 'lucide-react';
import { LiquidSurface } from './LiquidGlassFilter';
import { SmartArtwork } from './SmartArtwork';
import { OctavLogo } from './OctavLogo';
import { AvatarUploadModal } from './AvatarUploadModal';
import { StatsModal } from './StatsModal';
import { useAuth } from '../context/AuthContext';
import gsap from 'gsap';

const STORAGE_KEY_USER_NAME = 'octav_user_name';
const STORAGE_KEY_AUDIO_QUALITY = 'octav_audio_quality';

export function ProfileDrawer({
  isOpen,
  onClose,
  likedTracksCount = 0,
  playlistsCount = 0,
  region = 'ID',
  onToggleRegion,
  recentlyPlayed = [],
  onSelectTrack,
  onShowToast,
  onResetLibrary,
  crossfadeDuration = 0,
  onSetCrossfadeDuration,
  onOpenEQ,
}) {
  const { user, isAuthenticated, signOut, openAuthModal, updateProfile, effectiveAvatar } = useAuth();

  const drawerRef = useRef(null);
  const backdropRef = useRef(null);

  const [userName, setUserName] = useState(() => {
    return user?.displayName || localStorage.getItem(STORAGE_KEY_USER_NAME) || 'Guest Listener';
  });

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(userName);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'O';
    const clean = name.trim().replace(/^@/, '');
    const parts = clean.split(/[\s_.-]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return clean.slice(0, 2).toUpperCase();
  };

  // Sync displayName when user changes
  useEffect(() => {
    if (user?.displayName) {
      setUserName(user.displayName);
      setNameInput(user.displayName);
    } else {
      setUserName('Guest Listener');
      setNameInput('Guest Listener');
    }
  }, [user]);

  const [audioQuality, setAudioQuality] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_AUDIO_QUALITY) || '320kbps High (Ultra)';
    } catch {
      return '320kbps High (Ultra)';
    }
  });

  const [activeSubView, setActiveSubView] = useState('main'); // 'main' | 'history' | 'quality'

  // GSAP slide in/out from left
  useEffect(() => {
    const drawer = drawerRef.current;
    const backdrop = backdropRef.current;
    if (!drawer) return;

    if (isOpen) {
      setActiveSubView('main');
      drawer.style.display = 'flex';
      if (backdrop) backdrop.style.display = 'block';

      gsap.killTweensOf([drawer, backdrop]);
      gsap.fromTo(
        drawer,
        { x: '-100%', opacity: 0.95 },
        { x: '0%', opacity: 1, duration: 0.38, ease: 'power3.out', force3D: true }
      );
      if (backdrop) {
        gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      }
    } else {
      gsap.killTweensOf([drawer, backdrop]);
      gsap.to(drawer, {
        x: '-100%',
        opacity: 0.95,
        duration: 0.28,
        ease: 'power3.in',
        force3D: true,
        onComplete: () => {
          if (drawer) drawer.style.display = 'none';
        },
      });
      if (backdrop) {
        gsap.to(backdrop, {
          opacity: 0,
          duration: 0.25,
          onComplete: () => {
            if (backdrop) backdrop.style.display = 'none';
          },
        });
      }
    }
  }, [isOpen]);

  const handleSaveName = (e) => {
    e?.preventDefault();
    const trimmed = nameInput.trim() || 'Listener';
    setUserName(trimmed);
    setIsEditingName(false);

    if (user) {
      updateProfile({ displayName: trimmed });
    } else {
      try {
        localStorage.setItem(STORAGE_KEY_USER_NAME, trimmed);
      } catch (e) {}
    }
    onShowToast?.(`Name updated to "${trimmed}"`);
  };

  const handleSelectQuality = (quality) => {
    setAudioQuality(quality);
    try {
      localStorage.setItem(STORAGE_KEY_AUDIO_QUALITY, quality);
    } catch (e) {}
    onShowToast?.(`Audio stream quality set to ${quality}`);
  };

  const handleClearCache = () => {
    if (
      window.confirm(
        'Are you sure you want to reset all saved playlists, liked tracks, and audio cache?'
      )
    ) {
      try {
        ['octav_custom_playlists', 'octav_liked_tracks', 'octav_recent_tracks', 'octav_region',
         'octav_user_name', 'octav_audio_quality', 'octav_audio_eq_curve', 'octav_audio_eq_preset',
         'spotify_liquid_custom_playlists', 'spotify_liquid_liked_tracks', 'spotify_liquid_recent_tracks', 'spotify_liquid_region'
        ].forEach((k) => localStorage.removeItem(k));
      } catch (e) {}
      onShowToast?.('Library and cache reset successfully');
      onResetLibrary?.();
      onClose();
      setTimeout(() => window.location.reload(), 400);
    }
  };

  if (!isOpen) return null;

  const currentAvatar =
    user?.avatar ||
    effectiveAvatar ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('octav_guest_avatar')) ||
    '';

  return (
    <div className="absolute inset-0 z-50 flex pointer-events-auto select-none overflow-hidden">
      {/* Dimmed backdrop with blur confined inside mobile viewport */}
      <div
        ref={backdropRef}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm -z-10 cursor-pointer"
        style={{ display: 'none' }}
      />

      {/* Drawer Panel: w-[84%] max-w-[330px] */}
      <div
        ref={drawerRef}
        className="relative z-10 w-[84%] max-w-[330px] h-full flex flex-col overflow-hidden border-r border-white/[0.12] shadow-2xl"
        style={{
          display: 'none',
          transform: 'translateX(-100%)',
          background:
            'linear-gradient(145deg, rgba(20, 20, 26, 0.98) 0%, rgba(10, 10, 14, 0.96) 100%)',
          backdropFilter: 'url(#liquid-refraction) blur(40px) saturate(210%) brightness(1.08)',
          boxShadow:
            'inset 0 1px 1px 0 rgba(255, 255, 255, 0.4), 15px 0 50px rgba(0, 0, 0, 0.95)',
        }}
      >
        {/* Top Drawer Header with User Avatar & Brand */}
        <div className="p-5 pb-4 border-b border-white/[0.08]">
          {/* Top Brand & Close Bar */}
          <div className="flex items-center justify-between mb-4">
            <OctavLogo size={18} showWordmark={true} />
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-start justify-between mb-3.5">
            {/* User Profile Avatar with Presence Ring & Camera Edit Overlay */}
            <div
              onClick={() => setIsAvatarModalOpen(true)}
              className="relative w-14 h-14 rounded-full overflow-hidden p-0.5 border border-white/20 shadow-lg cursor-pointer group active:scale-95 transition-transform"
              title="Change profile picture"
            >
              <div
                className={`absolute inset-0 rounded-full ${
                  isAuthenticated
                    ? 'bg-gradient-to-tr from-[#1ed760] via-emerald-400 to-teal-300 opacity-90'
                    : 'bg-white/20'
                }`}
              />
              {currentAvatar && !imgError ? (
                <img
                  src={currentAvatar}
                  alt={userName}
                  onError={() => setImgError(true)}
                  className="relative z-10 w-full h-full object-cover rounded-full border-2 border-[#050507]"
                />
              ) : (
                <div className="relative z-10 w-full h-full flex items-center justify-center rounded-full bg-gradient-to-br from-[#1ed760] to-emerald-700 text-black font-black text-sm tracking-tight border-2 border-[#050507]">
                  {getInitials(userName)}
                </div>
              )}

              {/* Hover / Tap Camera Overlay Badge */}
              <div className="absolute inset-0 z-30 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <Camera className="w-4 h-4 text-white drop-shadow" />
              </div>

              <span
                className={`absolute bottom-0 right-0 z-30 w-3 h-3 border-2 border-[#050507] rounded-full ${
                  isAuthenticated ? 'bg-[#1ed760]' : 'bg-white/40'
                }`}
              />
            </div>
          </div>

          {/* User Name & Status */}
          {isEditingName ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                autoFocus
                maxLength={30}
                className="w-full px-2.5 py-1 rounded-lg bg-white/[0.1] border border-[#1ed760]/60 text-sm font-bold text-white outline-none"
              />
              <button
                type="submit"
                className="px-2.5 py-1 rounded-lg bg-[#1ed760] text-black text-xs font-black"
              >
                Save
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="text-base font-black text-white tracking-tight truncate">
                  {userName}
                </h2>
                <button
                  onClick={() => {
                    setNameInput(userName);
                    setIsEditingName(true);
                  }}
                  className="p-1 text-white/40 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Edit display name"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* User handle or Guest mode caption */}
          <div className="text-xs text-white/50 mb-2 truncate">
            {isAuthenticated ? (
              <span>@{user?.username} • {user?.email}</span>
            ) : (
              <span>Local session • Sign in to sync across devices</span>
            )}
          </div>

          {/* Profile Stats Badges */}
          <div className="flex items-center gap-3 text-xs text-white/60 font-semibold mt-1">
            <div className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-[#1ed760] fill-[#1ed760]" />
              <span>{likedTracksCount} Liked</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <ListMusic className="w-3.5 h-3.5 text-white/70" />
              <span>{playlistsCount} Playlists</span>
            </div>
          </div>
        </div>

        {/* Drawer Body Views */}
        <div className="flex-1 overflow-y-auto scrollbar-none p-4 flex flex-col justify-between">
          {activeSubView === 'main' && (
            <div className="flex flex-col gap-2">
              {/* Unauthenticated Guest Sync Banner Card */}
              {!isAuthenticated && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#1ed760]/15 via-emerald-500/10 to-transparent border border-[#1ed760]/30 flex flex-col gap-2 mb-1 shadow-lg">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#1ed760]" />
                    <span className="text-xs font-bold text-white">Sync Your Music Library</span>
                  </div>
                  <p className="text-[11px] text-white/60 leading-tight">
                    Sign in or create an account to back up liked tracks, playlists, and artists to the cloud.
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      openAuthModal('signin');
                    }}
                    className="py-2 px-3 rounded-xl bg-[#1ed760] text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(30,215,96,0.3)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer mt-0.5"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In / Create Account</span>
                  </button>
                </div>
              )}

              {/* Octav Rewind (Listening Stats) Card */}
              <button
                type="button"
                id="btn-octav-rewind"
                onClick={() => setIsStatsModalOpen(true)}
                className="w-full text-left p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-white/[0.04] to-transparent border border-emerald-500/30 flex items-center justify-between cursor-pointer hover:border-[#1ed760]/60 active:scale-[0.99] transition-all group shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1ed760]/20 border border-[#1ed760]/30 flex items-center justify-center text-[#1ed760] group-hover:scale-105 transition-transform">
                    <Sparkles className="w-4 h-4 fill-current" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-white group-hover:text-[#1ed760] transition-colors">
                        Octav Rewind
                      </span>
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-[#1ed760]/20 text-[#1ed760]">
                        Stats
                      </span>
                    </div>
                    <span className="text-[10px] text-white/50">Your top songs & listening time</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
              </button>

              {/* 1. Region & Catalog Switcher */}
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.08] flex items-center justify-center text-white/80">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Region & Catalog</span>
                    <span className="text-[11px] text-white/50 font-medium">
                      {region === 'ID' ? '🇮🇩 Indonesia (ID)' : '🌐 Global (US)'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={onToggleRegion}
                  className="px-2.5 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-[11px] font-extrabold text-[#1ed760] border border-white/[0.1] active:scale-95 transition-all cursor-pointer"
                >
                  Switch
                </button>
              </div>

              {/* 2. Audio Quality Preference */}
              <button
                onClick={() => setActiveSubView('quality')}
                className="w-full p-3 rounded-2xl hover:bg-white/[0.06] flex items-center justify-between transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.08] flex items-center justify-center text-white/80 group-hover:text-[#1ed760] transition-colors">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Audio Stream Quality</span>
                    <span className="text-[11px] text-[#1ed760] font-semibold">{audioQuality}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </button>

              {/* 3. Smooth Track Crossfade */}
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white/[0.08] flex items-center justify-center text-white/80">
                      <Sliders className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Smooth Crossfade</span>
                      <span className="text-[10px] text-white/50">
                        {crossfadeDuration === 0 ? 'Disabled' : `${crossfadeDuration}s transition`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                  {[0, 2, 4, 6].map((sec) => {
                    const active = crossfadeDuration === sec;
                    return (
                      <button
                        key={sec}
                        onClick={() => {
                          onSetCrossfadeDuration?.(sec);
                          onShowToast?.(sec === 0 ? 'Crossfade turned off' : `Crossfade set to ${sec}s`);
                        }}
                        className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          active
                            ? 'bg-[#1ed760] text-black border-[#1ed760]'
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        {sec === 0 ? 'Off' : `${sec}s`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5-Band Master Equalizer & Sound Signature */}
              <button
                onClick={() => {
                  onClose?.();
                  onOpenEQ?.();
                }}
                className="w-full p-3 rounded-2xl hover:bg-white/[0.06] flex items-center justify-between transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.08] flex items-center justify-center text-white/80 group-hover:text-[#1ed760] transition-colors">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">5-Band Master EQ</span>
                    <span className="text-[11px] text-white/50 font-medium">
                      Audiophile & IEM Presets
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </button>

              {/* 4. Listening History / Recently Played */}
              <button
                onClick={() => setActiveSubView('history')}
                className="w-full p-3 rounded-2xl hover:bg-white/[0.06] flex items-center justify-between transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.08] flex items-center justify-center text-white/80 group-hover:text-[#1ed760] transition-colors">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Listening History</span>
                    <span className="text-[11px] text-white/50 font-medium">
                      {recentlyPlayed.length} songs this session
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </button>

              {/* 5. Reset / Clear Cache */}
              <button
                onClick={handleClearCache}
                className="w-full p-3 rounded-2xl hover:bg-red-500/10 border border-transparent hover:border-red-500/20 flex items-center gap-3 text-left transition-colors cursor-pointer group mt-1"
              >
                <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-red-400 block">Clear Cache & Reset</span>
                  <span className="text-[10px] text-red-400/60 font-medium">
                    Clear cached audio & reset app state
                  </span>
                </div>
              </button>

              {/* 6. Sign Out Button (When Logged In) */}
              {isAuthenticated && (
                <button
                  onClick={() => {
                    signOut();
                    onShowToast?.('Signed out. Switched back to guest mode.');
                  }}
                  className="w-full p-3 rounded-2xl bg-white/[0.04] hover:bg-red-500/15 border border-white/[0.08] hover:border-red-500/30 flex items-center gap-3 text-left transition-colors cursor-pointer group mt-1"
                >
                  <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white group-hover:text-red-400 block transition-colors">
                      Sign Out
                    </span>
                    <span className="text-[10px] text-white/40">Switch back to Guest session</span>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* SUB-VIEW: Audio Quality Preferences */}
          {activeSubView === 'quality' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 pb-2 mb-1 border-b border-white/[0.06]">
                <button
                  onClick={() => setActiveSubView('main')}
                  className="p-1 text-white/60 hover:text-white cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                  Audio Quality
                </h3>
              </div>

              {[
                { label: '320kbps High (Ultra)', desc: 'Full bit-rate crystal AAC/MP4 stream' },
                { label: 'Lossless Spatial Master', desc: 'Precision 5-band acoustic EQ tuned' },
                { label: 'Data Saver (96kbps)', desc: 'Optimized for slow connections' },
              ].map((opt) => {
                const isSelected = audioQuality === opt.label;
                return (
                  <button
                    key={opt.label}
                    onClick={() => handleSelectQuality(opt.label)}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white/[0.1] border border-[#1ed760]/40'
                        : 'hover:bg-white/[0.05] border border-transparent'
                    }`}
                  >
                    <div>
                      <span
                        className={`text-xs font-bold block ${
                          isSelected ? 'text-[#1ed760]' : 'text-white'
                        }`}
                      >
                        {opt.label}
                      </span>
                      <span className="text-[10px] text-white/40">{opt.desc}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#1ed760]" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* SUB-VIEW: Listening History */}
          {activeSubView === 'history' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 pb-2 mb-1 border-b border-white/[0.06]">
                <button
                  onClick={() => setActiveSubView('main')}
                  className="p-1 text-white/60 hover:text-white cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                  Listening History
                </h3>
              </div>

              <div className="flex flex-col gap-1.5 max-h-[360px] overflow-y-auto scrollbar-none pr-1">
                {recentlyPlayed.length === 0 ? (
                  <p className="text-xs text-white/40 py-8 text-center">No songs played yet.</p>
                ) : (
                  recentlyPlayed.map((track, idx) => (
                    <div
                      key={`${track.id}-${idx}`}
                      onClick={() => {
                        onSelectTrack?.(track, recentlyPlayed);
                        onClose();
                      }}
                      className="p-2 rounded-xl hover:bg-white/[0.06] active:scale-[0.99] flex items-center gap-2.5 cursor-pointer transition-all"
                    >
                      <SmartArtwork
                        src={track.cover}
                        title={track.title}
                        artist={track.artist}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-white/[0.08]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{track.title}</p>
                        <p className="text-[10px] text-white/50 truncate">{track.artist}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Subtle Octav Brand Mark Footer */}
          <div className="pt-4 mt-auto border-t border-white/[0.06] flex items-center justify-center opacity-40 hover:opacity-80 transition-opacity">
            <OctavLogo size={16} showWordmark={true} />
          </div>
        </div>
      </div>

      {/* Change Profile Picture Modal */}
      <AvatarUploadModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatar={currentAvatar}
        onSaveAvatar={(newAvatarUrl) => {
          setImgError(false);
          updateProfile({ avatar: newAvatarUrl });
        }}
        onShowToast={onShowToast}
      />

      {/* Octav Rewind Listening Stats & Story Card Modal */}
      <StatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        onShowToast={onShowToast}
      />
    </div>
  );
}

export default ProfileDrawer;
