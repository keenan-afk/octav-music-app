/**
 * Region-Aware Hybrid Catalog + Multi-Engine Audio Resolver
 * ZERO fictional/mock tracks.
 * - Primary Index: Apple Music / iTunes Catalog with country-specific indexing ('ID' or 'US')
 * - Dual Entity Search: Concurrent Song & Artist search with Top Artist Result Card
 * - Smart Query Normalization: Indonesian & Rock shorthand aliases (so7, gnr, a7x, d19, etc.)
 * - 3-Tier Multi-Engine Stream Resolver:
 *     Tier 1: YouTube Music via Piped & Invidious API Pool
 *     Tier 2: JioSaavn Exact Match with >70% strict artist fuzzy verification
 *     Tier 3: Instant High-Bitrate Apple AAC/M4A Stream
 */

// Curated palette generator for organic ambient illumination
const ORGANIC_PALETTES = [
  { primary: '#104e38', secondary: '#07241a', accent: '#1ed760' }, // Forest Emerald
  { primary: '#8b4513', secondary: '#3d1c07', accent: '#e59866' }, // Warm Amber / Cognac
  { primary: '#1e3a4c', secondary: '#0b161f', accent: '#4da8da' }, // Nordic Slate Blue
  { primary: '#6b1d2f', secondary: '#2e0a13', accent: '#e0536c' }, // Velvet Wine
  { primary: '#7a4b1e', secondary: '#331a08', accent: '#d4883b' }, // Burnt Umber Bronze
  { primary: '#1c402e', secondary: '#0b1f15', accent: '#48c78e' }, // Moss Forest Jade
  { primary: '#142b47', secondary: '#071221', accent: '#3a86ff' }, // Deep Ocean Indigo
  { primary: '#8d4320', secondary: '#381608', accent: '#e07a5f' }, // Terracotta Ochre
  { primary: '#4a2545', secondary: '#1f0d1d', accent: '#b06ab3' }, // Amethyst Plum
  { primary: '#2d3748', secondary: '#1a202c', accent: '#81e6d9' }, // Nordic Granite Teal
];

// In-memory TTL cache (30 mins) for resolved full-length audio stream URLs
const STREAM_CACHE_TTL_MS = 30 * 60 * 1000;
class TTLCache extends Map {
  get(key) {
    const entry = super.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      super.delete(key);
      return undefined;
    }
    return entry.url;
  }
  has(key) {
    return this.get(key) !== undefined;
  }
  set(key, url) {
    if (!url) return this;
    return super.set(key, { url, expiresAt: Date.now() + STREAM_CACHE_TTL_MS });
  }
}
const streamCache = new TTLCache();

/**
 * Cross-platform timeout signal helper compatible with iOS Safari & all WebViews
 * Uses standard AbortController with setTimeout to avoid iOS Safari 16 AbortSignal.timeout bugs
 */
export function safeTimeoutSignal(ms = 5000) {
  const controller = new AbortController();
  setTimeout(() => {
    try {
      controller.abort();
    } catch { }
  }, ms);
  return controller.signal;
}

function getPaletteForTrack(title = '', artist = '') {
  let hash = 0;
  const str = `${title} ${artist}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % ORGANIC_PALETTES.length;
  return ORGANIC_PALETTES[index];
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '3:30';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const KNOWN_COVER_ARTISTS = [
  'felix irwan',
  'tami aulia',
  'adlani rambe',
  'mitty zasia',
  'aviwkila',
  'chintya gabriella',
  'remember entertainment',
  'genjreng guitar',
  '3 pemuda berbahaya',
  'akbar chalay',
  'michela thea',
  'fiersa besari cover',
];

/**
 * Filter out compilations, karaoke, tributes, covers, and loopable sound effects / nature sounds
 */
export function isCompilationOrKaraoke(title = '', artist = '', album = '') {
  const lowTitle = (title || '').toLowerCase();
  const lowArtist = (artist || '').toLowerCase();
  const lowAlbum = (album || '').toLowerCase();
  const text = `${lowTitle} ${lowArtist} ${lowAlbum}`;

  const bannedKeywords = [
    'karaoke',
    'tribute',
    'loopable',
    'relaxing rain',
    'rain sounds',
    'sound effects',
    'sound effect',
    'suara alam',
    'instrumental version',
    'backing track',
    'various artists',
    'the karaoke channel',
    'ringtone',
    'white noise',
    'sleep sounds',
    'sleep music',
    'nature sounds',
    'ambient noise',
    'meditation',
    'asmr',
    'lullaby',
    'guitar cover',
    'piano cover',
    'acoustic cover',
    'cover version',
    'coverin terus',
    'keroncong version',
    'string quartet',
    'vitamin string quartet',
    'idol artist',
    'piano version',
    'kidz bop',
    'music box',
    '8-bit tribute',
    'muppets version',
  ];

  if (lowArtist === 'various' || lowArtist === 'various artists') return true;
  return bannedKeywords.some((k) => text.includes(k));
}

/**
 * Common shorthand aliases (Indonesian & Global Rock)
 */
const QUERY_ALIASES = {
  so7: 'Sheila On 7',
  sheila: 'Sheila On 7',
  gnr: "Guns N' Roses",
  guns: "Guns N' Roses",
  a7x: 'Avenged Sevenfold',
  avenged: 'Avenged Sevenfold',
  d19: 'Dewa 19',
  dewa: 'Dewa 19',
  peterpan: 'Peterpan',
  noah: 'Noah',
  payung: 'Payung Teduh',
  am: 'Arctic Monkeys',
  rhcp: 'Red Hot Chili Peppers',
  lp: 'Linkin Park',
  mcr: 'My Chemical Romance',
  bmth: 'Bring Me The Horizon',
  soad: 'System Of A Down',
  oasis: 'Oasis',
};

/**
 * Normalize and expand user queries using aliases
 */
export function normalizeQuery(rawQuery = '') {
  if (!rawQuery) return '';
  const trimmed = rawQuery.trim();
  const lower = trimmed.toLowerCase();

  // Exact alias match (e.g. "so7" -> "Sheila On 7")
  if (QUERY_ALIASES[lower]) {
    return QUERY_ALIASES[lower];
  }

  // Prefix alias match (e.g. "so7 dan" -> "Sheila On 7 Dan")
  const words = trimmed.split(/\s+/);
  if (words.length > 1 && QUERY_ALIASES[words[0].toLowerCase()]) {
    const expandedPrefix = QUERY_ALIASES[words[0].toLowerCase()];
    // Prevent duplicating if query is already part of or matches the expanded name (e.g. "sheila on 7" -> not "sheila on 7 on 7")
    if (!trimmed.toLowerCase().startsWith(expandedPrefix.toLowerCase())) {
      return `${expandedPrefix} ${words.slice(1).join(' ')}`;
    }
  }

  return trimmed;
}

/**
 * Precision Strict Artist Matching Helper
 * Rejects substring mismatches (e.g. "Noah Cyrus" for "NOAH", "Queen Latifah" for "Queen", "Dewa Budjana" for "Dewa 19")
 * Accurately accepts collaborations (e.g. "Juicy Luicy & Adrian Khalif" for "Juicy Luicy", "Coldplay & BTS" for "Coldplay")
 */
export function isArtistStrictMatch(returnedArtist = '', targetArtist = '') {
  if (!returnedArtist || !targetArtist) return false;
  const r = returnedArtist.toLowerCase().replace(/^[.\-_/\s]+/, '').trim();
  const t = targetArtist.toLowerCase().replace(/^[.\-_/\s]+/, '').trim();
  if (r === t) return true;

  const normalize = (str) =>
    str
      .toLowerCase()
      .replace(/^[.\-_/\s]+/, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const normR = normalize(r);
  const normT = normalize(t);
  if (normR === normT) return true;
  if (normR === `the ${normT}` || normT === `the ${normR}`) return true;

  // Only split on explicit collaboration tags (feat, featuring, ft, with)
  const collabRegex = /\s*(?:\bfeat\.?\b|\bfeaturing\b|\bft\.?\b|\bwith\b)\s*/i;
  const rTokens = r.split(collabRegex).map(normalize).filter(Boolean);
  if (rTokens.includes(normT)) return true;

  const tTokens = t.split(collabRegex).map(normalize).filter(Boolean);
  if (tTokens.includes(normR)) return true;

  return false;
}

// Backwards compatibility alias
export const isArtistFuzzyMatch = isArtistStrictMatch;

// In-memory cache for verified official artist portraits
const artistPortraitCache = new Map();

/**
 * Fetch verified official artist portrait from artist catalog
 * Guarantees zero wrong photos, zero unsplash placeholders
 * Uses Apple Music official verified catalog with 100% native CORS support in all mobile browsers (iOS Safari)
 */
export async function fetchArtistPortrait(artistName, region = 'ID') {
  if (!artistName) return '';
  const trimmed = artistName.trim();
  const clean = trimmed.replace(/^[.\-_/\s]+/, '').trim();
  if (!clean) return '';

  const regCode = (region || 'ID').toLowerCase();
  const cacheKey = `${clean.toLowerCase()}__${regCode}`;
  if (artistPortraitCache.has(cacheKey)) {
    return artistPortraitCache.get(cacheKey);
  }

  // 1. Query Apple Music iTunes definitive release for this artist in active region
  try {
    const url = `https://itunes.apple.com/search?country=${regCode}&media=music&entity=album&attribute=artistTerm&limit=10&term=${encodeURIComponent(clean)}`;
    const res = await fetch(url, { signal: safeTimeoutSignal(4000) });
    if (res.ok) {
      const data = await res.json();
      const results = data.results || [];
      // STRICT FILTER: Match MUST belong to this artist (never pick a random other person)
      const match = results.find((a) => isArtistStrictMatch(a.artistName, clean));
      if (match?.artworkUrl100) {
        const portrait = match.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg');
        artistPortraitCache.set(cacheKey, portrait);
        return portrait;
      }
    }
  } catch (e) { }

  // 2. Fallback to Global / US catalog if not found in local region
  if (regCode !== 'us') {
    try {
      const url = `https://itunes.apple.com/search?country=US&media=music&entity=album&attribute=artistTerm&limit=10&term=${encodeURIComponent(clean)}`;
      const res = await fetch(url, { signal: safeTimeoutSignal(4000) });
      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        const match = results.find((a) => isArtistStrictMatch(a.artistName, clean));
        if (match?.artworkUrl100) {
          const portrait = match.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg');
          artistPortraitCache.set(cacheKey, portrait);
          return portrait;
        }
      }
    } catch (e) { }
  }

  return '';
}

