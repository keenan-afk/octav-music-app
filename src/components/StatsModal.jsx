import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  X,
  Sparkles,
  Download,
  Share2,
  Flame,
  Trophy,
  Play,
  Pause,
  Music,
  RotateCcw,
  LayoutGrid,
  Layers,
  Clock,
  Compass,
  Check,
  Calendar,
  Award,
  ChevronLeft,
  ChevronRight,
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
 * Full-screen interactive 9:16 story experience + summary grid.
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

  // Persona
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
  const avatarUrl =
    user?.avatar ||
    effectiveAvatar ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=180&q=80';

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
            // Stay at final slide
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
    // Ignore clicks on buttons/interactive elements
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

  // High-Resolution 1080x1920 9:16 Canvas Story Export
  const handleExportCard = async () => {
    setIsExporting(true);
    try {
      const canvas = document.createElement('canvas');
      const W = 1080;
      const H = 1920;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');

      // 1. Dark Studio Gradient Background
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, '#090a10');
      bgGrad.addColorStop(0.45, '#050508');
      bgGrad.addColorStop(1, '#020204');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // 2. Dual Aura Bleed
      const g1 = ctx.createRadialGradient(250, 380, 20, 250, 380, 550);
      g1.addColorStop(0, 'rgba(30, 215, 96, 0.32)');
      g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, H);

      const g2 = ctx.createRadialGradient(840, 1350, 20, 840, 1350, 600);
      g2.addColorStop(0, 'rgba(139, 92, 246, 0.28)');
      g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);

      // 3. Central Glass Frame
      const cardX = 70;
      const cardY = 120;
      const cardW = W - 140;
      const cardH = H - 240;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 52);
      ctx.fillStyle = 'rgba(20, 20, 28, 0.88)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.stroke();
      ctx.clip();

      // Top Glass Specular Line
      const rim = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY);
      rim.addColorStop(0, 'rgba(255, 255, 255, 0)');
      rim.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
      rim.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = rim;
      ctx.fillRect(cardX, cardY, cardW, 4);

      // Header Tag: Event Type & Period
      ctx.fillStyle = '#1ed760';
      ctx.font = '800 26px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillText(activePeriodObj.tag.toUpperCase(), cardX + 60, cardY + 85);

      // Main Period Title
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 58px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillText(activePeriodObj.label, cardX + 60, cardY + 155);

      // User pill
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '600 30px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`Curated for ${displayName}`, cardX + 60, cardY + 205);

      // 4. Two Metrics Blocks (Minutes & Persona)
      const metricY = cardY + 250;

      // Minutes Pill
      ctx.fillStyle = 'rgba(30, 215, 96, 0.12)';
      ctx.beginPath();
      ctx.roundRect(cardX + 60, metricY, 380, 110, 24);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(30, 215, 96, 0.35)';
      ctx.stroke();

      ctx.fillStyle = '#1ed760';
      ctx.font = '800 22px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillText('TOTAL WAKTU', cardX + 90, metricY + 42);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 44px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`${totalMinutes.toLocaleString()} Menit`, cardX + 90, metricY + 92);

      // Persona Pill
      ctx.fillStyle = 'rgba(139, 92, 246, 0.14)';
      ctx.beginPath();
      ctx.roundRect(cardX + 465, metricY, cardW - 525, 110, 24);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
      ctx.stroke();

      ctx.fillStyle = '#a78bfa';
      ctx.font = '800 22px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillText('AUDIO PERSONA', cardX + 495, metricY + 42);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillText(persona.badge, cardX + 495, metricY + 92);

      // 5. Top 1 Artist Card
      const artistY = metricY + 145;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.roundRect(cardX + 60, artistY, cardW - 120, 110, 24);
      ctx.fill();

      ctx.fillStyle = '#f59e0b';
      ctx.font = '800 22px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillText('ARTIS TERATAS #1', cardX + 90, artistY + 45);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 40px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillText(topArtists[0]?.name || 'Belum ada artis', cardX + 90, artistY + 92);

      // 6. Top 5 Songs Countdown List
      let trackY = artistY + 185;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillText('TOP 5 LAGU FAVORIT', cardX + 60, trackY);

      trackY += 45;
      topTracks.forEach((t, i) => {
        // Rank circle
        ctx.fillStyle = i === 0 ? '#1ed760' : 'rgba(255, 255, 255, 0.12)';
        ctx.beginPath();
        ctx.arc(cardX + 95, trackY + 30, 26, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = i === 0 ? '#050507' : '#ffffff';
        ctx.font = '900 26px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`0${i + 1}`, cardX + 95, trackY + 39);
        ctx.textAlign = 'left';

        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
        const truncatedTitle = t.title.length > 25 ? `${t.title.slice(0, 25)}...` : t.title;
        ctx.fillText(truncatedTitle, cardX + 145, trackY + 28);

        // Artist & Plays
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '500 26px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
        ctx.fillText(`${t.artist}  •  ${t.plays}x diputar`, cardX + 145, trackY + 62);

        // Divider
        if (i < topTracks.length - 1) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
          ctx.fillRect(cardX + 60, trackY + 90, cardW - 120, 2);
        }

        trackY += 125;
      });

      // 7. Footer Watermark
      const footerY = cardY + cardH - 85;
      ctx.fillStyle = '#1ed760';
      ctx.beginPath();
      ctx.arc(cardX + 85, footerY + 5, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 38px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Octav', cardX + 115, footerY + 18);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillText('music.octav.app', cardX + cardW - 250, footerY + 18);

      ctx.restore();

      // Trigger Direct Download & Share
      const dataUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${displayName.replace(/\s+/g, '_')}_Octav_${activePeriodObj.id}.png`;
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
              ? 'radial-gradient(circle at 50% 40%, rgba(139, 92, 246, 0.4) 0%, transparent 70%)'
              : currentSlide === 2
              ? 'radial-gradient(circle at 50% 40%, rgba(245, 158, 11, 0.35) 0%, transparent 70%)'
              : 'radial-gradient(circle at 50% 40%, rgba(30, 215, 96, 0.35) 0%, transparent 70%)',
        }}
      />

      {/* Main Container Card (Exact 9:16 Aspect on Mobile, Max-W 430px) */}
      <div
        onMouseDown={() => setIsHolding(true)}
        onMouseUp={() => setIsHolding(false)}
        onTouchStart={() => setIsHolding(true)}
        onTouchEnd={() => setIsHolding(false)}
        onClick={handleScreenTouch}
        className="relative w-full h-full md:h-[92vh] md:max-w-[420px] md:rounded-[40px] overflow-hidden flex flex-col justify-between text-white shadow-[0_30px_90px_rgba(0,0,0,0.95)] border border-white/15"
        style={{
          background: 'linear-gradient(175deg, #0d0f15 0%, #06070a 100%)',
        }}
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
                  <span className="text-[10px] font-black uppercase tracking-wider text-white/40 px-2 py-1">
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
            {/* Slide 0: Total Minutes & Listening Time */}
            {currentSlide === 0 && (
              <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-400">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-[#1ed760]/20 text-[#1ed760] border border-[#1ed760]/40 shadow-sm">
                    {activePeriodObj.tag}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white/60 tracking-tight">
                    Di {activePeriodObj.label}, kamu telah mendengarkan
                  </h3>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-6xl font-black tracking-tight text-white drop-shadow-[0_4px_25px_rgba(30,215,96,0.4)]">
                      {totalMinutes.toLocaleString()}
                    </span>
                    <span className="text-2xl font-bold text-[#1ed760]">Menit</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-white/50 font-medium">Total Lagu Diputar</span>
                    <span className="text-xl font-black text-white">{totalPlays} Lagu</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#1ed760]/20 flex items-center justify-center text-[#1ed760]">
                    <Music className="w-5 h-5" />
                  </div>
                </div>

                <p className="text-xs text-white/50 leading-relaxed italic border-l-2 border-[#1ed760] pl-3 py-1">
                  "Musik adalah soundtrack yang mengisi setiap langkah dan inspirasimu di{' '}
                  {activePeriodObj.label}."
                </p>

                <div className="pt-2 text-center text-xs text-white/40">
                  <span>Ketuk sisi kanan layar untuk lanjut →</span>
                </div>
              </div>
            )}

            {/* Slide 1: Audio Persona / Vibe */}
            {currentSlide === 1 && (
              <div className="flex flex-col items-center text-center gap-6 animate-in fade-in zoom-in-95 duration-400">
                <span className="text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Audio Persona Kamu
                </span>

                {/* Persona Avatar Aura */}
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <div
                    className="absolute inset-0 rounded-full blur-2xl opacity-60 animate-pulse"
                    style={{ background: persona.vibeColor }}
                  />
                  <div className="relative z-10 w-28 h-28 rounded-full bg-gradient-to-tr from-purple-900 to-indigo-950 border-2 border-purple-400/50 flex flex-col items-center justify-center shadow-2xl">
                    <span className="text-4xl">{persona.badge.split(' ')[0]}</span>
                    <span className="text-[10px] font-black text-purple-200 mt-1">PERSONA</span>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">{persona.title}</h2>
                  <p className="text-xs font-semibold text-purple-300 mt-0.5">{persona.tagline}</p>
                </div>

                <p className="text-xs text-white/70 max-w-xs leading-relaxed px-4">
                  {persona.description}
                </p>

                {persona.peakHour && (
                  <div className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-semibold text-white/80 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span>Jam puncak mendengarkan: {persona.peakHour} WIB</span>
                  </div>
                )}
              </div>
            )}

            {/* Slide 2: Top Artist Spotlight */}
            {currentSlide === 2 && (
              <div className="flex flex-col items-center text-center gap-5 animate-in fade-in zoom-in-95 duration-400">
                <span className="text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Artis Paling Setia Menemanimu
                </span>

                {/* Big Artist Circle */}
                <div className="relative w-36 h-36">
                  <div className="absolute inset-0 rounded-full bg-amber-500/30 blur-2xl" />
                  <div className="relative z-10 w-full h-full rounded-full overflow-hidden border-3 border-amber-400/60 shadow-2xl bg-neutral-900">
                    <SmartArtwork
                      src={topTracks[0]?.cover}
                      title={topArtists[0]?.name}
                      artist={topArtists[0]?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 z-20 w-8 h-8 rounded-full bg-amber-400 text-black flex items-center justify-center font-black shadow-lg">
                    👑
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    {topArtists[0]?.name || 'Belum Ada Artis'}
                  </h2>
                  <p className="text-xs text-amber-400/90 font-bold mt-0.5">
                    {topArtists[0]?.plays || 0}x diputar di {activePeriodObj.label}
                  </p>
                </div>

                {/* Runner-up Artists */}
                {topArtists.length > 1 && (
                  <div className="w-full max-w-xs flex flex-col gap-2 mt-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/40">
                      Disusul oleh musisi favoritmu:
                    </span>
                    <div className="flex items-center justify-center gap-3">
                      {topArtists.slice(1, 3).map((art, idx) => (
                        <div
                          key={art.name}
                          className="py-1.5 px-3 rounded-xl bg-white/[0.05] border border-white/10 text-xs font-bold text-white flex items-center gap-1.5"
                        >
                          <span className="text-amber-400 font-mono text-[10px]">#{idx + 2}</span>
                          <span className="truncate max-w-[90px]">{art.name}</span>
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
                  <span className="text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-[#1ed760]/20 text-[#1ed760] border border-[#1ed760]/30">
                    Top 5 Lagu Teratas
                  </span>
                  <h3 className="text-base font-black text-white mt-1">Lagu Paling Sering Kamu Putar</h3>
                </div>

                <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto scrollbar-none pr-1">
                  {topTracks.map((track, idx) => (
                    <div
                      key={track.id || idx}
                      onClick={() => onSelectTrack?.(track)}
                      className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer group no-story-nav ${
                        idx === 0
                          ? 'bg-[#1ed760]/15 border-[#1ed760]/40 shadow-[0_0_20px_rgba(30,215,96,0.15)]'
                          : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className={`w-5 text-center font-mono text-sm font-black ${
                            idx === 0 ? 'text-[#1ed760]' : 'text-white/40'
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
                        <span className="text-xs font-bold text-[#1ed760] font-mono">
                          {track.plays}x
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Slide 4: Final Summary & Shareable Story Card */}
            {currentSlide === 4 && (
              <div className="flex flex-col items-center gap-4 text-center animate-in fade-in zoom-in-95 duration-400">
                <span className="text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-[#1ed760]/20 text-[#1ed760] border border-[#1ed760]/30">
                  Kartu Musik {activePeriodObj.label}
                </span>

                {/* Compact Story Card Preview */}
                <div className="w-full max-w-[310px] p-4 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/20 shadow-2xl flex flex-col gap-3 text-left">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#1ed760] tracking-wider block">
                        OCTAV RECAP
                      </span>
                      <h4 className="text-sm font-black text-white">{activePeriodObj.label}</h4>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {persona.badge}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-white/60">Waktu Mendengar</span>
                    <span className="font-black text-[#1ed760]">{totalMinutes} Menit</span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-t border-white/[0.06]">
                    <span className="text-white/60">Artis #1</span>
                    <span className="font-black text-white truncate max-w-[140px]">
                      {topArtists[0]?.name || '-'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-t border-white/[0.06]">
                    <span className="text-white/60">Lagu #1</span>
                    <span className="font-black text-white truncate max-w-[140px]">
                      {topTracks[0]?.title || '-'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 w-full max-w-[310px] no-story-nav mt-1">
                  <button
                    onClick={handleExportCard}
                    disabled={isExporting || topTracks.length === 0}
                    className="w-full py-3.5 rounded-2xl bg-[#1ed760] hover:bg-[#1bc456] active:scale-95 text-black font-extrabold text-xs shadow-[0_6px_25px_rgba(30,215,96,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>
                      {isExporting ? 'Menyiapkan Story...' : 'Unduh Story Card (1080x1920 PNG)'}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentSlide(0);
                      setSlideProgress(0);
                    }}
                    className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
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
            <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-950/60 to-black/60 border border-[#1ed760]/30 flex items-center justify-between shadow-lg">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1ed760]">
                  {activePeriodObj.tag}
                </span>
                <h3 className="text-3xl font-black text-white">{totalMinutes.toLocaleString()} Menit</h3>
                <p className="text-xs text-white/60">{totalPlays} lagu diputar di {activePeriodObj.label}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#1ed760]/20 border border-[#1ed760]/30 flex items-center justify-center text-[#1ed760]">
                <Trophy className="w-6 h-6" />
              </div>
            </div>

            {/* Persona Card */}
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xl">
                  {persona.badge.split(' ')[0]}
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">{persona.title}</span>
                  <span className="text-[11px] text-white/50">{persona.tagline}</span>
                </div>
              </div>
              <span className="text-xs font-bold text-purple-300 font-mono">
                {persona.peakHour} WIB
              </span>
            </div>

            {/* Top 5 Tracks */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-white/50">
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
                      <span className="w-5 text-center font-mono text-xs font-black text-[#1ed760]">
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
                  <Flame className="w-4 h-4 text-amber-400" />
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
              <span>{isExporting ? 'Menyiapkan Story...' : 'Unduh Story Card (PNG)'}</span>
            </button>
          </div>
        )}

        {/* ================= BOTTOM BAR HINT ================= */}
        {viewMode === 'story' && (
          <div className="relative z-30 pb-4 px-6 flex items-center justify-between text-[11px] text-white/40 border-t border-white/[0.06] pt-2.5">
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
