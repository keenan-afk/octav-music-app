/**
 * Octav Rewind Stats Service
 * Tracks play counts, listened minutes, top songs and top artists.
 */

const STORAGE_KEY_STATS = 'octav_listening_stats';

export function getStatsStorageKey(userId) {
  return userId ? `octav_user_${userId}_stats` : STORAGE_KEY_STATS;
}

export function getListeningStats(userId) {
  try {
    const key = getStatsStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to read listening stats:', e);
  }

  // Build dynamically from user's actual recently played session tracks if stats not yet stored
  let recentList = [];
  try {
    const recentKey = userId ? `octav_user_${userId}_recent_tracks` : 'octav_recent_tracks';
    const recentRaw = localStorage.getItem(recentKey) || localStorage.getItem('spotify_liquid_recent_tracks');
    if (recentRaw) recentList = JSON.parse(recentRaw);
  } catch { }

  if (Array.isArray(recentList) && recentList.length > 0) {
    const tracks = {};
    const artists = {};
    let totalSec = 0;
    recentList.forEach((t, i) => {
      if (!t || !t.title) return;
      const tKey = t.id || `${t.title}_${t.artist}`;
      const plays = Math.max(1, 4 - Math.floor(i / 2));
      const secs = plays * (t.duration || 210);
      totalSec += secs;
      tracks[tKey] = {
        id: t.id,
        title: t.title,
        artist: t.artist,
        cover: t.cover,
        plays,
        seconds: secs,
      };
      const art = t.artist || 'Unknown';
      if (!artists[art]) artists[art] = { name: art, plays: 0 };
      artists[art].plays += plays;
    });

    return {
      totalSeconds: totalSec,
      playsCount: recentList.length,
      tracks,
      artists,
    };
  }

  // Pure zero-state default (No fake mock tracks)
  return {
    totalSeconds: 0,
    playsCount: 0,
    tracks: {},
    artists: {},
  };
}

export function recordTrackPlay(track, secondsListened = 30, userId = null) {
  if (!track || !track.title) return;

  try {
    const key = getStatsStorageKey(userId);
    const stats = getListeningStats(userId);

    stats.totalSeconds = (stats.totalSeconds || 0) + Math.round(secondsListened);
    stats.playsCount = (stats.playsCount || 0) + 1;

    // Track map
    if (!stats.tracks) stats.tracks = {};
    const trackKey = track.id || `${track.title}_${track.artist}`;
    if (!stats.tracks[trackKey]) {
      stats.tracks[trackKey] = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        cover: track.cover,
        plays: 0,
        seconds: 0,
      };
    }
    stats.tracks[trackKey].plays += 1;
    stats.tracks[trackKey].seconds += Math.round(secondsListened);

    // Artist map
    if (!stats.artists) stats.artists = {};
    const artistKey = track.artist || 'Unknown Artist';
    if (!stats.artists[artistKey]) {
      stats.artists[artistKey] = { name: artistKey, plays: 0 };
    }
    stats.artists[artistKey].plays += 1;

    localStorage.setItem(key, JSON.stringify(stats));
  } catch (err) {
    console.warn('Failed to record track play stats:', err);
  }
}

