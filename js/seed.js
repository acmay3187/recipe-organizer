import { countRecipes, seedRecipes } from "./recipes.js";
import { onAuthChange } from "./auth.js";

async function refreshSeedVisibility() {
  const wrap = document.getElementById("seed-wrap");
  if (!wrap) return;
  try {
    const count = await countRecipes();
    wrap.hidden = count > 0;
    const status = document.getElementById("seed-status");
    if (status) {
      status.textContent = count > 0
        ? `Already seeded (${count} recipes in the collection).`
        : "Collection is empty — click below to seed with the bundled 18 starter recipes.";
    }
  } catch (err) {
    console.warn("Could not read collection count:", err);
  }
}

export function wireSeedButton() {
  const btn = document.getElementById("seed-btn");
  if (!btn) return;

  onAuthChange(({ isOwner }) => {
    const wrap = document.getElementById("seed-wrap");
    if (wrap) wrap.hidden = !isOwner;
    if (isOwner) refreshSeedVisibility();
  });

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    const status = document.getElementById("seed-status");
    try {
      const resp = await fetch("data/seed-recipes.json", { cache: "no-cache" });
      if (!resp.ok) throw new Error(`Failed to load seed-recipes.json (${resp.status})`);
      const recipes = await resp.json();
      const n = await seedRecipes(recipes);
      if (status) status.textContent = `Seeded ${n} recipes. Redirecting…`;
      setTimeout(() => { window.location.href = "index.html"; }, 800);
    } catch (err) {
      console.error(err);
      if (status) status.textContent = "Seed failed: " + (err.message || err.code);
      btn.disabled = false;
    }
  });
}
