/**
 * Octav Monthly Recap & Yearly Wrapped Stats Service
 * Tracks listening time, play counts, top songs, top artists, and hourly patterns
 * across monthly periods and full-year Wrapped events.
 */

const STORAGE_KEY_STATS = 'octav_listening_stats';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function getCurrentPeriodKeys() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const yearKey = `${year}`;
  return {
    monthKey,
    yearKey,
    currentHour: now.getHours(),
    monthName: MONTH_NAMES[month],
    year,
  };
}

export function getAvailablePeriods() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const currentMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const prevDate = new Date(year, month - 1, 1);
  const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  return [
    {
      id: currentMonthKey,
      label: `${MONTH_NAMES[month]} ${year}`,
      shortLabel: 'Bulan Ini',
      tag: 'Monthly Recap',
      type: 'month',
    },
    {
      id: prevMonthKey,
      label: `${MONTH_NAMES[prevDate.getMonth()]} ${prevDate.getFullYear()}`,
      shortLabel: 'Bulan Lalu',
      tag: 'Past Recap',
      type: 'month',
    },
    {
      id: `${year}`,
      label: `${year} Wrapped`,
      shortLabel: `${year} Wrapped`,
      tag: 'Yearly Event',
      type: 'year',
    },
    {
      id: 'all',
      label: 'All-Time',
      shortLabel: 'Semua Waktu',
      tag: 'Lifetime Stats',
      type: 'all',
    },
  ];
}

export function getStatsStorageKey(userId, period = 'all') {
  const baseKey = userId ? `octav_user_${userId}_stats` : STORAGE_KEY_STATS;
  return period && period !== 'all' ? `${baseKey}_${period}` : baseKey;
}

export function getListeningStats(userId, period = 'current-month') {
  const { monthKey, yearKey } = getCurrentPeriodKeys();
  let resolvedPeriod = period;
  if (period === 'current-month') resolvedPeriod = monthKey;
  if (period === 'current-year') resolvedPeriod = yearKey;

  // 1. Try reading targeted period stats
  try {
    const key = getStatsStorageKey(userId, resolvedPeriod);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.playsCount > 0 || parsed.totalSeconds > 0)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read period listening stats:', e);
  }

  // 2. Fallback to all-time stats if period is not yet independently accumulated
  try {
    const allKey = getStatsStorageKey(userId, 'all');
    const rawAll = localStorage.getItem(allKey);
    if (rawAll) {
      const parsedAll = JSON.parse(rawAll);
      if (parsedAll && (parsedAll.playsCount > 0 || parsedAll.totalSeconds > 0)) {
        return parsedAll;
      }
    }
  } catch (e) {}

  // Pure zero-state default (never invent fake plays or simulated hourly distributions)
  return {
    totalSeconds: 0,
    playsCount: 0,
    tracks: {},
    artists: {},
    hourlyDistribution: {},
    period: resolvedPeriod,
  };
}

function updateStatsObject(stats, track, secondsListened, hour, incrementPlayCount = true) {
  stats.totalSeconds = (stats.totalSeconds || 0) + Math.max(0, Math.round(secondsListened));
  if (incrementPlayCount) {
    stats.playsCount = (stats.playsCount || 0) + 1;
    if (!stats.hourlyDistribution) stats.hourlyDistribution = {};
    stats.hourlyDistribution[hour] = (stats.hourlyDistribution[hour] || 0) + 1;
  }

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
  if (incrementPlayCount) {
    stats.tracks[trackKey].plays += 1;
  }
  stats.tracks[trackKey].seconds += Math.max(0, Math.round(secondsListened));

  // Artist map
  if (!stats.artists) stats.artists = {};
  const artistKey = track.artist || 'Unknown Artist';
  if (!stats.artists[artistKey]) {
    stats.artists[artistKey] = { name: artistKey, plays: 0 };
  }
  if (incrementPlayCount) {
    stats.artists[artistKey].plays += 1;
  }
}