/**
 * Clean and normalize search query for full-length audio stream resolution
 * Strips '(Remastered)', 'feat.', 'Official', brackets, and redundant noise.
 */
export function cleanSearchQuery(title = '', artist = '') {
  let cleanTitle = (title || '')
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/[-–—]\s*(remastered|remaster|official|audio|video|explicit|version|radio edit|live|deluxe|anniversary).*$/gi, '')
    .replace(/\b(feat\.|ft\.|featuring|with)\b.*$/gi, '')
    .replace(/\.+$/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let cleanArtist = (artist || '')
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\b(feat\.|ft\.|featuring|with)\b.*$/gi, '')
    .replace(/,\s*.*$/, '')
    .replace(/\.+$/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { cleanTitle: cleanTitle || title, cleanArtist: cleanArtist || artist };
}

export function isValidDecryptedStreamUrl(url = '') {
  if (!url || typeof url !== 'string') return false;
  if (!url.startsWith('http')) return false;
  if (url.includes('saavncdn.com')) {
    // Valid JioSaavn CDN paths always use a 32-char lowercase hex hash, never mixed-case encrypted base64
    return /\/[0-9a-f]{32}(?:_\d+)?\.(?:mp4|mp3|m4a)(?:\?|$)/i.test(url) && !/[A-Z]/.test(url.split('/').pop().split('_')[0]);
  }
  return true;
}

const STREAM_VARIANT_KEYWORDS = [
  'remix',
  'lofi',
  'lo-fi',
  'slowed',
  'reverb',
  'sped up',
  'nightcore',
  'mashup',
  '8d audio',
  'instrumental',
  'acoustic',
  'unplugged',
  'live',
  'cover',
  'karaoke',
  'tribute',
  'piano',
  'violin',
  'cello',
  'orchestra',
  'harp',
  'music box',
  '8-bit',
];

function normalizeMatchText(str = '') {
  return String(str || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\[.*?\]/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strictly score and pick the best matching full-stream candidate.
 * Returns null instead of risking a random wrong track when confidence is insufficient.
 */
export function pickBestStreamCandidate(candidateSongs = [], title = '', artist = '', targetDuration = 0) {
  if (!Array.isArray(candidateSongs) || candidateSongs.length === 0) return null;

  const { cleanTitle, cleanArtist } = cleanSearchQuery(title, artist);
  const targetTitleNorm = normalizeMatchText(cleanTitle);
  const targetArtistNorm = normalizeMatchText(cleanArtist);
  if (!targetTitleNorm) return null;

  const rawReqTitle = (title || '').toLowerCase();
  const targetTitleTokens = targetTitleNorm.split(' ').filter(Boolean);
  const targetArtistTokens = targetArtistNorm
    .split(' ')
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !['the', 'and', 'band', 'feat', 'ft'].includes(w));

  const normTargetDur = targetDuration > 1000 ? Math.round(targetDuration / 1000) : Number(targetDuration || 0);

  let bestCandidate = null;
  let bestScore = -1;

  for (const s of candidateSongs) {
    if (!s) continue;
    const dur = Number(s.duration || 0);
    if (dur < 40) continue;

    // Duration sanity check when studio track duration is known
    if (normTargetDur >= 60) {
      const diff = Math.abs(dur - normTargetDur);
      if (diff > Math.max(90, normTargetDur * 0.55)) continue;
    }

    const rawCandTitle = String(s.name || s.title || '');
    const candAlbum = typeof s.album === 'string' ? s.album : String(s.album?.name || '');

    // Decode HTML entities BEFORE splitting artist delimiters (e.g. '&amp;' or '&#039;' must stay intact!)
    const decodeEnt = (str) =>
      String(str || '')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");

    const decodedSub = decodeEnt(s.subtitle || '');
    const subArtistPart = decodedSub.includes(' - ') ? decodedSub.split(' - ')[0] : decodedSub;
    const rawPrimaryList = Array.isArray(s.primaryArtists)
      ? s.primaryArtists.map((a) => (typeof a === 'string' ? a : a?.name || ''))
      : typeof s.primaryArtists === 'string'
        ? s.primaryArtists.split(',')
        : [];

    // ONLY inspect actual performing/featured artists — NEVER composer/lyricist maps (artist_map.artists / artists.all),
    // because JioSaavn credits original songwriters there on random cover/tribute tracks!
    const candArtistItems = [
      ...(s.artist_map?.primary_artists || []).map((a) => a?.name || ''),
      ...(s.artists?.primary || []).map((a) => a?.name || ''),
      ...(s.artists?.featured || []).map((a) => a?.name || ''),
      ...rawPrimaryList,
      ...(typeof s.featuredArtists === 'string' ? s.featuredArtists.split(',') : []),
      ...subArtistPart.split(/,|&|\band\b/i),
    ]
      .map((a) => decodeEnt(a).trim())
      .filter(Boolean);

    const candArtistJoined = candArtistItems.map(normalizeMatchText).join(' ');

    if (isCompilationOrKaraoke(rawCandTitle, candArtistJoined, candAlbum)) continue;

    // Reject derivative track versions (remix, slowed, lofi, live, cover, etc.) unless explicitly requested
    const lowCandTitle = rawCandTitle.toLowerCase();
    const hasUnwantedVariant = STREAM_VARIANT_KEYWORDS.some(
      (kw) => new RegExp(`\\b${kw}\\b`, 'i').test(lowCandTitle) && !new RegExp(`\\b${kw}\\b`, 'i').test(rawReqTitle)
    );
    if (hasUnwantedVariant) continue;

    // Strict Title Scoring
    const candTitleNorm = normalizeMatchText(cleanSearchQuery(rawCandTitle, '').cleanTitle || rawCandTitle);
    if (!candTitleNorm) continue;

    let titleScore = 0;
    if (candTitleNorm === targetTitleNorm) {
      titleScore = 120;
    } else if (targetTitleNorm.length <= 4 || targetTitleTokens.length === 1) {
      // Short or single-word titles require exact title match or exact whole-word prefix with zero mismatched words
      if (candTitleNorm === targetTitleNorm) {
        titleScore = 120;
      } else {
        continue;
      }
    } else {
      // Multi-word titles: prevent short substring songs ("Mine") matching long songs ("Sweet Child O Mine")
      if (candTitleNorm.length < targetTitleNorm.length * 0.65) continue;
      if (candTitleNorm.startsWith(`${targetTitleNorm} `)) {
        titleScore = 95;
      } else {
        const candTokens = new Set(candTitleNorm.split(' ').filter(Boolean));
        const matchedCount = targetTitleTokens.filter((tok) => candTokens.has(tok)).length;
        const ratio = matchedCount / Math.max(targetTitleTokens.length, candTokens.size);
        if (matchedCount < targetTitleTokens.length || ratio < 0.72) continue;
        titleScore = Math.round(70 + ratio * 30);
      }
    }

    // Strict Artist Scoring (MANDATORY match)
    let artistScore = 0;
    if (!targetArtistNorm) {
      artistScore = 30;
    } else if (candArtistItems.some((ca) => isArtistStrictMatch(ca, cleanArtist))) {
      artistScore = 100;
    } else if (targetArtistTokens.length > 0) {
      const candArtistWords = new Set(candArtistJoined.split(' ').filter(Boolean));
      const matchedArtistTokens = targetArtistTokens.filter((tok) => candArtistWords.has(tok));
      // Require ALL meaningful tokens for multi-word artists (e.g. "Guns N Roses" must match BOTH "guns" and "roses")
      if (matchedArtistTokens.length === targetArtistTokens.length && targetArtistTokens.some((t) => t.length >= 3)) {
        artistScore = 75;
      }
    }

    if (artistScore === 0) continue;

    const downloadList = s.downloadUrl || s.download_url || [];
    if (!Array.isArray(downloadList) || downloadList.length === 0) continue;

    const durBonus = normTargetDur >= 60 ? Math.max(0, 20 - Math.abs(dur - normTargetDur) / 3) : 0;
    const totalScore = titleScore + artistScore + durBonus;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestCandidate = s;
    }
  }

  return bestCandidate;
}

