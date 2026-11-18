import React, { useState } from 'react';
import { X, UserPlus, Check, ArrowRight } from 'lucide-react';

export function GoogleAccountChooserModal({ isOpen, onClose, onSelectAccount }) {
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  if (!isOpen) return null;

  const defaultAccounts = [
    {
      name: 'Mazid',
      email: 'mazid.sound@gmail.com',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Mazid&backgroundColor=1ed760&textColor=000000',
    },
    {
      name: 'Mazid Studio',
      email: 'mazid.studio@gmail.com',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=MS&backgroundColor=1ed760&textColor=000000',
    },
  ];

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customEmail.includes('@')) return;
    const name = customName.trim() || customEmail.split('@')[0];
    onSelectAccount({
      email: customEmail.trim(),
      name,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${name}&backgroundColor=1ed760`,
    });
  };

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center p-4 select-none pointer-events-auto">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity" />

      {/* Google Dialog Box */}
      <div
        className="relative w-full max-w-[360px] bg-[#1a1a22]/95 border border-white/20 rounded-[28px] p-6 shadow-2xl text-white flex flex-col gap-4 z-10"
        style={{
          backdropFilter: 'blur(30px) saturate(180%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            {/* Google G multi-color icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="text-xs font-bold text-white/80">Sign in with Google</span>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5 text-white/70" />
          </button>
        </div>

        <div>
          <h3 className="text-base font-extrabold text-white tracking-tight">Choose an account</h3>
          <p className="text-xs text-white/50 mt-0.5">to continue to <span className="text-white font-semibold">Octav</span></p>
        </div>

        {/* Existing / Preset Google Accounts */}
        {!isAddingNew ? (
          <div className="flex flex-col gap-2">
            {defaultAccounts.map((acc) => (
              <button
                key={acc.email}
                onClick={() => onSelectAccount(acc)}
                className="w-full p-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] active:scale-[0.99] border border-white/10 flex items-center justify-between text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={acc.avatar}
                    alt={acc.name}
                    className="w-9 h-9 rounded-full object-cover border border-white/20"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block group-hover:text-[#1ed760] transition-colors truncate">
                      {acc.name}
                    </span>
                    <span className="text-[11px] text-white/50 truncate block">
                      {acc.email}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white transition-colors" />
              </button>
            ))}

            {/* Use Another Account Button */}
            <button
              onClick={() => setIsAddingNew(true)}
              className="w-full p-2.5 rounded-2xl hover:bg-white/[0.06] border border-dashed border-white/20 flex items-center gap-3 text-left transition-all cursor-pointer mt-1 group"
            >
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/70 group-hover:text-white">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Use another Google account</span>
                <span className="text-[10px] text-white/50">Enter custom name & email</span>
              </div>
            </button>
          </div>
        ) : (
          /* Custom Google Account Form */
          <form onSubmit={handleCustomSubmit} className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1 block">
                Google Display Name
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Mazid Sound"
                className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#1ed760] transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1 block">
                Google Email Address
              </label>
              <input
                type="email"
                required
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="username@gmail.com"
                className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#1ed760] transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="py-2.5 px-3 rounded-xl bg-white/10 text-xs font-bold text-white hover:bg-white/15 active:scale-95 transition-all"
              >
                Back
              </button>
              <button
                type="submit"
                className="py-2.5 px-3 rounded-xl bg-[#1ed760] text-black text-xs font-bold shadow-md hover:scale-[1.02] active:scale-95 transition-all"
              >
                Continue
              </button>
            </div>
          </form>
        )}

        <div className="pt-2 text-center text-[10px] text-white/40">
          Octav securely uses your Google profile to sync playlists and liked songs across devices.
        </div>
      </div>
    </div>
  );
}

