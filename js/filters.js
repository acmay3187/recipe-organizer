import { recipeMatchesIngredient } from "./constants.js";

export function createFilterState() {
  return {
    search: "",
    cuisines: new Set(),
    ingredients: new Set(),
    nutrients: new Set(),
    nutrientMode: "all", // "all" | "any"
    sort: "name" // "name" | "time" | "newest"
  };
}

export function applyFilters(recipes, state) {
  const q = state.search.trim().toLowerCase();

  const filtered = recipes.filter((r) => {
    if (state.cuisines.size > 0 && !state.cuisines.has(r.cuisine)) return false;

    if (state.ingredients.size > 0) {
      let anyMatch = false;
      for (const key of state.ingredients) {
        if (recipeMatchesIngredient(r, key)) {
          anyMatch = true;
          break;
        }
      }
      if (!anyMatch) return false;
    }

    if (state.nutrients.size > 0) {
      const set = new Set(r.nutrients || []);
      if (state.nutrientMode === "all") {
        for (const n of state.nutrients) if (!set.has(n)) return false;
      } else {
        let any = false;
        for (const n of state.nutrients) if (set.has(n)) { any = true; break; }
        if (!any) return false;
      }
    }

    if (q) {
      const hay = [
        r.name,
        r.cuisine,
        r.source,
        r.notes,
        (r.nutrients || []).join(" ")
      ].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });

  const sorted = filtered.slice();
  if (state.sort === "name") {
    sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  } else if (state.sort === "time") {
    sorted.sort((a, b) => (a.timeMinutes || 9999) - (b.timeMinutes || 9999));
  } else if (state.sort === "newest") {
    sorted.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  }
  return sorted;
}

function toMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (ts.seconds) return ts.seconds * 1000;
  return 0;
}
