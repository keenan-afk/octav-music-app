import { decryptDesEcb } from './_des.js';

function decodeHtmlEntities(str = '') {
  return String(str)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalizeDirectJioSaavnResults(results = []) {
  return results
    .map((item) => {
      const encUrl = item?.more_info?.encrypted_media_url;
      if (!encUrl) return null;
      const decryptedBase = decryptDesEcb(encUrl, '38346591').replace(/^http:\/\//i, 'https://');
      if (!decryptedBase || !decryptedBase.startsWith('https://')) return null;

      const buildQualityUrl = (q) => decryptedBase.replace(/_96\.mp4|_160\.mp4|_320\.mp4/i, `_${q}.mp4`);
      const primaryArtists = (item?.more_info?.artistMap?.primary_artists || []).map((a) => ({
        name: decodeHtmlEntities(a.name || ''),
      }));
      const allArtists = (item?.more_info?.artistMap?.artists || []).map((a) => ({
        name: decodeHtmlEntities(a.name || ''),
      }));

      return {
        id: item.id,
        name: decodeHtmlEntities(item.title || item.song || ''),
        subtitle: decodeHtmlEntities(item.subtitle || ''),
        duration: Number(item?.more_info?.duration || 0),
        album: { name: decodeHtmlEntities(item?.more_info?.album || '') },
        primaryArtists: primaryArtists.map((a) => a.name).join(', '),
        artist_map: {
          primary_artists: primaryArtists,
          artists: allArtists,
        },
        downloadUrl: [
          { quality: '96kbps', link: buildQualityUrl(96) },
          { quality: '160kbps', link: buildQualityUrl(160) },
          { quality: '320kbps', link: buildQualityUrl(320) },
        ],
      };
    })
    .filter(Boolean);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const q = String(req.query?.q || '').trim();
  const limit = Math.min(20, Math.max(1, Number(req.query?.limit || 12)));
  if (!q) {
    return res.status(400).json({ error: 'Missing search query q', results: [] });
  }

  try {
    const target = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=${limit}&q=${encodeURIComponent(q)}`;
    const upstream = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (upstream.ok) {
      const json = await upstream.json();
      const rawResults = json?.results || [];
      const normalized = normalizeDirectJioSaavnResults(rawResults);
      if (normalized.length > 0) {
        res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
        return res.status(200).json({ success: true, source: 'direct', results: normalized });
      }
    }
  } catch (err) {
    console.warn('Direct JioSaavn lookup warning:', err.message);
  }

  // Fallback to verified public mirrors server-side if direct API returned empty
  const fallbackEndpoints = [
    `https://jiosaavn-api-private.vercel.app/search/songs?q=${encodeURIComponent(q)}&limit=${limit}`,
    `https://jiosaavn-api-taupe.vercel.app/search/songs?query=${encodeURIComponent(q)}&limit=${limit}`,
  ];

  for (const endpoint of fallbackEndpoints) {
    try {
      const r = await fetch(endpoint, { signal: AbortSignal.timeout(4000) });
      if (!r.ok) continue;
      const json = await r.json();
      const results = json?.data?.results || json?.results || [];
      if (Array.isArray(results) && results.length > 0) {
        res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800');
        return res.status(200).json({ success: true, source: 'mirror', results });
      }
    } catch {}
  }

  return res.status(200).json({ success: false, results: [] });
}
