import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authService from '../services/authService';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signin'); // 'signin' | 'signup'

  // Load existing session on initial mount
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const session = await authService.getInitialSession();
        if (mounted && session) {
          setUser(session);
        }
      } catch (e) {
        console.warn('Init auth exception:', e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    // Listen to real-time Supabase auth state changes
    if (isSupabaseConfigured && supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          const formatted = authService.formatSupabaseUser(session.user);
          authService.saveSession(formatted);
          authService.migrateGuestDataToUser(formatted.id);
          setUser(formatted);
        } else if (event === 'SIGNED_OUT') {
          authService.saveSession(null);
          setUser(null);
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, []);

  const openAuthModal = useCallback((mode = 'signin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const handleSignUp = useCallback(async (data) => {
    const newUser = await authService.signUp(data);
    setUser(newUser);
    return newUser;
  }, []);

  const handleSignIn = useCallback(async (data) => {
    const loggedIn = await authService.signIn(data);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const handleGoogleSignIn = useCallback(async (googleData) => {
    const googleUser = await authService.signInWithGoogle(googleData);
    if (googleUser) {
      setUser(googleUser);
    }
    return googleUser;
  }, []);

  const [guestProfile, setGuestProfile] = useState(() => {
    try {
      return {
        displayName: localStorage.getItem('octav_user_name') || 'Guest Listener',
        avatar: localStorage.getItem('octav_guest_avatar') || '',
      };
    } catch {
      return { displayName: 'Guest Listener', avatar: '' };
    }
  });

  const handleSignOut = useCallback(async () => {
    await authService.signOut();
    setUser(null);
  }, []);

  const handleUpdateProfile = useCallback(
    async (profileUpdates) => {
      if (!user) {
        setGuestProfile((prev) => {
          const next = { ...prev, ...profileUpdates };
          if (profileUpdates.avatar) {
            try {
              localStorage.setItem('octav_guest_avatar', profileUpdates.avatar);
            } catch {}
          }
          if (profileUpdates.displayName) {
            try {
              localStorage.setItem('octav_user_name', profileUpdates.displayName);
            } catch {}
          }
          return next;
        });
        return profileUpdates;
      }
      const updated = await authService.updateProfile(user.id, profileUpdates);
      if (updated) {
        setUser(updated);
      }
      return updated;
    },
    [user]
  );

  const value = {
    user,
    guestProfile,
    effectiveAvatar: user?.avatar || guestProfile.avatar,
    effectiveDisplayName: user?.displayName || guestProfile.displayName,
    isAuthenticated: Boolean(user),
    isLoading,
    isAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    openAuthModal,
    closeAuthModal,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signInWithGoogle: handleGoogleSignIn,
    signOut: handleSignOut,
    updateProfile: handleUpdateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
