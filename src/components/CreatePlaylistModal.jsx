import React, { useState, useEffect, useRef } from 'react';
import { X, Music2, Sparkles } from 'lucide-react';
import { LiquidSurface } from './LiquidGlassFilter';
import gsap from 'gsap';

export function CreatePlaylistModal({ isOpen, onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const inputRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setTimeout(() => inputRef.current?.focus(), 100);

      if (modalRef.current) {
        gsap.fromTo(
          modalRef.current,
          { scale: 0.92, opacity: 0, y: 20 },
          { scale: 1, opacity: 1, y: 0, duration: 0.35, ease: 'back.out(1.2)' }
        );
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e?.preventDefault();
    const finalTitle = title.trim() || 'New Playlist';
    onCreate(finalTitle, description.trim());
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-4 select-none"
      onKeyDown={handleKeyDown}
    >
      {/* Dimmed backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity"
      />

      {/* Modal Surface */}
      <div ref={modalRef} className="relative z-10 w-full max-w-[360px]">
        <LiquidSurface
          className="rounded-[28px] p-6 border border-white/[0.14] overflow-hidden"
          style={{
            background:
              'linear-gradient(145deg, rgba(26, 26, 36, 0.94) 0%, rgba(12, 12, 18, 0.92) 100%)',
            backdropFilter: 'url(#liquid-refraction) blur(40px) saturate(210%) brightness(1.06)',
            boxShadow:
              'inset 0 1px 1px 0 rgba(255, 255, 255, 0.5), 0 20px 50px rgba(0, 0, 0, 0.85)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#1ed760]/20 border border-[#1ed760]/30 flex items-center justify-center text-[#1ed760]">
                <Music2 className="w-4 h-4" />
              </div>
              <h3 className="text-base font-extrabold text-white tracking-tight">New Playlist</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {/* Title Input */}
            <div>
              <label className="text-[11px] font-bold text-white/50 tracking-wider uppercase mb-1.5 block">
                Playlist Name
              </label>
              <input
                ref={inputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your playlist a name"
                maxLength={60}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-sm font-semibold text-white placeholder-white/30 focus:outline-none focus:border-[#1ed760]/60 focus:bg-white/[0.09] transition-all"
              />
            </div>

            {/* Description Input */}
            <div>
              <label className="text-[11px] font-bold text-white/50 tracking-wider uppercase mb-1.5 block">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add an optional description"
                maxLength={120}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs font-medium text-white placeholder-white/30 focus:outline-none focus:border-[#1ed760]/60 focus:bg-white/[0.09] transition-all"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-3 mt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs font-bold text-white/80 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#1ed760] hover:bg-[#1fdf64] active:scale-[0.98] text-xs font-extrabold text-black shadow-lg shadow-[#1ed760]/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create</span>
              </button>
            </div>
          </form>
        </LiquidSurface>
      </div>
    </div>
  );
}

export default CreatePlaylistModal;

