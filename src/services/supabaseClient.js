import { createClient } from '@supabase/supabase-js';

// Default production Supabase credentials (public publishable key for client-side cloud sync)
const DEFAULT_SUPABASE_URL = 'https://zztvoweptexgkfzdtahx.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_EKKeIbOHw9v_ofnvYSjg4Q_X-1VE57o';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  DEFAULT_SUPABASE_URL;

const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.length > 10
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

function compactTrack(track) {
  if (!track || typeof track !== 'object') return null;
  return {
    id: track.id,
    title: track.title || '',
    artist: track.artist || '',
    album: track.album || '',
    duration: Number(track.duration || 0),
    durationFormatted: track.durationFormatted || '',
    cover: typeof track.cover === 'string' && !track.cover.startsWith('data:') ? track.cover : '',
    releaseYear: track.releaseYear,
    artistId: track.artistId,
    collectionId: track.collectionId,
    genre: track.genre,
    source: track.source || 'itunes',
  };
}

function compactPlaylist(pl) {
  if (!pl || typeof pl !== 'object') return null;
  return {
    id: pl.id,
    title: pl.title || 'Playlist',
    description: pl.description || '',
    curator: pl.curator || 'You',
    isCustom: Boolean(pl.isCustom),
    createdAt: pl.createdAt,
    // Strip huge base64 custom covers from auth JWT metadata; remote URLs stay
    cover: typeof pl.cover === 'string' && !pl.cover.startsWith('data:') ? pl.cover : '',
    tracks: Array.isArray(pl.tracks) ? pl.tracks.slice(0, 60).map(compactTrack).filter(Boolean) : [],
  };
}

let pendingSyncData = {};
let syncDebounceTimer = null;

/**
 * Sync user's music library (liked tracks, playlists, followed artists, listening stats) to Supabase Cloud.
 * Strips heavy lyrics/data-URI blobs to keep Supabase user_metadata compact and debounces concurrent calls.
 */
export async function syncUserDataToCloud({ likedTracks, customPlaylists, followedArtists, listeningStats }) {
  if (!supabase) return { success: false, reason: 'not_configured' };

  if (likedTracks !== undefined) {
    pendingSyncData.likedTracks = likedTracks.slice(0, 100).map(compactTrack).filter(Boolean);
  }
  if (customPlaylists !== undefined) {
    pendingSyncData.customPlaylists = customPlaylists.slice(0, 50).map(compactPlaylist).filter(Boolean);
  }
  if (followedArtists !== undefined) {
    pendingSyncData.followedArtists = followedArtists.slice(0, 50);
  }
  if (listeningStats !== undefined) {
    pendingSyncData.listeningStats = listeningStats;
  }

  return new Promise((resolve) => {
    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(async () => {
      const batch = { ...pendingSyncData, lastSyncedAt: Date.now() };
      pendingSyncData = {};
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          resolve({ success: false, error: userError });
          return;
        }
        const { data, error } = await supabase.auth.updateUser({ data: batch });
        if (error) {
          console.warn('Supabase cloud sync warning:', error.message);
          resolve({ success: false, error });
          return;
        }
        resolve({ success: true, data });
      } catch (err) {
        console.warn('Supabase cloud sync exception:', err);
        resolve({ success: false, error: err });
      }
    }, 450);
  });
}

/**
 * Fetch cloud library data from user metadata
 */
export function extractCloudLibrary(user) {
  if (!user) return null;
  const meta = user.user_metadata || user.rawUser?.user_metadata || {};
  return {
    likedTracks: Array.isArray(meta.likedTracks) ? meta.likedTracks : null,
    customPlaylists: Array.isArray(meta.customPlaylists) ? meta.customPlaylists : null,
    followedArtists: Array.isArray(meta.followedArtists) ? meta.followedArtists : null,
    listeningStats: meta.listeningStats || null,
    lastSyncedAt: meta.lastSyncedAt || null,
  };
}

/**
 * Actively query latest user metadata from Supabase Cloud
 */
export async function fetchUserDataFromCloud() {
  if (!supabase) return null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return extractCloudLibrary(user);
  } catch (err) {
    console.warn('Fetch cloud user exception:', err);
    return null;
  }
}
