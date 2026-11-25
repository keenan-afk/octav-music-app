import { useState, useEffect, useCallback } from 'react';
import { syncUserDataToCloud, fetchUserDataFromCloud } from '../services/supabaseClient';

const STORAGE_KEY_FOLLOWED = 'octav_followed_artists';
const LEGACY_STORAGE_KEY_FOLLOWED = 'vetra_followed_artists';

export function useFollowedArtists(user = null) {
  const getStorageKey = useCallback(
    () => (user?.id ? `octav_user_${user.id}_followed_artists` : STORAGE_KEY_FOLLOWED),
    [user?.id]
  );

  const [followedArtists, setFollowedArtists] = useState(() => {
    try {
      const key = user?.id ? `octav_user_${user.id}_followed_artists` : STORAGE_KEY_FOLLOWED;
      const raw = localStorage.getItem(key) || localStorage.getItem(LEGACY_STORAGE_KEY_FOLLOWED);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let active = true;
    const key = getStorageKey();

    let localList = [];
    try {
      const raw = localStorage.getItem(key) || (!user?.id ? localStorage.getItem(LEGACY_STORAGE_KEY_FOLLOWED) : null);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        localList = parsed;
        setFollowedArtists(localList);
      } else {
        setFollowedArtists([]);
      }
    } catch {
      setFollowedArtists([]);
    }

    async function hydrate() {
      if (!user?.id || !user?.isSupabase) return;
      try {
        const cloud = await fetchUserDataFromCloud();
        const cloudList = cloud?.followedArtists || user.cloudLibrary?.followedArtists;
        if (active && Array.isArray(cloudList) && cloudList.length > 0) {
          const merged = Array.from(new Set([...localList, ...cloudList]));
          setFollowedArtists(merged);
          try {
            localStorage.setItem(key, JSON.stringify(merged));
          } catch {}
        }
      } catch {}
    }

    hydrate();
    return () => {
      active = false;
    };
  }, [user?.id, user?.isSupabase, getStorageKey]);

  const isFollowingArtist = useCallback(
    (artistName) => {
      if (!artistName) return false;
      const target = artistName.toLowerCase().trim();
      return followedArtists.some((a) => String(a).toLowerCase().trim() === target);
    },
    [followedArtists]
  );

  const toggleFollowArtist = useCallback(
    (artistName) => {
      if (!artistName) return false;
      const clean = artistName.trim();
      let nowFollowing = false;

      setFollowedArtists((prev) => {
        const exists = prev.some((a) => String(a).toLowerCase().trim() === clean.toLowerCase());
        const updated = exists
          ? prev.filter((a) => String(a).toLowerCase().trim() !== clean.toLowerCase())
          : [...prev, clean];
        nowFollowing = !exists;

        try {
          localStorage.setItem(getStorageKey(), JSON.stringify(updated));
          if (user?.id && user?.isSupabase) {
            syncUserDataToCloud({ followedArtists: updated });
          }
        } catch (err) {
          console.warn('Failed saving followed artists:', err);
        }
        return updated;
      });

      return nowFollowing;
    },
    [getStorageKey, user?.id, user?.isSupabase]
  );

  return {
    followedArtists,
    isFollowingArtist,
    toggleFollowArtist,
  };
}
