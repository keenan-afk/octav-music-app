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
let hasLibrariesTable = true; // Auto-detects whether supabase/schema.sql has been applied

function isMissingTableError(error) {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    error.status === 404
  );
}

/**
 * Sync user's music library (liked tracks, playlists, followed artists, listening stats) to Supabase Cloud.
 * Prefers dedicated PostgreSQL table `public.user_libraries` (see supabase/schema.sql) and falls back
 * transparently to compact `user_metadata` if the SQL migration has not yet been executed.
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

        // 1. Prefer PostgreSQL `user_libraries` table when present
        if (hasLibrariesTable) {
          const rowPayload = {
            user_id: user.id,
            ...(batch.likedTracks !== undefined ? { liked_tracks: batch.likedTracks } : {}),
            ...(batch.customPlaylists !== undefined ? { custom_playlists: batch.customPlaylists } : {}),
            ...(batch.followedArtists !== undefined ? { followed_artists: batch.followedArtists } : {}),
            ...(batch.listeningStats !== undefined ? { listening_stats: batch.listeningStats } : {}),
            updated_at: new Date().toISOString(),
          };
          const { error: dbError } = await supabase
            .from('user_libraries')
            .upsert(rowPayload, { onConflict: 'user_id' });

          if (!dbError) {
            resolve({ success: true, storage: 'postgres' });
            return;
          }
          if (isMissingTableError(dbError)) {
            hasLibrariesTable = false;
          } else {
            console.warn('Supabase table sync warning:', dbError.message);
          }
        }

        // 2. Fallback to Auth user_metadata
        const { data, error } = await supabase.auth.updateUser({ data: batch });
        if (error) {
          console.warn('Supabase cloud sync warning:', error.message);
          resolve({ success: false, error });
          return;
        }
        resolve({ success: true, storage: 'metadata', data });
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
 * Actively query latest user library from Supabase PostgreSQL table or Auth metadata fallback
 */
export async function fetchUserDataFromCloud() {
  if (!supabase) return null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    if (hasLibrariesTable) {
      const { data: row, error: dbError } = await supabase
        .from('user_libraries')
        .select('liked_tracks, custom_playlists, followed_artists, listening_stats, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!dbError && row) {
        return {
          likedTracks: Array.isArray(row.liked_tracks) ? row.liked_tracks : null,
          customPlaylists: Array.isArray(row.custom_playlists) ? row.custom_playlists : null,
          followedArtists: Array.isArray(row.followed_artists) ? row.followed_artists : null,
          listeningStats: row.listening_stats || null,
          lastSyncedAt: row.updated_at ? new Date(row.updated_at).getTime() : null,
        };
      }
      if (isMissingTableError(dbError)) {
        hasLibrariesTable = false;
      }
    }

    return extractCloudLibrary(user);
  } catch (err) {
    console.warn('Fetch cloud user exception:', err);
    return null;
  }
}
