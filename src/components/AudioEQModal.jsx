import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Sliders, RotateCcw, Check, Sparkles, Volume2, Info } from 'lucide-react';
import { audioEqualizer, EQ_PRESETS, EQ_BANDS_INFO } from '../services/audioEqualizer';
import gsap from 'gsap';

/**
 * 5-Band Studio Equalizer & IEM Monitor Reference Modal
 * Frequencies: 60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz (-12dB to +12dB)
 * Audiophile Presets: Flat / IEM Reference, Rock & Metal, Vocal & Acoustic, Late Night Warm, Custom
 */
export function AudioEQModal({ isOpen, onClose, onShowToast }) {
  const modalRef = useRef(null);
  const [bandValues, setBandValues] = useState(() => audioEqualizer.getBandValues());
  const [activePreset, setActivePreset] = useState(() => audioEqualizer.getActivePreset());

  // Sync state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setBandValues(audioEqualizer.getBandValues());
      setActivePreset(audioEqualizer.getActivePreset());
    }
  }, [isOpen]);

  // GSAP spring sheet animation
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    if (isOpen) {
      modal.style.display = 'flex';
      gsap.killTweensOf(modal);
      gsap.fromTo(
        modal,
        { y: '100%', opacity: 0.85 },
        {
          y: '0%',
          opacity: 1,
          duration: 0.42,
          ease: 'back.out(1.12)',
          force3D: true,
        }
      );
    } else {
      gsap.killTweensOf(modal);
      gsap.to(modal, {
        y: '100%',
        opacity: 0.85,
        duration: 0.28,
        ease: 'power3.in',
        force3D: true,
        onComplete: () => {
          if (modal) modal.style.display = 'none';
        },
      });
    }
  }, [isOpen]);

  // Handle individual slider drag
  const handleSliderChange = (bandId, value) => {
    const num = Number(value);
    const updated = { ...bandValues, [bandId]: num };
    setBandValues(updated);
    setActivePreset('custom');
    audioEqualizer.setBandGain(bandId, num, true);
  };

  // Handle 1-tap preset selection
  const handleSelectPreset = (presetKey) => {
    const preset = audioEqualizer.applyPreset(presetKey);
    setBandValues(preset.values);
    setActivePreset(preset.id);
    onShowToast?.(`EQ Preset: ${preset.name}`);
  };

  // Reset to Flat
  const handleResetFlat = () => {
    handleSelectPreset('flat');
  };

  // Compute SVG spline path across the 5 bands
  const curvePoints = useMemo(() => {
    // Width 340, Height 90. 0dB is at y = 45. +12dB is y = 10, -12dB is y = 80.
    const xCoords = [25, 95, 170, 245, 315];
    const points = EQ_BANDS_INFO.map((band, idx) => {
      const val = bandValues[band.id] ?? 0;
      // map val [-12, 12] to y [80, 10]
      const y = 45 - (val / 12) * 35;
      return { x: xCoords[idx], y };
    });

    if (points.length === 0) return '';

    // Smooth Bezier path generator
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const mx = (p0.x + p1.x) / 2;
      d += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  }, [bandValues]);

  // Compute closed SVG area for glowing gradient fill
  const areaPath = useMemo(() => {
    if (!curvePoints) return '';
    return `${curvePoints} L 315 85 L 25 85 Z`;
  }, [curvePoints]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center pointer-events-auto select-none">
      {/* Backdrop blur */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-md transition-opacity"
      />

      {/* Floating Bottom Modal Sheet */}
      <div
        ref={modalRef}
        className="relative w-full max-w-[430px] max-h-[90vh] overflow-y-auto scrollbar-none rounded-t-[36px] p-6 text-white z-10 border-t border-x border-white/15 shadow-[0_-20px_50px_rgba(0,0,0,0.9)] flex flex-col gap-4"
        style={{
          background: 'linear-gradient(180deg, rgba(20, 20, 26, 0.98) 0%, rgba(8, 8, 12, 0.98) 100%)',
          backdropFilter: 'blur(35px) saturate(200%)',
        }}
      >
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto -mt-2 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#1ed760]/15 border border-[#1ed760]/30 flex items-center justify-center text-[#1ed760] shadow-sm">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                <span>5-Band Master EQ</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#1ed760]/20 text-[#1ed760] border border-[#1ed760]/30">
                  STUDIO
                </span>
              </h2>
              <p className="text-xs text-white/50">Precision Biquad Filters • 60Hz to 14kHz</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        {/* 1-Tap Audiophile & Musician Presets Row */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 -mx-1 px-1">
          {Object.values(EQ_PRESETS).map((p) => {
            const isActive = activePreset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#1ed760] text-black border-[#1ed760] shadow-[0_0_15px_rgba(30,215,96,0.35)]'
                    : 'bg-white/[0.05] text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {isActive && <Check className="w-3 h-3 stroke-[3]" />}
                <span>{p.name}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Response Curve Visualizer */}
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] text-white/50 font-mono mb-2">
            <span>RESPONSE CURVE</span>
            <span className="text-[#1ed760] font-bold">
              {activePreset === 'custom' ? 'Custom EQ' : EQ_PRESETS[activePreset]?.name}
            </span>
          </div>

          <div className="relative w-full h-[85px]">
            <svg viewBox="0 0 340 90" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="eqAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1ed760" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#1ed760" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="eqLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#1ed760" />
                  <stop offset="50%" stopColor="#2dd4bf" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>

              {/* Zero dB Reference Line */}
              <line
                x1="15"
                y1="45"
                x2="325"
                y2="45"
                stroke="rgba(255,255,255,0.12)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />

              {/* +12dB and -12dB subtle boundary lines */}
              <line x1="15" y1="10" x2="325" y2="10" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <line x1="15" y1="80" x2="325" y2="80" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

              {/* Curve Area Fill */}
              {areaPath && <path d={areaPath} fill="url(#eqAreaGrad)" />}

              {/* Main Response Spline */}
              {curvePoints && (
                <path
                  d={curvePoints}
                  fill="none"
                  stroke="url(#eqLineGrad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}

              {/* Band Nodes */}
              {EQ_BANDS_INFO.map((band, idx) => {
                const xCoords = [25, 95, 170, 245, 315];
                const val = bandValues[band.id] ?? 0;
                const y = 45 - (val / 12) * 35;
                return (
                  <circle
                    key={band.id}
                    cx={xCoords[idx]}
                    cy={y}
                    r="4"
                    fill="#1ed760"
                    stroke="#050507"
                    strokeWidth="2"
                    className="drop-shadow-[0_0_6px_rgba(30,215,96,0.8)]"
                  />
                );
              })}
            </svg>
          </div>
        </div>

        {/* 5-Band Vertical Slider Array */}
        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col gap-4">
          <div className="grid grid-cols-5 gap-2 items-end h-[160px] pt-3 pb-1">
            {EQ_BANDS_INFO.map((band) => {
              const val = bandValues[band.id] ?? 0;
              const formattedVal = val > 0 ? `+${val}` : `${val}`;

              return (
                <div key={band.id} className="flex flex-col items-center h-full justify-between">
                  {/* Gain readout */}
                  <span
                    className={`font-mono text-[11px] font-bold ${
                      val > 0
                        ? 'text-[#1ed760]'
                        : val < 0
                        ? 'text-cyan-400'
                        : 'text-white/40'
                    }`}
                  >
                    {formattedVal}
                  </span>

                  {/* Vertical Slider Wrapper */}
                  <div className="relative w-7 h-[100px] flex items-center justify-center">
                    {/* Center Zero Tick Indicator */}
                    <div className="absolute w-3.5 h-[1.5px] bg-white/20 pointer-events-none z-0" />

                    {/* Native Vertical Range Slider with Custom Styling */}
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="1"
                      value={val}
                      onChange={(e) => handleSliderChange(band.id, e.target.value)}
                      className="w-[100px] h-2 bg-white/10 rounded-full appearance-none cursor-pointer outline-none -rotate-90 origin-center accent-[#1ed760] transition-colors"
                      style={{
                        WebkitAppearance: 'none',
                      }}
                      title={`${band.label}: ${formattedVal} dB`}
                    />
                  </div>

                  {/* Frequency Label */}
                  <div className="flex flex-col items-center">
                    <span className="font-mono text-xs font-extrabold text-white">
                      {band.label}
                    </span>
                    <span className="text-[9px] text-white/40 leading-none mt-0.5 truncate max-w-[50px] text-center">
                      {band.id === 'sub'
                        ? 'Sub'
                        : band.id === 'bass'
                        ? 'Bass'
                        : band.id === 'mid'
                        ? 'Mid'
                        : band.id === 'highMid'
                        ? 'Presence'
                        : 'Air'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={handleResetFlat}
            className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 text-xs font-semibold text-white/70 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Flat</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#1ed760] hover:bg-[#1bc456] active:scale-95 text-black text-xs font-extrabold transition-all cursor-pointer shadow-[0_4px_15px_rgba(30,215,96,0.35)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default AudioEQModal;

