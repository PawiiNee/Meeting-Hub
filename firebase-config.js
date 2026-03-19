// Firebase configuration for Meeting Hub
// Uses Firebase Realtime Database for real-time sync across devices
//
// NOTE: Firebase API keys for web apps are intentionally public – they identify
// the project but do not grant privileged access.  Access is controlled by
// Firebase Security Rules configured in the Firebase console.

const firebaseConfig = {
  apiKey: "AIzaSyBvC7uiSHNWvc08QFfwN8C1_p4rN0Am24A",
  authDomain: "meeting-hub-cb400.firebaseapp.com",
  databaseURL: "https://meeting-hub-cb400-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "meeting-hub-cb400",
  storageBucket: "meeting-hub-cb400.firebasestorage.app",
  messagingSenderId: "138132597288",
  appId: "1:138132597288:web:1e5a18179c4402c3cfe31d",
  measurementId: "G-607ZQGQ4TG"
};

let db = null;

try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.database();
} catch (e) {
  console.warn('Firebase initialization failed:', e);
}
