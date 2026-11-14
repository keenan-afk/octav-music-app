import React, { useRef, useState, useMemo } from 'react';
import { X, Sparkles, Download, Flame, Trophy, Play, Music, Radio } from 'lucide-react';
import { SmartArtwork } from './SmartArtwork';
import { OctavLogo } from './OctavLogo';
import { getListeningStats } from '../services/statsService';
import { useAuth } from '../context/AuthContext';

/**
 * StatsModal ("Octav Rewind")
 * Interactive Listening Stats & Social 9:16 Story Card Generator.
 */
export function StatsModal({ isOpen, onClose, onShowToast }) {
  const { user, effectiveDisplayName, effectiveAvatar } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const cardRef = useRef(null);

  const stats = useMemo(() => {
    return getListeningStats(user?.id);
  }, [user?.id, isOpen]);

  const totalMinutes = Math.round((stats.totalSeconds || 0) / 60);

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

  if (!isOpen) return null;

  const displayName = user?.displayName || effectiveDisplayName || 'Listener';
  const avatarUrl = user?.avatar || effectiveAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=180&q=80';

  // Export 9:16 PNG Social Story Card
  const handleExportCard = async () => {
    setIsExporting(true);
    try {
      const canvas = document.createElement('canvas');
      const W = 1080;
      const H = 1920;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');

      // 1. Deep Obsidian Studio Canvas Background
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, '#090a0f');
      bgGrad.addColorStop(0.5, '#050507');
      bgGrad.addColorStop(1, '#020204');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // 2. Emerald Ambient Bleed Glows
      const glow1 = ctx.createRadialGradient(250, 400, 10, 250, 400, 600);
      glow1.addColorStop(0, 'rgba(30, 215, 96, 0.28)');
      glow1.addColorStop(1, 'transparent');
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, W, H);

      const glow2 = ctx.createRadialGradient(850, 1300, 10, 850, 1300, 600);
      glow2.addColorStop(0, 'rgba(16, 78, 56, 0.35)');
      glow2.addColorStop(1, 'transparent');
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, W, H);

      // 3. Central Glass Frame
      const cardX = 80;
      const cardY = 160;
      const cardW = W - 160;
      const cardH = H - 320;

      // Rounded rect helper
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 48);
      ctx.fillStyle = 'rgba(20, 20, 28, 0.88)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.stroke();
      ctx.clip();

      // Top Glass Highlight
      const rim = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY);
      rim.addColorStop(0, 'rgba(255, 255, 255, 0)');
      rim.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
      rim.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = rim;
      ctx.fillRect(cardX, cardY, cardW, 4);

      // Header: User & Badge
      ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#1ed760';
      ctx.fillText('OCTAV REWIND', cardX + 60, cardY + 90);

      ctx.font = '800 52px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${displayName}'s Top 5`, cardX + 60, cardY + 160);

      // Listening Time Pill
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.roundRect(cardX + 60, cardY + 195, 360, 60, 20);
      ctx.fill();
      ctx.font = '600 28px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#1ed760';
      ctx.fillText(`${totalMinutes} Minutes`, cardX + 85, cardY + 236);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText('• Pure Sound', cardX + 260, cardY + 236);

      // Top 5 Songs List
      let trackY = cardY + 330;
      topTracks.forEach((t, i) => {
        // Rank pill
        ctx.fillStyle = i === 0 ? '#1ed760' : 'rgba(255, 255, 255, 0.12)';
        ctx.beginPath();
        ctx.arc(cardX + 90, trackY + 30, 28, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = i === 0 ? '#050507' : '#ffffff';
        ctx.font = '800 28px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`0${i + 1}`, cardX + 90, trackY + 40);
        ctx.textAlign = 'left';

        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
        const truncatedTitle = t.title.length > 22 ? t.title.slice(0, 22) + '...' : t.title;
        ctx.fillText(truncatedTitle, cardX + 145, trackY + 26);

        // Artist & Plays
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '500 28px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
        ctx.fillText(`${t.artist}  •  ${t.plays} plays`, cardX + 145, trackY + 62);

        // Subtle row line
        if (i < topTracks.length - 1) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
          ctx.fillRect(cardX + 60, trackY + 95, cardW - 120, 2);
        }

        trackY += 135;
      });

      // Bottom Watermark Divider & Octav Logo
      const footerY = cardY + cardH - 120;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(cardX + 60, footerY - 40, cardW - 120, 2);

      // Green Octav dot & brand name
      ctx.fillStyle = '#1ed760';
      ctx.beginPath();
      ctx.arc(cardX + 85, footerY + 2, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 42px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Octav', cardX + 115, footerY + 16);

      ctx.restore();

      // Trigger Direct PNG Download
      const dataUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${displayName.replace(/\s+/g, '_')}_Octav_Rewind.png`;
      downloadLink.href = dataUrl;
      downloadLink.click();

      onShowToast?.('Rewind Story Card saved to downloads');
    } catch (e) {
      console.error('Failed generating Rewind card:', e);
      onShowToast?.('Failed saving story card');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center p-4 pointer-events-auto select-none">
      {/* Blurred Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-xl transition-opacity cursor-pointer"
      />

      {/* Modal Dialog Card */}
      <div
        className="relative w-full max-w-[400px] max-h-[90vh] rounded-[36px] p-6 text-white z-10 flex flex-col gap-4 border border-white/20 shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden"
        style={{
          background: 'linear-gradient(150deg, rgba(22, 22, 28, 0.96) 0%, rgba(10, 10, 14, 0.98) 100%)',
          backdropFilter: 'blur(32px) saturate(190%) brightness(1.05)',
          boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.4), 0 30px 80px rgba(0, 0, 0, 0.95)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#1ed760]" />
            <h2 className="text-base font-black tracking-tight text-white">Octav Rewind</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        {/* Stats Summary Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-black/60 border border-[#1ed760]/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#1ed760]">
              Total Pure Audio
            </span>
            <h3 className="text-2xl font-black text-white">{totalMinutes} Minutes</h3>
            <p className="text-[11px] text-white/60">{stats.playsCount || 28} songs played</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#1ed760]/20 flex items-center justify-center text-[#1ed760]">
            <Trophy className="w-6 h-6" />
          </div>
        </div>

        {/* Top 5 Songs List */}
        {topTracks.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col items-center gap-2">
            <Music className="w-8 h-8 text-[#1ed760]/60 mb-1" />
            <h4 className="text-sm font-bold text-white">No Listening History Yet</h4>
            <p className="text-xs text-white/50 max-w-[240px] leading-relaxed">
              Play songs to start tracking your listening hours, top tracks, and personal rewind cards!
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-white/40">
                Top 5 Most Played Songs
              </span>

              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto scrollbar-none pr-1">
                {topTracks.map((track, idx) => (
                  <div
                    key={track.id || idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] border border-white/[0.06]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className={`w-5 text-center font-mono text-xs font-black ${
                          idx === 0 ? 'text-[#1ed760]' : 'text-white/40'
                        }`}
                      >
                        0{idx + 1}
                      </span>
                      <SmartArtwork
                        src={track.cover}
                        title={track.title}
                        artist={track.artist}
                        className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-white/10"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white truncate">{track.title}</h4>
                        <p className="text-[10px] text-white/50 truncate">{track.artist}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-[#1ed760] ml-2 flex-shrink-0">
                      {track.plays}x
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 3 Artists */}
            {topArtists.length > 0 && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                <div className="flex items-center gap-1.5 text-xs text-white/70">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="font-bold">Top Artists:</span>
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
          </>
        )}

        {/* Story Card Download Action */}
        <button
          onClick={handleExportCard}
          disabled={isExporting || topTracks.length === 0}
          className="w-full py-3.5 rounded-2xl bg-[#1ed760] hover:bg-[#1bc456] text-black font-extrabold text-xs shadow-[0_6px_20px_rgba(30,215,96,0.35)] flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50 mt-1"
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
          <span>{isExporting ? 'Generating Card...' : 'Download Top 5 Story Card (PNG)'}</span>
        </button>
      </div>
    </div>
  );
}

export default StatsModal;

