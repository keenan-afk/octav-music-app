import React, { useState, useRef, useEffect } from 'react';
import { X, Lock, Mail, User, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { OctavLogo } from './OctavLogo';
import gsap from 'gsap';

export function AuthModal({ onShowToast }) {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalMode,
    signIn,
    signUp,
    signInWithGoogle,
  } = useAuth();

  const [mode, setMode] = useState(authModalMode || 'signin');
  const [identifier, setIdentifier] = useState(''); // email or username for signin
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const modalRef = useRef(null);
  const tabPillRef = useRef(null);

  // Sync mode with context
  useEffect(() => {
    if (authModalMode) {
      setMode(authModalMode);
      setErrorMessage('');
    }
  }, [authModalMode]);

  // GSAP tab indicator animation
  useEffect(() => {
    if (!tabPillRef.current) return;
    gsap.to(tabPillRef.current, {
      x: mode === 'signin' ? '0%' : '100%',
      duration: 0.28,
      ease: 'power3.out',
    });
  }, [mode]);

  // GSAP Entrance & Exit
  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;

    if (isAuthModalOpen) {
      el.style.display = 'flex';
      gsap.killTweensOf(el);
      gsap.fromTo(
        el,
        { scale: 0.94, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.35, ease: 'back.out(1.15)', force3D: true }
      );
    } else {
      gsap.killTweensOf(el);
      gsap.to(el, {
        scale: 0.94,
        opacity: 0,
        y: 20,
        duration: 0.25,
        ease: 'power3.in',
        force3D: true,
        onComplete: () => {
          if (el) el.style.display = 'none';
        },
      });
    }
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        const user = await signIn({ identifier, password });
        onShowToast?.(`Welcome back, ${user.displayName}!`);
        closeAuthModal();
      } else {
        const user = await signUp({ username, email, password });
        if (user.needsEmailVerification) {
          onShowToast?.(user.verificationMessage || 'Account registered! Please check your inbox.');
        } else {
          onShowToast?.(`Account created! Welcome to Octav, @${user.username}.`);
        }
        closeAuthModal();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please check details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueWithGoogle = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      await signInWithGoogle();
    } catch (err) {
      console.warn('Real Google OAuth status:', err);
      const msg = (err.message || '').toLowerCase();
      if (
        msg.includes('provider is not enabled') ||
        msg.includes('not configured') ||
        msg.includes('validation_failed')
      ) {
        setErrorMessage(
          'Login Google OAuth belum diaktifkan pada server Supabase. Silakan masuk atau daftar menggunakan Email & Password.'
        );
      } else {
        setErrorMessage(err.message || 'Google sign in failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[65] flex items-center justify-center p-4 select-none pointer-events-auto">
      {/* Dimmed backdrop */}
      <div
        onClick={closeAuthModal}
        className="absolute inset-0 bg-black/75 backdrop-blur-xl transition-opacity"
      />

      {/* Liquid Glass Dialog Card */}
      <div
        ref={modalRef}
        className="relative w-full max-w-[390px] rounded-[36px] p-6 text-white z-10 flex flex-col gap-4 border border-white/20 overflow-hidden"
        style={{
          display: isAuthModalOpen ? 'flex' : 'none',
          background: 'linear-gradient(150deg, rgba(24, 24, 32, 0.92) 0%, rgba(10, 10, 14, 0.96) 100%)',
          backdropFilter: 'blur(32px) saturate(190%) brightness(1.05)',
          boxShadow:
            'inset 0 1px 1px 0 rgba(255, 255, 255, 0.45), inset 0 -1px 1px 0 rgba(255, 255, 255, 0.08), 0 30px 80px rgba(0, 0, 0, 0.95)',
        }}
      >
          {/* Subtle Ambient Color Glow behind card */}
          <div
            className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-[#1ed760]/20 blur-3xl pointer-events-none"
          />

          {/* Close button & Brand Header */}
          <div className="flex items-center justify-between">
            {/* Signature Octav Geometric Logo */}
            <OctavLogo size={24} showWordmark={true} />

            <button
              onClick={closeAuthModal}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition-all cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4 text-white/80" />
            </button>
          </div>

          <div className="text-center pt-1">
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              {mode === 'signin' ? 'Welcome to Octav' : 'Create your Octav Account'}
            </h2>
            <p className="text-xs text-white/60 mt-0.5">
              {mode === 'signin'
                ? 'Sign in to access your saved library & playlists'
                : 'Join Octav to save your music and playlists'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="relative p-1 rounded-2xl bg-white/[0.06] border border-white/10 grid grid-cols-2">
            <div
              ref={tabPillRef}
              className="absolute top-1 left-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-white/20 border border-white/20 shadow-md pointer-events-none"
            />
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage('');
              }}
              className={`relative z-10 py-2 text-xs font-bold transition-colors cursor-pointer ${
                mode === 'signin' ? 'text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage('');
              }}
              className={`relative z-10 py-2 text-xs font-bold transition-colors cursor-pointer ${
                mode === 'signup' ? 'text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Continue with Google 1-Tap Button */}
          <button
            type="button"
            onClick={handleContinueWithGoogle}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-neutral-100 text-black font-extrabold text-xs shadow-[0_4px_20px_rgba(255,255,255,0.15)] flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all cursor-pointer group"
          >
            {/* Google Multi-color Logo SVG */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-0.5">
            <div className="h-[1px] flex-1 bg-white/10" />
            <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">or with credentials</span>
            <div className="h-[1px] flex-1 bg-white/10" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === 'signup' && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1 block">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. mazid"
                    className="w-full py-2.5 pl-10 pr-3.5 rounded-2xl bg-white/[0.05] border border-white/15 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#1ed760] transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1 block">
                {mode === 'signin' ? 'Email or Username' : 'Email address'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                <input
                  type={mode === 'signin' ? 'text' : 'email'}
                  required
                  value={mode === 'signin' ? identifier : email}
                  onChange={(e) =>
                    mode === 'signin' ? setIdentifier(e.target.value) : setEmail(e.target.value)
                  }
                  placeholder={mode === 'signin' ? 'username or name@email.com' : 'name@email.com'}
                  className="w-full py-2.5 pl-10 pr-3.5 rounded-2xl bg-white/[0.05] border border-white/15 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#1ed760] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full py-2.5 pl-10 pr-10 rounded-2xl bg-white/[0.05] border border-white/15 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#1ed760] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold leading-snug">
                {errorMessage}
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#1ed760] to-[#17b14d] text-black font-extrabold text-sm shadow-[0_4px_20px_rgba(30,215,96,0.35)] flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Sign In to Octav' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        <div className="text-center pt-1">
          <button
            onClick={closeAuthModal}
            className="text-xs text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;

