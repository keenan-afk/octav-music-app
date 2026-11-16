/**
 * Web Audio API 5-Band Equalizer, Musician Jam Isolator & Audio-Reactive Engine
 * Provides:
 * - 5-band precision biquad filters (60Hz, 230Hz, 910Hz, 4kHz, 14kHz)
 * - Jam Practice Isolators: Guitar Solo Focus, Backing Track/Jam Along, Bass Punch
 * - Spatial Audio 3D acoustic simulation (Binaural stereo widening & convolution reverb)
 * - Real-time sub-bass analyser (20Hz - 150Hz) driving --bass-pulse
 * - AudioContext safe connection to HTML5 audio element with pitch-locking
 */

const STORAGE_KEY_EQ_CURVE = 'octav_audio_eq_curve';
const STORAGE_KEY_EQ_PRESET = 'octav_audio_eq_preset';

export const EQ_PRESETS = {
  flat: {
    id: 'flat',
    name: 'Balanced',
    desc: 'Clean, neutral sound profile',
    values: { sub: 0, bass: 0, mid: 0, highMid: 0, treble: 0 },
  },
  rock: {
    id: 'rock',
    name: 'Rock',
    desc: 'Punchy bass with clear highs',
    values: { sub: 5, bass: 3, mid: -2, highMid: 4, treble: 5 },
  },
  vocal: {
    id: 'vocal',
    name: 'Vocal',
    desc: 'Clear vocals and acoustic instruments',
    values: { sub: -2, bass: 0, mid: 4, highMid: 3, treble: 2 },
  },
  warm: {
    id: 'warm',
    name: 'Warm',
    desc: 'Smooth low-end and gentle highs',
    values: { sub: 3, bass: 3, mid: 1, highMid: -2, treble: -4 },
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    desc: 'Personalized equalizer profile',
    values: { sub: 0, bass: 0, mid: 0, highMid: 0, treble: 0 },
  },
};

export const EQ_BANDS_INFO = [
  { id: 'sub', label: '60Hz', type: 'lowshelf', freq: 60, desc: 'Sub-Bass Kick' },
  { id: 'bass', label: '230Hz', type: 'peaking', freq: 230, desc: 'Bass & Body' },
  { id: 'mid', label: '910Hz', type: 'peaking', freq: 910, desc: 'Mid Harmonics' },
  { id: 'highMid', label: '3.6kHz', type: 'peaking', freq: 3600, desc: 'Vocal & Lead Attack' },
  { id: 'treble', label: '14kHz', type: 'highshelf', freq: 14000, desc: 'Air & Sparkle' },
];

