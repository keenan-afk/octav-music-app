import test from 'node:test';
import assert from 'node:assert/strict';

// Minimal localStorage mock for pure service testing in Node
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const {
  getListeningStats,
  recordTrackPlay,
  getStatsStorageKey,
} = await import('../src/services/statsService.js');

const {
  cleanSearchQuery,
  isArtistStrictMatch,
  isCompilationOrKaraoke,
  streamCache,
} = await import('../src/services/musicApi.js');

const {
  migrateGuestDataToUser,
  signInWithGoogle,
} = await import('../src/services/authService.js');

test('statsService returns zero-state even when recentlyPlayed exists', () => {
  localStorage.clear();
  localStorage.setItem('octav_recent_tracks', JSON.stringify([
    { id: 't1', title: 'Dan...', artist: 'Sheila On 7', duration: 240 },
  ]));
  const stats = getListeningStats(null, 'all');
  assert.equal(stats.playsCount, 0);
  assert.equal(stats.totalSeconds, 0);
  assert.deepEqual(stats.tracks, {});
});

test('statsService counts plays strictly when incrementPlayCount is true', () => {
  localStorage.clear();
  const track = { id: 't1', title: 'Dan', artist: 'Sheila On 7' };
  // Under 15s skip: seconds logged, play count NOT incremented
  recordTrackPlay(track, 5, 'u1', false);
  let stats = JSON.parse(localStorage.getItem(getStatsStorageKey('u1', 'all')));
  assert.equal(stats.totalSeconds, 5);
  assert.equal(stats.playsCount, 0);

  // Genuine play >= 15s
  recordTrackPlay(track, 10, 'u1', true);
  stats = JSON.parse(localStorage.getItem(getStatsStorageKey('u1', 'all')));
  assert.equal(stats.totalSeconds, 15);
  assert.equal(stats.playsCount, 1);
});

test('musicApi rejects nature sounds, covers, and unrelated artist matches', () => {
  assert.equal(isCompilationOrKaraoke('Rain Sounds 10 Hours', 'Relaxing Nature', 'Sleep'), true);
  assert.equal(isCompilationOrKaraoke('Dan (Acoustic Cover)', 'Felix Irwan', 'Acoustic Covers'), true);
  assert.equal(isCompilationOrKaraoke('Dan...', 'Sheila On 7', 'Sheila On 7'), false);

  assert.equal(isArtistStrictMatch('NOAH', 'Noah Cyrus'), false);
  assert.equal(isArtistStrictMatch('Dewa 19', 'Dewa Budjana'), false);
  assert.equal(isArtistStrictMatch('Sheila On 7', 'Sheila On 7'), true);

  const cleaned = cleanSearchQuery('Dan... (Remastered 2020)', 'Sheila On 7');
  assert.equal(cleaned.cleanTitle, 'Dan');
  assert.equal(cleaned.cleanArtist, 'Sheila On 7');
});

test('musicApi streamCache stores and retrieves URLs cleanly', () => {
  streamCache.set('dan__sheila on 7', 'https://aac.saavncdn.com/test.mp4');
  assert.equal(streamCache.get('dan__sheila on 7'), 'https://aac.saavncdn.com/test.mp4');
});

test('authService migrates active octav guest data and blocks fake Google bypass', async () => {
  localStorage.clear();
  localStorage.setItem('octav_liked_tracks', JSON.stringify([{ id: 'song-1', title: 'Kangen' }]));
  localStorage.setItem('octav_guest_custom_playlists', JSON.stringify([{ id: 'pl-1', title: 'My Mix', tracks: [] }]));
  migrateGuestDataToUser('user_123');

  const userLiked = JSON.parse(localStorage.getItem('octav_user_user_123_liked_tracks'));
  const userPlaylists = JSON.parse(localStorage.getItem('octav_user_user_123_custom_playlists'));
  assert.equal(userLiked.length, 1);
  assert.equal(userLiked[0].id, 'song-1');
  assert.equal(userPlaylists.length, 1);
  assert.equal(userPlaylists[0].title, 'My Mix');

  await assert.rejects(() => signInWithGoogle({ email: 'victim@gmail.com', name: 'Attacker' }), /./);
});
