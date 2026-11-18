import { useState, useEffect, useCallback, useRef } from 'react';
import { syncUserDataToCloud, fetchUserDataFromCloud } from '../services/supabaseClient';

const STORAGE_KEY_PLAYLISTS = 'octav_guest_custom_playlists';
const LEGACY_STORAGE_KEY_PLAYLISTS = 'spotify_liquid_custom_playlists';

export function usePlaylists(user = null) {
  const getStorageKey = () => (user?.id ? `octav_user_${user.id}_custom_playlists` : STORAGE_KEY_PLAYLISTS);
  const getLegacyStorageKey = () => (user?.id ? `vetra_user_${user.id}_custom_playlists` : LEGACY_STORAGE_KEY_PLAYLISTS);

  const isHydratedRef = useRef(false);

  const [customPlaylists, setCustomPlaylists] = useState(() => {
    try {
      const key = user?.id ? `octav_user_${user.id}_custom_playlists` : STORAGE_KEY_PLAYLISTS;
      const legacyKey = user?.id ? `vetra_user_${user.id}_custom_playlists` : LEGACY_STORAGE_KEY_PLAYLISTS;
      const saved = localStorage.getItem(key) || (legacyKey ? localStorage.getItem(legacyKey) : null);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out legacy dummy "Roadtrip Rockers" if it was empty mock
          const cleaned = parsed.filter((p) => p.id !== 'custom-favorites');
          return cleaned;
        }
      }
    } catch (e) {
      console.warn('Failed to load custom playlists from localStorage:', e);
    }
    return [];
  });

  // Re-load playlists when active user changes & Hydrate from Supabase Cloud
  useEffect(() => {
    isHydratedRef.current = false;
    let isCancelled = false;
    const key = getStorageKey();
    const legacyKey = getLegacyStorageKey();

    let localPlaylists = [];
    try {
      const saved = localStorage.getItem(key) || (legacyKey ? localStorage.getItem(legacyKey) : null);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          localPlaylists = parsed.filter((p) => p.id !== 'custom-favorites');
          setCustomPlaylists(localPlaylists);
        }
      } else if (!user) {
        setCustomPlaylists([]);
      }
    } catch (e) {}

    // Cross-Device Sync Hydration: Fetch Cloud Library on new login/device
    async function hydrateFromCloud() {
      if (!user?.id) {
        isHydratedRef.current = true;
        return;
      }

      try {
        let cloudPlaylists = user.cloudLibrary?.customPlaylists || null;
        if (!cloudPlaylists && user.isSupabase) {
          const cloudData = await fetchUserDataFromCloud();
          if (cloudData?.customPlaylists) {
            cloudPlaylists = cloudData.customPlaylists;
          }
        }

        if (isCancelled) return;

        if (Array.isArray(cloudPlaylists) && cloudPlaylists.length > 0) {
          const playlistMap = new Map();
          // Seed with local playlists
          localPlaylists.forEach((p) => playlistMap.set(p.id, p));

          // Merge cloud playlists (cloud playlists take precedence if they have more tracks)
          cloudPlaylists.forEach((cp) => {
            if (!playlistMap.has(cp.id)) {
              playlistMap.set(cp.id, cp);
            } else {
              const existing = playlistMap.get(cp.id);
              if ((cp.tracks?.length || 0) >= (existing.tracks?.length || 0)) {
                playlistMap.set(cp.id, { ...existing, ...cp });
              }
            }
          });

          const merged = Array.from(playlistMap.values());
          setCustomPlaylists(merged);
          try {
            localStorage.setItem(key, JSON.stringify(merged));
          } catch {}
        }
      } catch (err) {
        console.warn('Playlists cloud hydration note:', err);
      } finally {
        if (!isCancelled) {
          isHydratedRef.current = true;
        }
      }
    }

    hydrateFromCloud();

    return () => {
      isCancelled = true;
    };
  }, [user?.id]);

  // Sync to scoped localStorage and Supabase Cloud
  useEffect(() => {
    try {
      const key = getStorageKey();
      localStorage.setItem(key, JSON.stringify(customPlaylists));

      // Guard: Only sync to Cloud after initial hydration has finished
      // This prevents a newly mounted empty state from overwriting cloud playlists
      if (isHydratedRef.current && user?.id && user?.isSupabase) {
        syncUserDataToCloud({ customPlaylists });
      }
    } catch (e) {
      console.warn('Failed to persist custom playlists:', e);
    }
  }, [customPlaylists, user?.id, user?.isSupabase]);

  const createPlaylist = useCallback((title, description = '') => {
    const trimmedTitle = (title || 'New Playlist').trim();
    const newPlaylist = {
      id: `custom-pl-${Date.now()}`,
      title: trimmedTitle || 'My Playlist',
      description: description.trim() || 'Curated on Octav',
      curator: 'You',
      isCustom: true,
      tracks: [],
      createdAt: Date.now(),
    };

    setCustomPlaylists((prev) => [newPlaylist, ...prev]);
    return newPlaylist;
  }, []);

  const deletePlaylist = useCallback((playlistId) => {
    setCustomPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
  }, []);

  const renamePlaylist = useCallback((playlistId, newTitle, newDescription) => {
    setCustomPlaylists((prev) =>
      prev.map((p) =>
        p.id === playlistId
          ? {
              ...p,
              title: newTitle.trim() || p.title,
              description: newDescription !== undefined ? newDescription.trim() : p.description,
            }
          : p
      )
    );
  }, []);

  const addTrackToPlaylist = useCallback((playlistId, track) => {
    if (!track) return false;
    let added = false;

    setCustomPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === playlistId) {
          const exists = p.tracks.some((t) => t.id === track.id);
          if (!exists) {
            added = true;
            return {
              ...p,
              tracks: [track, ...p.tracks],
            };
          }
        }
        return p;
      })
    );

    return added;
  }, []);

  const removeTrackFromPlaylist = useCallback((playlistId, trackId) => {
    setCustomPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === playlistId) {
          return {
            ...p,
            tracks: p.tracks.filter((t) => t.id !== trackId),
          };
        }
        return p;
      })
    );
  }, []);

  const updatePlaylistCover = useCallback((playlistId, coverUrl) => {
    setCustomPlaylists((prev) =>
      prev.map((p) => (p.id === playlistId ? { ...p, cover: coverUrl } : p))
    );
  }, []);

  return {
    customPlaylists,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    updatePlaylistCover,
  };
}

export default usePlaylists;

