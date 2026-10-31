// Firebase project settings — Firebase Console > Project settings > Your apps > Web app > "firebaseConfig"
// Replace the PASTE_... values with your own (README step 2).
window.FIREBASE_CONFIG = {
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID"
};

// Email IDs that can open admin.html and see all users and attempts.
// Must also be listed in firestore.rules (isAdmin function).
window.ADMIN_EMAILS = ["PASTE_ADMIN_EMAIL@gmail.com"];

window.SITE_CREDIT = {
  name: "Sandeep Kumar",
  org: "Sandeep Jan Seva Kendra",
  mobile: "8299430081"
};
