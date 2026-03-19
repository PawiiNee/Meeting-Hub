// Firebase Realtime Database service for Meeting Hub
// Provides real-time sync of meetings and employees across devices
// Falls back to localStorage when Firebase is unavailable

let _fbListenersAttached = false;

/**
 * Save meetings array to Firebase Realtime Database.
 * @param {Array} meetings
 */
function firebaseSaveMeetings(meetings) {
  if (!db) return;
  try {
    db.ref('meetings').set(Array.isArray(meetings) ? meetings : []);
  } catch (e) {
    console.warn('Firebase: failed to save meetings:', e);
  }
}

/**
 * Save employees array to Firebase Realtime Database.
 * @param {Array} employees
 */
function firebaseSaveEmployees(employees) {
  if (!db) return;
  try {
    db.ref('employees').set(Array.isArray(employees) ? employees : []);
  } catch (e) {
    console.warn('Firebase: failed to save employees:', e);
  }
}

/**
 * Upload local data to Firebase when Firebase is empty (first-time sync).
 * @param {Array} localMeetings
 * @param {Array} localEmployees
 */
function firebaseInitialSync(localMeetings, localEmployees) {
  if (!db) return;
  db.ref('meetings').once('value').then((snap) => {
    if (snap.val() === null && Array.isArray(localMeetings) && localMeetings.length > 0) {
      firebaseSaveMeetings(localMeetings);
    }
  }).catch(() => {});
  db.ref('employees').once('value').then((snap) => {
    if (snap.val() === null && Array.isArray(localEmployees) && localEmployees.length > 0) {
      firebaseSaveEmployees(localEmployees);
    }
  }).catch(() => {});
}

/**
 * Attach real-time listeners for meetings, employees, and connection state.
 * Callbacks receive the latest data array from Firebase.
 * @param {function} onMeetings  - called with meetings array
 * @param {function} onEmployees - called with employees array
 */
function firebaseAttachListeners(onMeetings, onEmployees) {
  if (!db || _fbListenersAttached) return;
  _fbListenersAttached = true;

  db.ref('meetings').on('value', (snapshot) => {
    const val = snapshot.val();
    if (val === null) return; // Firebase empty – local data already retained
    const data = Array.isArray(val) ? val : Object.values(val);
    onMeetings(data);
  }, (err) => {
    console.warn('Firebase: meetings listener error:', err);
  });

  db.ref('employees').on('value', (snapshot) => {
    const val = snapshot.val();
    if (val === null) return; // Firebase empty – local data already retained
    const data = Array.isArray(val) ? val : Object.values(val);
    onEmployees(data);
  }, (err) => {
    console.warn('Firebase: employees listener error:', err);
  });

  db.ref('.info/connected').on('value', (snap) => {
    if (typeof updateFirebaseStatusBadge === 'function') {
      updateFirebaseStatusBadge(snap.val() ? 'connected' : 'disconnected');
    }
  });
}

/**
 * Detach all Firebase listeners (call on logout).
 */
function firebaseDetachListeners() {
  if (!db) return;
  try {
    db.ref('meetings').off();
    db.ref('employees').off();
    db.ref('.info/connected').off();
  } catch (e) {
    console.warn('Firebase: error detaching listeners:', e);
  }
  _fbListenersAttached = false;
}

/**
 * Update the Firebase sync status badge in the sidebar.
 * @param {'connected'|'disconnected'|'syncing'} state
 */
function updateFirebaseStatusBadge(state) {
  const badge = document.getElementById('fbStatusBadge');
  if (!badge) return;
  const map = {
    connected:    { text: '🔥 Firebase', color: '#22c55e' },
    disconnected: { text: '📴 Offline',  color: '#ef4444' },
    syncing:      { text: '🔄 Syncing',  color: '#f59e0b' }
  };
  const s = map[state] || map.disconnected;
  badge.textContent = s.text;
  badge.style.color  = s.color;
}
