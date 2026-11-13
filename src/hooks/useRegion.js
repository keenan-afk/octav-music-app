import { useState, useCallback, useEffect } from 'react';

const REGION_STORAGE_KEY = 'octav_region';
const LEGACY_REGION_STORAGE_KEY = 'spotify_liquid_region';

/**
 * Region Switcher Hook
 * Manages active country code ('ID' for Indonesia default, 'US' for Global).
 * Persists selection in localStorage.
 */
export function useRegion() {
  const [region, setRegionState] = useState(() => {
    try {
      const saved = localStorage.getItem(REGION_STORAGE_KEY) || localStorage.getItem(LEGACY_REGION_STORAGE_KEY);
      if (saved === 'ID' || saved === 'US') return saved;
    } catch (e) {
      console.warn('Failed to load saved region:', e);
    }
    return 'ID'; // Default to Indonesia
  });

  const setRegion = useCallback((newRegion) => {
    const val = newRegion === 'US' ? 'US' : 'ID';
    setRegionState(val);
    try {
      localStorage.setItem(REGION_STORAGE_KEY, val);
    } catch (e) {
      console.warn('Failed to persist region:', e);
    }
  }, []);

  const toggleRegion = useCallback(() => {
    setRegion(region === 'ID' ? 'US' : 'ID');
  }, [region, setRegion]);

  return {
    region,
    setRegion,
    toggleRegion,
    isIndo: region === 'ID',
    regionLabel: region === 'ID' ? '🇮🇩 ID' : '🌐 Global',
  };
}

export default useRegion;

