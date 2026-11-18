/**
 * Octav Hybrid Authentication & Cloud Sync Engine
 * Seamlessly pairs Supabase Cloud Auth & Metadata with Instant Local Offline Storage
 */
import { supabase, isSupabaseConfigured, syncUserDataToCloud } from './supabaseClient.js';

const STORAGE_KEY_USERS = 'octav_users_db';
const LEGACY_STORAGE_KEY_USERS = 'vetra_users_db';
const STORAGE_KEY_SESSION = 'octav_auth_session';
const LEGACY_STORAGE_KEY_SESSION = 'vetra_auth_session';

/**
 * Get 1-2 uppercase clean initials for fallback avatars
 * Prevents awkward name clipping (e.g. "keenannn" clipping to "keena")
 */
export function getInitials(name) {
  if (!name) return 'O';
  const clean = name.trim().replace(/^@/, '');
  const parts = clean.split(/[\s_.-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

/**
 * Format a Supabase User object into Octav's unified User model
 */
export function formatSupabaseUser(supabaseUser) {
  if (!supabaseUser) return null;
  const meta = supabaseUser.user_metadata || {};
  const email = supabaseUser.email || '';
  const username = meta.username || email.split('@')[0].replace(/[^a-z0-9_]/g, '');
  const displayName = meta.display_name || meta.full_name || username;
  const initials = getInitials(displayName);
  const avatar =
    meta.avatar_url ||
    meta.avatar ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(initials)}&backgroundColor=1ed760&textColor=000000&chars=2`;

  return {
    id: supabaseUser.id,
    username,
    displayName,
    email,
    avatar,
    provider: supabaseUser.app_metadata?.provider || 'supabase',
    createdAt: new Date(supabaseUser.created_at || Date.now()).getTime(),
    verified: Boolean(supabaseUser.email_confirmed_at || supabaseUser.confirmed_at),
    isSupabase: true,
    cloudLibrary: {
      likedTracks: Array.isArray(meta.likedTracks) ? meta.likedTracks : null,
      customPlaylists: Array.isArray(meta.customPlaylists) ? meta.customPlaylists : null,
      followedArtists: Array.isArray(meta.followedArtists) ? meta.followedArtists : null,
      lastSyncedAt: meta.lastSyncedAt || null,
    },
    rawUser: supabaseUser,
  };
}

/**
 * Local Users Database
 */
export function getUsersDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS) || localStorage.getItem(LEGACY_STORAGE_KEY_USERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveUsersDB(users) {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  } catch (e) {
    console.warn('Failed saving users db:', e);
  }
}

/**
 * Active Session Management
 */
export function getCurrentSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION) || localStorage.getItem(LEGACY_STORAGE_KEY_SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('Failed reading auth session:', e);
    return null;
  }
}

export function saveSession(user) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_SESSION);
      localStorage.removeItem(LEGACY_STORAGE_KEY_SESSION);
    }
  } catch (e) {
    console.warn('Failed updating auth session:', e);
  }
}

/**
 * Check Supabase and local storage for initial active session
 */
export async function getInitialSession() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!error && session?.user) {
        const formatted = formatSupabaseUser(session.user);
        saveSession(formatted);
        return formatted;
      }
    } catch (e) {
      console.warn('Supabase getInitialSession error:', e);
    }
  }
  return getCurrentSession();
}

/**
 * Sign Up with Username, Email, Password
 */
export async function signUp({ username, email, password, displayName }) {
  await new Promise((r) => setTimeout(r, 350)); // Tactile feedback

  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanUsername || cleanUsername.length < 3) {
    throw new Error('Username must be at least 3 characters (letters, numbers, underscores).');
  }

  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    throw new Error('Please enter a valid email address.');
  }

  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const avatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanUsername}&backgroundColor=1ed760,050507`;

  // 1. Try Supabase Auth First
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            username: cleanUsername,
            display_name: displayName?.trim() || cleanUsername,
            avatar,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.user) {
        const formatted = formatSupabaseUser(data.user);
        saveSession(formatted);

        // Also record in local users registry for offline/username lookups
        const users = getUsersDB();
        if (!users.some((u) => u.id === formatted.id || u.email === cleanEmail)) {
          users.push({
            id: formatted.id,
            username: cleanUsername,
            displayName: formatted.displayName,
            email: cleanEmail,
            avatar,
            provider: 'supabase',
            createdAt: Date.now(),
          });
          saveUsersDB(users);
        }

        migrateGuestDataToUser(formatted.id);

        if (!data.session) {
          return {
            ...formatted,
            needsEmailVerification: true,
            verificationMessage: 'Account registered! Please check your email inbox to verify.',
          };
        }

        return formatted;
      }
    } catch (sbError) {
      // Re-throw Supabase validation/signup errors
      throw sbError;
    }
  }

  // 2. Fallback to Local Auth DB if Supabase not configured
  const users = getUsersDB();

  if (users.some((u) => u.username === cleanUsername)) {
    throw new Error(`Username @${cleanUsername} is already taken.`);
  }

  if (users.some((u) => u.email === cleanEmail)) {
    throw new Error(`An account with email ${cleanEmail} already exists.`);
  }

  const newUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    username: cleanUsername,
    displayName: displayName?.trim() || cleanUsername,
    email: cleanEmail,
    passwordHash: btoa(password),
    avatar,
    provider: 'password',
    createdAt: Date.now(),
    verified: true,
  };

  users.push(newUser);
  saveUsersDB(users);
  saveSession(newUser);
  migrateGuestDataToUser(newUser.id);

  return newUser;
}

