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

/**
 * Sync user's music library (liked tracks, playlists, followed artists) to Supabase Cloud
 */
export async function syncUserDataToCloud({ likedTracks, customPlaylists, followedArtists }) {
  if (!supabase) return { success: false, reason: 'not_configured' };

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, error: userError };

    const updatePayload = {
      data: {
        ...(likedTracks !== undefined ? { likedTracks: likedTracks.slice(0, 100) } : {}),
        ...(customPlaylists !== undefined ? { customPlaylists: customPlaylists.slice(0, 50) } : {}),
        ...(followedArtists !== undefined ? { followedArtists: followedArtists.slice(0, 50) } : {}),
        lastSyncedAt: Date.now(),
      },
    };

    const { data, error } = await supabase.auth.updateUser(updatePayload);
    if (error) {
      console.warn('Supabase cloud sync warning:', error.message);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.warn('Supabase cloud sync exception:', err);
    return { success: false, error: err };
  }
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