export function recordTrackPlay(track, secondsListened = 0, userId = null, incrementPlayCount = true) {
  if (!track || !track.title) return;
  if (secondsListened <= 0 && !incrementPlayCount) return;

  try {
    const { monthKey, yearKey, currentHour } = getCurrentPeriodKeys();

    const targets = ['all', monthKey, yearKey];
    targets.forEach((period) => {
      const key = getStatsStorageKey(userId, period);
      let targetStats;
      try {
        const raw = localStorage.getItem(key);
        targetStats = raw ? JSON.parse(raw) : { totalSeconds: 0, playsCount: 0, tracks: {}, artists: {}, hourlyDistribution: {} };
      } catch {
        targetStats = { totalSeconds: 0, playsCount: 0, tracks: {}, artists: {}, hourlyDistribution: {} };
      }

      updateStatsObject(targetStats, track, secondsListened, currentHour, incrementPlayCount);
      localStorage.setItem(key, JSON.stringify(targetStats));
    });
  } catch (err) {
    console.warn('Failed to record track play stats:', err);
  }
}

export function exportCompactStatsForCloud(userId = null) {
  try {
    const { monthKey } = getCurrentPeriodKeys();
    const rawAll = localStorage.getItem(getStatsStorageKey(userId, 'all'));
    const rawMonth = localStorage.getItem(getStatsStorageKey(userId, monthKey));
    const allStats = rawAll ? JSON.parse(rawAll) : null;
    const monthStats = rawMonth ? JSON.parse(rawMonth) : null;

    const trimTracks = (map) => {
      if (!map || typeof map !== 'object') return {};
      return Object.fromEntries(
        Object.entries(map)
          .sort((a, b) => (b[1].seconds || 0) - (a[1].seconds || 0))
          .slice(0, 12)
      );
    };

    return {
      monthKey,
      all: allStats ? { ...allStats, tracks: trimTracks(allStats.tracks) } : null,
      month: monthStats ? { ...monthStats, tracks: trimTracks(monthStats.tracks) } : null,
    };
  } catch {
    return null;
  }
}

export function hydrateStatsFromCloud(userId, cloudStats) {
  if (!userId || !cloudStats) return;
  try {
    const mergeStore = (period, incoming) => {
      if (!incoming) return;
      const key = getStatsStorageKey(userId, period);
      const existingRaw = localStorage.getItem(key);
      const existing = existingRaw ? JSON.parse(existingRaw) : null;
      if (!existing || (incoming.totalSeconds || 0) > (existing.totalSeconds || 0)) {
        localStorage.setItem(key, JSON.stringify(incoming));
      }
    };
    if (cloudStats.all) mergeStore('all', cloudStats.all);
    if (cloudStats.month && cloudStats.monthKey) mergeStore(cloudStats.monthKey, cloudStats.month);
  } catch {}
}

/**
 * Determines whether the Monthly Recap event is currently active.
 * The event is held at the end of the month (from day 25 through the last day)
 * until the 2nd day of the following month.
 */
export function isMonthlyRecapActive(date = new Date()) {
  const day = date.getDate();
  return day >= 25 || day <= 2;
}

/**
 * Returns the target recap period info (name, status, active state, next schedule)
 */
export function getRecapEventStatus(date = new Date()) {
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  const isActive = day >= 25 || day <= 2;

  // If day <= 2, it recaps the previous month that just ended
  let recapMonthIdx = month;
  let recapYear = year;
  if (day <= 2) {
    const prevDate = new Date(year, month - 1, 1);
    recapMonthIdx = prevDate.getMonth();
    recapYear = prevDate.getFullYear();
  }

  const recapMonthName = MONTH_NAMES[recapMonthIdx];
  const nextEventDate = day < 25 ? `25 ${MONTH_NAMES[month]}` : `25 ${MONTH_NAMES[(month + 1) % 12]}`;

  return {
    isActive,
    recapMonthName,
    recapYear,
    label: `${recapMonthName} ${recapYear}`,
    nextEventDate,
    day,
  };
}

/**
 * Computes stylistic "Sound Architecture & Listening Persona"
 * derived from hourly distribution, artist replay loyalty, and catalog diversity.
 */