/**
 * Sign In with (Email OR Username) + Password
 */
export async function signIn({ identifier, password }) {
  await new Promise((r) => setTimeout(r, 350));

  const cleanIdentifier = identifier.trim().toLowerCase();

  if (!cleanIdentifier) {
    throw new Error('Please enter your email address or username.');
  }

  if (!password) {
    throw new Error('Please enter your password.');
  }

  let targetEmail = cleanIdentifier;

  // Check if identifier is a username from our local registry
  const users = getUsersDB();
  const matchedUser = users.find(
    (u) =>
      u.email.toLowerCase() === cleanIdentifier ||
      u.username.toLowerCase() === cleanIdentifier.replace(/^@/, '')
  );

  if (matchedUser && matchedUser.email) {
    targetEmail = matchedUser.email;
  }

  // 1. Try Supabase Auth First
  if (isSupabaseConfigured && supabase && targetEmail.includes('@')) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });

      if (error) {
        // If email not yet confirmed
        if (error.message.toLowerCase().includes('email not confirmed')) {
          throw new Error('Email not confirmed. Check your inbox or turn off "Confirm email" in Supabase Auth settings.');
        }
        // If not found in Supabase or wrong password, let's check error message
        throw new Error(error.message);
      }

      if (data?.user) {
        const formatted = formatSupabaseUser(data.user);
        saveSession(formatted);
        migrateGuestDataToUser(formatted.id);
        return formatted;
      }
    } catch (sbError) {
      // If error was explicit Supabase credential error, throw it
      throw sbError;
    }
  }

  // 2. Fallback to Local Auth DB
  if (!matchedUser) {
    throw new Error('No Octav account found with that email or username.');
  }

  if (matchedUser.passwordHash && matchedUser.passwordHash !== btoa(password)) {
    throw new Error('Incorrect password. Please try again.');
  }

  saveSession(matchedUser);
  migrateGuestDataToUser(matchedUser.id);

  return matchedUser;
}

/**
 * Continue with Google (OAuth or Interactive Chooser)
 */
export async function signInWithGoogle(googleAccount) {
  await new Promise((r) => setTimeout(r, 350));

  // If provided directly from GoogleAccountChooser
  if (googleAccount && googleAccount.email && googleAccount.name) {
    const cleanEmail = googleAccount.email.trim().toLowerCase();
    const cleanName = googleAccount.name.trim();
    const username = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '');

    // Deterministic password for cross-device Supabase cloud authentication
    const deterministicPassword = `Octav_Sync_${btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}_2026!`;

    // 1. Authenticate with Supabase Cloud so PC and Mobile sync the exact same account
    if (isSupabaseConfigured && supabase) {
      try {
        let sbUser = null;
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: deterministicPassword,
        });

        if (!signInError && signInData?.user) {
          sbUser = signInData.user;
        } else {
          // If not registered yet in Supabase, create deterministic account
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: deterministicPassword,
            options: {
              data: {
                username,
                display_name: cleanName || username,
                avatar:
                  googleAccount.avatar ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(getInitials(cleanName))}&backgroundColor=1ed760&textColor=000000&chars=2`,
              },
            },
          });

          if (!signUpError && signUpData?.user) {
            sbUser = signUpData.user;
          }
        }

        if (sbUser) {
          const formatted = formatSupabaseUser(sbUser);
          saveSession(formatted);

          // Save to local users registry
          const users = getUsersDB();
          const existingIdx = users.findIndex((u) => u.email === cleanEmail);
          if (existingIdx !== -1) {
            users[existingIdx] = { ...users[existingIdx], ...formatted };
          } else {
            users.push(formatted);
          }
          saveUsersDB(users);

          migrateGuestDataToUser(formatted.id);
          return formatted;
        }
      } catch (sbErr) {
        console.warn('Supabase Google cloud auth warning:', sbErr);
      }
    }

    // 2. Offline / Local Fallback: Deterministic user ID based on email
    // Guarantees PC and Phone have the identical user ID for the same Gmail account
    const deterministicId = `usr_g_${btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`;
    const users = getUsersDB();
    let user = users.find((u) => u.email === cleanEmail || u.id === deterministicId);

    if (!user) {
      user = {
        id: deterministicId,
        username,
        displayName: cleanName || username,
        email: cleanEmail,
        avatar:
          googleAccount.avatar ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(getInitials(cleanName))}&backgroundColor=1ed760&textColor=000000&chars=2`,
        provider: 'google',
        createdAt: Date.now(),
        verified: true,
      };
      users.push(user);
      saveUsersDB(users);
    } else {
      user.id = deterministicId;
      if (cleanName) user.displayName = cleanName;
      if (googleAccount.avatar) user.avatar = googleAccount.avatar;
      saveUsersDB(users);
    }

    saveSession(user);
    migrateGuestDataToUser(user.id);

    return user;
  }

  // If called without params, try Supabase OAuth
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      throw error;
    }

    if (data?.url) {
      window.location.href = data.url;
      return null;
    }
  }

  throw new Error('Google OAuth credentials not configured.');
}