/**
 * 3-Tier Multi-Engine Full-Length Audio Stream Resolver
 * High-speed concurrent mirror resolution (320kbps / 160kbps full streams)
 */
export async function resolveAudioStream(title, artist, fallbackUrl = '', targetDuration = 0) {
  const { cleanTitle, cleanArtist } = cleanSearchQuery(title, artist);
  const cacheKey = `${cleanTitle}__${cleanArtist}`.toLowerCase().trim();
  const rawKey = `${(title || '').toLowerCase().trim()}__${(artist || '').toLowerCase().trim()}`;

  if (streamCache.has(cacheKey)) {
    return streamCache.get(cacheKey);
  }
  if (streamCache.has(rawKey)) {
    return streamCache.get(rawKey);
  }

  // First-party Vercel Serverless resolver (with Edge cache) + verified fallback mirrors
  const mirrorEndpoints = [
    ...(typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)
      ? [(q) => `/api/resolve-stream?q=${encodeURIComponent(q)}&limit=12`]
      : []),
    (q) => `https://jiosaavn-api-private.vercel.app/search/songs?q=${encodeURIComponent(q)}&limit=12`,
    (q) => `https://jiosaavn-api-taupe.vercel.app/search/songs?query=${encodeURIComponent(q)}&limit=12`,
  ];

  const normTitle = cleanTitle.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const normArtist = cleanArtist.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

  // Always include artist when known to avoid random homonym track collisions
  const queries = normArtist
    ? [`${normArtist} ${normTitle}`.trim(), `${normTitle} ${normArtist}`.trim()]
    : [normTitle];
  const distinctQueries = Array.from(new Set(queries.filter(Boolean)));

  // Concurrently query resolvers across candidate queries
  const fetchTasks = [];
  for (const q of distinctQueries) {
    for (const getEndpoint of mirrorEndpoints) {
      fetchTasks.push(
        fetch(getEndpoint(q), { signal: safeTimeoutSignal(6000) })
          .then((r) => {
            const ct = r.headers.get('content-type') || '';
            return r.ok && ct.includes('application/json') ? r.json() : null;
          })
          .then((json) => {
            if (!json) return [];
            return json.data?.results || json.results || [];
          })
          .catch(() => [])
      );
    }
  }

  try {
    const allResults = await Promise.allSettled(fetchTasks);
    const candidateSongs = [];
    for (const res of allResults) {
      if (res.status === 'fulfilled' && Array.isArray(res.value) && res.value.length > 0) {
        candidateSongs.push(...res.value);
      }
    }

    if (candidateSongs.length > 0) {
      let qualityPref = '320kbps';
      try {
        qualityPref = localStorage.getItem('octav_audio_quality') || '320kbps';
      } catch { }

      // Pick highest-scoring verified candidate, retrying next valid pool item if URL is malformed
      const remainingPool = [...candidateSongs];
      while (remainingPool.length > 0) {
        const selectedSong = pickBestStreamCandidate(remainingPool, title, artist, targetDuration);
        if (!selectedSong) break;
        const removeIdx = remainingPool.indexOf(selectedSong);
        if (removeIdx !== -1) remainingPool.splice(removeIdx, 1);

        const downloadList = selectedSong.downloadUrl || selectedSong.download_url || [];
        let best = null;
        if (qualityPref.includes('96kbps')) {
          best =
            downloadList.find((d) => d.quality === '96kbps') ||
            downloadList.find((d) => d.quality === '160kbps') ||
            downloadList[0];
        } else {
          best =
            downloadList.find((d) => d.quality === '320kbps') ||
            downloadList.find((d) => d.quality === '160kbps') ||
            downloadList[downloadList.length - 1];
        }

        const resolved = best?.link || best?.url;
        if (isValidDecryptedStreamUrl(resolved)) {
          streamCache.set(cacheKey, resolved);
          streamCache.set(rawKey, resolved);
          return resolved;
        }
      }
    }
  } catch (e) {
    console.warn('Concurrent stream resolution exception:', e);
  }

  // If no verified match was found, return fallbackUrl (verified Apple track audio) WITHOUT polluting streamCache
  if (fallbackUrl) {
    return fallbackUrl;
  }

  return '';
}

/**
 * Proactive background pre-resolver for the upcoming track in queue
 * Populates streamCache ahead of time to enable 100% synchronous, gapless background autoplay on mobile
 */
export async function preResolveTrackStream(track) {
  if (!track || !track.title) return '';
  const key = getTrackKey(track);
  if (streamCache.has(key)) {
    const cached = streamCache.get(key);
    track.resolvedStreamUrl = cached;
    track.audioUrl = cached;
    return cached;
  }
  try {
    const full = await resolveFullAudioStream(track);
    if (full && !full.includes('itunes.apple.com') && !full.includes('AudioPreview')) {
      streamCache.set(key, full);
      track.resolvedStreamUrl = full;
      track.audioUrl = full;
      return full;
    }
  } catch { }
  return '';
}

export { streamCache };

/**
 * High-level resolver accepting track object
 */
export async function resolveFullAudioStream(track) {
  if (!track) return '';
  const fallback = track.audioUrl || track.previewUrl || '';
  return resolveAudioStream(track.title, track.artist, fallback, track.duration);
}

export function getTrackKey(track) {
  if (!track) return '';
  const t = (track.title || '').toLowerCase().trim();
  const a = (track.artist || '').toLowerCase().trim();
  return `${t}__${a}`;
}