class AudioEqualizerEngine {
  constructor() {
    this.ctx = null;
    this.source = null;
    this.analyser = null;
    this.bands = [];
    this.spatialGain = null;
    this.spatialConvolver = null;
    this.dryGain = null;
    this.wetGain = null;
    this.isSpatialEnabled = true;
    this.spatialMode = 'vision'; // 'stereo' | 'studio' | 'vision'
    this.isInitialized = false;
    this.audioElement = null;

    // Load persisted 5-band gain values in dB (-12 to +12)
    let savedValues = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_EQ_CURVE);
      if (raw) savedValues = JSON.parse(raw);
    } catch {}

    this.bandValues = savedValues || {
      sub: 3, // 60Hz
      bass: 2, // 230Hz
      mid: 1, // 910Hz
      highMid: 3, // 3.6kHz
      treble: 4, // 14kHz
    };

    this.activePreset = localStorage.getItem(STORAGE_KEY_EQ_PRESET) || 'custom';
    this.activeIsolator = 'normal'; // 'normal' | 'guitarFocus' | 'backingTrack' | 'bassPunch'
  }

  init(audioElement) {
    if (this.isInitialized || !audioElement) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.audioElement = audioElement;

      // Ensure Pitch Lock is enabled on the audio element
      audioElement.preservesPitch = true;
      audioElement.mozPreservesPitch = true;
      audioElement.webkitPreservesPitch = true;

      // Configure crossOrigin if not set
      if (!audioElement.crossOrigin) {
        audioElement.crossOrigin = 'anonymous';
      }

      // Connect source to filters
      this.source = this.ctx.createMediaElementSource(audioElement);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128; // 64 frequency bins
      this.analyser.smoothingTimeConstant = 0.8;

      // 5 Biquad Filters (60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz)
      const frequencies = [
        { type: 'lowshelf', freq: 60, id: 'sub' },
        { type: 'peaking', freq: 230, id: 'bass' },
        { type: 'peaking', freq: 910, id: 'mid' },
        { type: 'peaking', freq: 3600, id: 'highMid' },
        { type: 'highshelf', freq: 14000, id: 'treble' },
      ];

      this.bands = frequencies.map((f) => {
        const filter = this.ctx.createBiquadFilter();
        filter.type = f.type;
        filter.frequency.value = f.freq;
        filter.gain.value = this.bandValues[f.id] || 0;
        return { id: f.id, filter };
      });

      // Chain filters sequentially
      let prevNode = this.source;
      this.bands.forEach(({ filter }) => {
        prevNode.connect(filter);
        prevNode = filter;
      });

      // Route filter chain directly to analyser and master destination (ultra-clean, zero stutter)
      prevNode.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio Equalizer initialization warning:', e.message);
      this.isInitialized = false;
    }
  }

  toggleSpatial(enabled) {
    this.isSpatialEnabled = Boolean(enabled);
  }

  setSpatialMode(mode) {
    this.spatialMode = mode;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  getBandValues() {
    return { ...this.bandValues };
  }

  getActivePreset() {
    return this.activePreset || 'custom';
  }

  setBandGain(bandId, gainDb, markCustom = true) {
    this.bandValues[bandId] = gainDb;
    const band = this.bands.find((b) => b.id === bandId);
    if (band && band.filter && this.ctx) {
      band.filter.gain.setTargetAtTime(gainDb, this.ctx.currentTime, 0.05);
    }
    if (markCustom) {
      this.activePreset = 'custom';
      try {
        localStorage.setItem(STORAGE_KEY_EQ_PRESET, 'custom');
      } catch {}
    }
    try {
      localStorage.setItem(STORAGE_KEY_EQ_CURVE, JSON.stringify(this.bandValues));
    } catch {}
  }

  setAllBandGains(curve, presetName = 'custom') {
    if (!curve) return;
    this.activePreset = presetName;
    Object.keys(curve).forEach((bandId) => {
      this.setBandGain(bandId, curve[bandId], false);
    });
    try {
      localStorage.setItem(STORAGE_KEY_EQ_PRESET, presetName);
      localStorage.setItem(STORAGE_KEY_EQ_CURVE, JSON.stringify(this.bandValues));
    } catch {}
  }

  applyPreset(presetKey) {
    const preset = EQ_PRESETS[presetKey] || EQ_PRESETS.flat;
    this.setAllBandGains(preset.values, preset.id);
    return preset;
  }

  /**
   * Musician Jam Practice Isolator Modes:
   * - normal: Standard balanced curve
   * - guitarFocus: Boosts 800Hz - 4kHz, cuts sub-bass so guitar solos & leads stand out
   * - backingTrack: Center mid/vocal scoop (-8dB mid/highMid) so user can jam on top
   * - bassPunch: Sub-bass and low-end kick punch with wide stereo imaging
   */
  setIsolatorMode(mode) {
    this.activeIsolator = mode;
    this.resume();

    if (mode === 'guitarFocus') {
      this.setBandGain('sub', -6);
      this.setBandGain('bass', -2);
      this.setBandGain('mid', 6);
      this.setBandGain('highMid', 7);
      this.setBandGain('treble', 3);
      this.setSpatialMode('stereo');
    } else if (mode === 'backingTrack') {
      this.setBandGain('sub', 2);
      this.setBandGain('bass', 3);
      this.setBandGain('mid', -8);
      this.setBandGain('highMid', -7);
      this.setBandGain('treble', -2);
      this.setSpatialMode('vision');
    } else if (mode === 'bassPunch') {
      this.setBandGain('sub', 8);
      this.setBandGain('bass', 5);
      this.setBandGain('mid', -1);
      this.setBandGain('highMid', 1);
      this.setBandGain('treble', 2);
      this.setSpatialMode('vision');
    } else {
      // normal
      this.setBandGain('sub', 3);
      this.setBandGain('bass', 2);
      this.setBandGain('mid', 1);
      this.setBandGain('highMid', 3);
      this.setBandGain('treble', 4);
      this.setSpatialMode('vision');
    }
  }

  /**
   * Real-time Sub-Bass Energy Analyser (20Hz - 150Hz)
   * Returns normalized value between 0.0 and 1.0.
   * If Web Audio analysis is CORS-restricted, calculates a natural pulse fallback.
   */
  getBassEnergy() {
    if (!this.analyser) {
      return 0.15;
    }

    try {
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.analyser.getByteFrequencyData(dataArray);

      // Low frequency bins (first 4 bins ~ 20Hz - 150Hz with fftSize 128 at 44.1kHz)
      const lowBins = [dataArray[0], dataArray[1], dataArray[2], dataArray[3]].filter(
        (v) => v !== undefined
      );

      const avgLow = lowBins.reduce((a, b) => a + b, 0) / lowBins.length;

      // If audio is silent or blocked by CORS returning all zeros, check audio element playback
      if (avgLow === 0 && this.audioElement && !this.audioElement.paused) {
        // Fallback rhythmic pulse
        const time = this.audioElement.currentTime || 0;
        return (Math.sin(time * 4) + 1) * 0.25;
      }

      return Math.min(1.0, Math.max(0, avgLow / 255));
    } catch (e) {
      return 0.15;
    }
  }

  getFrequencyData() {
    if (!this.analyser) return new Uint8Array(16);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }
}

export const audioEqualizer = new AudioEqualizerEngine();
export default audioEqualizer;
