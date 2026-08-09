import { countRecipes, seedRecipes, findMissingRecipes, importMissingRecipes } from "./recipes.js";
import { onAuthChange } from "./auth.js";

async function loadSeedFile() {
  const resp = await fetch("data/seed-recipes.json", { cache: "no-cache" });
  if (!resp.ok) throw new Error(`Failed to load seed-recipes.json (${resp.status})`);
  return await resp.json();
}

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
        : "Collection is empty — click below to seed with the bundled starter recipes.";
    }
    // The import panel is the counterpart to the seed panel: it only makes sense
    // once seeding is done.
    const importWrap = document.getElementById("import-wrap");
    if (importWrap) importWrap.hidden = count === 0;
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
      const recipes = await loadSeedFile();
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

// Owner-only "import missing recipes": diffs data/seed-recipes.json against the
// live collection and writes just the ones that aren't there yet. Unlike the seed
// button this is safe to run repeatedly — it never touches existing documents.
export function wireImportButton() {
  const checkBtn = document.getElementById("import-check-btn");
  const confirmBtn = document.getElementById("import-confirm-btn");
  if (!checkBtn || !confirmBtn) return;

  const status = document.getElementById("import-status");
  const list = document.getElementById("import-list");

  function setStatus(text) {
    if (status) status.textContent = text;
  }

  function renderList(recipes) {
    if (!list) return;
    list.innerHTML = "";
    for (const r of recipes) {
      const li = document.createElement("li");
      li.textContent = r.name;
      const meta = document.createElement("span");
      meta.className = "muted";
      const bits = [r.cuisine, r.timeMinutes ? `${r.timeMinutes} min` : null].filter(Boolean);
      meta.textContent = bits.length ? ` — ${bits.join(", ")}` : "";
      li.appendChild(meta);
      list.appendChild(li);
    }
    list.hidden = recipes.length === 0;
  }

  checkBtn.addEventListener("click", async () => {
    checkBtn.disabled = true;
    confirmBtn.hidden = true;
    setStatus("Checking…");
    try {
      const recipes = await loadSeedFile();
      const { missing, existingCount } = await findMissingRecipes(recipes);
      renderList(missing);
      if (missing.length === 0) {
        setStatus(`Nothing to import — all ${recipes.length} recipes in the file are already in the collection (${existingCount} total).`);
      } else {
        setStatus(`${missing.length} recipe(s) in the file are not in the collection yet:`);
        confirmBtn.textContent = `Add ${missing.length} recipe${missing.length === 1 ? "" : "s"}`;
        confirmBtn.hidden = false;
      }
    } catch (err) {
      console.error(err);
      setStatus("Check failed: " + (err.message || err.code));
    } finally {
      checkBtn.disabled = false;
    }
  });

  confirmBtn.addEventListener("click", async () => {
    confirmBtn.disabled = true;
    checkBtn.disabled = true;
    setStatus("Importing…");
    try {
      const recipes = await loadSeedFile();
      const { added, skipped } = await importMissingRecipes(recipes);
      renderList([]);
      confirmBtn.hidden = true;
      if (added === 0) {
        setStatus(`Nothing imported — all ${skipped} recipes were already present.`);
      } else {
        setStatus(`Imported ${added} recipe(s), skipped ${skipped} already present. Redirecting…`);
        setTimeout(() => { window.location.href = "index.html"; }, 1000);
      }
    } catch (err) {
      console.error(err);
      setStatus("Import failed: " + (err.message || err.code));
      confirmBtn.disabled = false;
    } finally {
      checkBtn.disabled = false;
    }
  });
}
