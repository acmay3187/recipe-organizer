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
import { diffRecipes, keyOf } from "./recipe-diff.js";

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

// Writes absent recipes. Re-runs the diff itself rather than trusting a caller-supplied
// list, so a stale preview can't write a duplicate. `selectedKeys` (a Set of keyOf()
// values) narrows the write to a chosen subset — recipes deliberately deleted from the
// collection stay deleted. Pass null to write everything that's missing.
export async function importMissingRecipes(recipes, selectedKeys = null) {
  const { missing, present } = await findMissingRecipes(recipes);
  const toWrite = selectedKeys
    ? missing.filter((r) => selectedKeys.has(keyOf(r)))
    : missing;
  const declined = missing.length - toWrite.length;
  if (toWrite.length === 0) return { added: 0, skipped: present.length, declined };

  const batch = writeBatch(db);
  for (const r of toWrite) {
    const ref = doc(collection(db, RECIPES));
    batch.set(ref, {
      ...r,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
  await batch.commit();
  return { added: toWrite.length, skipped: present.length, declined };
}

// The whole collection, shaped exactly like data/seed-recipes.json: seed fields only,
// no `id` and no Firestore timestamps, sorted so re-exports produce a stable diff.
export async function exportRecipes() {
  const snap = await getDocs(collection(db, RECIPES));
  const rows = snap.docs.map((d) => {
    const { id, createdAt, updatedAt, ...rest } = d.data();
    return {
      name: rest.name || "",
      url: rest.url || "",
      source: rest.source || "",
      cuisine: rest.cuisine || "",
      protein: rest.protein || "none",
      dietaryTags: rest.dietaryTags || [],
      timeMinutes: rest.timeMinutes ?? null,
      notes: rest.notes || "",
      ingredients: rest.ingredients || "",
      nutrients: rest.nutrients || []
    };
  });
  rows.sort((a, b) => (a.cuisine || "").localeCompare(b.cuisine) || a.name.localeCompare(b.name));
  return rows;
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
