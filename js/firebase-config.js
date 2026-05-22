// Firebase Web App Config
//
// Paste the values from your Firebase project here:
//   Firebase Console → Project settings → General → Your apps → Web app → SDK setup
//
// These values are public and safe to commit. Security is enforced server-side by
// Firestore security rules (see README.md "Step 4 — Firestore security rules").

export const firebaseConfig = {
  apiKey: "AIzaSyDx83r33X-ihQ0oOnz-HjzAVLdA7x1E7kY",
  authDomain: "recipe-organizer-fb49c.firebaseapp.com",
  projectId: "recipe-organizer-fb49c",
  storageBucket: "recipe-organizer-fb49c.firebasestorage.app",
  messagingSenderId: "648062569694",
  appId: "1:648062569694:web:5375fe9dc33cbd19df864f"
};

// Only this email is allowed to write (add/edit/delete recipes).
// Must match the Firestore rule in README.md exactly.
export const OWNER_EMAIL = "alexander.c.mayer@gmail.com";
