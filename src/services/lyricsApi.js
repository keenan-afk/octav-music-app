/**
 * Real-Time Synced Lyrics Service (LRCLIB)
 * Queries LRCLIB public API with clean title/artist, performs duration matching,
 * and parses [mm:ss.xx] timestamps with millisecond accuracy.
 * ZERO fake/AI lyrics allowed.
 */

import { safeTimeoutSignal } from './musicApi';

export function cleanTrackTitle(title = '') {
  return title
    .replace(/\s*\(remaster(?:ed)?(?:\s*\d{4})?\)/gi, '')
    .replace(/\s*\(official(?:\s*music)?(?:\s*video)?\)/gi, '')
    .replace(/\s*\(album\s*version\)/gi, '')
    .replace(/\s*\(radio\s*version\)/gi, '')
    .replace(/\s*\(live(?:\s*at\s*[^)]+)?\)/gi, '')
    .replace(/\s*-\s*from\s*["'][^"']+["']/gi, '')
    .replace(/\s*-\s*single/gi, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .replace(/\s*-\s*remastered.*/gi, '')
    .trim();
}

export function cleanArtistName(artist = '') {
  return (artist || '')
    .replace(/\s*feat\..*/gi, '')
    .replace(/\s*ft\..*/gi, '')
    .replace(/,.*$/, '')
    .trim();
}

/**
 * Accurate LRC Timestamp Parser
 * Parses lines matching /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/
 * Filters out empty lines and LRC metadata headers ([ar:], [ti:], etc.)
 */
export function parseLRC(lrcText) {
  if (!lrcText || typeof lrcText !== 'string') return [];
  const lines = lrcText.split('\n');
  const result = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip LRC metadata tags
    if (/^\[(ar|ti|by|al|length|offset|re|ve):/i.test(trimmed)) continue;

    const match = trimmed.match(regex);
    if (match) {
      const mins = parseInt(match[1], 10);
      const secs = parseInt(match[2], 10);
      const msRaw = match[3];
      // Centiseconds (2 digits) vs Milliseconds (3 digits)
      const ms = msRaw.length === 2 ? parseInt(msRaw, 10) * 10 : parseInt(msRaw, 10);
      const time = mins * 60 + secs + ms / 1000;
      const text = match[4].trim();

      if (text) {
        result.push({ time, text });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

/**
 * Fetch Time-Synced Lyrics from LRCLIB
 * 1. Queries https://lrclib.net/api/search?track_name=...&artist_name=...
 * 2. Filters for items with syncedLyrics
 * 3. Matches the result closest to audioDuration
 * 4. Fallback to plainLyrics or null (NO AI LYRICS)
 */
export async function fetchSyncedLyrics(artistName, trackName, audioDuration = 0) {
  if (!trackName) return { syncedLyrics: [], plainLyrics: null };

  const cleanTitle = cleanTrackTitle(trackName);
  const cleanArtist = cleanArtistName(artistName);

  try {
    const searchUrl = `https://lrclib.net/api/search?track_name=${encodeURIComponent(
      cleanTitle
    )}&artist_name=${encodeURIComponent(cleanArtist)}`;

    const res = await fetch(searchUrl, { signal: safeTimeoutSignal(5000) });
    if (!res.ok) throw new Error(`LRCLIB responded with ${res.status}`);

    const results = await res.json();
    if (Array.isArray(results) && results.length > 0) {
      // Filter results that have synced lyrics
      const withSynced = results.filter((r) => r.syncedLyrics && r.syncedLyrics.trim().length > 0);

      if (withSynced.length > 0) {
        // Duration Matching: Pick the item whose duration is closest to our playing audio
        if (audioDuration > 0) {
          withSynced.sort(
            (a, b) =>
              Math.abs((a.duration || 0) - audioDuration) -
              Math.abs((b.duration || 0) - audioDuration)
          );
        }

        const bestMatch = withSynced[0];
        const parsed = parseLRC(bestMatch.syncedLyrics);
        if (parsed.length > 0) {
          return {
            syncedLyrics: parsed,
            plainLyrics: bestMatch.plainLyrics || null,
          };
        }
      }

      // Check if any result has plain lyrics
      const withPlain = results.find((r) => r.plainLyrics && r.plainLyrics.trim().length > 0);
      if (withPlain) {
        return {
          syncedLyrics: [],
          plainLyrics: withPlain.plainLyrics,
        };
      }
    }
  } catch (err) {
    console.warn('LRCLIB exact lookup error:', err.message);
  }

  // Fallback: Try general search query if exact track+artist search yielded nothing
  try {
    const generalUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(
      `${cleanTitle} ${cleanArtist}`
    )}`;

    const res = await fetch(generalUrl, { signal: safeTimeoutSignal(4500) });
    if (res.ok) {
      const results = await res.json();
      if (Array.isArray(results) && results.length > 0) {
        const withSynced = results.filter((r) => r.syncedLyrics);
        if (withSynced.length > 0) {
          if (audioDuration > 0) {
            withSynced.sort(
              (a, b) =>
                Math.abs((a.duration || 0) - audioDuration) -
                Math.abs((b.duration || 0) - audioDuration)
            );
          }
          const parsed = parseLRC(withSynced[0].syncedLyrics);
          if (parsed.length > 0) {
            return {
              syncedLyrics: parsed,
              plainLyrics: withSynced[0].plainLyrics || null,
            };
          }
        }

        const withPlain = results.find((r) => r.plainLyrics);
        if (withPlain) {
          return {
            syncedLyrics: [],
            plainLyrics: withPlain.plainLyrics,
          };
        }
      }
    }
  } catch (err) {
    console.warn('LRCLIB general search fallback error:', err.message);
  }

  // Clean empty state - ZERO FAKE AI LYRICS
  return {
    syncedLyrics: [],
    plainLyrics: null,
  };
}
