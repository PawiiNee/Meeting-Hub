// firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyBvC7uiSHNWvc08QFfwN8C1_p4rN0Am24A",
  authDomain: "meeting-hub-cb400.firebaseapp.com",
  projectId: "meeting-hub-cb400",
  storageBucket: "meeting-hub-cb400.firebasestorage.app",
  messagingSenderId: "138132597288",
  appId: "1:138132597288:web:1e5a18179c4402c3cfe31d",
  measurementId: "G-607ZQGQ4TG"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Export for use
window.firebaseDB = {
  database: database,
  ref: firebase.database.Reference
};
