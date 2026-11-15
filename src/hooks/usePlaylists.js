import { useState, useEffect, useCallback } from 'react';
import { syncUserDataToCloud } from '../services/supabaseClient';

const STORAGE_KEY_PLAYLISTS = 'octav_guest_custom_playlists';
const LEGACY_STORAGE_KEY_PLAYLISTS = 'spotify_liquid_custom_playlists';

export function usePlaylists(user = null) {
  const getStorageKey = () => (user?.id ? `octav_user_${user.id}_custom_playlists` : STORAGE_KEY_PLAYLISTS);
  const getLegacyStorageKey = () => (user?.id ? `vetra_user_${user.id}_custom_playlists` : LEGACY_STORAGE_KEY_PLAYLISTS);

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

  // Re-load playlists when active user changes
  useEffect(() => {
    const key = getStorageKey();
    const legacyKey = getLegacyStorageKey();
    try {
      const saved = localStorage.getItem(key) || (legacyKey ? localStorage.getItem(legacyKey) : null);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((p) => p.id !== 'custom-favorites');
          setCustomPlaylists(cleaned);
          return;
        }
      }
    } catch (e) {}

    if (!user) {
      setCustomPlaylists([]);
    }
  }, [user?.id]);

  // Sync to scoped localStorage and Supabase Cloud
  useEffect(() => {
    try {
      const key = getStorageKey();
      localStorage.setItem(key, JSON.stringify(customPlaylists));
      if (user?.id && user?.isSupabase) {
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

