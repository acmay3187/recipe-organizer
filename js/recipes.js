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
