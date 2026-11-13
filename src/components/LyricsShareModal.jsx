import React, { useState, useRef } from 'react';
import { X, Download, Copy, Check, Sparkles } from 'lucide-react';
import { SmartArtwork } from './SmartArtwork';
import { OctavLogo } from './OctavLogo';

export function LyricsShareModal({ isOpen, onClose, currentTrack, onShowToast }) {
  const [selectedIndices, setSelectedIndices] = useState([0, 1]);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const cardRef = useRef(null);

  if (!isOpen || !currentTrack) return null;

  const rawLyrics =
    currentTrack.lyrics && currentTrack.lyrics.length > 0
      ? currentTrack.lyrics.map((l) => (typeof l === 'string' ? l : l.text))
      : currentTrack.plainLyrics
      ? currentTrack.plainLyrics.split('\n').filter((l) => l.trim().length > 0)
      : [
          "And it's hard to hold a candle",
          'In the cold November rain',
          "Don't you know you need somebody",
          'Everybody needs somebody',
        ];

  const toggleLine = (idx) => {
    if (selectedIndices.includes(idx)) {
      if (selectedIndices.length === 1) return; // Keep at least 1 line
      setSelectedIndices((prev) => prev.filter((i) => i !== idx));
    } else {
      if (selectedIndices.length >= 4) {
        onShowToast?.('Maximum 4 lyric lines per card');
        return;
      }
      setSelectedIndices((prev) => [...prev, idx].sort((a, b) => a - b));
    }
  };

  const selectedLines = selectedIndices.map((i) => rawLyrics[i]).filter(Boolean);
  const selectedText = selectedLines.join('\n');

  // Copy lyrics to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(`"${selectedText}"\n\n— ${currentTrack.title} • ${currentTrack.artist}`);
    setCopied(true);
    onShowToast?.('Lyrics copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  // High-Resolution 1080x1920 Story Card Export via Native HTML5 Canvas
  const handleExportPNG = async () => {
    setIsExporting(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');

      // 1. Deep Obsidian Base Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
      bgGrad.addColorStop(0, '#0c0d12');
      bgGrad.addColorStop(0.5, '#050507');
      bgGrad.addColorStop(1, '#020204');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1920);

      // 2. Load Artwork for Ambient Background Bleed
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = currentTrack.cover;

      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });

      if (img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.filter = 'blur(100px) brightness(0.38) saturate(1.8)';
        ctx.drawImage(img, -200, -200, 1480, 1480);
        ctx.restore();
      }

      // 3. Pre-calculate Lyrics Wrapping to Make Card Height Adaptive (No dead space!)
      const cardW = 880;
      const cardX = (1080 - cardW) / 2;
      const maxTextW = cardW - 160;

      ctx.font = 'bold 50px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      const wrappedParagraphs = [];
      let totalLinesCount = 0;

      selectedLines.forEach((line) => {
        const words = line.split(' ');
        const wrappedLines = [];
        let currentLine = '';

        words.forEach((w) => {
          const test = currentLine ? `${currentLine} ${w}` : w;
          if (ctx.measureText(test).width > maxTextW) {
            wrappedLines.push(currentLine);
            currentLine = w;
          } else {
            currentLine = test;
          }
        });
        if (currentLine) wrappedLines.push(currentLine);

        totalLinesCount += wrappedLines.length;
        wrappedParagraphs.push(wrappedLines);
      });

      // Adaptive Card Dimensions
      const headerH = 170;
      const footerH = 110;
      const lyricsH = totalLinesCount * 76 + (wrappedParagraphs.length - 1) * 36;
      const paddingH = 140;
      const calculatedCardH = Math.max(680, Math.min(1360, headerH + lyricsH + footerH + paddingH));
      const cardH = calculatedCardH;
      const cardY = (1920 - cardH) / 2;
      const radius = 56;

      // 4. Draw Central Glass Card Box
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, radius);
      ctx.fillStyle = 'rgba(20, 20, 26, 0.82)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.stroke();
      ctx.restore();

      // Specular Top Rim Glow
      ctx.save();
      const rimGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY);
      rimGrad.addColorStop(0, 'rgba(255,255,255,0)');
      rimGrad.addColorStop(0.5, 'rgba(255,255,255,0.45)');
      rimGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.roundRect(cardX + 40, cardY, cardW - 80, 4, 2);
      ctx.fillStyle = rimGrad;
      ctx.fill();
      ctx.restore();

      // 5. Header: 120x120 Album Cover + Song Title + Artist
      const thumbSize = 110;
      const thumbX = cardX + 60;
      const thumbY = cardY + 60;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(thumbX, thumbY, thumbSize, thumbSize, 24);
      ctx.clip();
      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, thumbX, thumbY, thumbSize, thumbSize);
      } else {
        ctx.fillStyle = '#1c1c24';
        ctx.fillRect(thumbX, thumbY, thumbSize, thumbSize);
      }
      ctx.restore();

      // Title & Artist Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      const titleText = currentTrack.title.length > 25 ? `${currentTrack.title.slice(0, 24)}...` : currentTrack.title;
      ctx.fillText(titleText, thumbX + thumbSize + 36, thumbY + 50);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.font = '500 32px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      const artistText = currentTrack.artist.length > 30 ? `${currentTrack.artist.slice(0, 29)}...` : currentTrack.artist;
      ctx.fillText(artistText, thumbX + thumbSize + 36, thumbY + 98);

      // Subtle divider under header
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(cardX + 60, thumbY + thumbSize + 45, cardW - 120, 2);

      // 6. Middle: Selected Lyrics in Large Spotify Typography
      let textCursorY = thumbY + thumbSize + 115;
      ctx.font = 'bold 50px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';

      wrappedParagraphs.forEach((paragraph) => {
        const paragraphH = paragraph.length * 76;

        // Emerald accent bar beside each lyric stanza
        ctx.fillStyle = '#1ed760';
        ctx.beginPath();
        ctx.roundRect(cardX + 60, textCursorY - 42, 6, paragraphH - 15, 3);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        paragraph.forEach((line) => {
          ctx.fillText(line, cardX + 85, textCursorY);
          textCursorY += 76;
        });

        textCursorY += 28;
      });

      // 7. Bottom: Divider + Clean Minimalist "Octav" Brand Mark
      const footerY = cardY + cardH - 65;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(cardX + 60, footerY - 45, cardW - 120, 2);

      // Waveform icon dot
      ctx.fillStyle = '#1ed760';
      ctx.beginPath();
      ctx.arc(cardX + 75, footerY - 5, 10, 0, Math.PI * 2);
      ctx.fill();

      // Bold tight Octav logotype
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Octav', cardX + 102, footerY + 6);

      // 8. Trigger Direct PNG Download
      const dataUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${currentTrack.title.replace(/\s+/g, '_')}_Octav_Story.png`;
      downloadLink.href = dataUrl;
      downloadLink.click();

      onShowToast?.('Lyrics Story saved to downloads');
    } catch (e) {
      console.error('Failed generating canvas card:', e);
      onShowToast?.('Failed generating PNG: ' + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto select-none">
      {/* Dimmed backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-xl transition-opacity"
      />

      {/* Modal Dialog */}
      <div
        className="relative w-full max-w-[410px] max-h-[92vh] bg-[#121218]/95 border border-white/15 rounded-[32px] p-5 shadow-2xl flex flex-col gap-4 overflow-hidden z-10"
        style={{
          backdropFilter: 'blur(32px) saturate(190%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#1ed760]" />
            <h3 className="text-base font-black tracking-tight text-white">Share Lyrics Story</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        {/* 9:16 Story Preview Card */}
        <div
          ref={cardRef}
          className="relative w-full aspect-[9/13] rounded-3xl p-5 overflow-hidden flex flex-col justify-between border border-white/20 shadow-2xl text-white"
          style={{
            background: 'linear-gradient(150deg, rgba(28,28,36,0.92) 0%, rgba(10,10,14,0.96) 100%)',
          }}
        >
          {/* Blurred Background Art */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40 blur-2xl scale-125"
            style={{
              backgroundImage: `url(${currentTrack.cover})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          {/* Specular Rim */}
          <div className="absolute inset-x-4 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

          {/* Track Header */}
          <div className="relative z-10 flex items-center gap-3">
            <SmartArtwork
              src={currentTrack.cover}
              title={currentTrack.title}
              artist={currentTrack.artist}
              className="w-12 h-12 rounded-xl border border-white/20 shadow-md object-cover flex-shrink-0"
            />
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-white truncate leading-snug">
                {currentTrack.title}
              </h4>
              <p className="text-xs text-white/60 truncate leading-snug">{currentTrack.artist}</p>
            </div>
          </div>

          {/* Selected Quotes Highlight */}
          <div className="relative z-10 flex flex-col gap-2.5 my-auto py-2">
            {selectedLines.map((line, idx) => (
              <p
                key={idx}
                className="text-lg sm:text-xl font-black tracking-tight leading-snug text-white drop-shadow-md border-l-2 border-[#1ed760] pl-3"
              >
                {line}
              </p>
            ))}
          </div>

          {/* Minimalist Octav Brand Mark */}
          <div className="relative z-10 flex items-center justify-between text-xs text-white/70 font-medium pt-3 border-t border-white/10">
            <OctavLogo size={18} showWordmark={true} />
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Story Card</span>
          </div>
        </div>

        {/* Lyric Line Selector: Fixed scrollable container, NO clipped text! */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
              Select Lines ({selectedIndices.length}/4)
            </span>
            <span className="text-[10px] text-white/40">Tap up to 4 lines</span>
          </div>

          <div className="max-h-40 overflow-y-auto flex flex-col gap-2 pr-1 scrollbar-none">
            {rawLyrics.map((line, idx) => {
              const isSelected = selectedIndices.includes(idx);
              return (
                <button
                  key={idx}
                  onClick={() => toggleLine(idx)}
                  className={`shrink-0 py-2.5 px-3.5 h-auto min-h-[40px] text-left text-sm leading-snug rounded-xl border transition-all flex items-center justify-between gap-2 active:scale-[0.99] ${
                    isSelected
                      ? 'bg-[#1ed760]/20 border-[#1ed760]/50 text-white font-semibold shadow-[0_0_12px_rgba(30,215,96,0.15)]'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="flex-1 break-words">{line}</span>
                  {isSelected && <Check className="w-4 h-4 text-[#1ed760] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleCopy}
            className="py-3 px-3 rounded-xl bg-white/10 border border-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-white/15 active:scale-95 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#1ed760]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Text'}</span>
          </button>

          <button
            onClick={handleExportPNG}
            disabled={isExporting}
            className="py-3 px-3 rounded-xl bg-gradient-to-r from-[#1ed760] to-[#17b14d] text-black font-bold text-xs flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(30,215,96,0.3)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Generating...' : 'Download PNG'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
