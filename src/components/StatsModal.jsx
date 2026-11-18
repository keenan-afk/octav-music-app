import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  X,
  Sparkles,
  Download,
  Share2,
  Play,
  Pause,
  Music2,
  RotateCcw,
  LayoutGrid,
  Layers,
  Clock,
  Compass,
  Check,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Disc3,
  BarChart3,
  Flame,
  Radio,
} from 'lucide-react';
import { SmartArtwork } from './SmartArtwork';
import {
  getListeningStats,
  getAvailablePeriods,
  computeListeningPersona,
} from '../services/statsService';
import { useAuth } from '../context/AuthContext';

const SLIDE_DURATION_MS = 6500;
const TOTAL_SLIDES = 5;

/**
 * Octav Monthly Recap & Yearly Wrapped Modal
 * Anti-Slop High-Contrast Editorial Story Experience + Grid Archive.
 */
export function StatsModal({
  isOpen,
  onClose,
  onShowToast,
  onSelectTrack,
}) {
  const { user, effectiveDisplayName, effectiveAvatar } = useAuth();
  const periods = useMemo(() => getAvailablePeriods(), []);

  const [selectedPeriod, setSelectedPeriod] = useState(() => periods[0]?.id || '2026-11');
  const [viewMode, setViewMode] = useState('story'); // 'story' | 'grid'
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [slideProgress, setSlideProgress] = useState(0);
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const activePeriodObj = useMemo(() => {
    return periods.find((p) => p.id === selectedPeriod) || periods[0];
  }, [periods, selectedPeriod]);

  // Read stats for the selected period
  const stats = useMemo(() => {
    return getListeningStats(user?.id, selectedPeriod);
  }, [user?.id, selectedPeriod, isOpen]);

  const totalMinutes = Math.round((stats.totalSeconds || 0) / 60);
  const totalPlays = stats.playsCount || 0;

  // Persona & Sound Architecture
  const persona = useMemo(() => {
    return computeListeningPersona(stats);
  }, [stats]);

  // Top 5 Tracks sorted by plays
  const topTracks = useMemo(() => {
    const list = Object.values(stats.tracks || {});
    list.sort((a, b) => b.plays - a.plays);
    return list.slice(0, 5);
  }, [stats]);

  // Top 3 Artists sorted by plays
  const topArtists = useMemo(() => {
    const list = Object.values(stats.artists || {});
    list.sort((a, b) => b.plays - a.plays);
    return list.slice(0, 3);
  }, [stats]);

  const displayName = user?.displayName || effectiveDisplayName || 'Listener';

  // Story progression timer
  useEffect(() => {
    if (!isOpen || viewMode !== 'story') return;
    if (isPaused || isHolding || isPeriodMenuOpen) return;

    const intervalTime = 50;
    const increment = (intervalTime / SLIDE_DURATION_MS) * 100;

    const timer = setInterval(() => {
      setSlideProgress((prev) => {
        if (prev >= 100) {
          if (currentSlide < TOTAL_SLIDES - 1) {
            setCurrentSlide((s) => s + 1);
            return 0;
          } else {
            return 100;
          }
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isOpen, viewMode, currentSlide, isPaused, isHolding, isPeriodMenuOpen]);

  // Reset slide when period changes
  const handleSelectPeriod = (pId) => {
    setSelectedPeriod(pId);
    setIsPeriodMenuOpen(false);
    setCurrentSlide(0);
    setSlideProgress(0);
  };

  const handleNextSlide = () => {
    if (currentSlide < TOTAL_SLIDES - 1) {
      setCurrentSlide((s) => s + 1);
      setSlideProgress(0);
    }
  };

  const handlePrevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide((s) => s - 1);
      setSlideProgress(0);
    }
  };

  const handleScreenTouch = (e) => {
    if (e.target.closest('button') || e.target.closest('.no-story-nav')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX || (e.changedTouches && e.changedTouches[0]?.clientX) || 0;
    const xRatio = (clientX - rect.left) / rect.width;

    if (xRatio < 0.35) {
      handlePrevSlide();
    } else {
      handleNextSlide();
    }
  };

  // High-Resolution 1080x1920 9:16 Editorial Canvas Story Export
  const handleExportCard = async () => {
    setIsExporting(true);
    try {
      const canvas = document.createElement('canvas');
      const W = 1080;
      const H = 1920;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');

      // 1. Dark Basalt Noise Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#0a0b10');
      bgGrad.addColorStop(0.5, '#07080b');
      bgGrad.addColorStop(1, '#030406');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Subtle editorial accent bleed
      const aura = ctx.createRadialGradient(W / 2, 450, 40, W / 2, 450, 650);
      aura.addColorStop(0, 'rgba(30, 215, 96, 0.22)');
      aura.addColorStop(0.7, 'rgba(16, 185, 129, 0.05)');
      aura.addColorStop(1, 'transparent');
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, W, H);

      // 2. Central Editorial Card Frame
      const cardX = 64;
      const cardY = 100;
      const cardW = W - 128;
      const cardH = H - 200;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 44);
      ctx.fillStyle = 'rgba(15, 17, 24, 0.92)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.stroke();
      ctx.clip();

      // Top Specular Accent
      const rim = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY);
      rim.addColorStop(0, 'rgba(30, 215, 96, 0)');
      rim.addColorStop(0.5, '#1ed760');
      rim.addColorStop(1, 'rgba(30, 215, 96, 0)');
      ctx.fillStyle = rim;
      ctx.fillRect(cardX, cardY, cardW, 4);

      // Header: Event Tag & Issue Number
      ctx.fillStyle = '#1ed760';
      ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillText('OCTAV // MONTHLY RECAP', cardX + 60, cardY + 80);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '700 22px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`ISSUE // ${activePeriodObj.id}`, cardX + cardW - 60, cardY + 80);
      ctx.textAlign = 'left';

      // Big Period Header
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 68px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillText(activePeriodObj.label.toUpperCase(), cardX + 60, cardY + 160);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.font = '600 28px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`Curated sound archive for ${displayName}`, cardX + 60, cardY + 210);

      // Section 1: Massive Minutes Block
      const block1Y = cardY + 260;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.beginPath();
      ctx.roundRect(cardX + 60, block1Y, cardW - 120, 180, 28);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = '800 20px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillText('TOTAL MINUTES LOGGED', cardX + 90, block1Y + 45);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 86px monospace';
      ctx.fillText(totalMinutes.toLocaleString(), cardX + 90, block1Y + 135);

      ctx.fillStyle = '#1ed760';
      ctx.font = '800 28px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillText('MIN', cardX + 90 + ctx.measureText(totalMinutes.toLocaleString()).width + 20, block1Y + 135);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${totalPlays} plays recorded`, cardX + cardW - 90, block1Y + 135);
      ctx.textAlign = 'left';

      // Section 2: Two Columns (Sound Persona & Top Artist)
      const block2Y = block1Y + 210;
      const colW = (cardW - 145) / 2;

      // Col A: Sound Persona
      ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
      ctx.beginPath();
      ctx.roundRect(cardX + 60, block2Y, colW, 190, 24);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
      ctx.stroke();

      ctx.fillStyle = '#60a5fa';
      ctx.font = '800 18px monospace';
      ctx.fillText('SOUND ARCHETYPE', cardX + 85, block2Y + 45);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillText(persona.title, cardX + 85, block2Y + 95);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillText(persona.tagline, cardX + 85, block2Y + 140);

      // Col B: Top Artist
      ctx.fillStyle = 'rgba(249, 115, 22, 0.08)';
      ctx.beginPath();
      ctx.roundRect(cardX + 60 + colW + 25, block2Y, colW, 190, 24);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.25)';
      ctx.stroke();

      ctx.fillStyle = '#fb923c';
      ctx.font = '800 18px monospace';
      ctx.fillText('TOP ROTATION ARTIST', cardX + 60 + colW + 50, block2Y + 45);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      const aName = topArtists[0]?.name || 'Belum Ada Artis';
      ctx.fillText(aName.length > 14 ? `${aName.slice(0, 14)}...` : aName, cardX + 60 + colW + 50, block2Y + 95);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`${topArtists[0]?.plays || 0}x heavy plays`, cardX + 60 + colW + 50, block2Y + 140);

      // Section 3: Top 5 Tracks Countdown
      let listY = block2Y + 235;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = '800 20px monospace';
      ctx.fillText('TOP ROTATION // TRACKLIST', cardX + 60, listY);

      listY += 40;
      topTracks.slice(0, 5).forEach((t, i) => {
        ctx.fillStyle = i === 0 ? 'rgba(30, 215, 96, 0.12)' : 'rgba(255, 255, 255, 0.02)';
        ctx.beginPath();
        ctx.roundRect(cardX + 60, listY, cardW - 120, 85, 18);
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = i === 0 ? 'rgba(30, 215, 96, 0.3)' : 'rgba(255, 255, 255, 0.05)';
        ctx.stroke();

        // Rank Number
        ctx.fillStyle = i === 0 ? '#1ed760' : 'rgba(255, 255, 255, 0.4)';
        ctx.font = '900 26px monospace';
        ctx.fillText(`0${i + 1}`, cardX + 85, listY + 52);

        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 28px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
        const cleanT = t.title.length > 28 ? `${t.title.slice(0, 28)}...` : t.title;
        ctx.fillText(cleanT, cardX + 155, listY + 42);

        // Artist
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '500 22px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
        ctx.fillText(t.artist, cardX + 155, listY + 68);

        // Plays
        ctx.fillStyle = i === 0 ? '#1ed760' : 'rgba(255, 255, 255, 0.6)';
        ctx.font = '800 22px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${t.plays}x`, cardX + cardW - 90, listY + 52);
        ctx.textAlign = 'left';

        listY += 100;
      });

      // Section 4: Authentic Barcode & Branding Footer
      const footerY = cardY + cardH - 100;

      // Draw stylized barcode lines
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      const barcodeX = cardX + 60;
      const barCount = 42;
      for (let b = 0; b < barCount; b++) {
        const w = (b % 3 === 0) ? 5 : (b % 2 === 0) ? 3 : 2;
        ctx.fillRect(barcodeX + (b * 8), footerY, w, 36);
      }

      ctx.fillStyle = '#1ed760';
      ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Octav', cardX + cardW - 60, footerY + 30);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '600 18px monospace';
      ctx.fillText('OCTAV SOUND LABS', cardX + cardW - 60, footerY + 54);
      ctx.textAlign = 'left';

      ctx.restore();

      // Download
      const dataUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `Octav_Recap_${activePeriodObj.id}_${displayName.replace(/\s+/g, '_')}.png`;
      downloadLink.href = dataUrl;
      downloadLink.click();

      onShowToast?.(`${activePeriodObj.label} Story Card berhasil diunduh!`);
    } catch (e) {
      console.error('Failed generating story card:', e);
      onShowToast?.('Gagal menyimpan story card');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-2xl select-none animate-in fade-in duration-300">
      {/* Background Ambience Layer */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 transition-colors duration-700"
        style={{
          background:
            currentSlide === 1
              ? 'radial-gradient(circle at 50% 35%, rgba(59, 130, 246, 0.3) 0%, transparent 65%)'
              : currentSlide === 2
              ? 'radial-gradient(circle at 50% 35%, rgba(249, 115, 22, 0.3) 0%, transparent 65%)'
              : currentSlide === 3
              ? 'radial-gradient(circle at 50% 35%, rgba(234, 179, 8, 0.25) 0%, transparent 65%)'
              : 'radial-gradient(circle at 50% 35%, rgba(30, 215, 96, 0.3) 0%, transparent 65%)',
        }}
      />

      {/* Main Container Card (Exact 9:16 Aspect on Mobile, Max-W 420px) */}
      <div
        onMouseDown={() => setIsHolding(true)}
        onMouseUp={() => setIsHolding(false)}
        onTouchStart={() => setIsHolding(true)}
        onTouchEnd={() => setIsHolding(false)}
        onClick={handleScreenTouch}
        className="relative w-full h-full md:h-[92vh] md:max-w-[420px] md:rounded-[40px] overflow-hidden flex flex-col justify-between text-white shadow-[0_30px_90px_rgba(0,0,0,0.95)] border border-white/15 bg-[#090a0f]"
      >
        {/* ================= TOP BAR CONTROLS ================= */}
        <div className="relative z-30 pt-4 px-4 pb-2 flex flex-col gap-3">
          {/* Segmented Progress Bars (Instagram / Spotify Stories style) */}
          {viewMode === 'story' && (
            <div className="grid grid-cols-5 gap-1.5 w-full">
              {Array.from({ length: TOTAL_SLIDES }).map((_, idx) => {
                let widthPercent = 0;
                if (idx < currentSlide) widthPercent = 100;
                else if (idx === currentSlide) widthPercent = slideProgress;

                return (
                  <div
                    key={idx}
                    className="h-1 bg-white/20 rounded-full overflow-hidden cursor-pointer no-story-nav"
                    onClick={() => {
                      setCurrentSlide(idx);
                      setSlideProgress(0);
                    }}
                  >
                    <div
                      className="h-full bg-white transition-all ease-linear"
                      style={{
                        width: `${widthPercent}%`,
                        transitionDuration: idx === currentSlide ? '50ms' : '200ms',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Row: Period Selector, Mode Switcher & Close */}
          <div className="flex items-center justify-between no-story-nav">
            {/* Period Selector Dropdown Button */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPeriodMenuOpen((prev) => !prev);
                }}
                className="py-1 px-3 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Calendar className="w-3.5 h-3.5 text-[#1ed760]" />
                <span>{activePeriodObj.label}</span>
                <span className="text-[10px] text-white/50">▼</span>
              </button>

              {/* Dropdown Menu */}
              {isPeriodMenuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-9 left-0 w-52 rounded-2xl bg-[#14151e]/98 border border-white/20 shadow-2xl p-1.5 z-50 flex flex-col gap-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
                >
                  <span className="text-[10px] font-black uppercase tracking-wider text-white/40 px-2 py-1 font-mono">
                    Pilih Periode
                  </span>
                  {periods.map((p) => {
                    const isSelected = p.id === selectedPeriod;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPeriod(p.id)}
                        className={`w-full py-2 px-2.5 rounded-xl text-xs font-bold text-left flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#1ed760] text-black'
                            : 'text-white/80 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span>{p.label}</span>
                          <span
                            className={`text-[9px] ${
                              isSelected ? 'text-black/70' : 'text-white/40'
                            }`}
                          >
                            {p.tag}
                          </span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Tools: View Toggle & Close */}
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode(viewMode === 'story' ? 'grid' : 'story');
                }}
                className="py-1 px-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border border-white/10"
                title={viewMode === 'story' ? 'Lihat ringkasan semua' : 'Buka mode story'}
              >
                {viewMode === 'story' ? (
                  <>
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Grid</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-3.5 h-3.5 text-[#1ed760]" />
                    <span className="text-[11px]">Story</span>
                  </>
                )}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4 text-white/80" />
              </button>
            </div>
          </div>
        </div>

        {/* ================= STORY VIEW SLIDES ================= */}
        {viewMode === 'story' ? (
          <div className="relative flex-1 px-6 flex flex-col justify-center overflow-hidden">
            {/* Slide 0: Total Minutes & Frequency */}
            {currentSlide === 0 && (
              <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-400">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-[#1ed760]/20 text-[#1ed760] border border-[#1ed760]/40 font-mono shadow-sm">
                    01 // TOTAL WAKTU
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-white/50 font-mono">
                    Di {activePeriodObj.label}, kamu telah memutar
                  </h3>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-7xl font-black font-mono tracking-tighter text-white drop-shadow-[0_4px_30px_rgba(30,215,96,0.35)]">
                      {totalMinutes.toLocaleString()}
                    </span>
                    <span className="text-2xl font-black text-[#1ed760] font-mono">MIN</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-white/50 font-semibold font-mono uppercase tracking-wider">
                      Lagu Terekam
                    </span>
                    <span className="text-2xl font-black text-white mt-0.5">{totalPlays} Tracks</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-[#1ed760]/15 border border-[#1ed760]/30 flex items-center justify-center text-[#1ed760]">
                    <Music2 className="w-6 h-6 stroke-[2]" />
                  </div>
                </div>

                <p className="text-xs text-white/70 leading-relaxed border-l-2 border-[#1ed760] pl-3 py-1 font-medium">
                  {totalMinutes > 60
                    ? `Kamu menghabiskan lebih dari ${Math.round(totalMinutes / 60)} jam bersama Octav bulan ini. Musik yang menemani fokus, perjalanan, dan istirahatmu.`
                    : 'Setiap detik musik mencatat cerita tersendiri. Terus putar lagu favoritmu untuk memperkaya rekaman bulananmu.'}
                </p>

                <div className="pt-2 text-center text-xs text-white/40 font-mono">
                  <span>Ketuk sisi kanan layar untuk lanjut →</span>
                </div>
              </div>
            )}

            {/* Slide 1: Sound Architecture (Persona) */}
            {currentSlide === 1 && (
              <div className="flex flex-col items-center text-center gap-6 animate-in fade-in zoom-in-95 duration-400">
                <span className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-mono">
                  02 // SOUND ARCHITECTURE
                </span>

                {/* Concentric Kinetic Radar Ring */}
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-blue-500/20 animate-ping opacity-40 duration-1000" />
                  <div className="absolute inset-2 rounded-full border border-blue-500/30" />
                  <div className="absolute inset-6 rounded-full border border-blue-500/50" />
                  <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-tr from-blue-900 to-indigo-950 border border-blue-400/60 flex flex-col items-center justify-center shadow-2xl">
                    <Radio className="w-7 h-7 text-blue-300 stroke-[2]" />
                    <span className="text-[8px] font-mono font-black text-blue-200 mt-1 tracking-wider">
                      {persona.archetypeCode}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 font-mono block mb-1">
                    {persona.badge}
                  </span>
                  <h2 className="text-2xl font-black text-white tracking-tight">{persona.title}</h2>
                  <p className="text-xs font-semibold text-white/60 mt-1">{persona.tagline}</p>
                </div>

                <p className="text-xs text-white/70 max-w-xs leading-relaxed px-2 font-medium">
                  {persona.description}
                </p>

                {persona.peakHour && (
                  <div className="w-full max-w-xs px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-xs font-semibold">
                    <span className="text-white/50 font-mono uppercase text-[10px]">Peak Activity</span>
                    <span className="text-blue-300 font-mono font-bold">{persona.peakHour} WIB</span>
                  </div>
                )}
              </div>
            )}

            {/* Slide 2: Top Artist Spotlight */}
            {currentSlide === 2 && (
              <div className="flex flex-col items-center text-center gap-5 animate-in fade-in zoom-in-95 duration-400">
                <span className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 font-mono">
                  03 // ANCHOR ARTIST
                </span>

                {/* Big Vinyl Record with Artist Artwork */}
                <div className="relative w-40 h-40">
                  <div className="absolute inset-0 rounded-full bg-orange-600/20 blur-2xl pointer-events-none" />
                  <div className="relative z-10 w-full h-full rounded-full border-4 border-[#121318] shadow-2xl overflow-hidden bg-black flex items-center justify-center">
                    {/* Concentric vinyl groove rings */}
                    <div className="absolute inset-3 rounded-full border border-white/[0.07]" />
                    <div className="absolute inset-7 rounded-full border border-white/[0.07]" />
                    <div className="absolute inset-11 rounded-full border border-white/[0.07]" />
                    {/* Center Artwork */}
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-orange-400/80 shadow-md">
                      <SmartArtwork
                        src={topTracks[0]?.cover}
                        title={topArtists[0]?.name}
                        artist={topArtists[0]?.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  {/* Monospace 01 Badge */}
                  <div className="absolute -bottom-1 -right-1 z-20 w-8 h-8 rounded-full bg-orange-500 text-black flex items-center justify-center font-black font-mono text-xs shadow-lg">
                    01
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    {topArtists[0]?.name || 'Belum Ada Artis'}
                  </h2>
                  <p className="text-xs text-orange-400 font-mono font-bold mt-1">
                    {topArtists[0]?.plays || 0}x Rotasi di {activePeriodObj.label}
                  </p>
                </div>

                {/* Runner-up Artists (Festival Lineup Style) */}
                {topArtists.length > 1 && (
                  <div className="w-full max-w-xs flex flex-col gap-2 mt-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/40 font-mono">
                      Lineup Selanjutnya
                    </span>
                    <div className="flex items-center justify-center gap-2">
                      {topArtists.slice(1, 3).map((art, idx) => (
                        <div
                          key={art.name}
                          className="py-1.5 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-bold text-white flex items-center gap-1.5"
                        >
                          <span className="text-orange-400 font-mono text-[10px]">0{idx + 2}</span>
                          <span className="truncate max-w-[100px]">{art.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Slide 3: Top 5 Tracks Countdown */}
            {currentSlide === 3 && (
              <div className="flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-400">
                <div className="text-center pb-1">
                  <span className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-mono">
                    04 // ROTASI TERATAS
                  </span>
                  <h3 className="text-base font-black text-white mt-1.5">5 Lagu Paling Sering Kamu Putar</h3>
                </div>

                <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto scrollbar-none pr-1">
                  {topTracks.map((track, idx) => (
                    <div
                      key={track.id || idx}
                      onClick={() => onSelectTrack?.(track)}
                      className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer group no-story-nav ${
                        idx === 0
                          ? 'bg-yellow-500/15 border-yellow-500/40 shadow-[0_0_20px_rgba(234,179,8,0.15)]'
                          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className={`w-6 text-center font-mono text-sm font-black ${
                            idx === 0 ? 'text-yellow-400' : 'text-white/40'
                          }`}
                        >
                          0{idx + 1}
                        </span>
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-900 border border-white/10">
                          <SmartArtwork
                            src={track.cover}
                            title={track.title}
                            artist={track.artist}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-[#1ed760] transition-colors">
                            {track.title}
                          </h4>
                          <p className="text-[11px] text-white/50 truncate">{track.artist}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                        <span className="text-xs font-bold text-yellow-400 font-mono">
                          {track.plays}x
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Slide 4: Final Cassette Pass & High-Res Export */}
            {currentSlide === 4 && (
              <div className="flex flex-col items-center gap-4 text-center animate-in fade-in zoom-in-95 duration-400">
                <span className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-[#1ed760]/20 text-[#1ed760] border border-[#1ed760]/40 font-mono">
                  05 // KARTU REKAP RESMI
                </span>

                {/* Editorial Cassette Pass Preview */}
                <div className="w-full max-w-[320px] p-4 rounded-3xl bg-[#0f1118] border border-white/15 shadow-2xl flex flex-col gap-3 text-left">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div>
                      <span className="text-[9px] font-black uppercase text-[#1ed760] tracking-widest font-mono block">
                        OCTAV ARCHIVE
                      </span>
                      <h4 className="text-sm font-black text-white">{activePeriodObj.label}</h4>
                    </div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/40 font-mono">
                      {persona.archetypeCode}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-1">
                    <div className="p-2 rounded-xl bg-white/[0.04]">
                      <span className="text-[10px] text-white/50 font-mono uppercase block">Waktu Dengar</span>
                      <span className="font-black text-base text-[#1ed760] font-mono">{totalMinutes} Min</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/[0.04]">
                      <span className="text-[10px] text-white/50 font-mono uppercase block">Total Putar</span>
                      <span className="font-black text-base text-white font-mono">{totalPlays} Lagu</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-t border-white/[0.08]">
                    <span className="text-white/50 font-mono text-[10px] uppercase">Artis #1</span>
                    <span className="font-bold text-white truncate max-w-[150px]">
                      {topArtists[0]?.name || '-'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-t border-white/[0.08]">
                    <span className="text-white/50 font-mono text-[10px] uppercase">Lagu #1</span>
                    <span className="font-bold text-white truncate max-w-[150px]">
                      {topTracks[0]?.title || '-'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 w-full max-w-[320px] no-story-nav mt-1">
                  <button
                    onClick={handleExportCard}
                    disabled={isExporting || topTracks.length === 0}
                    className="w-full py-3.5 rounded-2xl bg-[#1ed760] hover:bg-[#1bc456] active:scale-95 text-black font-black text-xs shadow-[0_6px_25px_rgba(30,215,96,0.35)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>
                      {isExporting ? 'Memproses Kartu...' : 'Unduh Story Card (1080x1920 PNG)'}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentSlide(0);
                      setSlideProgress(0);
                    }}
                    className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer font-mono"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Tonton Ulang Story</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ================= GRID OVERVIEW MODE ================= */
          <div className="flex-1 overflow-y-auto scrollbar-none px-5 py-2 flex flex-col gap-4">
            {/* Header Metrics */}
            <div className="p-4.5 rounded-3xl bg-[#0f1118] border border-[#1ed760]/30 flex items-center justify-between shadow-lg">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1ed760] font-mono">
                  {activePeriodObj.tag}
                </span>
                <h3 className="text-3xl font-black font-mono text-white mt-0.5">{totalMinutes.toLocaleString()} MIN</h3>
                <p className="text-xs text-white/60">{totalPlays} lagu diputar di {activePeriodObj.label}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#1ed760]/15 border border-[#1ed760]/30 flex items-center justify-center text-[#1ed760]">
                <BarChart3 className="w-6 h-6 stroke-[2]" />
              </div>
            </div>

            {/* Persona Card */}
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-blue-400 block mb-0.5">
                  {persona.badge}
                </span>
                <span className="text-sm font-black text-white block">{persona.title}</span>
                <span className="text-xs text-white/50">{persona.tagline}</span>
              </div>
              <span className="text-xs font-bold text-blue-300 font-mono">
                {persona.peakHour} WIB
              </span>
            </div>

            {/* Top 5 Tracks */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-white/50 font-mono">
                Top 5 Lagu Teratas
              </span>
              <div className="flex flex-col gap-1.5">
                {topTracks.map((track, idx) => (
                  <div
                    key={track.id || idx}
                    onClick={() => onSelectTrack?.(track)}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="w-6 text-center font-mono text-xs font-black text-[#1ed760]">
                        0{idx + 1}
                      </span>
                      <SmartArtwork
                        src={track.cover}
                        title={track.title}
                        artist={track.artist}
                        className="w-9 h-9 rounded-xl object-cover flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white truncate">{track.title}</h4>
                        <p className="text-[10px] text-white/50 truncate">{track.artist}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#1ed760] font-mono ml-2">
                      {track.plays}x
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Artists */}
            {topArtists.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-white/70">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="font-bold">Musisi Teratas:</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  {topArtists.map((a, i) => (
                    <span key={a.name}>
                      <span className="text-[#1ed760]">{a.name}</span>
                      {i < topArtists.length - 1 && <span className="text-white/30 ml-2">•</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Export Action */}
            <button
              onClick={handleExportCard}
              disabled={isExporting || topTracks.length === 0}
              className="w-full py-3.5 rounded-2xl bg-[#1ed760] hover:bg-[#1bc456] text-black font-extrabold text-xs shadow-[0_6px_20px_rgba(30,215,96,0.35)] flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50 mt-1 mb-4"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>{isExporting ? 'Memproses Kartu...' : 'Unduh Story Card (PNG)'}</span>
            </button>
          </div>
        )}

        {/* ================= BOTTOM BAR HINT ================= */}
        {viewMode === 'story' && (
          <div className="relative z-30 pb-4 px-6 flex items-center justify-between text-[11px] text-white/40 border-t border-white/[0.06] pt-2.5 font-mono">
            <span>Tahan untuk jeda</span>
            <span>
              Slide {currentSlide + 1} dari {TOTAL_SLIDES}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default StatsModal;