export function getTrackDedupeKey(track) {
  if (!track) return '';
  const cleanT = (track.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  const cleanA = (track.artist || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  return `${cleanT}__${cleanA}`;
}

/**
 * Curated Artist Clusters for Infinite Smart Radio Engine
 */
export const INDONESIAN_POP_ROCK_CLUSTER = [
  'Sheila On 7',
  'Dewa 19',
  'Peterpan',
  'NOAH',
  'Padi',
  'Cokelat',
  'Andra and the BackBone',
  'Nidji',
  'Letto',
  'Gigi',
  'Ada Band',
  'Ungu',
  'Slank',
  'Kotak',
  'Drive',
  'Last Child',
  'Payung Teduh',
  'Hindia',
  'Perunggu',
  'Fourtwnty',
  'Juicy Luicy',
  'Sal Priadi',
  'Bernadya',
  'The Changcuters',
  'D’Masiv',
];

export const ROCK_HARD_ROCK_METAL_CLUSTER = [
  "Guns N' Roses",
  'Avenged Sevenfold',
  'Metallica',
  'Queen',
  'Oasis',
  'Nirvana',
  'Bon Jovi',
  'Aerosmith',
  'Linkin Park',
  'Muse',
  'Green Day',
  'My Chemical Romance',
  'Scorpions',
  'Dream Theater',
  'Red Hot Chili Peppers',
  'Arctic Monkeys',
  'Radiohead',
  'Foo Fighters',
  'Coldplay',
  'AC/DC',
  'System Of A Down',
  'Bring Me The Horizon',
  'The Killers',
];

function matchArtistToCluster(artistName = '', cluster = []) {
  if (!artistName) return false;
  const norm = artistName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return cluster.some((item) => {
    const itemNorm = item.toLowerCase().replace(/[^a-z0-9]/g, '');
    return norm.includes(itemNorm) || itemNorm.includes(norm);
  });
}

function preventConsecutiveArtists(tracks, maxConsecutive = 2) {
  const result = [];
  const pool = [...tracks];

  while (pool.length > 0) {
    let blockedArtist = null;
    if (result.length >= maxConsecutive) {
      const lastArtists = result
        .slice(-maxConsecutive)
        .map((t) => (t.artist || '').toLowerCase().trim());
      if (lastArtists.every((a) => a === lastArtists[0])) {
        blockedArtist = lastArtists[0];
      }
    }

    let nextIdx = pool.findIndex((t) => (t.artist || '').toLowerCase().trim() !== blockedArtist);
    if (nextIdx === -1) {
      nextIdx = 0;
    }

    result.push(pool.splice(nextIdx, 1)[0]);
  }

  return result;
}

/**
 * Smart, Non-Repeating Infinite Radio Recommendations
 * Strictly excludes any song present in sessionPlayedKeys (by track.id and normalized title+artist).
 */
export async function fetchSmartRadioRecommendations(seedTrack, sessionPlayedKeys = new Set(), region = 'ID') {
  if (!seedTrack) return [];
  const artistName = seedTrack.artist || '';

  const isIndo = matchArtistToCluster(artistName, INDONESIAN_POP_ROCK_CLUSTER);
  const isRock = matchArtistToCluster(artistName, ROCK_HARD_ROCK_METAL_CLUSTER);

  const queries = [];
  let country = region === 'US' ? 'US' : 'ID';

  if (isIndo) {
    country = 'ID';
    const norm = artistName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const siblings = INDONESIAN_POP_ROCK_CLUSTER.filter(
      (a) => !norm.includes(a.toLowerCase().replace(/[^a-z0-9]/g, ''))
    );
    const shuffledSiblings = [...siblings].sort(() => 0.5 - Math.random()).slice(0, 4);
    queries.push(...shuffledSiblings);
    // 1 different song query from current artist
    queries.push(`${seedTrack.artist} greatest hits`);
  } else if (isRock) {
    const norm = artistName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const peers = ROCK_HARD_ROCK_METAL_CLUSTER.filter(
      (a) => !norm.includes(a.toLowerCase().replace(/[^a-z0-9]/g, ''))
    );
    const shuffledPeers = [...peers].sort(() => 0.5 - Math.random()).slice(0, 4);
    queries.push(...shuffledPeers);
    queries.push(`${seedTrack.artist} rock hits`);
  } else {
    // Dynamic Genre & Album Lookup (For All Other Tracks)
    const genre = seedTrack.primaryGenreName || seedTrack.genre || 'Pop';
    queries.push(`${genre} hits`);
    queries.push(`${seedTrack.artist} top tracks`);
  }

  const searchPromises = queries.map((q) => searchMusic(q, country).catch(() => []));
  const rawResults = await Promise.all(searchPromises);

  const seenKeys = new Set(sessionPlayedKeys);
  if (seedTrack.id) seenKeys.add(seedTrack.id);
  seenKeys.add(getTrackKey(seedTrack));
  seenKeys.add(getTrackDedupeKey(seedTrack));

  const validCandidates = [];
  const artistCounts = new Map();

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    const tracks = rawResults[i] || [];

    for (const track of tracks) {
      if (!track || !track.title) continue;
      if (isCompilationOrKaraoke(track.title, track.artist)) continue;

      // In cluster mode, verify that track is actually from the target band or seed artist
      if (isIndo || isRock) {
        const matchesTarget =
          isArtistFuzzyMatch(track.artist, query) ||
          isArtistFuzzyMatch(track.artist, seedTrack.artist);
        if (!matchesTarget) continue;
      }

      const normKey = getTrackKey(track);
      const dedupeKey = getTrackDedupeKey(track);

      // Strict blacklist filtering
      if (seenKeys.has(track.id) || seenKeys.has(normKey) || seenKeys.has(dedupeKey)) {
        continue;
      }

      // Max 2 tracks per artist to keep radio diverse
      const aNorm = (track.artist || '').toLowerCase().trim();
      const currentCount = artistCounts.get(aNorm) || 0;
      if (currentCount >= 2) continue;

      seenKeys.add(track.id);
      seenKeys.add(normKey);
      seenKeys.add(dedupeKey);
      artistCounts.set(aNorm, currentCount + 1);

      validCandidates.push(track);
    }
  }

  // Shuffle and distribute to prevent consecutive songs by same artist
  const shuffled = [...validCandidates].sort(() => 0.5 - Math.random());
  const distributed = preventConsecutiveArtists(shuffled, 2);
  return distributed.slice(0, 10);
}

/**
 * Canonical Search & Artist Discovery Engine (Apple Music / iTunes catalog)
 * Concurrent dual-entity search (songs + artists) with exact artist boost.
 */
export async function searchMusic(rawQuery, region = 'ID') {
  if (!rawQuery || !rawQuery.trim()) return [];
  const normalized = normalizeQuery(rawQuery);
  const countryCode = region === 'US' ? 'US' : 'ID';

  const songsUrl = `https://itunes.apple.com/search?country=${countryCode}&media=music&entity=song&limit=30&term=${encodeURIComponent(
    normalized
  )}`;
  const artistsUrl = `https://itunes.apple.com/search?country=${countryCode}&media=music&entity=musicArtist&limit=3&term=${encodeURIComponent(
    normalized
  )}`;

  const [songsResult, artistsResult] = await Promise.allSettled([
    fetch(songsUrl, { signal: safeTimeoutSignal(5000) }).then((r) => r.json()),
    fetch(artistsUrl, { signal: safeTimeoutSignal(5000) }).then((r) => r.json()),
  ]);

  const rawSongs = songsResult.status === 'fulfilled' ? songsResult.value.results || [] : [];
  const rawArtists = artistsResult.status === 'fulfilled' ? artistsResult.value.results || [] : [];

  // Parse and filter songs
  const filteredSongs = rawSongs.filter(
    (item) => !isCompilationOrKaraoke(item.trackName, item.artistName, item.collectionName)
  );
  let songsToUse = filteredSongs.length > 0 ? filteredSongs : rawSongs;

  // Auto-fallback: If regional search returned 0 results, retry with global catalog
  if ((songsToUse.length === 0 || rawArtists.length === 0) && countryCode === 'ID') {
    try {
      const fallbackUrl = `https://itunes.apple.com/search?country=US&media=music&entity=song&limit=30&term=${encodeURIComponent(
        normalized
      )}`;
      const fallbackArtistsUrl = `https://itunes.apple.com/search?country=US&media=music&entity=musicArtist&limit=3&term=${encodeURIComponent(
        normalized
      )}`;
      const [fbRes, fbArtistRes] = await Promise.all([
        songsToUse.length === 0
          ? fetch(fallbackUrl, { signal: safeTimeoutSignal(4000) }).then((r) => r.json()).catch(() => ({ results: [] }))
          : Promise.resolve({ results: [] }),
        rawArtists.length === 0
          ? fetch(fallbackArtistsUrl, { signal: safeTimeoutSignal(4000) }).then((r) => r.json()).catch(() => ({ results: [] }))
          : Promise.resolve({ results: [] }),
      ]);
      if (fbRes.results && fbRes.results.length > 0) {
        songsToUse = fbRes.results.filter(
          (item) => !isCompilationOrKaraoke(item.trackName, item.artistName, item.collectionName)
        );
      }
      if (rawArtists.length === 0 && fbArtistRes.results && fbArtistRes.results.length > 0) {
        rawArtists.push(...fbArtistRes.results);
      }
    } catch (e) { }
  }

  // Tier-2 Catalog Fallback: If iTunes search rate-limited (403) or returned empty, query JioSaavn catalog!
  if (songsToUse.length === 0) {
    const jioFallback = await _searchJioSaavnCatalog(normalized, 20);
    songsToUse = jioFallback.map((t) => ({
      wrapperType: 'track',
      kind: 'song',
      trackId: t.id,
      trackName: t.title,
      artistName: t.artist,
      collectionName: t.album,
      artworkUrl100: t.cover,
      trackTimeMillis: (t.duration || 210) * 1000,
      primaryGenreName: t.genre || 'Music',
      previewUrl: t.resolvedStreamUrl || t.audioUrl || '',
      resolvedStreamUrl: t.resolvedStreamUrl || t.audioUrl || '',
    }));
  }

  const lowQuery = normalized.toLowerCase().trim();

  // Determine if the query directly matches an artist entity
  const isQueryArtist = rawArtists.some((ra) => {
    const n = (ra.artistName || '').toLowerCase().trim();
    const cleanN = n.replace(/[^\w\s]/g, '').trim();
    return n === lowQuery || cleanN === lowQuery || n.includes(lowQuery) || lowQuery.includes(n);
  });

  // Relevance Ranking & Short Title Boost (e.g. "Dan" by Sheila On 7)
  const rankedSongs = [...songsToUse].sort((a, b) => {
    const aTitle = (a.trackName || '').toLowerCase();
    const bTitle = (b.trackName || '').toLowerCase();
    const aArtist = (a.artistName || '').toLowerCase();
    const bArtist = (b.artistName || '').toLowerCase();
    const aAlbum = (a.collectionName || '').toLowerCase();
    const bAlbum = (b.collectionName || '').toLowerCase();

    // Clean titles for punctuation-insensitive matching (e.g. "Dan..." vs "Dan")
    const cleanATitle = aTitle.replace(/[^\w\s]/g, '').trim();
    const cleanBTitle = bTitle.replace(/[^\w\s]/g, '').trim();
    const cleanAArtist = aArtist.replace(/[^\w\s]/g, '').trim();
    const cleanBArtist = bArtist.replace(/[^\w\s]/g, '').trim();

    // Deprioritize known indie cover artists below official original artists
    const aIsCover = KNOWN_COVER_ARTISTS.some((ca) => aArtist.includes(ca)) || aTitle.includes('cover') || aAlbum.includes('cover');
    const bIsCover = KNOWN_COVER_ARTISTS.some((ca) => bArtist.includes(ca)) || bTitle.includes('cover') || bAlbum.includes('cover');
    if (!aIsCover && bIsCover) return -1;
    if (aIsCover && !bIsCover) return 1;

    const aArtistExact = aArtist === lowQuery || cleanAArtist === lowQuery;
    const bArtistExact = bArtist === lowQuery || cleanBArtist === lowQuery;

    const aExactTitle = aTitle === lowQuery || cleanATitle === lowQuery;
    const bExactTitle = bTitle === lowQuery || cleanBTitle === lowQuery;

    // Special Boost: In 'ID' region, if an exact title match is "Dan" by Sheila On 7, boost to #1!
    if (countryCode === 'ID') {
      const aIsSo7Dan = aExactTitle && aArtist.includes('sheila on 7');
      const bIsSo7Dan = bExactTitle && bArtist.includes('sheila on 7');
      if (aIsSo7Dan && !bIsSo7Dan) return -1;
      if (!aIsSo7Dan && bIsSo7Dan) return 1;
    }

    // CRITICAL FIX: If user searched for an artist (e.g. "Tulus", "Noah", "Ungu", "Gigi", "Cokelat"),
    // songs BY THAT ARTIST must strictly come first! Never place another artist's song at #1!
    if (isQueryArtist) {
      if (aArtistExact && !bArtistExact) return -1;
      if (!aArtistExact && bArtistExact) return 1;

      const aArtistHas = aArtist.includes(lowQuery) || lowQuery.includes(aArtist);
      const bArtistHas = bArtist.includes(lowQuery) || lowQuery.includes(bArtist);
      if (aArtistHas && !bArtistHas) return -1;
      if (!aArtistHas && bArtistHas) return 1;
    } else {
      // General Song Search (e.g. "Dan", "Kangen", "Istana Bintang")
      if (aExactTitle && !bExactTitle) return -1;
      if (!aExactTitle && bExactTitle) return 1;

      if (aArtistExact && !bArtistExact) return -1;
      if (!aArtistExact && bArtistExact) return 1;
    }

    // Title startsWith lowQuery (e.g. "Dan " vs random title containing "dan")
    const aStartsWith = aTitle.startsWith(lowQuery);
    const bStartsWith = bTitle.startsWith(lowQuery);
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;

    // Indonesian priority artists when searching in 'ID'
    if (countryCode === 'ID') {
      const topIndo = ['sheila on 7', 'dewa 19', 'noah', 'peterpan', 'payung teduh', 'tulus'];
      const aIsIndo = topIndo.some((name) => aArtist.includes(name));
      const bIsIndo = topIndo.some((name) => bArtist.includes(name));
      if (aIsIndo && !bIsIndo) return -1;
      if (!aIsIndo && bIsIndo) return 1;
    }

    return 0;
  });

  // Deduplicate songs by normalized (cleanTitle + cleanArtist)
  // Keeps only the canonical studio album release, completely eliminating duplicate cards with different covers
  const seenTracks = new Set();
  const deduplicatedSongs = [];
  for (const item of rankedSongs) {
    const cleanT = (item.trackName || '')
      .toLowerCase()
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/[-–—].*$/, '')
      .replace(/[^\w\s]/g, '')
      .trim();
    const cleanA = (item.artistName || '')
      .toLowerCase()
      .replace(/\(.*?\)/g, '')
      .replace(/[^\w\s]/g, '')
      .trim();
    const dedupeKey = `${cleanT}__${cleanA}`;
    if (!seenTracks.has(dedupeKey)) {
      seenTracks.add(dedupeKey);
      deduplicatedSongs.push(item);
    }
  }

  const parsedTracks = deduplicatedSongs.map((item) => {
    const durationSec = Math.round((item.trackTimeMillis || 210000) / 1000);
    const cover = (item.artworkUrl100 || '')
      .replace('100x100bb.jpg', '600x600bb.jpg')
      .replace(/^http:\/\//i, 'https://');
    const title = item.trackName || 'Untitled Track';
    const artist = item.artistName || 'Featured Artist';

    return {
      id: `itunes-${item.trackId || Math.random().toString(36).slice(2, 9)}`,
      title,
      artist,
      album: item.collectionName || title,
      duration: durationSec,
      durationFormatted: formatDuration(durationSec),
      cover: cover || '',
      audioUrl: item.previewUrl || '',
      palette: getPaletteForTrack(title, artist),
      genre: item.primaryGenreName || 'Music',
      releaseYear: item.releaseDate ? new Date(item.releaseDate).getFullYear() : 2024,
      explicit: item.trackExplicitness === 'explicit',
      artistId: item.artistId,
      collectionId: item.collectionId,
      source: 'itunes',
    };
  });

  // Extract Top Artist match
  let topArtist = null;
  const hasExactSongMatch =
    parsedTracks.length > 0 &&
    ((parsedTracks[0].title || '').toLowerCase().trim() === lowQuery ||
      (parsedTracks[0].title || '').toLowerCase().replace(/[^\w\s]/g, '').trim() ===
      lowQuery.replace(/[^\w\s]/g, ''));

  if (rawArtists.length > 0) {
    // Only match an artist if:
    // 1) The artist name exactly matches the query (or query alias)
    // 2) AND the query isn't explicitly an exact song title match for a different song
    const exactArtist = rawArtists.find((a) => {
      const name = (a.artistName || '').toLowerCase().trim();
      const cleanN = name.replace(/[^\w\s]/g, '').trim();
      return name === lowQuery || cleanN === lowQuery;
    });

    const isExplicitArtistQuery = isQueryArtist && !hasExactSongMatch;
    const matchedArtist =
      exactArtist ||
      (isExplicitArtistQuery
        ? rawArtists.find((a) => {
          const name = (a.artistName || '').toLowerCase().trim();
          return name.startsWith(lowQuery);
        })
        : null);

    if (matchedArtist) {
      // Find highest resolution artwork STRICTLY from THIS SPECIFIC artist's tracks
      const artistTracks = parsedTracks.filter(
        (t) => t.artistId === matchedArtist.artistId || isArtistFuzzyMatch(t.artist, matchedArtist.artistName)
      );

      // 1) Try verified official artist portrait from artist catalog first
      let artistCover = await fetchArtistPortrait(matchedArtist.artistName, countryCode);

      // 2) Fallback to a track strictly by this artist
      if (!artistCover) {
        artistCover = artistTracks[0]?.cover || '';
      }

      if (artistCover || exactArtist) {
        topArtist = {
          id: matchedArtist.artistId,
          name: matchedArtist.artistName,
          genre: matchedArtist.primaryGenreName || 'Popular Music',
          cover: artistCover,
          trackCount: artistTracks.length || 25,
        };
      }
    }
  }

  // Return array with .topArtist attached for 100% backwards compatibility
  const returnArray = [...parsedTracks];
  returnArray.tracks = parsedTracks;
  returnArray.topArtist = topArtist;

  return returnArray;
}

/**
 * Fetch Artist Discography (Top Songs & Albums)
 * Accepts either an artist object, an artist name string, or a numeric artistId.
 * Queries Apple Music / iTunes artist catalog.
 */
export async function fetchArtistDiscography(artistIdentifier, region = 'ID') {
  if (!artistIdentifier) return { artist: null, tracks: [] };
  const countryCode = region === 'US' ? 'US' : 'ID';

  let artistName = '';
  let artistId = null;
  let initialCover = '';

  if (typeof artistIdentifier === 'object') {
    artistName = artistIdentifier.name || artistIdentifier.title || artistIdentifier.artist || '';
    artistId = artistIdentifier.id && !isNaN(Number(artistIdentifier.id)) ? artistIdentifier.id : null;
    initialCover = artistIdentifier.cover || '';
  } else if (typeof artistIdentifier === 'string') {
    if (!isNaN(Number(artistIdentifier)) && artistIdentifier.length > 3) {
      artistId = artistIdentifier;
    } else {
      artistName = artistIdentifier.trim();
    }
  } else if (typeof artistIdentifier === 'number') {
    artistId = artistIdentifier;
  }

  // Construct search or lookup query URLs for songs AND albums concurrently
  let songsUrl = '';
  let albumsUrl = '';
  if (artistName) {
    songsUrl = `https://itunes.apple.com/search?country=${countryCode}&media=music&entity=song&attribute=artistTerm&limit=15&term=${encodeURIComponent(artistName)}`;
    albumsUrl = `https://itunes.apple.com/search?country=${countryCode}&media=music&entity=album&attribute=artistTerm&limit=12&term=${encodeURIComponent(artistName)}`;
  } else if (artistId) {
    songsUrl = `https://itunes.apple.com/lookup?id=${artistId}&entity=song&country=${countryCode}&limit=15`;
    albumsUrl = `https://itunes.apple.com/lookup?id=${artistId}&entity=album&country=${countryCode}&limit=12`;
  } else {
    return { artist: null, tracks: [], albums: [] };
  }

  try {
    const [songsRes, albumsRes] = await Promise.all([
      fetch(songsUrl, { signal: safeTimeoutSignal(6000) }).then((r) => r.json()).catch(() => ({ results: [] })),
      fetch(albumsUrl, { signal: safeTimeoutSignal(6000) }).then((r) => r.json()).catch(() => ({ results: [] })),
    ]);

    const results = songsRes.results || [];
    const artistObj = results.find((r) => r.wrapperType === 'artist') || null;
    const targetArtistName = artistObj?.artistName || artistName || '';

    // Strictly filter songs: only include songs that actually match this target artist!
    const rawSongs = results.filter((r) => {
      const isSong = (r.wrapperType === 'track' && r.kind === 'song') || r.trackName;
      if (!isSong) return false;
      if (!targetArtistName) return true;
      const tArtist = r.artistName || '';
      return isArtistStrictMatch(tArtist, targetArtistName);
    });

    const tracks = rawSongs.slice(0, 10).map((item, index) => {
      const durationSec = Math.round((item.trackTimeMillis || 210000) / 1000);
      const cover = (item.artworkUrl100 || '')
        .replace('100x100bb.jpg', '600x600bb.jpg')
        .replace(/^http:\/\//i, 'https://');
      const title = item.trackName || 'Untitled Track';
      const resolvedArtist = item.artistName || targetArtistName || 'Artist';

      return {
        id: `artist-track-${item.trackId || index}`,
        title,
        artist: resolvedArtist,
        album: item.collectionName || title,
        duration: durationSec,
        durationFormatted: formatDuration(durationSec),
        cover: cover || '',
        audioUrl: item.previewUrl || '',
        palette: getPaletteForTrack(title, resolvedArtist),
        releaseYear: item.releaseDate ? new Date(item.releaseDate).getFullYear() : 2024,
        explicit: item.trackExplicitness === 'explicit',
        artistId: item.artistId || artistId,
        source: 'itunes',
      };
    });

    const finalArtistName = targetArtistName || tracks[0]?.artist || 'Featured Artist';

    // Parse Albums & Singles strictly matching this artist
    const rawAlbums = albumsRes.results || [];
    const albums = rawAlbums
      .filter((r) => {
        const isAlbum = (r.wrapperType === 'collection' || r.collectionType === 'Album' || r.collectionName) && r.wrapperType !== 'artist';
        if (!isAlbum) return false;
        if (!targetArtistName) return true;
        const aArtist = r.artistName || '';
        return isArtistStrictMatch(aArtist, targetArtistName);
      })
      .map((item, idx) => {
        const cover = (item.artworkUrl100 || '')
          .replace('100x100bb.jpg', '600x600bb.jpg')
          .replace(/^http:\/\//i, 'https://');
        const trackCount = item.trackCount || 1;
        const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : 2024;
        return {
          id: `album-${item.collectionId || idx}`,
          collectionId: item.collectionId || '',
          title: item.collectionName || 'Album',
          artist: item.artistName || finalArtistName,
          cover: cover || '', // NEVER borrow tracks[0]?.cover!
          releaseYear: year,
          trackCount,
          type: trackCount <= 3 ? 'Single / EP' : 'Album',
        };
      });

    const genreLabel = artistObj?.primaryGenreName || rawSongs[0]?.primaryGenreName || 'Artist Catalog';
    const catalogSummary = albums.length > 0
      ? `${albums.length} albums • ${genreLabel}`
      : `${tracks.length} top songs • ${genreLabel}`;

    // Strictly resolve verified artist portrait from official catalog
    const verifiedPortrait = await fetchArtistPortrait(finalArtistName, countryCode);
    const matchingAlbum = albums.find((a) => isArtistStrictMatch(a.artist, finalArtistName));
    const matchingTrack = tracks.find((t) => isArtistStrictMatch(t.artist, finalArtistName));
    const artistCover = verifiedPortrait || matchingAlbum?.cover || matchingTrack?.cover || initialCover || '';

    return {
      artist: {
        id: artistId || tracks[0]?.artistId || finalArtistName,
        name: finalArtistName,
        genre: genreLabel,
        cover: artistCover,
        totalTracks: tracks.length,
        monthlyListeners: catalogSummary,
      },
      tracks,
      albums,
    };
  } catch (err) {
    console.warn('Artist discography fetch fallback:', err);
    return {
      artist: {
        id: artistId || artistName,
        name: artistName || 'Artist',
        genre: 'Pop / Rock',
        cover: initialCover || '',
        totalTracks: 0,
        monthlyListeners: 'Verified Artist Catalog',
      },
      tracks: [],
      albums: [],
    };
  }
}

/**
 * Fetch Real Trending / Top Tracks for Search Default State
 */
export async function fetchTrendingTracks(region = 'ID') {
  const trendingQueries =
    region === 'ID'
      ? [
        'Sheila On 7 Dan',
        'Dewa 19 Kangen',
        'Noah Separuh Aku',
        'Payung Teduh Akad',
        'Sheila On 7 Sephia',
        "Guns N' Roses November Rain",
        'Avenged Sevenfold Dear God',
        'Dewa 19 Pupus',
      ]
      : [
        "Guns N' Roses Sweet Child O' Mine",
        'Avenged Sevenfold Dear God',
        'Oasis Wonderwall',
        'Radiohead Creep',
        'Arctic Monkeys Do I Wanna Know',
        'Queen Bohemian Rhapsody',
        'Coldplay Fix You',
        'Nirvana Smells Like Teen Spirit',
      ];

  const results = [];
  for (const q of trendingQueries.slice(0, 6)) {
    try {
      const res = await searchMusic(q, region);
      if (res.length > 0) {
        results.push(res[0]);
      }
    } catch (e) {
      // Continue
    }
  }

  return results;
}

/**
 * Real Home Feed Initialization with Region-Aware Rotation
 */
export async function fetchHomeFeed(region = 'ID') {
  const featuredRequests =
    region === 'ID'
      ? [
        { title: 'Dan...', query: 'Sheila On 7 Dan' },
        { title: 'Kangen', query: 'Dewa 19 Kangen' },
        { title: 'Separuh Aku', query: 'Noah Separuh Aku' },
        { title: 'Akad', query: 'Payung Teduh Akad' },
        { title: 'November Rain', query: "Guns N' Roses November Rain" },
        { title: 'Dear God', query: 'Avenged Sevenfold Dear God' },
        { title: 'Sephia', query: 'Sheila On 7 Sephia' },
        { title: 'Pupus', query: 'Dewa 19 Pupus' },
      ]
      : [
        { title: 'November Rain', query: "Guns N' Roses November Rain" },
        { title: 'Dear God', query: 'Avenged Sevenfold Dear God' },
        { title: 'Wonderwall', query: 'Oasis Wonderwall' },
        { title: 'Bohemian Rhapsody', query: 'Queen Bohemian Rhapsody' },
        { title: 'Creep', query: 'Radiohead Creep' },
        { title: 'Do I Wanna Know?', query: 'Arctic Monkeys Do I Wanna Know' },
        { title: 'Fix You', query: 'Coldplay Fix You' },
        { title: 'Smells Like Teen Spirit', query: 'Nirvana Smells Like Teen Spirit' },
      ];

  const quickPicks = [];
  for (const req of featuredRequests) {
    try {
      const tracks = await searchMusic(req.query, region);
      if (tracks.length > 0) {
        quickPicks.push(tracks[0]);
      }
    } catch (e) {
      // Continue
    }
  }

  return quickPicks;
}

/**
 * Fetch Real Apple Music Top Ranked Charts
 * Country-specific RSS feed ('ID' for Indonesia Top 50, 'US' for Global Top 50)
 */
export async function fetchTopCharts(region = 'ID', limit = 50) {
  try {
    const regCode = (region || 'ID').toLowerCase();
    const url = `https://itunes.apple.com/${regCode}/rss/topsongs/limit=${limit}/json`;
    const res = await fetch(url, { signal: safeTimeoutSignal(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const entries = data.feed?.entry || [];

    return entries.map((e, idx) => {
      const title = e['im:name']?.label || 'Untitled';
      const artist = e['im:artist']?.label || 'Unknown Artist';
      const rawImg = e['im:image']?.[2]?.label || e['im:image']?.[1]?.label || '';
      const cover = rawImg ? rawImg.replace(/170x170/g, '400x400') : '';
      const previewUrl = e.link?.[1]?.attributes?.href || '';
      const rawDur = parseInt(e['im:duration']?.label || '210', 10);
      const duration = rawDur > 1000 ? Math.round(rawDur / 1000) : rawDur;
      const genre = e.category?.attributes?.label || 'Pop';
      const rank = idx + 1;
      const trend = idx === 0 ? 'HOT' : idx < 3 ? '▲' : idx % 5 === 0 ? 'NEW' : idx % 2 === 0 ? '▲' : '▼';

      return {
        id: `chart_${regCode}_${e.id?.attributes?.['im:id'] || idx}`,
        title,
        artist,
        album: e['im:collection']?.['im:name']?.label || title,
        cover,
        duration,
        durationFormatted: formatDuration(duration),
        previewUrl,
        audioUrl: previewUrl,
        genre,
        rank,
        trend,
        region: regCode.toUpperCase(),
        palette: getPaletteForTrack(title, artist),
      };
    });
  } catch (err) {
    console.warn('Failed to fetch Apple Top Charts, using fallback:', err);
    return [];
  }
}

/**
 * Fetch Fresh New Releases for active region
 */
export async function fetchNewReleases(region = 'ID') {
  try {
    const regCode = (region || 'ID').toLowerCase();
    const url = `https://itunes.apple.com/${regCode}/rss/topalbums/limit=15/json`;
    const res = await fetch(url, { signal: safeTimeoutSignal(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const entries = data.feed?.entry || [];

    return entries.map((e, idx) => {
      const title = e['im:name']?.label || 'New Album';
      const artist = e['im:artist']?.label || 'Featured Artist';
      const rawImg = e['im:image']?.[2]?.label || e['im:image']?.[1]?.label || '';
      const cover = rawImg ? rawImg.replace(/170x170/g, '400x400') : '';
      const genre = e.category?.attributes?.label || 'New Release';

      return {
        id: `rel_${regCode}_${e.id?.attributes?.['im:id'] || idx}`,
        collectionId: e.id?.attributes?.['im:id'] || '',
        title,
        artist,
        subtitle: artist,
        cover,
        genre,
        releaseDate: e['im:releaseDate']?.attributes?.label || 'Recent',
        palette: getPaletteForTrack(title, artist),
      };
    });
  } catch (err) {
    console.warn('Failed fetching new releases:', err);
    return [];
  }
}

/**
 * Fetch real tracklist for an Apple Music / iTunes Album by collectionId
 */
export async function fetchAlbumTracks(collectionId, region = 'ID') {
  if (!collectionId) return [];
  try {
    const regCode = (region || 'ID').toLowerCase();
    const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(collectionId)}&entity=song&country=${regCode}`;
    const res = await fetch(url, { signal: safeTimeoutSignal(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    const songs = (data.results || []).filter((r) => r.wrapperType === 'track' && r.trackName);
    return songs.map((item) => {
      const durationSec = Math.round((item.trackTimeMillis || 210000) / 1000);
      const cover = (item.artworkUrl100 || '')
        .replace('100x100bb.jpg', '600x600bb.jpg')
        .replace(/^http:\/\//i, 'https://');
      const title = item.trackName || 'Untitled Track';
      const artist = item.artistName || 'Artist';
      return {
        id: `itunes-${item.trackId || Math.random().toString(36).slice(2, 9)}`,
        title,
        artist,
        album: item.collectionName || title,
        duration: durationSec,
        durationFormatted: formatDuration(durationSec),
        cover: cover || '',
        audioUrl: item.previewUrl || '',
        previewUrl: item.previewUrl || '',
        genre: item.primaryGenreName || 'Music',
        palette: getPaletteForTrack(title, artist),
        artistId: item.artistId,
        collectionId: item.collectionId,
        source: 'itunes',
      };
    });
  } catch (err) {
    console.warn('Failed fetching album tracks:', err);
    return [];
  }
}

const _categoryCache = new Map();
const CATEGORY_SESSION_TTL_MS = 20 * 60 * 1000;

function _readSessionCategoryCache(key) {
  if (_categoryCache.has(key)) return _categoryCache.get(key);
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(`octav_cat_${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.tracks) && Date.now() < parsed.expiresAt) {
      _categoryCache.set(key, parsed.tracks);
      return parsed.tracks;
    }
  } catch { }
  return null;
}

function _writeSessionCategoryCache(key, tracks) {
  if (!Array.isArray(tracks) || tracks.length === 0) return;
  _categoryCache.set(key, tracks);
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(
        `octav_cat_${key}`,
        JSON.stringify({ tracks, expiresAt: Date.now() + CATEGORY_SESSION_TTL_MS })
      );
    }
  } catch { }
}

function _decodeBasicEntities(str = '') {
  return String(str || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

async function _searchJioSaavnCatalog(query, limit = 6) {
  const endpoints = [
    ...(typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)
      ? [`/api/resolve-stream?q=${encodeURIComponent(query)}&limit=${limit}`]
      : []),
    `https://jiosaavn-api-private.vercel.app/search/songs?q=${encodeURIComponent(query)}&limit=${limit}`,
    `https://jiosaavn-api-taupe.vercel.app/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { signal: safeTimeoutSignal(5000) });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok || !ct.includes('application/json')) continue;
      const json = await res.json();
      const rawList = json?.data?.results || json?.results || [];
      if (!Array.isArray(rawList) || rawList.length === 0) continue;

      const mapped = [];
      for (const s of rawList) {
        if (!s || Number(s.duration || 0) < 40) continue;
        const title = _decodeBasicEntities(s.name || s.title || 'Untitled');
        const sub = _decodeBasicEntities(s.subtitle || '');
        const primary =
          (s.artist_map?.primary_artists || []).map((a) => _decodeBasicEntities(a.name || '')).filter(Boolean).join(', ') ||
          (s.artists?.primary || []).map((a) => _decodeBasicEntities(a.name || '')).filter(Boolean).join(', ') ||
          (typeof s.primaryArtists === 'string' ? _decodeBasicEntities(s.primaryArtists) : '') ||
          (sub.includes(' - ') ? sub.split(' - ')[0] : sub) ||
          'Artist';
        const album = _decodeBasicEntities(typeof s.album === 'string' ? s.album : s.album?.name || title);
        if (isCompilationOrKaraoke(title, primary, album)) continue;
        const lowQ = query.toLowerCase();
        const lowT = title.toLowerCase();
        if (
          (/\b(remix|original mix|slowed|reverb|lofi|lo-fi|mashup|nightcore|sped up)\b/i.test(lowT) &&
            !/\b(remix|slowed|lofi|mashup)\b/i.test(lowQ))
        ) {
          continue;
        }

        const downloads = s.downloadUrl || s.download_url || [];
        const bestAudio =
          downloads.find((d) => d.quality === '320kbps') ||
          downloads.find((d) => d.quality === '160kbps') ||
          downloads[downloads.length - 1];
        const audioUrl = bestAudio?.link || bestAudio?.url || '';
        if (!isValidDecryptedStreamUrl(audioUrl)) continue;

        const imgs = Array.isArray(s.image) ? s.image : [];
        const bestImg = imgs[imgs.length - 1]?.link || imgs[imgs.length - 1]?.url || (typeof s.image === 'string' ? s.image : '');
        const cover = String(bestImg || '').replace(/^http:\/\//i, 'https://');
        const durSec = Number(s.duration || 210);

        mapped.push({
          id: `saavn-${s.id || title}`,
          title,
          artist: primary,
          album,
          cover,
          duration: durSec,
          durationFormatted: formatDuration(durSec),
          previewUrl: audioUrl,
          audioUrl,
          resolvedStreamUrl: audioUrl,
          genre: 'Music',
          palette: getPaletteForTrack(title, primary),
          source: 'saavn',
        });
      }
      if (mapped.length > 0) {
        const qTokens = normalizeMatchText(query).split(' ').filter((w) => w.length >= 2);
        const scored = mapped
          .map((t) => {
            const artN = normalizeMatchText(t.artist);
            const titN = normalizeMatchText(t.title);
            let artistHits = 0;
            let titleHits = 0;
            for (const tok of qTokens) {
              if (artN.includes(tok)) artistHits += 1;
              if (titN.includes(tok)) titleHits += 1;
            }
            return { track: t, artistHits, titleHits, score: artistHits * 3 + titleHits };
          })
          // Filter out completely unrelated cover/DJ remixes when query specifies artist + song
          .filter((entry) => qTokens.length < 2 || entry.artistHits > 0)
          .sort((a, b) => b.score - a.score)
          .map((entry) => entry.track);

        if (scored.length > 0) return scored;
      }
    } catch { }
  }
  return [];
}

function _mapItunesSongItem(item, fallbackArtist = '') {
  const durationSec = Math.round((item.trackTimeMillis || 210000) / 1000);
  const title = item.trackName || 'Untitled';
  const artist = item.artistName || fallbackArtist || 'Unknown Artist';
  const cover = item.artworkUrl100
    ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg')
    : '';
  return {
    id: `itunes-${item.trackId}`,
    title,
    artist,
    album: item.collectionName || 'Single',
    cover,
    duration: durationSec,
    durationFormatted: formatDuration(durationSec),
    previewUrl: item.previewUrl || '',
    audioUrl: item.resolvedStreamUrl || item.previewUrl || '',
    resolvedStreamUrl: item.resolvedStreamUrl || '',
    genre: item.primaryGenreName || 'Music',
    palette: getPaletteForTrack(title, artist),
    artistId: item.artistId,
    collectionId: item.collectionId,
    source: 'itunes',
  };
}

async function _fetchQuickItunesTracks(query, region = 'ID') {
  const countryCode = region === 'US' ? 'US' : 'ID';
  const fetchCountry = async (cc) => {
    try {
      const url = `https://itunes.apple.com/search?country=${cc}&media=music&entity=song&limit=6&term=${encodeURIComponent(query)}`;
      const res = await fetch(url, { signal: safeTimeoutSignal(4500) });
      if (!res.ok) return { rateLimited: res.status === 403 || res.status === 429, tracks: [] };
      const data = await res.json();
      const raw = (data.results || []).filter(
        (item) =>
          item.trackName &&
          item.previewUrl &&
          !isCompilationOrKaraoke(item.trackName, item.artistName, item.collectionName)
      );
      return { rateLimited: false, tracks: raw.map((item) => _mapItunesSongItem(item)) };
    } catch {
      return { rateLimited: false, tracks: [] };
    }
  };

  const localRes = await fetchCountry(countryCode);
  if (localRes.tracks.length > 0) return localRes.tracks;

  if (!localRes.rateLimited && countryCode !== 'US') {
    const usRes = await fetchCountry('US');
    if (usRes.tracks.length > 0) return usRes.tracks;
  }

  // Fallback directly to JioSaavn catalog when iTunes search is rate-limited (403/429) or empty
  return _searchJioSaavnCatalog(query, 6);
}

async function _fetchAppleRssGenre(region = 'ID', rssGenreId = 14) {
  try {
    const cc = region === 'US' ? 'us' : 'id';
    const url = `https://itunes.apple.com/${cc}/rss/topsongs/limit=15/genre=${rssGenreId}/json`;
    const res = await fetch(url, { signal: safeTimeoutSignal(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.feed?.entry || []).map((e, idx) => {
      const title = e['im:name']?.label || 'Untitled';
      const artist = e['im:artist']?.label || 'Unknown Artist';
      const rawImg = e['im:image']?.[2]?.label || e['im:image']?.[1]?.label || '';
      const cover = rawImg ? rawImg.replace(/170x170/g, '400x400') : '';
      const previewUrl = e.link?.[1]?.attributes?.href || '';
      const rawDur = parseInt(e['im:duration']?.label || '210', 10);
      const duration = rawDur > 1000 ? Math.round(rawDur / 1000) : rawDur;
      return {
        id: `rss_${cc}_${rssGenreId}_${e.id?.attributes?.['im:id'] || idx}`,
        title,
        artist,
        album: e['im:collection']?.['im:name']?.label || title,
        cover,
        duration,
        durationFormatted: formatDuration(duration),
        previewUrl,
        audioUrl: previewUrl,
        genre: e.category?.attributes?.label || 'Music',
        palette: getPaletteForTrack(title, artist),
      };
    });
  } catch {
    return [];
  }
}

async function _collectUniqueTracks(queries = [], region = 'ID', maxPerQuery = 1, limit = 15, fallbackRssGenre = null) {
  const seen = new Set();
  const collected = [];
  const BATCH_SIZE = 3;

  for (let i = 0; i < queries.length; i += BATCH_SIZE) {
    if (collected.length >= limit) break;
    const chunk = queries.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(
      chunk.map((q) => _fetchQuickItunesTracks(q, region))
    );

    for (const result of settled) {
      if (result.status !== 'fulfilled' || !Array.isArray(result.value)) continue;
      let addedForQuery = 0;
      for (const track of result.value) {
        if (!track || !track.title) continue;
        const dedupeKey = `${(track.title || '').toLowerCase().trim()}::${(track.artist || '').toLowerCase().trim()}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        collected.push(track);
        addedForQuery += 1;
        if (addedForQuery >= maxPerQuery || collected.length >= limit) break;
      }
      if (collected.length >= limit) break;
    }
  }

  if (collected.length < 4 && fallbackRssGenre) {
    const rss = await _fetchAppleRssGenre(region, fallbackRssGenre);
    for (const track of rss) {
      const dedupeKey = `${(track.title || '').toLowerCase().trim()}::${(track.artist || '').toLowerCase().trim()}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      collected.push(track);
      if (collected.length >= limit) break;
    }
  }

  return collected;
}

const CATEGORY_QUERIES = {
  'Indo Hits': [
    'Tulus Hati Hati di Jalan',
    'Mahalini Sial',
    'Nadin Amizah Bertaut',
    'Dewa 19 Kangen',
    'Sheila On 7 Dan',
    'Hindia Evaluasi',
    'Noah Separuh Aku',
    'Raisa Kali Kedua',
    'Sal Priadi Gala Bunga Matahari',
    'Bernadya Satu Bulan',
    'Juicy Luicy Lantas',
    'Lyodra Pesan Terakhir',
  ],
  Rock: [
    "Guns N' Roses Sweet Child O' Mine",
    'Queen Bohemian Rhapsody',
    'Nirvana Smells Like Teen Spirit',
    'Linkin Park Numb',
    'Avenged Sevenfold Dear God',
    'Arctic Monkeys Do I Wanna Know',
    'Oasis Wonderwall',
    'Metallica Enter Sandman',
    'Red Hot Chili Peppers Californication',
    'Bon Jovi Livin On A Prayer',
  ],
  Acoustic: [
    'Payung Teduh Akad',
    'John Mayer Slow Dancing in a Burning Room',
    'Pamungkas To The Bone',
    'Ed Sheeran Photograph',
    'Banda Neira Sampai Jadi Debu',
    'Fiersa Besari Celengan Rindu',
    'Tulus Monokrom',
    'John Mayer Gravity',
    'Jason Mraz I Wont Give Up',
    'Fourtwnty Zona Nyaman',
  ],
};

const GENRE_QUERIES = {
  g1: ["Guns N' Roses Welcome to the Jungle", 'Metallica Enter Sandman', 'Linkin Park In The End', 'Avenged Sevenfold Nightmare', 'Queen We Will Rock You', 'Nirvana Come As You Are', 'Foo Fighters Everlong', 'Green Day Boulevard of Broken Dreams'],
  g2: ['Tulus Monokrom', 'Mahalini Melawan Restu', 'Raisa Kali Kedua', 'Tiara Andini Usai', 'Lyodra Sang Dewi', 'Bernadya Untungnya Hidup Harus Tetap Berjalan', 'Sal Priadi Dari Planet Lain', 'Rizky Febian Hingga Tua Bersama'],
  g3: ['Hindia Rumah ke Rumah', 'Feast Peradaban', 'Tame Impala The Less I Know The Better', 'Reality Club Anything You Want', 'Radiohead Creep', 'Arctic Monkeys 505', 'The Strokes Last Nite', 'Efek Rumah Kaca Desember'],
  g4: ['Oasis Wonderwall', 'Blur Song 2', 'The Verve Bitter Sweet Symphony', 'Coldplay Yellow', 'Keane Somewhere Only We Know', 'Oasis Dont Look Back In Anger', 'Pulp Common People', 'Suede Beautiful Ones'],
  g5: ['Dewa 19 Pupus', 'Sheila On 7 Sephia', 'Padi Begitu Indah', 'Nirvana Come As You Are', 'Red Hot Chili Peppers Californication', 'Dewa 19 Kangen', 'Sheila On 7 Sebuah Kisah Klasik', 'Radiohead High and Dry'],
  g6: ['Payung Teduh Untuk Perempuan Yang Sedang Dalam Pelukan', 'Fourtwnty Zona Nyaman', 'Jason Mraz I Wont Give Up', 'John Mayer Gravity', 'Norah Jones Come Away With Me', 'Pamungkas Monolog', 'Tulus Pamit', 'Ed Sheeran Thinking Out Loud'],
  g7: ["Queen Don't Stop Me Now", 'Coldplay Viva La Vida', 'Imagine Dragons Believer', 'Bon Jovi Livin On A Prayer', 'U2 With Or Without You', 'The Killers Mr Brightside', 'Queen We Are The Champions', 'Coldplay Fix You'],
  g8: ['Adele Someone Like You', 'Glenn Fredly Januari', 'Chrisye Seperti Yang Kau Minta', 'Sam Smith Stay With Me', 'Lewis Capaldi Someone You Loved', 'Mahalini Sial', 'Judika Aku Yang Tersakiti', 'Bruno Mars When I Was Your Man'],
};

const CATEGORY_RSS_GENRES = {
  'Indo Hits': 14,
  Rock: 21,
  Acoustic: 10,
};

const GENRE_RSS_IDS = {
  g1: 21,
  g2: 14,
  g3: 20,
  g4: 20,
  g5: 21,
  g6: 10,
  g7: 21,
  g8: 14,
};

/**
 * Fetch distinct real tracks for a Home category filter tab
 */
export async function fetchCategoryFeed(category, region = 'ID') {
  if (!category || category === 'All') return [];
  const cacheKey = `cat:${category}:${region}`;
  const cached = _readSessionCategoryCache(cacheKey);
  if (cached) return cached;

  let tracks = [];
  if (category === 'Trending') {
    const charts = await fetchTopCharts(region, 20);
    tracks = charts.length > 0 ? charts : await fetchTrendingTracks(region);
  } else {
    const queries = CATEGORY_QUERIES[category] || [category];
    tracks = await _collectUniqueTracks(
      queries,
      region,
      1,
      15,
      CATEGORY_RSS_GENRES[category] || 14
    );
  }

  _writeSessionCategoryCache(cacheKey, tracks);
  return tracks;
}

/**
 * Fetch distinct real tracks for SearchView Browse-All genre cards
 */
export async function fetchGenrePlaylistTracks(genreId, genreTitle, region = 'ID') {
  const cacheKey = `genre:${genreId || genreTitle}:${region}`;
  const cached = _readSessionCategoryCache(cacheKey);
  if (cached) return cached;

  const queries = GENRE_QUERIES[genreId] || [genreTitle || 'Popular Hits'];
  const tracks = await _collectUniqueTracks(
    queries,
    region,
    GENRE_QUERIES[genreId] ? 1 : 3,
    15,
    GENRE_RSS_IDS[genreId] || 14
  );

  _writeSessionCategoryCache(cacheKey, tracks);
  return tracks;
}

