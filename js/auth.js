import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { auth, googleProvider } from "./firebase-init.js";
import { OWNER_EMAIL } from "./firebase-config.js";

const subscribers = new Set();
let currentState = { user: null, isOwner: false };

onAuthStateChanged(auth, (user) => {
  currentState = {
    user,
    isOwner: !!user && user.email === OWNER_EMAIL
  };
  subscribers.forEach((cb) => cb(currentState));
});

export function onAuthChange(callback) {
  subscribers.add(callback);
  callback(currentState);
  return () => subscribers.delete(callback);
}

export function getAuthState() {
  return currentState;
}

export async function signIn() {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    console.error("Sign-in failed:", err);
    alert("Sign-in failed: " + (err.message || err.code));
  }
}

export async function signOutUser() {
  await signOut(auth);
}

export function wireAuthButtons({ signInBtnId, signOutBtnId, userLabelId }) {
  const signInBtn = signInBtnId ? document.getElementById(signInBtnId) : null;
  const signOutBtn = signOutBtnId ? document.getElementById(signOutBtnId) : null;
  const userLabel = userLabelId ? document.getElementById(userLabelId) : null;

  if (signInBtn) signInBtn.addEventListener("click", signIn);
  if (signOutBtn) signOutBtn.addEventListener("click", signOutUser);

  onAuthChange(({ user, isOwner }) => {
    if (signInBtn) signInBtn.hidden = !!user;
    if (signOutBtn) signOutBtn.hidden = !user;
    if (userLabel) {
      if (user) {
        userLabel.textContent = isOwner
          ? `Signed in as ${user.email} (owner)`
          : `Signed in as ${user.email} — read-only`;
        userLabel.hidden = false;
      } else {
        userLabel.textContent = "";
        userLabel.hidden = true;
      }
    }
  });
}