/**
 * Sign Out
 */
export async function signOut() {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut error:', e);
    }
  }
  saveSession(null);
}

/**
 * Update Profile Details
 */
export async function updateProfile(userId, { displayName, avatar }) {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.auth.updateUser({
        data: {
          ...(displayName ? { display_name: displayName.trim() } : {}),
          ...(avatar ? { avatar_url: avatar } : {}),
        },
      });
    } catch (e) {
      console.warn('Supabase updateUser error:', e);
    }
  }

  const users = getUsersDB();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx !== -1) {
    if (displayName) users[idx].displayName = displayName.trim();
    if (avatar) users[idx].avatar = avatar;
    saveUsersDB(users);
  }

  const current = getCurrentSession();
  if (current && current.id === userId) {
    const updated = {
      ...current,
      ...(displayName ? { displayName: displayName.trim() } : {}),
      ...(avatar ? { avatar } : {}),
    };
    saveSession(updated);
    return updated;
  }
  return current;
}

/**
 * Migrate unauthenticated guest data to the user's isolated storage
 */
export function migrateGuestDataToUser(userId) {
  if (!userId) return;

  try {
    // 1. Liked Tracks
    const guestLiked = localStorage.getItem('spotify_liquid_liked_tracks');
    if (guestLiked) {
      const parsedGuest = JSON.parse(guestLiked);
      const userKey = `octav_user_${userId}_liked_tracks`;
      const legacyKey = `vetra_user_${userId}_liked_tracks`;
      const existingUser = localStorage.getItem(userKey) || localStorage.getItem(legacyKey);
      const parsedUser = existingUser ? JSON.parse(existingUser) : [];

      const existingIds = new Set(parsedUser.map((t) => t.id));
      const merged = [...parsedUser];
      parsedGuest.forEach((t) => {
        if (!existingIds.has(t.id)) {
          merged.push(t);
        }
      });
      localStorage.setItem(userKey, JSON.stringify(merged));
    }

    // 2. Custom Playlists
    const guestPlaylists = localStorage.getItem('spotify_liquid_custom_playlists');
    if (guestPlaylists) {
      const parsedGuest = JSON.parse(guestPlaylists);
      const userKey = `octav_user_${userId}_custom_playlists`;
      const legacyKey = `vetra_user_${userId}_custom_playlists`;
      const existingUser = localStorage.getItem(userKey) || localStorage.getItem(legacyKey);
      const parsedUser = existingUser ? JSON.parse(existingUser) : [];

      const existingIds = new Set(parsedUser.map((p) => p.id));
      const merged = [...parsedUser];
      parsedGuest.forEach((p) => {
        if (!existingIds.has(p.id)) {
          merged.push(p);
        }
      });
      localStorage.setItem(userKey, JSON.stringify(merged));
    }

    // 3. Followed Artists
    const guestFollowed = localStorage.getItem('octav_followed_artists') || localStorage.getItem('vetra_followed_artists');
    if (guestFollowed) {
      const parsedGuest = JSON.parse(guestFollowed);
      const userKey = `octav_user_${userId}_followed_artists`;
      const legacyKey = `vetra_user_${userId}_followed_artists`;
      const existingUser = localStorage.getItem(userKey) || localStorage.getItem(legacyKey);
      const parsedUser = existingUser ? JSON.parse(existingUser) : [];

      const merged = Array.from(new Set([...parsedUser, ...parsedGuest]));
      localStorage.setItem(userKey, JSON.stringify(merged));
    }
  } catch (e) {
    console.warn('Guest data migration note:', e);
  }
}
