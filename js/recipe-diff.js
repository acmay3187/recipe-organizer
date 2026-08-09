// Pure matching logic for the "import missing recipes" flow — no Firestore imports,
// so it can be exercised directly in a console or test harness.

// Recipes are matched on URL first, name second — either one matching counts as
// "already present" so a recipe typed in by hand isn't duplicated by the import.
export function matchKeys(r) {
  const url = (r.url || "").trim().toLowerCase().replace(/\/+$/, "");
  const name = (r.name || "").trim().toLowerCase();
  return { url, name };
}

// Stable identity for a recipe within a single import session — used to tie a
// checkbox in the preview back to the recipe it represents.
export function keyOf(r) {
  const { url, name } = matchKeys(r);
  return url || name;
}

// Splits `candidates` into the ones absent from `existing` and the ones already there.
// Duplicates *within* candidates collapse too, so a repeated entry in the JSON file
// is only written once.
export function diffRecipes(existing, candidates) {
  const urls = new Set();
  const names = new Set();
  for (const e of existing) {
    const { url, name } = matchKeys(e);
    if (url) urls.add(url);
    if (name) names.add(name);
  }

  const missing = [];
  const present = [];
  for (const r of candidates) {
    const { url, name } = matchKeys(r);
    if ((url && urls.has(url)) || (name && names.has(name))) {
      present.push(r);
    } else {
      missing.push(r);
      if (url) urls.add(url);
      if (name) names.add(name);
    }
  }
  return { missing, present };
}
