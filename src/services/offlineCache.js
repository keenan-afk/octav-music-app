import { resolveFullAudioStream } from './musicApi';

const CACHE_NAME = 'octav-offline-audio-v1';
const STORAGE_KEY_DOWNLOADS = 'octav_downloaded_playlists';

function getOfflineCacheKey(trackId) {
  return `/__octav_offline__/track/${encodeURIComponent(String(trackId || ''))}`;
}

export function getDownloadedPlaylists() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOWNLOADS);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isPlaylistDownloaded(playlistId) {
  if (!playlistId) return false;
  return getDownloadedPlaylists().some((p) => p.id === playlistId);
}

/**
 * Retrieve an offline-cached audio Blob URL if the track was downloaded.
 * Returns empty string if not cached or Cache API unavailable.
 */
export async function getOfflineTrackUrl(trackId) {
  if (!trackId || typeof caches === 'undefined') return '';
  try {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(getOfflineCacheKey(trackId));
    if (!match) return '';
    const blob = await match.blob();
    if (!blob || blob.size < 1024) return '';
    return URL.createObjectURL(blob);
  } catch {
    return '';
  }
}

/**
 * Download an entire playlist's tracks into the browser's CacheStorage for true offline playback.
 */
export async function downloadPlaylistOffline(playlist, tracks = [], onProgress) {
  if (!playlist || !Array.isArray(tracks) || tracks.length === 0) {
    throw new Error('Playlist has no tracks to download');
  }
  if (typeof caches === 'undefined') {
    throw new Error('Offline storage is not supported in this browser');
  }

  const cache = await caches.open(CACHE_NAME);
  const downloadedTracks = [];
  let completed = 0;

  for (const track of tracks) {
    completed++;
    onProgress?.(completed, tracks.length, track);
    try {
      const streamUrl =
        track.resolvedStreamUrl ||
        (await resolveFullAudioStream(track)) ||
        track.audioUrl ||
        track.previewUrl;

      if (!streamUrl || streamUrl.includes('AudioPreview') || streamUrl.includes('mzstatic')) {
        continue;
      }

      const key = getOfflineCacheKey(track.id);
      const existing = await cache.match(key);
      if (!existing) {
        const res = await fetch(streamUrl, { mode: 'cors' });
        if (!res.ok) continue;
        await cache.put(key, res);
      }
      downloadedTracks.push({ ...track, isOfflineCached: true });
    } catch (err) {
      console.warn('Offline cache skipped track:', track?.title, err);
    }
  }

  if (downloadedTracks.length === 0) {
    throw new Error('Could not cache full streams for offline playback');
  }

  const existingList = getDownloadedPlaylists().filter((p) => p.id !== playlist.id);
  const record = {
    id: playlist.id,
    title: playlist.title,
    subtitle: `Downloaded • ${downloadedTracks.length} songs`,
    curator: playlist.curator || 'Octav',
    cover: playlist.cover || downloadedTracks[0]?.cover || '',
    type: playlist.type || 'Playlist',
    isCustom: Boolean(playlist.isCustom),
    tracks: downloadedTracks,
    downloadedAt: Date.now(),
  };

  localStorage.setItem(STORAGE_KEY_DOWNLOADS, JSON.stringify([record, ...existingList]));
  return record;
}

export async function removePlaylistOffline(playlistId) {
  const existingList = getDownloadedPlaylists();
  const target = existingList.find((p) => p.id === playlistId);
  const remaining = existingList.filter((p) => p.id !== playlistId);
  localStorage.setItem(STORAGE_KEY_DOWNLOADS, JSON.stringify(remaining));

  if (target?.tracks && typeof caches !== 'undefined') {
    try {
      const stillReferencedIds = new Set(
        remaining.flatMap((p) => (p.tracks || []).map((t) => t.id))
      );
      const cache = await caches.open(CACHE_NAME);
      for (const track of target.tracks) {
        if (!stillReferencedIds.has(track.id)) {
          await cache.delete(getOfflineCacheKey(track.id));
        }
      }
    } catch {}
  }
}
