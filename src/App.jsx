import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Sparkles, Mic2, Radio } from 'lucide-react';
import { LiquidGlassFilter } from './components/LiquidGlassFilter';
import { AmbientCanvas } from './components/AmbientCanvas';
import { TopFilterBar } from './components/TopFilterBar';
import { QuickJumpGrid } from './components/QuickJumpGrid';
import { HorizontalShelf } from './components/HorizontalShelf';
import { PlaylistDetailView } from './components/PlaylistDetailView';
import { MiniPlayerIsland } from './components/MiniPlayerIsland';
import { NowPlayingSheet } from './components/NowPlayingSheet';
import { FloatingTabDock } from './components/FloatingTabDock';
import { SearchView } from './components/SearchView';
import { LibraryView } from './components/LibraryView';
import { SpatialAudioModal } from './components/SpatialAudioModal';
import { ActionSheet } from './components/ActionSheet';
import { CreatePlaylistModal } from './components/CreatePlaylistModal';
import { ArtistProfileSheet } from './components/ArtistProfileSheet';
import { ProfileDrawer } from './components/ProfileDrawer';
import { HomeView } from './components/HomeView';
import { TopChartsView } from './components/TopChartsView';
import { QueueSheet } from './components/QueueSheet';
import { PracticeStudioModal } from './components/PracticeStudioModal';
import { AudioEQModal } from './components/AudioEQModal';
import { LyricsShareModal } from './components/LyricsShareModal';
import { AuthModal } from './components/AuthModal';
import { Toast } from './components/Toast';
import { useAuth } from './context/AuthContext';
import { useAudioController } from './hooks/useAudioController';
import { usePlaylists } from './hooks/usePlaylists';
import { useRegion } from './hooks/useRegion';
import { REAL_PLAYLISTS } from './data/mockTracks';
import { fetchHomeFeed } from './services/musicApi';

