import { useState, useEffect, useRef, useCallback } from 'react';
import { REAL_INITIAL_TRACKS } from '../data/mockTracks';
import { fetchSyncedLyrics } from '../services/lyricsApi';
import { audioEqualizer } from '../services/audioEqualizer';
import {
  resolveFullAudioStream,
  fetchSmartRadioRecommendations,
  getTrackDedupeKey,
  getTrackKey,
  preResolveTrackStream,
  streamCache,
} from '../services/musicApi';
import { syncUserDataToCloud, fetchUserDataFromCloud } from '../services/supabaseClient';
import { recordTrackPlay } from '../services/statsService';

const STORAGE_KEY_LIKED = 'octav_liked_tracks';
const STORAGE_KEY_RECENT = 'octav_recent_tracks';
const STORAGE_KEY_CROSSFADE = 'octav_crossfade';
const LEGACY_STORAGE_KEY_LIKED = 'spotify_liquid_liked_tracks';
const LEGACY_STORAGE_KEY_RECENT = 'spotify_liquid_recent_tracks';
const LEGACY_STORAGE_KEY_CROSSFADE = 'spotify_liquid_crossfade';

export function useAudioController(user = null, region = 'ID') {
  const getLikedKey = () => (user?.id ? `octav_user_${user.id}_liked_tracks` : STORAGE_KEY_LIKED);
  const getLegacyLikedKey = () => (user?.id ? `vetra_user_${user.id}_liked_tracks` : LEGACY_STORAGE_KEY_LIKED);
  const getRecentKey = () => (user?.id ? `octav_user_${user.id}_recent_tracks` : STORAGE_KEY_RECENT);
  const getLegacyRecentKey = () => (user?.id ? `vetra_user_${user.id}_recent_tracks` : LEGACY_STORAGE_KEY_RECENT);

  // Load saved liked tracks - strictly empty for brand new guests
  const [likedTracks, setLikedTracks] = useState(() => {
    try {
      const key = user?.id ? `octav_user_${user.id}_liked_tracks` : STORAGE_KEY_LIKED;
      const legacyKey = user?.id ? `vetra_user_${user.id}_liked_tracks` : LEGACY_STORAGE_KEY_LIKED;
      const saved = localStorage.getItem(key) || localStorage.getItem(legacyKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to read liked tracks from storage:', e);
    }
    return [];
  });

  // Load saved recently played - strictly empty for brand new guests
  const [recentlyPlayed, setRecentlyPlayed] = useState(() => {
    try {
      const key = user?.id ? `octav_user_${user.id}_recent_tracks` : STORAGE_KEY_RECENT;
      const legacyKey = user?.id ? `vetra_user_${user.id}_recent_tracks` : LEGACY_STORAGE_KEY_RECENT;
      const saved = localStorage.getItem(key) || localStorage.getItem(legacyKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to read recent tracks from storage:', e);
    }
    return [];
  });

  const isLikedHydratedRef = useRef(false);

  // Re-sync liked tracks and recently played when user changes (Login / Logout / Switch)
  useEffect(() => {
    isLikedHydratedRef.current = false;
    let isCancelled = false;
    const lKey = getLikedKey();
    const legLKey = getLegacyLikedKey();
    const rKey = getRecentKey();
    const legRKey = getLegacyRecentKey();

    let localLiked = [];
    try {
      const savedLiked = localStorage.getItem(lKey) || localStorage.getItem(legLKey);
      if (savedLiked) {
        const parsed = JSON.parse(savedLiked);
        if (Array.isArray(parsed)) {
          localLiked = parsed;
          setLikedTracks(localLiked);
        }
      } else if (!user) {
        setLikedTracks([]);
      }

      const savedRecent = localStorage.getItem(rKey) || localStorage.getItem(legRKey);
      if (savedRecent) {
        const parsed = JSON.parse(savedRecent);
        if (Array.isArray(parsed)) setRecentlyPlayed(parsed);
      }
    } catch (e) {}

    // Cloud hydration for liked tracks across devices
    async function hydrateLikedFromCloud() {
      if (!user?.id) {
        isLikedHydratedRef.current = true;
        return;
      }

      try {
        let cloudLiked = user.cloudLibrary?.likedTracks || null;
        if (!cloudLiked && user.isSupabase) {
          const cloudData = await fetchUserDataFromCloud();
          if (cloudData?.likedTracks) {
            cloudLiked = cloudData.likedTracks;
          }
        }

        if (isCancelled) return;

        if (Array.isArray(cloudLiked) && cloudLiked.length > 0) {
          const map = new Map();
          localLiked.forEach((t) => map.set(t.id, t));
          cloudLiked.forEach((t) => {
            if (!map.has(t.id)) map.set(t.id, t);
          });
          const merged = Array.from(map.values());
          setLikedTracks(merged);
          try {
            localStorage.setItem(lKey, JSON.stringify(merged));
          } catch {}
        }
      } catch (err) {
        console.warn('Liked tracks cloud hydration note:', err);
      } finally {
        if (!isCancelled) {
          isLikedHydratedRef.current = true;
        }
      }
    }

    hydrateLikedFromCloud();

    return () => {
      isCancelled = true;
    };
  }, [user?.id]);

  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off' | 'all' | 'one'
  const [playbackSpeed, setPlaybackSpeedState] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [playlistQueue, setPlaylistQueue] = useState([]);

  // A-B Looper State
  const [loopA, setLoopAState] = useState(null);
  const [loopB, setLoopBState] = useState(null);
  const [isLooping, setIsLooping] = useState(false);

  // Crossfade Setting (0 = Off, 2, 4, 6 seconds)
  const [crossfadeDuration, setCrossfadeDurationState] = useState(() => {
    try {
      const val = Number(localStorage.getItem(STORAGE_KEY_CROSSFADE));
      return isNaN(val) ? 0 : val;
    } catch {
      return 0;
    }
  });

  // Isolator mode state (normal | guitarFocus | backingTrack | bassPunch)
  const [isolatorMode, setIsolatorModeState] = useState('normal');

  const audioRef = useRef(null);
  const loopRef = useRef({ loopA, loopB, isLooping });
  loopRef.current = { loopA, loopB, isLooping };

  // Sync liked tracks to localStorage and Supabase Cloud
  useEffect(() => {
    try {
      const key = getLikedKey();
      localStorage.setItem(key, JSON.stringify(likedTracks));
      if (isLikedHydratedRef.current && user?.id && user?.isSupabase) {
        syncUserDataToCloud({ likedTracks });
      }
    } catch (e) {
      console.warn('Failed to persist liked tracks:', e);
    }
  }, [likedTracks, user?.id, user?.isSupabase]);

  // Sync recently played to localStorage
  useEffect(() => {
    try {
      const key = getRecentKey();
      localStorage.setItem(key, JSON.stringify(recentlyPlayed));
    } catch (e) {
      console.warn('Failed to persist recent tracks:', e);
    }
  }, [recentlyPlayed, user?.id]);

  // Sync crossfade to localStorage
  const setCrossfadeDuration = useCallback((val) => {
    const num = Number(val) || 0;
    setCrossfadeDurationState(num);
    try {
      localStorage.setItem(STORAGE_KEY_CROSSFADE, num.toString());
    } catch (e) {
      console.warn('Failed saving crossfade:', e);
    }
  }, []);

  // Session-played memory to prevent repeating recently played songs in Infinite Radio
  const playedHistoryRef = useRef([]); // Stores last 40 played tracks FIFO: [{ id, title, artist, key, dedupeKey }]
  const sessionPlayedRef = useRef(new Set());
  const isFetchingRadioRef = useRef(false);
  const isFinitePlaylistRef = useRef(false);
  const handleNextTrackRef = useRef();
  const playTrackRef = useRef();
  const togglePlayPauseRef = useRef();
  const handlePrevTrackRef = useRef();
  const seekToRef = useRef();
  const isManualPauseRef = useRef(false);

  const currentTrackRef = useRef(currentTrack);
  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  const playlistQueueRef = useRef(playlistQueue);
  useEffect(() => {
    playlistQueueRef.current = playlistQueue;
  }, [playlistQueue]);

  const isShuffleRef = useRef(isShuffle);
  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const repeatModeRef = useRef(repeatMode);
  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  const volumeRef = useRef(volume);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const crossfadeDurationRef = useRef(crossfadeDuration);
  useEffect(() => {
    crossfadeDurationRef.current = crossfadeDuration;
  }, [crossfadeDuration]);

  const playbackSpeedRef = useRef(playbackSpeed);
  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  // Derived set of liked track IDs
  const likedTrackIds = new Set(likedTracks.map((t) => t.id));
  const isLiked = currentTrack ? likedTrackIds.has(currentTrack.id) : false;

  // Ahead-of-time stream pre-resolution for upcoming tracks in queue (Zero stutter, instant iOS transition)
  useEffect(() => {
    if (!currentTrack || !playlistQueue || playlistQueue.length === 0) return;
    const currIdx = playlistQueue.findIndex((t) => t.id === currentTrack.id);
    const startIdx = currIdx >= 0 ? currIdx + 1 : 0;
    const upcoming = playlistQueue.slice(startIdx, startIdx + 4);

    upcoming.forEach((track) => {
      if (
        track &&
        (!track.resolvedStreamUrl ||
          !track.audioUrl ||
          track.audioUrl.includes('itunes.apple.com') ||
          track.audioUrl.includes('mzstatic') ||
          track.audioUrl.includes('AudioPreview'))
      ) {
        resolveFullAudioStream(track)
          .then((resolvedUrl) => {
            if (
              resolvedUrl &&
              !resolvedUrl.includes('itunes.apple.com') &&
              !resolvedUrl.includes('mzstatic') &&
              !resolvedUrl.includes('AudioPreview')
            ) {
              track.audioUrl = resolvedUrl;
              track.resolvedStreamUrl = resolvedUrl;
              setPlaylistQueue((prev) =>
                prev.map((t) =>
                  t.id === track.id ? { ...t, audioUrl: resolvedUrl, resolvedStreamUrl: resolvedUrl } : t
                )
              );
            }
          })
          .catch(() => {});
      }
    });
  }, [currentTrack?.id, playlistQueue.length]);

  // Initialize HTML5 Audio Element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume = volume;
    audio.playbackRate = playbackSpeed;

    // Pitch Locking on HTML5 Audio Element
    audio.preservesPitch = true;
    audio.mozPreservesPitch = true;
    audio.webkitPreservesPitch = true;

    // Critical iOS Safari requirements for lockscreen & background playback
    audio.playsInline = true;
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');

    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      // True Track Duration from Full Audio Stream (guard against 30s preview metadata overwriting)
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 35) {
        setDuration(Math.floor(audio.duration));
      } else if (currentTrackRef.current?.duration) {
        setDuration(currentTrackRef.current.duration);
      }
      setIsLoading(false);
      audio.playbackRate = playbackSpeedRef.current || 1.0;

      if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        try {
          navigator.mediaSession.setPositionState({
            duration: Math.max(0, audio.duration),
            playbackRate: audio.playbackRate || 1.0,
            position: Math.min(Math.max(0, audio.currentTime || 0), audio.duration),
          });
        } catch (e) {}
      }
    };

    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    // Direct native timeupdate handler
    const handleTimeUpdate = () => {
      if (audio.currentTime != null && !isNaN(audio.currentTime)) {
        const cur = audio.currentTime;
        setCurrentTime(cur);

        // A-B Looper boundary check
        const { loopA, loopB, isLooping } = loopRef.current;
        if (isLooping && loopA !== null && loopB !== null && cur >= loopB) {
          audio.currentTime = loopA;
          setCurrentTime(loopA);
          return;
        }

        const crossfade = crossfadeDurationRef.current || 0;
        const curVol = volumeRef.current || 1.0;

        // Smooth Crossfade volume fade-out near track end (only when visible to avoid throttled background timers)
        if (crossfade > 0 && audio.duration > 0 && !document.hidden) {
          const timeLeft = audio.duration - cur;
          if (timeLeft <= crossfade && timeLeft > 0) {
            const factor = Math.max(0, timeLeft / crossfade);
            audio.volume = factor * curVol;
          } else {
            audio.volume = curVol;
          }
        }

        // Proactively pre-resolve upcoming track in the queue when nearing end (<30s)
        if (audio.duration > 35 && audio.duration - cur < 30) {
          const curQueue = playlistQueueRef.current || [];
          const cTrack = currentTrackRef.current;
          const curIdx = curQueue.findIndex((t) => t.id === cTrack?.id);
          if (curIdx !== -1 && curIdx + 1 < curQueue.length) {
            preResolveTrackStream(curQueue[curIdx + 1]).catch(() => {});
          }
        }
      }
    };

    const handleEnded = () => {
      if (repeatModeRef.current === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        handleNextTrackRef.current?.(true);
      }
    };

    const handlePause = () => {
      if (isManualPauseRef.current) {
        isManualPauseRef.current = false;
        return;
      }
      // Do not auto-recover if at the end of the track or ended
      if (audio.ended || (audio.duration > 0 && Math.abs(audio.currentTime - audio.duration) < 0.8)) {
        return;
      }
      // Auto-recover if iOS paused audio unexpectedly in the background while state is active
      if (isPlayingRef.current && audio.currentTime > 0) {
        audio.play().catch(() => {
          setIsPlaying(false);
        });
      }
    };

    const handleError = () => {
      console.warn('Audio playback error encountered on stream URL:', audio.src);
      setIsLoading(false);
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  // Play / Pause Toggle
  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    const cur = currentTrackRef.current || currentTrack;
    if (!audio || !cur) return;

    audioEqualizer.resume();

    // If audio is in error, has no src, or failed: force re-resolve and reload!
    if (!audio.src || audio.error) {
      playTrackRef.current?.(cur, undefined, false);
      return;
    }

    if (isPlaying) {
      isManualPauseRef.current = true;
      audio.pause();
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    } else {
      isManualPauseRef.current = false;
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'playing';
          }
        })
        .catch((err) => {
          console.warn('Playback failed:', err);
          // Try full re-resolution on play failure!
          playTrackRef.current?.(cur, undefined, false);
        });
    }
  }, [isPlaying, currentTrack]);
  togglePlayPauseRef.current = togglePlayPause;

  // Compute session blacklist: current track + last 40 played tracks FIFO + all tracks sitting in queue
  const getSessionPlayedKeys = useCallback(() => {
    const keys = new Set();
    if (currentTrack) {
      if (currentTrack.id) keys.add(currentTrack.id);
      keys.add(getTrackKey(currentTrack));
      keys.add(getTrackDedupeKey(currentTrack));
    }
    playedHistoryRef.current.forEach((t) => {
      if (t.id) keys.add(t.id);
      if (t.key) keys.add(t.key);
      if (t.dedupeKey) keys.add(t.dedupeKey);
    });
    playlistQueue.forEach((t) => {
      if (t.id) keys.add(t.id);
      keys.add(getTrackKey(t));
      keys.add(getTrackDedupeKey(t));
    });
    sessionPlayedRef.current.forEach((k) => keys.add(k));
    return keys;
  }, [currentTrack, playlistQueue]);

  // Smart Auto-Queue (Infinite Non-Repeating Radio Engine):
  // When approaching or reaching end of queue, fetch curated peer tracks and append automatically
  const triggerAutoQueue = useCallback(
    async (seed = currentTrack, autoPlayNext = false) => {
      // NEVER append recommendations into user playlists, albums, or finite queues!
      if (isFinitePlaylistRef.current) return;
      if (isFetchingRadioRef.current || !seed) return;
      isFetchingRadioRef.current = true;
      try {
        const blacklist = getSessionPlayedKeys();
        const recs = await fetchSmartRadioRecommendations(seed, blacklist, region || 'ID');
        if (recs && recs.length > 0) {
          let newlyAppended = [];
          setPlaylistQueue((prev) => {
            const existingIds = new Set(prev.map((t) => t.id));
            const existingKeys = new Set(prev.map((t) => getTrackKey(t)));
            const existingDedupes = new Set(prev.map((t) => getTrackDedupeKey(t)));
            const fresh = recs.filter(
              (t) =>
                !existingIds.has(t.id) &&
                !existingKeys.has(getTrackKey(t)) &&
                !existingDedupes.has(getTrackDedupeKey(t))
            );
            newlyAppended = fresh;
            return fresh.length > 0 ? [...prev, ...fresh] : prev;
          });

          // If autoPlayNext requested (queue ended without repeat), seamlessly start next recommendation
          if (autoPlayNext && newlyAppended.length > 0) {
            playTrackRef.current?.(newlyAppended[0], undefined, true);
          }
        } else if (autoPlayNext) {
          setIsLoading(false);
          setIsPlaying(false);
        }
      } catch (e) {
        console.warn('Smart Auto-Queue fetch error:', e);
        if (autoPlayNext) {
          setIsLoading(false);
          setIsPlaying(false);
        }
      } finally {
        isFetchingRadioRef.current = false;
      }
    },
    [currentTrack, getSessionPlayedKeys, region]
  );

  // Play specific track by object (100% Full Streams, Zero Cutoff)
  const playTrack = useCallback(
    async (track, queue, fromEnded = false) => {
      if (!track) return;
      const audio = audioRef.current;

      // If clicked track is ALREADY current track, toggle play/pause instead of restarting!
      if (
        !fromEnded &&
        currentTrack &&
        (currentTrack.id === track.id ||
          (currentTrack.title?.toLowerCase() === track.title?.toLowerCase() &&
            currentTrack.artist?.toLowerCase() === track.artist?.toLowerCase()))
      ) {
        // If audio has error, has no src, or is stalled: DON'T just toggle, re-fetch stream!
        if (!audio || !audio.src || audio.error || !isPlayingRef.current) {
          // Re-resolve stream below!
        } else {
          togglePlayPause();
          return;
        }
      }

      // 1. Immediately update active track info and UI state
      setCurrentTrack(track);
      setIsPlaying(true);
      setIsLoading(true); // Buffering spinner indicator while stream resolves
      setCurrentTime(0);
      setDuration(track.duration || 210);

      // Reset A-B looper on new track
      setLoopAState(null);
      setLoopBState(null);
      setIsLooping(false);

      if (queue && Array.isArray(queue) && queue.length > 0) {
        setPlaylistQueue(queue);
        isFinitePlaylistRef.current = queue.length > 1;
      }

      // Track session play history (last 40 played tracks FIFO + normalized keys)
      const tKey = getTrackKey(track);
      const dKey = getTrackDedupeKey(track);
      sessionPlayedRef.current.add(track.id);
      sessionPlayedRef.current.add(tKey);
      sessionPlayedRef.current.add(dKey);

      playedHistoryRef.current = [
        { id: track.id, title: track.title, artist: track.artist, key: tKey, dedupeKey: dKey },
        ...playedHistoryRef.current.filter((item) => item.id !== track.id && item.key !== tKey),
      ].slice(0, 40);

      // Add to recently played (deduplicated)
      setRecentlyPlayed((prev) => {
        const filtered = prev.filter((t) => t.id !== track.id);
        return [track, ...filtered].slice(0, 25);
      });

      recordTrackPlay(track, 45, user?.id);

      // Fetch real synced lyrics from LRCLIB concurrently
      fetchSyncedLyrics(
        track.artist,
        track.title,
        track.duration || 210
      )
        .then(({ syncedLyrics, plainLyrics }) => {
          setCurrentTrack((prev) =>
            prev.id === track.id
              ? {
                  ...prev,
                  lyrics: syncedLyrics || [],
                  plainLyrics: plainLyrics || null,
                }
              : prev
          );
        })
        .catch(() => {});

      // Check if upcoming queue needs proactive replenishment (< 3 remaining) ONLY if NOT a finite playlist
      const effectiveQueue = queue && Array.isArray(queue) && queue.length > 0 ? queue : playlistQueue;
      const currentIdx = effectiveQueue.findIndex((t) => t.id === track.id);
      if (!isFinitePlaylistRef.current && currentIdx !== -1 && effectiveQueue.length - (currentIdx + 1) < 3) {
        triggerAutoQueue(track, false);
      }

      // Proactively pre-resolve the NEXT track in queue right now so it's ready ahead of time!
      const nextIdx = currentIdx !== -1 ? currentIdx + 1 : -1;
      if (nextIdx !== -1 && nextIdx < effectiveQueue.length) {
        preResolveTrackStream(effectiveQueue[nextIdx]).catch(() => {});
      }

      // Retrieve instant full-length stream URL from cache or resolvedStreamUrl
      const cachedFullStream = streamCache.get(tKey);
      let targetStreamUrl =
        cachedFullStream ||
        track.resolvedStreamUrl ||
        (track.audioUrl &&
        !track.audioUrl.includes('itunes.apple.com') &&
        !track.audioUrl.includes('mzstatic') &&
        !track.audioUrl.includes('AudioPreview')
          ? track.audioUrl
          : '');

      audioEqualizer.resume();

      try {
        if (!targetStreamUrl) {
          // Fast-race resolution (max 2200ms) to ensure single atomic source assignment
          const resolved = await Promise.race([
            resolveFullAudioStream(track),
            new Promise((res) => setTimeout(() => res(''), 2200)),
          ]);
          if (
            resolved &&
            !resolved.includes('itunes.apple.com') &&
            !resolved.includes('mzstatic') &&
            !resolved.includes('AudioPreview')
          ) {
            targetStreamUrl = resolved;
          }
        }

        const finalUrl = targetStreamUrl || track.audioUrl || track.previewUrl || '';

        if (audio && finalUrl) {
          if (audio.src !== finalUrl) {
            audio.src = finalUrl;
            audio.playbackRate = playbackSpeedRef.current || 1.0;
            audio.currentTime = 0;

            const curVol = volumeRef.current || 1.0;
            const crossfade = crossfadeDurationRef.current || 0;

            // Only run gradual fade-in when document is visible; in background/doze mode on Android, timers are throttled!
            if (crossfade > 0 && !document.hidden) {
              audio.volume = 0;
              audio
                .play()
                .then(() => {
                  setIsPlaying(true);
                  setIsLoading(false);
                  let step = 0;
                  const totalSteps = 15;
                  const stepMs = 100;
                  const timer = setInterval(() => {
                    step++;
                    if (audioRef.current && step <= totalSteps) {
                      audioRef.current.volume = Math.min(curVol, (step / totalSteps) * curVol);
                    } else {
                      clearInterval(timer);
                      if (audioRef.current) audioRef.current.volume = curVol;
                    }
                  }, stepMs);
                })
                .catch((err) => {
                  console.warn('Playback error:', err);
                  setIsLoading(false);
                });
            } else {
              audio.volume = curVol;
              audio
                .play()
                .then(() => {
                  setIsPlaying(true);
                  setIsLoading(false);
                })
                .catch((err) => {
                  console.warn('Playback error:', err);
                  setIsLoading(false);
                });
            }
          } else {
            setIsPlaying(true);
            setIsLoading(false);
          }
        }

        setCurrentTrack((prev) => (prev?.id === track.id ? { ...prev, audioUrl: finalUrl } : prev));
      } catch (err) {
        console.warn('Stream resolution error:', err);
        setIsLoading(false);
      }
    },
    [playbackSpeed, volume, playlistQueue, user?.id, triggerAutoQueue, crossfadeDuration, togglePlayPause, currentTrack]
  );
  playTrackRef.current = playTrack;

  // Next Track with Smart Auto-Queue trigger
  const handleNextTrack = useCallback(
    (fromEnded = false) => {
      const curTrack = currentTrackRef.current || currentTrack;
      if (!curTrack) return;
      const liveQueue = playlistQueueRef.current || playlistQueue;
      const queue = liveQueue.length > 0 ? liveQueue : [curTrack];
      const currentIndex = queue.findIndex((t) => t.id === curTrack.id);
      const shuffle = isShuffleRef.current;
      const repMode = repeatModeRef.current;

      // Shuffle mode
      if (shuffle) {
        const remaining = queue.filter((t, idx) => idx > currentIndex);
        if (remaining.length > 0) {
          const next = remaining[Math.floor(Math.random() * remaining.length)];
          playTrack(next, undefined, fromEnded);
          if (!isFinitePlaylistRef.current && remaining.length < 3) {
            triggerAutoQueue(next, false);
          }
        } else if (repMode === 'all' || isFinitePlaylistRef.current) {
          const randomTrack = queue[Math.floor(Math.random() * queue.length)];
          playTrack(randomTrack, undefined, fromEnded);
        } else {
          // End of shuffle queue without repeat: NEVER loop back to 0.
          // Trigger Infinite Radio and auto-play the next recommendation!
          triggerAutoQueue(curTrack, true);
        }
        return;
      }

      // Normal Sequential Progression
      if (currentIndex >= 0 && currentIndex < queue.length - 1) {
        const nextSong = queue[currentIndex + 1];
        playTrack(nextSong, undefined, fromEnded);

        // Proactively replenish if fewer than 3 upcoming tracks left (only in radio mode)
        if (!isFinitePlaylistRef.current && queue.length - (currentIndex + 2) < 3) {
          triggerAutoQueue(nextSong, false);
        }
      } else if (repMode === 'all' || isFinitePlaylistRef.current || (queue.length > 1 && !shuffle)) {
        // User turned on repeat all, or reached end of user playlist/album:
        // Seamlessly loop back to start so playlist never abruptly halts into silence!
        playTrack(queue[0], undefined, fromEnded);
      } else {
        // Reached end of queue without repeat in radio mode!
        // Advance forward into newly fetched Auto-Play recommendations!
        triggerAutoQueue(curTrack, true);
      }
    },
    [playlistQueue, currentTrack, playTrack, triggerAutoQueue]
  );
  handleNextTrackRef.current = handleNextTrack;

  // Insert track as next in queue
  const playNextInQueue = useCallback((track) => {
    if (!track) return;
    setPlaylistQueue((prev) => {
      const filtered = prev.filter((t) => t.id !== track.id);
      const currIdx = currentTrack ? filtered.findIndex((t) => t.id === currentTrack.id) : -1;
      if (currIdx === -1) {
        return currentTrack ? [currentTrack, track, ...filtered] : [track, ...filtered];
      }
      const updated = [...filtered];
      updated.splice(currIdx + 1, 0, track);
      return updated;
    });
  }, [currentTrack]);

  const moveQueueTrack = useCallback((fromIndex, toIndex) => {
    setPlaylistQueue((prev) => {
      if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length) {
        return prev;
      }
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  }, []);

  const removeQueueTrack = useCallback((trackId) => {
    setPlaylistQueue((prev) => prev.filter((t) => t.id !== trackId));
  }, []);

  const clearQueue = useCallback(() => {
    setPlaylistQueue((prev) => prev.filter((t) => t.id === currentTrack?.id));
  }, [currentTrack?.id]);

  // Previous Track
  const handlePrevTrack = useCallback(() => {
    const audio = audioRef.current;
    if (!currentTrack) return;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    const queue = playlistQueue.length > 0 ? playlistQueue : [currentTrack];
    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    const prevTrack = queue[prevIndex] || queue[0];
    if (prevTrack) playTrack(prevTrack);
  }, [playlistQueue, currentTrack, playTrack]);
  handlePrevTrackRef.current = handlePrevTrack;

  // Seek
  const seekTo = useCallback(
    (seconds) => {
      const audio = audioRef.current;
      if (audio) {
        const clamped = Math.max(0, Math.min(seconds, audio.duration || duration));
        audio.currentTime = clamped;
        setCurrentTime(clamped);
      }
    },
    [duration]
  );
  seekToRef.current = seekTo;

  // Playback Speed with Strict Pitch-Locking
  const setPlaybackSpeed = useCallback((speed) => {
    const val = Number(speed) || 1.0;
    setPlaybackSpeedState(val);
    if (audioRef.current) {
      audioRef.current.preservesPitch = true;
      audioRef.current.mozPreservesPitch = true;
      audioRef.current.webkitPreservesPitch = true;
      audioRef.current.playbackRate = val;
    }
  }, []);

  // A-B Looper Controls
  const setLoopA = useCallback((time) => {
    const target = time !== undefined ? time : (audioRef.current?.currentTime || 0);
    setLoopAState(Math.floor(target * 10) / 10);
    setIsLooping(true);
  }, []);

  const setLoopB = useCallback((time) => {
    const target = time !== undefined ? time : (audioRef.current?.currentTime || 0);
    setLoopBState(Math.floor(target * 10) / 10);
    setIsLooping(true);
  }, []);

  const clearLoop = useCallback(() => {
    setLoopAState(null);
    setLoopBState(null);
    setIsLooping(false);
  }, []);

  const toggleLooping = useCallback(() => {
    setIsLooping((prev) => !prev);
  }, []);

  // Web Audio Isolator Mode Switcher
  const setIsolatorMode = useCallback((mode) => {
    setIsolatorModeState(mode);
    audioEqualizer.setIsolatorMode(mode);
  }, []);

  // Volume
  const setVolume = useCallback((val) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
      audioRef.current.muted = clamped === 0;
    }
    setIsMuted(clamped === 0);
  }, []);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      if (audioRef.current) audioRef.current.volume = volume || 0.8;
    } else {
      setIsMuted(true);
      if (audioRef.current) audioRef.current.volume = 0;
    }
  }, [isMuted, volume]);

  // Toggle Like with Full Track Object Persistence
  const toggleLike = useCallback(
    (trackOrId) => {
      const targetTrack =
        typeof trackOrId === 'object'
          ? trackOrId
          : currentTrack?.id === trackOrId
          ? currentTrack
          : REAL_INITIAL_TRACKS.find((t) => t.id === trackOrId) || {
              id: trackOrId,
              title: 'Liked Track',
            };

      setLikedTracks((prev) => {
        const exists = prev.some((t) => t.id === targetTrack.id);
        if (exists) {
          return prev.filter((t) => t.id !== targetTrack.id);
        } else {
          return [targetTrack, ...prev];
        }
      });
    },
    [currentTrack]
  );

  // Time formatters
  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatRemainingTime = (current, total) => {
    const remaining = Math.max(0, (total || 0) - (current || 0));
    return `-${formatTime(remaining)}`;
  };

  // Native Lockscreen Controls via MediaSession API (iOS & Android System Media Center)
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    try {
      const coverUrl = currentTrack.cover || '';
      const artworkList = coverUrl
        ? [
            { src: coverUrl, sizes: '96x96', type: 'image/jpeg' },
            { src: coverUrl, sizes: '128x128', type: 'image/jpeg' },
            { src: coverUrl, sizes: '192x192', type: 'image/jpeg' },
            { src: coverUrl, sizes: '256x256', type: 'image/jpeg' },
            { src: coverUrl, sizes: '384x384', type: 'image/jpeg' },
            { src: coverUrl, sizes: '512x512', type: 'image/jpeg' },
          ]
        : [];

      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentTrack.title || 'Unknown Track',
        artist: currentTrack.artist || 'Unknown Artist',
        album: currentTrack.album || 'Octav',
        artwork: artworkList,
      });

      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      if ('setPositionState' in navigator.mediaSession && duration > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: Math.max(0, duration),
            playbackRate: playbackSpeedRef.current || 1.0,
            position: Math.min(Math.max(0, currentTime || 0), duration),
          });
        } catch (e) {}
      }
    } catch (e) {
      console.warn('MediaSession metadata error:', e);
    }
  }, [currentTrack, isPlaying, duration]);

  // Persistent MediaSession action handlers (registered once on mount for iOS & Android lockscreen resilience)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.setActionHandler('play', () => {
        togglePlayPauseRef.current?.();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        togglePlayPauseRef.current?.();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        handlePrevTrackRef.current?.();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        handleNextTrackRef.current?.(false);
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime != null) {
          seekToRef.current?.(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skip = details.seekOffset || 10;
        const cur = audioRef.current?.currentTime || 0;
        seekToRef.current?.(Math.max(0, cur - skip));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skip = details.seekOffset || 10;
        const cur = audioRef.current?.currentTime || 0;
        const dur = audioRef.current?.duration || 0;
        seekToRef.current?.(Math.min(dur, cur + skip));
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        isManualPauseRef.current = true;
        audioRef.current?.pause();
        setIsPlaying(false);
      });
    } catch (e) {
      console.warn('MediaSession handler registration error:', e);
    }
  }, []);

  return {
    currentTrack,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    progress: duration > 0 ? currentTime / duration : 0,
    volume,
    isMuted,
    isShuffle,
    setIsShuffle,
    repeatMode,
    setRepeatMode,
    playbackSpeed,
    setPlaybackSpeed,
    playlistQueue,
    moveQueueTrack,
    removeQueueTrack,
    clearQueue,
    isLiked,
    likedTracks,
    likedTrackIds,
    recentlyPlayed,
    togglePlayPause,
    playTrack,
    playNextInQueue,
    nextTrack: handleNextTrack,
    prevTrack: handlePrevTrack,
    seekTo,
    setVolume,
    toggleMute,
    toggleLike,
    formatTime,
    formatRemainingTime,

    // Jam Studio Looper & Isolators
    loopA,
    loopB,
    isLooping,
    setLoopA,
    setLoopB,
    clearLoop,
    toggleLooping,
    isolatorMode,
    setIsolatorMode,

    // Crossfade & Auto-queue
    crossfadeDuration,
    setCrossfadeDuration,
    triggerAutoQueue,
  };
}
