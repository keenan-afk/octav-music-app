import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Sliders, Volume2, Check } from 'lucide-react';
import { LiquidSurface } from './LiquidGlassFilter';
import { audioEqualizer } from '../services/audioEqualizer';

/**
 * Apple iOS 26 Spatial Audio & 5-Band Acoustic Equalizer Popover
 * Opens when tapping the green 'Spatial Audio • Vision iOS' badge.
 * Provides:
 * - Master Spatial Audio 3D convolution toggle
 * - Mode selection (Spatial Stereo, Studio, Vision Immersion)
 * - 5-Band precision biquad sliders (-12dB to +12dB)
 * - Sound signature presets
 * - Live animated visualizer spectrum
 */
export function SpatialAudioModal({ isOpen, onClose, isPlaying }) {
  const [isSpatialEnabled, setIsSpatialEnabled] = useState(true);
  const [spatialMode, setSpatialMode] = useState('vision');
  const [activePreset, setActivePreset] = useState('visionSpatial');
  const [bands, setBands] = useState({
    sub: 4,
    bass: 2,
    mid: 1,
    highMid: 3,
    treble: 5,
  });

  const [spectrum, setSpectrum] = useState([35, 60, 45, 80, 50, 75, 40]);
  const animFrameRef = useRef(null);

  // Live visualizer spectrum loop
  useEffect(() => {
    if (!isOpen) return;

    const updateBars = () => {
      if (isPlaying) {
        // Sample real analyser data or generate harmonic organic bars
        const raw = audioEqualizer.getFrequencyData();
        const hasSignal = raw && raw.some((v) => v > 0);

        if (hasSignal) {
          setSpectrum([
            raw[1] || 40,
            raw[3] || 65,
            raw[5] || 50,
            raw[8] || 85,
            raw[12] || 60,
            raw[16] || 70,
            raw[20] || 45,
          ]);
        } else {
          // Dynamic pulsating simulation if CORS prevents raw byte read
          setSpectrum([
            30 + Math.sin(Date.now() / 200) * 20,
            50 + Math.cos(Date.now() / 250) * 35,
            40 + Math.sin(Date.now() / 180) * 25,
            75 + Math.cos(Date.now() / 300) * 45,
            45 + Math.sin(Date.now() / 220) * 30,
            65 + Math.cos(Date.now() / 190) * 35,
            35 + Math.sin(Date.now() / 240) * 20,
          ]);
        }
      } else {
        setSpectrum([12, 16, 14, 18, 15, 16, 12]);
      }
      animFrameRef.current = requestAnimationFrame(updateBars);
    };

    animFrameRef.current = requestAnimationFrame(updateBars);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, isPlaying]);

  if (!isOpen) return null;

  const handleBandChange = (bandId, value) => {
    const num = parseFloat(value);
    setBands((prev) => ({ ...prev, [bandId]: num }));
    audioEqualizer.setBandGain(bandId, num);
    setActivePreset('custom');
  };

  const handleSpatialToggle = () => {
    const next = !isSpatialEnabled;
    setIsSpatialEnabled(next);
    audioEqualizer.toggleSpatial(next);
  };

  const handleModeChange = (mode) => {
    setSpatialMode(mode);
    audioEqualizer.setSpatialMode(mode);
  };

  const handlePresetSelect = (presetKey) => {
    setActivePreset(presetKey);
    audioEqualizer.applyPreset(presetKey);

    const presets = {
      flat: { sub: 0, bass: 0, mid: 0, highMid: 0, treble: 0 },
      bassBoost: { sub: 6, bass: 4, mid: 0, highMid: -1, treble: -2 },
      vocal: { sub: -2, bass: 0, mid: 3, highMid: 4, treble: 2 },
      electronic: { sub: 5, bass: 3, mid: -1, highMid: 2, treble: 5 },
      acoustic: { sub: 2, bass: 1, mid: 2, highMid: 2, treble: 4 },
      visionSpatial: { sub: 4, bass: 2, mid: 1, highMid: 3, treble: 5 },
    };
    if (presets[presetKey]) {
      setBands(presets[presetKey]);
    }
  };

  const bandConfigs = [
    { id: 'sub', label: '60 Hz', desc: 'Sub Bass' },
    { id: 'bass', label: '230 Hz', desc: 'Bass' },
    { id: 'mid', label: '910 Hz', desc: 'Mids' },
    { id: 'highMid', label: '4 kHz', desc: 'Highs' },
    { id: 'treble', label: '14 kHz', desc: 'Air' },
  ];

  const presetsList = [
    { id: 'visionSpatial', label: 'Immersive 3D' },
    { id: 'bassBoost', label: 'Bass Boost' },
    { id: 'vocal', label: 'Vocal Clarity' },
    { id: 'electronic', label: 'Electronic' },
    { id: 'acoustic', label: 'Acoustic' },
    { id: 'flat', label: 'Flat' },
  ];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none animate-in fade-in duration-200">
      <LiquidSurface
        className="w-full max-w-[380px] p-5 rounded-3xl"
        style={{
          background:
            'linear-gradient(145deg, rgba(24, 24, 32, 0.88) 0%, rgba(12, 12, 18, 0.8) 100%)',
          backdropFilter: 'blur(32px) saturate(190%) brightness(1.05)',
          boxShadow:
            'inset 0 1px 1px 0 rgba(255, 255, 255, 0.5), inset 0 -1px 1px 0 rgba(255, 255, 255, 0.08), 0 25px 60px rgba(0, 0, 0, 0.95)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#1ed760]/20 flex items-center justify-center text-[#1ed760] border border-[#1ed760]/30 shadow-[0_0_12px_rgba(30,215,96,0.3)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white tracking-tight">
                Spatial Audio & EQ
              </h2>
              <p className="text-[10px] text-white/50 font-semibold">
                Octav High-Resolution Acoustic Engine
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white/80 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Spatial Audio Toggle & Mode Selector */}
        <div className="mb-4 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white">3D Spatial Headstage</span>
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-[#1ed760]/20 text-[#1ed760] border border-[#1ed760]/30">
                PRO
              </span>
            </div>

            {/* Tactile visionOS Glass Switch */}
            <button
              onClick={handleSpatialToggle}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                isSpatialEnabled ? 'bg-[#1ed760]' : 'bg-white/20'
              }`}
              style={{
                boxShadow: isSpatialEnabled
                  ? '0 0 12px rgba(30, 215, 96, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.4)'
                  : 'inset 0 1px 1px rgba(0, 0, 0, 0.3)',
              }}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-md ${
                  isSpatialEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Spatial Mode Pills */}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'stereo', label: 'Binaural' },
              { id: 'studio', label: 'Studio' },
              { id: 'vision', label: 'Immersive 3D' },
            ].map((m) => {
              const isSelected = spatialMode === m.id && isSpatialEnabled;
              return (
                <button
                  key={m.id}
                  disabled={!isSpatialEnabled}
                  onClick={() => handleModeChange(m.id)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white text-black shadow-md'
                      : 'bg-white/[0.06] text-white/60 hover:text-white disabled:opacity-40'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Audio Visualizer Spectrum */}
        <div className="h-8 flex items-end justify-between px-2 mb-3 bg-black/20 rounded-xl py-1">
          {spectrum.map((val, idx) => (
            <div
              key={idx}
              className="w-4 rounded-full bg-gradient-to-t from-[#1ed760] to-emerald-300 transition-all duration-75"
              style={{
                height: `${Math.max(15, Math.min(100, val))}%`,
                boxShadow: '0 0 8px rgba(30, 215, 96, 0.5)',
              }}
            />
          ))}
        </div>

        {/* 5-Band Sliders */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-[11px] font-bold text-white/50 mb-2">
            <span>Acoustic Frequency Bands</span>
            <span>-12dB / +12dB</span>
          </div>

          <div className="flex flex-col gap-2">
            {bandConfigs.map((band) => (
              <div key={band.id} className="flex items-center gap-2">
                <div className="w-14 flex flex-col">
                  <span className="text-[11px] font-bold text-white leading-none">
                    {band.label}
                  </span>
                  <span className="text-[9px] font-medium text-white/40">
                    {band.desc}
                  </span>
                </div>

                {/* Slider Input */}
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={bands[band.id]}
                  onChange={(e) => handleBandChange(band.id, e.target.value)}
                  className="flex-1 h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[#1ed760]"
                />

                <span className="w-10 text-right text-[11px] font-mono font-bold text-white/80">
                  {bands[band.id] > 0 ? `+${bands[band.id]}` : bands[band.id]}dB
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {presetsList.map((p) => {
            const isSelected = activePreset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handlePresetSelect(p.id)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1ed760] text-black shadow-sm'
                    : 'bg-white/[0.08] text-white/70 hover:bg-white/[0.14]'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </LiquidSurface>
    </div>
  );
}

export default SpatialAudioModal;