export function computeListeningPersona(stats) {
  const totalPlays = stats.playsCount || 0;
  if (totalPlays === 0) {
    return {
      title: 'The Curious Ear',
      badge: 'ARCHETYPE 01',
      tagline: 'Eksplorasi Katalog Baru',
      description: 'Rotasi lagumu baru mulai terbentuk. Putar lebih banyak lagu untuk memetakan arsitektur suaramu.',
      vibeColor: '#1ed760',
      accentColor: '#10b981',
      peakHour: '12:00',
      archetypeCode: 'EXPL-01',
    };
  }

  const hourly = stats.hourlyDistribution || {};
  let nightPlays = 0;
  let morningPlays = 0;
  let dayPlays = 0;
  let peakHour = 21;
  let peakHourCount = 0;

  for (let h = 0; h < 24; h++) {
    const count = hourly[h] || 0;
    if (count > peakHourCount) {
      peakHourCount = count;
      peakHour = h;
    }
    if (h >= 22 || h <= 4) nightPlays += count;
    else if (h >= 5 && h <= 11) morningPlays += count;
    else dayPlays += count;
  }

  const artists = Object.values(stats.artists || {});
  artists.sort((a, b) => b.plays - a.plays);
  const topArtistPlays = artists[0]?.plays || 0;

  // 1. Devoted Loyalist (Extremely high single-artist devotion)
  if (artists.length >= 1 && (topArtistPlays / totalPlays) >= 0.45) {
    return {
      title: 'The Devoted Loyalist',
      badge: 'HEAVY ROTATION',
      tagline: 'Kesetiaan Katalog Penuh',
      description: `Rotasimu didominasi oleh ${artists[0].name}. Bukan sekadar mendengarkan, kamu mendalami setiap detail diskografinya secara intensif.`,
      vibeColor: '#f97316',
      accentColor: '#fb923c',
      peakHour: `${String(peakHour).padStart(2, '0')}:00`,
      archetypeCode: 'LOYAL-09',
    };
  }

  // 2. Nocturnal Audiophile (Peak hours 22:00 - 04:00)
  if (nightPlays > 0 && (nightPlays / totalPlays) >= 0.35) {
    return {
      title: 'The Nocturnal Audiophile',
      badge: 'MIDNIGHT FREQUENCY',
      tagline: 'Resonansi Tengah Malam',
      description: 'Fokus musikmu mencapai puncak saat dunia luar sunyi. Jam larut adalah ruang dengar paling sakral bagimu.',
      vibeColor: '#3b82f6',
      accentColor: '#60a5fa',
      peakHour: `${String(peakHour).padStart(2, '0')}:00`,
      archetypeCode: 'NOCT-03',
    };
  }

  // 3. Morning Architect (Peak hours 05:00 - 11:00)
  if (morningPlays > 0 && (morningPlays / totalPlays) >= 0.35) {
    return {
      title: 'The Morning Architect',
      badge: 'DAYBREAK FOCUS',
      tagline: 'Ritme Awal Hari',
      description: 'Musik adalah pemicu tempo dan konsentrasi pagimu. Melodi yang kamu pilih menentukan kejernihan hari yang kamu bangun.',
      vibeColor: '#06b6d4',
      accentColor: '#22d3ee',
      peakHour: `${String(peakHour).padStart(2, '0')}:00`,
      archetypeCode: 'DAWN-04',
    };
  }

  // 4. Sonic Omnivore (Broad variety of 5+ distinct artists)
  if (artists.length >= 5) {
    return {
      title: 'The Sonic Omnivore',
      badge: 'WIDE SPECTRUM',
      tagline: 'Eksplorasi Lintas Spektrum',
      description: 'Telingamu tidak mengenal batasan satu genre. Kamu menyerap ritme, lirik, dan aransemen dari berbagai sudut musikal.',
      vibeColor: '#eab308',
      accentColor: '#facc15',
      peakHour: `${String(peakHour).padStart(2, '0')}:00`,
      archetypeCode: 'OMNI-07',
    };
  }

  // 5. Melodic Purist (Curated consistent listening)
  return {
    title: 'The Melodic Purist',
    badge: 'PURE HARMONICS',
    tagline: 'Kurasi Harmoni Alami',
    description: 'Pilihan lagumu selektif dan berbobot. Kamu mencari nada yang tidak lekang oleh waktu dan menemani fokus harimu.',
    vibeColor: '#1ed760',
    accentColor: '#34d399',
    peakHour: `${String(peakHour).padStart(2, '0')}:00`,
    archetypeCode: 'PURE-02',
  };
}
