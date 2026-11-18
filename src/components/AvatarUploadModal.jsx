import React, { useState, useRef } from 'react';
import { X, Upload, Link as LinkIcon, Check, Camera, Image as ImageIcon } from 'lucide-react';
import { LiquidSurface } from './LiquidGlassFilter';

/**
 * AvatarUploadModal
 * Sleek Liquid Glass dialog for uploading or setting a custom user profile picture.
 * Features:
 * - Offscreen HTML5 Canvas (256x256 center-crop + JPEG 0.88 compression)
 * - Direct Image URL pasting
 * - Live preview with crisp presence ring
 */
export function AvatarUploadModal({ isOpen, onClose, currentAvatar, onSaveAvatar, onShowToast }) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'url'
  const [imageUrl, setImageUrl] = useState('');
  const [previewSrc, setPreviewSrc] = useState(currentAvatar || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Process file upload via offscreen HTML5 Canvas
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast?.('Please select a valid image file');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          // Offscreen 256x256 canvas for crisp avatar
          const canvas = document.createElement('canvas');
          const size = 256;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');

          // Center-crop calculation (aspect ratio preserve)
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setPreviewSrc(compressedDataUrl);
          setIsProcessing(false);
        } catch (err) {
          console.error('Image compression failed:', err);
          setPreviewSrc(event.target.result);
          setIsProcessing(false);
        }
      };
      img.onerror = () => {
        setIsProcessing(false);
        onShowToast?.('Could not load selected image');
      };
      img.src = event.target.result;
    };

    reader.onerror = () => {
      setIsProcessing(false);
      onShowToast?.('Failed reading image file');
    };

    reader.readAsDataURL(file);
  };

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setImageUrl(val);
    if (val.trim()) {
      setPreviewSrc(val.trim());
    }
  };

  const handleSave = () => {
    if (!previewSrc) {
      onShowToast?.('Please choose an image or enter a URL');
      return;
    }
    onSaveAvatar(previewSrc);
    onShowToast?.('Profile picture updated');
    onClose();
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
        className="relative w-full max-w-[360px] rounded-[32px] p-5 text-white z-10 flex flex-col gap-4 border border-white/20 shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden"
        style={{
          background: 'linear-gradient(150deg, rgba(22, 22, 28, 0.96) 0%, rgba(10, 10, 14, 0.98) 100%)',
          backdropFilter: 'blur(32px) saturate(190%) brightness(1.05)',
          boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.4), 0 25px 50px rgba(0, 0, 0, 0.95)',
        }}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#1ed760]" />
            <h3 className="text-base font-extrabold tracking-tight text-white">Profile Picture</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5 text-white/80" />
          </button>
        </div>

        {/* Live Preview Avatar */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="relative w-24 h-24 rounded-full p-1 border-2 border-white/20 shadow-xl overflow-hidden group">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#1ed760] via-emerald-400 to-teal-300 opacity-90" />
            <img
              src={previewSrc}
              alt="Avatar preview"
              className="relative z-10 w-full h-full object-cover rounded-full border-2 border-[#050507]"
              onError={(e) => {
                e.target.src =
                  'https://api.dicebear.com/7.x/initials/svg?seed=User&backgroundColor=1ed760&textColor=000000';
              }}
            />
            {isProcessing && (
              <div className="absolute inset-0 z-20 bg-black/60 rounded-full flex items-center justify-center text-xs text-[#1ed760] font-bold">
                Optimizing...
              </div>
            )}
          </div>
          <span className="text-[11px] text-white/50 mt-2 font-medium">
            256x256 Crisp Compressed Avatar
          </span>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/[0.06] border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'upload'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-white/50 hover:text-white'
              }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Photo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'url'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-white/50 hover:text-white'
              }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Image URL</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'upload' ? (
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 border-2 border-dashed border-white/20 hover:border-[#1ed760]/60 rounded-2xl flex flex-col items-center justify-center gap-1 bg-white/[0.03] hover:bg-white/[0.06] transition-all cursor-pointer group"
            >
              <ImageIcon className="w-6 h-6 text-white/40 group-hover:text-[#1ed760] transition-colors" />
              <span className="text-xs font-bold text-white group-hover:text-[#1ed760] transition-colors">
                Choose photo from device
              </span>
              <span className="text-[10px] text-white/40">PNG, JPG, WebP supported</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-white/60">
              Paste Direct Image URL
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={handleUrlChange}
              placeholder="https://..."
              className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-xs text-white placeholder-white/30 outline-none focus:border-[#1ed760] transition-colors"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white active:scale-95 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isProcessing}
            className="py-2.5 rounded-xl bg-[#1ed760] hover:bg-[#1bc456] text-black text-xs font-extrabold shadow-[0_4px_16px_rgba(30,215,96,0.35)] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Save Avatar</span>
          </button>
        </div>
      </div>
    </div>
  );
}