export function App() {
  const { user } = useAuth();
  const { region, setRegion, toggleRegion, isIndo } = useRegion();
  const audio = useAudioController(user, region);
  const playlistsManager = usePlaylists(user);

  const [activeTab, setActiveTab] = useState('home');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSpatialModalOpen, setIsSpatialModalOpen] = useState(false);
  const [homeTracks, setHomeTracks] = useState([]);

  // Artist Discography Sheet
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [isArtistSheetOpen, setIsArtistSheetOpen] = useState(false);

  // Left Profile Drawer
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);

  // Modals & Sheets
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [actionTrack, setActionTrack] = useState(null);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [isPracticeStudioOpen, setIsPracticeStudioOpen] = useState(false);
  const [isAudioEQOpen, setIsAudioEQOpen] = useState(false);
  const [isLyricsShareOpen, setIsLyricsShareOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  // Single-Instance Toast State (Strictly one toast, never loops or auto-refires)
  const [toast, setToast] = useState(null);

  // Sleep Timer State
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState(0);
  const [sleepTimerEndTime, setSleepTimerEndTime] = useState(null);
  const [sleepTimerRemainingText, setSleepTimerRemainingText] = useState(null);

  const showToast = useCallback((message) => {
    if (!message) return;
    setToast({ id: Date.now(), message });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const openActionSheet = useCallback((track) => {
    setActionTrack(track || audio.currentTrack);
    setIsActionSheetOpen(true);
  }, [audio.currentTrack]);

  const handleToggleRegion = useCallback(() => {
    toggleRegion();
    showToast(region === 'ID' ? 'Switched to Global Catalog (US)' : 'Switched to Indonesian Catalog (ID)');
  }, [region, toggleRegion, showToast]);

  const handleOpenArtist = useCallback((artist) => {
    setSelectedArtist(artist);
    setIsArtistSheetOpen(true);
  }, []);

  // Stable refs for audio controller in interval/timeout effects
  const isAudioPlayingRef = useRef(audio.isPlaying);
  isAudioPlayingRef.current = audio.isPlaying;
  const togglePlayPauseRef = useRef(audio.togglePlayPause);
  togglePlayPauseRef.current = audio.togglePlayPause;

  // Handle sleep timer setup
  const handleSetSleepTimer = useCallback((minutes) => {
    if (minutes === 0 || !minutes) {
      setSleepTimerMinutes(0);
      setSleepTimerEndTime(null);
      setSleepTimerRemainingText(null);
    } else if (minutes === 'end') {
      setSleepTimerMinutes('end');
      setSleepTimerEndTime(null);
      setSleepTimerRemainingText('End of track');
    } else {
      setSleepTimerMinutes(minutes);
      const endTime = Date.now() + minutes * 60 * 1000;
      setSleepTimerEndTime(endTime);
    }
  }, []);

  // Sleep timer countdown effect (Guarded: strictly runs on sleepTimerEndTime, no loops)
  useEffect(() => {
    if (!sleepTimerEndTime) return;

    const interval = setInterval(() => {
      const remainingMs = sleepTimerEndTime - Date.now();
      if (remainingMs <= 0) {
        clearInterval(interval);
        setSleepTimerMinutes(0);
        setSleepTimerEndTime(null);
        setSleepTimerRemainingText(null);
        if (isAudioPlayingRef.current) {
          togglePlayPauseRef.current();
        }
        showToast('Sleep timer finished: audio paused');
      } else {
        const remainingSec = Math.ceil(remainingMs / 1000);
        const mins = Math.floor(remainingSec / 60);
        const secs = remainingSec % 60;
        setSleepTimerRemainingText(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimerEndTime, showToast]);

  // Handle end-of-track sleep timer (Guarded)
  useEffect(() => {
    if (sleepTimerMinutes === 'end' && audio.duration > 0 && audio.currentTime >= audio.duration - 0.5) {
      if (isAudioPlayingRef.current) {
        togglePlayPauseRef.current();
      }
      setSleepTimerMinutes(0);
      setSleepTimerRemainingText(null);
      showToast('Track ended: audio paused');
    }
  }, [sleepTimerMinutes, audio.currentTime, audio.duration, showToast]);

  // Dynamic greeting based on current hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Real Home Feed Initialization with Region-Aware Rotation
  useEffect(() => {
    let isMounted = true;
    fetchHomeFeed(region)
      .then((tracks) => {
        if (isMounted && tracks.length > 0) {
          setHomeTracks(tracks);
        }
      })
      .catch((e) => {
        console.warn('Home feed fetch fallback:', e);
      });

    return () => {
      isMounted = false;
    };
  }, [region]);

  const handleOpenPlaylist = (playlist) => {
    setSelectedPlaylist(playlist);
  };

  const handleBackFromPlaylist = () => {
    setSelectedPlaylist(null);
  };

  const handleCreatePlaylist = (title, desc) => {
    const created = playlistsManager.createPlaylist(title, desc);
    showToast(`Created playlist "${created.title}"`);
    setSelectedPlaylist(created);
    setActiveTab('library');
  };

  // Find active playlist if custom
  const currentActivePlaylist = useMemo(() => {
    if (!selectedPlaylist) return null;
    if (selectedPlaylist.isCustom) {
      return (
        playlistsManager.customPlaylists.find((p) => p.id === selectedPlaylist.id) ||
        selectedPlaylist
      );
    }
    return selectedPlaylist;
  }, [selectedPlaylist, playlistsManager.customPlaylists]);

  return (
    <div className="w-full h-full min-h-screen bg-[#020204] flex items-center justify-center p-0 sm:p-4 overflow-hidden select-none">
      {/* Hidden Global Optical Liquid Glass Engine */}
      <LiquidGlassFilter />

      {/* Outer Desktop Canvas Ambient Aura */}
      <div className="fixed inset-0 pointer-events-none opacity-40 z-0 hidden sm:block">
        <div
          className="absolute w-[640px] h-[640px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            background: audio.currentTrack?.palette?.primary || '#104e38',
            filter: 'blur(160px)',
            opacity: 0.28,
          }}
        />
      </div>

      {/* Mobile Shell: Full viewport on mobile, locked max-w-[430px] with Sleek Device Frame on desktop */}
      <div className="relative w-full max-w-full sm:max-w-[430px] h-[100dvh] sm:h-[94dvh] max-h-none sm:max-h-[920px] bg-[#050507] sm:rounded-[52px] sm:border-[10px] sm:border-[#16161c] sm:ring-1 sm:ring-white/10 sm:shadow-[0_30px_90px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col z-10">
        {/* Dynamic Ambient Color Bleed Canvas behind UI (z-0) */}
        <AmbientCanvas currentTrack={audio.currentTrack} />

        {/* Main Content Area */}
        <div className="relative z-10 flex-1 overflow-hidden flex flex-col">
          {currentActivePlaylist ? (
            /* Playlist Detail View */
            <PlaylistDetailView
              playlist={currentActivePlaylist}
              onBack={handleBackFromPlaylist}
              currentTrack={audio.currentTrack}
              isPlaying={audio.isPlaying}
              onSelectTrack={audio.playTrack}
              onTogglePlayPause={audio.togglePlayPause}
              likedTrackIds={audio.likedTrackIds}
              onToggleLike={audio.toggleLike}
              tracks={currentActivePlaylist.tracks || homeTracks}
              onOpenActionSheet={openActionSheet}
              onDeletePlaylist={playlistsManager.deletePlaylist}
              onRemoveTrackFromPlaylist={playlistsManager.removeTrackFromPlaylist}
              onShowToast={showToast}
              onOpenArtist={handleOpenArtist}
              isShuffle={audio.isShuffle}
              onToggleShuffle={() => audio.setIsShuffle((p) => !p)}
              onUpdatePlaylistCover={playlistsManager.updatePlaylistCover}
            />
          ) : activeTab === 'charts' ? (
            /* Top Charts View */
            <TopChartsView
              region={region}
              currentTrack={audio.currentTrack}
              isPlaying={audio.isPlaying}
              likedTrackIds={audio.likedTrackIds}
              onSelectTrack={audio.playTrack}
              onTogglePlayPause={audio.togglePlayPause}
              onToggleLike={audio.toggleLike}
              onOpenActionSheet={openActionSheet}
              onOpenArtist={handleOpenArtist}
            />
          ) : activeTab === 'search' ? (
            /* Search View */
            <SearchView
              region={region}
              onToggleRegion={handleToggleRegion}
              currentTrack={audio.currentTrack}
              isPlaying={audio.isPlaying}
              likedTrackIds={audio.likedTrackIds}
              onSelectTrack={audio.playTrack}
              onToggleLike={audio.toggleLike}
              onOpenPlaylist={handleOpenPlaylist}
              onOpenActionSheet={openActionSheet}
              onOpenArtist={handleOpenArtist}
            />
          ) : activeTab === 'library' ? (
            /* Your Library View */
            <LibraryView
              playlists={[]}
              customPlaylists={playlistsManager.customPlaylists}
              likedTracks={audio.likedTracks}
              recentlyPlayed={audio.recentlyPlayed}
              currentTrack={audio.currentTrack}
              isPlaying={audio.isPlaying}
              onOpenPlaylist={handleOpenPlaylist}
              onSelectTrack={audio.playTrack}
              onOpenCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
              onProfileClick={() => setIsProfileDrawerOpen(true)}
            />
          ) : (
            /* Dynamic Personalized Home View */
            <HomeView
              region={region}
              onToggleRegion={handleToggleRegion}
              currentTrack={audio.currentTrack}
              isPlaying={audio.isPlaying}
              likedTracks={audio.likedTracks}
              recentlyPlayed={audio.recentlyPlayed}
              onSelectTrack={audio.playTrack}
              onOpenPlaylist={handleOpenPlaylist}
              onProfileClick={() => setIsProfileDrawerOpen(true)}
              onShowToast={showToast}
              onOpenArtist={handleOpenArtist}
            />
          )}
        </div>

        {/* Separation Layer: Fixed Bottom Ambient Vignette behind floating bars */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#050507] via-[#050507]/85 to-transparent z-30" />

        {/* Floating Liquid Mini-Player Island (Above Tab Dock) */}
        <MiniPlayerIsland
          currentTrack={audio.currentTrack}
          isPlaying={audio.isPlaying}
          progress={audio.progress}
          isLiked={audio.isLiked}
          onTogglePlayPause={audio.togglePlayPause}
          onToggleLike={audio.toggleLike}
          onExpandSheet={() => setIsExpanded(true)}
          onOpenSpatialAudio={() => setIsSpatialModalOpen(true)}
          onOpenQueue={() => setIsQueueOpen(true)}
        />

        {/* Bottom Floating Liquid Tab Dock */}
        <FloatingTabDock
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setSelectedPlaylist(null);
            setActiveTab(tab);
          }}
        />

        {/* iOS Home Indicator Bar */}
        <div className="relative z-40 pb-2 flex items-center justify-center pointer-events-none">
          <div className="w-32 h-1 bg-white/30 rounded-full" />
        </div>

        {/* Full-Screen "Now Playing" Sheet */}
        {audio.currentTrack && (
          <NowPlayingSheet
            isOpen={isExpanded}
            isExpanded={isExpanded}
            onClose={() => setIsExpanded(false)}
            currentTrack={audio.currentTrack}
            isPlaying={audio.isPlaying}
            currentTime={audio.currentTime}
            duration={audio.duration}
            progress={audio.progress}
            isLiked={audio.isLiked}
            isShuffle={audio.isShuffle}
            setIsShuffle={audio.setIsShuffle}
            repeatMode={audio.repeatMode}
            setRepeatMode={audio.setRepeatMode}
            onTogglePlayPause={audio.togglePlayPause}
            onNextTrack={audio.nextTrack}
            onPrevTrack={audio.prevTrack}
            onSeekTo={audio.seekTo}
            onToggleLike={audio.toggleLike}
            onOpenSpatialAudio={() => setIsSpatialModalOpen(true)}
            onOpenEQ={() => setIsAudioEQOpen(true)}
            onOpenStudio={() => setIsPracticeStudioOpen(true)}
            onOpenLyricsShare={() => setIsLyricsShareOpen(true)}
            onOpenArtist={handleOpenArtist}
            onOpenQueue={() => setIsQueueOpen(true)}
            loopA={audio.loopA}
            loopB={audio.loopB}
            onOpenActionSheet={openActionSheet}
            onShowToast={showToast}
            formatTime={audio.formatTime}
            formatRemainingTime={audio.formatRemainingTime}
            activePlaylistTitle={currentActivePlaylist?.title || "Now Playing"}
          />
        )}

        {/* Artist Profile & Discography Sheet */}
        <ArtistProfileSheet
          isOpen={isArtistSheetOpen}
          onClose={() => setIsArtistSheetOpen(false)}
          artist={selectedArtist}
          region={region}
          currentTrack={audio.currentTrack}
          isPlaying={audio.isPlaying}
          onSelectTrack={audio.playTrack}
          onTogglePlayPause={audio.togglePlayPause}
          likedTrackIds={audio.likedTrackIds}
          onToggleLike={audio.toggleLike}
          onOpenActionSheet={openActionSheet}
          onShowToast={showToast}
        />

        {/* Octav Action Sheet (Context Menu) */}
        {(actionTrack || audio.currentTrack) && (
          <ActionSheet
            isOpen={isActionSheetOpen}
            onClose={() => setIsActionSheetOpen(false)}
            track={actionTrack || audio.currentTrack}
            isLiked={actionTrack ? audio.likedTrackIds.has(actionTrack.id) : audio.isLiked}
            onToggleLike={audio.toggleLike}
            onOpenArtist={handleOpenArtist}
            onPlayNext={audio.playNextInQueue}
            onAddToPlaylist={playlistsManager.addTrackToPlaylist}
            onOpenCreatePlaylist={() => {
              setIsActionSheetOpen(false);
              setIsCreatePlaylistOpen(true);
            }}
            customPlaylists={playlistsManager.customPlaylists}
            sleepTimerRemaining={sleepTimerRemainingText}
            onSetSleepTimer={handleSetSleepTimer}
            playbackSpeed={audio.playbackSpeed}
            onChangePlaybackSpeed={audio.setPlaybackSpeed}
            onShowToast={showToast}
          />
        )}

        {/* Create Playlist Modal */}
        <CreatePlaylistModal
          isOpen={isCreatePlaylistOpen}
          onClose={() => setIsCreatePlaylistOpen(false)}
          onCreate={handleCreatePlaylist}
        />

        {/* Apple visionOS Spatial Audio & 5-Band Acoustic EQ Modal */}
        <SpatialAudioModal
          isOpen={isSpatialModalOpen}
          onClose={() => setIsSpatialModalOpen(false)}
          isPlaying={audio.isPlaying}
        />

        {/* Spotify iOS Left Profile Drawer */}
        <ProfileDrawer
          isOpen={isProfileDrawerOpen}
          onClose={() => setIsProfileDrawerOpen(false)}
          likedTracksCount={audio.likedTracks.length}
          playlistsCount={playlistsManager.customPlaylists.length}
          region={region}
          onToggleRegion={handleToggleRegion}
          recentlyPlayed={audio.recentlyPlayed}
          onSelectTrack={audio.playTrack}
          onShowToast={showToast}
          crossfadeDuration={audio.crossfadeDuration}
          onSetCrossfadeDuration={audio.setCrossfadeDuration}
          onOpenEQ={() => setIsAudioEQOpen(true)}
          onResetLibrary={() => {
            window.location.reload();
          }}
        />

        {/* Musician / Jam Practice Studio Modal */}
        <PracticeStudioModal
          isOpen={isPracticeStudioOpen}
          onClose={() => setIsPracticeStudioOpen(false)}
          currentTrack={audio.currentTrack}
          currentTime={audio.currentTime}
          duration={audio.duration}
          playbackSpeed={audio.playbackSpeed}
          onSetPlaybackSpeed={audio.setPlaybackSpeed}
          loopA={audio.loopA}
          loopB={audio.loopB}
          isLooping={audio.isLooping}
          onSetLoopA={audio.setLoopA}
          onSetLoopB={audio.setLoopB}
          onClearLoop={audio.clearLoop}
          onToggleLooping={audio.toggleLooping}
          isolatorMode={audio.isolatorMode}
          onSetIsolatorMode={audio.setIsolatorMode}
          formatTime={audio.formatTime}
          onOpenEQ={() => setIsAudioEQOpen(true)}
        />

        {/* Equalizer Modal */}
        <AudioEQModal
          isOpen={isAudioEQOpen}
          onClose={() => setIsAudioEQOpen(false)}
          onShowToast={showToast}
        />

        {/* Interactive Up Next Queue Sheet */}
        <QueueSheet
          isOpen={isQueueOpen}
          onClose={() => setIsQueueOpen(false)}
          currentTrack={audio.currentTrack}
          isPlaying={audio.isPlaying}
          queue={audio.playlistQueue}
          onSelectTrack={audio.playTrack}
          onMoveTrack={audio.moveQueueTrack}
          onRemoveTrack={audio.removeQueueTrack}
          onClearQueue={audio.clearQueue}
        />

        {/* Lyrics Story Card Generator */}
        <LyricsShareModal
          isOpen={isLyricsShareOpen}
          onClose={() => setIsLyricsShareOpen(false)}
          currentTrack={audio.currentTrack}
          onShowToast={showToast}
        />

        {/* Authentication Modal */}
        <AuthModal onShowToast={showToast} />

        {/* Single-Instance Liquid Glass Floating Toast (Strictly once, no infinite loops) */}
        <Toast toast={toast} onDismiss={dismissToast} />
      </div>
    </div>
  );
}

export default App;
