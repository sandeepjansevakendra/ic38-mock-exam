// Firebase project settings — Firebase Console > Project settings > Your apps > Web app > "firebaseConfig"
// Replace the PASTE_... values with your own (README step 2).
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBr2wTgeqt3C5XIuCP9QPpFvrDfVKSyWCU",
  authDomain: "ic38-mock-exam.firebaseapp.com",
  projectId: "ic38-mock-exam",
  storageBucket: "ic38-mock-exam.firebasestorage.app",
  messagingSenderId: "309687780697",
  appId: "1:309687780697:web:885d266671e6a06c867848"
};

// Email IDs that can open admin.html and see all users and attempts.
// Must also be listed in firestore.rules (isAdmin function).
window.ADMIN_EMAILS = ["sandeepjansevakendra.unnao@gmail.com"];

window.SITE_CREDIT = {
  name: "Sandeep Kumar",
  org: "Sandeep Jan Seva Kendra",
  mobile: "8299430081"
};
