import {
  collection,
  onSnapshot,
  addDoc,
  setDoc,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { db } from "./firebase-init.js";
import { diffRecipes } from "./recipe-diff.js";

const RECIPES = "recipes";

export function subscribeRecipes(callback, onError) {
  return onSnapshot(
    collection(db, RECIPES),
    (snap) => {
      const recipes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(recipes);
    },
    (err) => {
      console.error("Recipes subscription error:", err);
      if (onError) onError(err);
    }
  );
}

export async function getRecipe(id) {
  const snap = await getDoc(doc(db, RECIPES, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function addRecipe(data) {
  return await addDoc(collection(db, RECIPES), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateRecipe(id, data) {
  return await setDoc(
    doc(db, RECIPES, id),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function deleteRecipe(id) {
  return await deleteDoc(doc(db, RECIPES, id));
}

export async function countRecipes() {
  const snap = await getDocs(collection(db, RECIPES));
  return snap.size;
}

// Dry run: which of `recipes` are not yet in Firestore? Does not write anything.
export async function findMissingRecipes(recipes) {
  const snap = await getDocs(collection(db, RECIPES));
  const existing = snap.docs.map((d) => d.data());
  const { missing, present } = diffRecipes(existing, recipes);
  return { missing, present, existingCount: snap.size };
}

// Writes only the recipes that are absent. Re-runs the diff itself rather than
// trusting a caller-supplied list, so a stale preview can't write a duplicate.
export async function importMissingRecipes(recipes) {
  const { missing, present } = await findMissingRecipes(recipes);
  if (missing.length === 0) return { added: 0, skipped: present.length };

  const batch = writeBatch(db);
  for (const r of missing) {
    const ref = doc(collection(db, RECIPES));
    batch.set(ref, {
      ...r,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
  await batch.commit();
  return { added: missing.length, skipped: present.length };
}

export async function seedRecipes(recipes) {
  const existing = await countRecipes();
  if (existing > 0) {
    throw new Error(`Refusing to seed — collection already has ${existing} recipe(s).`);
  }
  const batch = writeBatch(db);
  for (const r of recipes) {
    const ref = doc(collection(db, RECIPES));
    batch.set(ref, {
      ...r,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
  await batch.commit();
  return recipes.length;
}
