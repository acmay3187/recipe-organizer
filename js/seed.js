import { countRecipes, seedRecipes, findMissingRecipes, importMissingRecipes, exportRecipes } from "./recipes.js";
import { keyOf } from "./recipe-diff.js";
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
    const exportWrap = document.getElementById("export-wrap");
    if (exportWrap) exportWrap.hidden = count === 0;
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

// Owner-only export: downloads the live collection in seed-recipes.json's exact shape.
// This is the only way the JSON file can be brought back in line with Firestore — a
// static page can't write to the repo — so deletions and hand-added recipes only reach
// version control by downloading this and committing it.
export function wireExportButton() {
  const btn = document.getElementById("export-btn");
  if (!btn) return;
  const status = document.getElementById("export-status");

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    if (status) status.textContent = "Building export…";
    let url;
    try {
      const rows = await exportRecipes();
      const json = JSON.stringify(rows, null, 2) + "\n";
      const blob = new Blob([json], { type: "application/json" });
      url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "seed-recipes.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (status) {
        status.textContent = `Downloaded ${rows.length} recipes. Replace data/seed-recipes.json in the repo with this file and commit it.`;
      }
    } catch (err) {
      console.error(err);
      if (status) status.textContent = "Export failed: " + (err.message || err.code);
    } finally {
      // Revoking immediately can cancel the download in some browsers; give it a beat.
      if (url) setTimeout(() => URL.revokeObjectURL(url), 10000);
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
  const toggleBtn = document.getElementById("import-toggle-btn");

  function setStatus(text) {
    if (status) status.textContent = text;
  }

  function selectedKeys() {
    return new Set(
      Array.from(list?.querySelectorAll("input[type=checkbox]:checked") || [])
        .map((cb) => cb.value)
    );
  }

  function syncConfirmButton() {
    const n = selectedKeys().size;
    confirmBtn.textContent = `Add ${n} recipe${n === 1 ? "" : "s"}`;
    confirmBtn.disabled = n === 0;
  }

  function renderList(recipes) {
    if (!list) return;
    list.innerHTML = "";
    for (const r of recipes) {
      const li = document.createElement("li");
      const label = document.createElement("label");
      label.className = "import-item";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = keyOf(r);
      cb.checked = true;
      cb.addEventListener("change", syncConfirmButton);
      label.appendChild(cb);

      const text = document.createElement("span");
      text.textContent = r.name;
      const bits = [r.cuisine, r.timeMinutes ? `${r.timeMinutes} min` : null].filter(Boolean);
      if (bits.length) {
        const meta = document.createElement("span");
        meta.className = "muted";
        meta.textContent = ` — ${bits.join(", ")}`;
        text.appendChild(meta);
      }
      label.appendChild(text);

      li.appendChild(label);
      list.appendChild(li);
    }
    list.hidden = recipes.length === 0;
    if (toggleBtn) toggleBtn.hidden = recipes.length === 0;
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
        setStatus(`${missing.length} recipe(s) in the file are not in the collection. Untick anything you deleted on purpose — only ticked recipes are added.`);
        confirmBtn.hidden = false;
        syncConfirmButton();
      }
    } catch (err) {
      console.error(err);
      setStatus("Check failed: " + (err.message || err.code));
    } finally {
      checkBtn.disabled = false;
    }
  });

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const boxes = Array.from(list?.querySelectorAll("input[type=checkbox]") || []);
      const allOn = boxes.every((cb) => cb.checked);
      boxes.forEach((cb) => { cb.checked = !allOn; });
      toggleBtn.textContent = allOn ? "Select all" : "Select none";
      syncConfirmButton();
    });
  }

  confirmBtn.addEventListener("click", async () => {
    const chosen = selectedKeys();
    if (chosen.size === 0) return;
    confirmBtn.disabled = true;
    checkBtn.disabled = true;
    setStatus("Importing…");
    try {
      const recipes = await loadSeedFile();
      const { added, skipped, declined } = await importMissingRecipes(recipes, chosen);
      renderList([]);
      confirmBtn.hidden = true;
      if (added === 0) {
        setStatus(`Nothing imported — all ${skipped} recipes were already present.`);
      } else {
        const parts = [`Imported ${added} recipe(s)`, `skipped ${skipped} already present`];
        if (declined > 0) parts.push(`left out ${declined} you unticked`);
        setStatus(parts.join(", ") + ". Redirecting…");
        setTimeout(() => { window.location.href = "index.html"; }, 1200);
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
