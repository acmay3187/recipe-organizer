import { PROTEINS } from "./constants.js";
import { deleteRecipe } from "./recipes.js";
import { getAuthState } from "./auth.js";

const proteinLabel = (key) => {
  const found = PROTEINS.find((p) => p.value === key);
  return found ? found.label : key;
};

export function renderGrid(container, recipes, { onAfterDelete } = {}) {
  container.innerHTML = "";

  if (recipes.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No recipes match your filters. Try clearing some.";
    container.appendChild(empty);
    return;
  }

  const { isOwner } = getAuthState();

  for (const r of recipes) {
    container.appendChild(renderCard(r, isOwner, onAfterDelete));
  }
}

function renderCard(r, isOwner, onAfterDelete) {
  const card = document.createElement("article");
  card.className = "recipe-card";

  const header = document.createElement("div");
  header.className = "recipe-card__header";

  const title = document.createElement("h3");
  title.className = "recipe-card__title";
  const link = document.createElement("a");
  link.href = r.url || "#";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = r.name || "(untitled)";
  title.appendChild(link);
  header.appendChild(title);

  if (isOwner) {
    const actions = document.createElement("div");
    actions.className = "recipe-card__actions";

    const editBtn = document.createElement("a");
    editBtn.href = `add.html?id=${encodeURIComponent(r.id)}`;
    editBtn.className = "icon-btn";
    editBtn.title = "Edit recipe";
    editBtn.setAttribute("aria-label", `Edit ${r.name}`);
    editBtn.textContent = "Edit";

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "icon-btn icon-btn--danger";
    delBtn.title = "Delete recipe";
    delBtn.setAttribute("aria-label", `Delete ${r.name}`);
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", async () => {
      if (!confirm(`Delete "${r.name}"? This cannot be undone.`)) return;
      try {
        await deleteRecipe(r.id);
        if (onAfterDelete) onAfterDelete(r);
      } catch (err) {
        alert("Delete failed: " + (err.message || err));
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    header.appendChild(actions);
  }

  card.appendChild(header);

  const badges = document.createElement("div");
  badges.className = "badges";
  if (r.cuisine) badges.appendChild(badge(r.cuisine, "badge--cuisine"));
  if (r.protein && r.protein !== "none") badges.appendChild(badge(proteinLabel(r.protein), "badge--protein"));
  for (const tag of (r.dietaryTags || [])) {
    badges.appendChild(badge(capitalize(tag), "badge--diet"));
  }
  if (typeof r.timeMinutes === "number") {
    badges.appendChild(badge(`${r.timeMinutes} min`, "badge--time"));
  }
  card.appendChild(badges);

  if (r.source) {
    const src = document.createElement("div");
    src.className = "recipe-card__source";
    src.textContent = `from ${r.source}`;
    card.appendChild(src);
  }

  if (r.notes) {
    const notes = document.createElement("p");
    notes.className = "recipe-card__notes";
    notes.textContent = r.notes;
    card.appendChild(notes);
  }

  if (r.nutrients && r.nutrients.length) {
    const nutWrap = document.createElement("div");
    nutWrap.className = "nutrients";
    const label = document.createElement("span");
    label.className = "nutrients__label";
    label.textContent = "Nutrients: ";
    nutWrap.appendChild(label);
    for (const n of r.nutrients) {
      const chip = document.createElement("span");
      chip.className = "nutrient-chip";
      chip.textContent = n;
      nutWrap.appendChild(chip);
    }
    card.appendChild(nutWrap);
  }

  return card;
}

function badge(text, extraClass) {
  const el = document.createElement("span");
  el.className = `badge ${extraClass || ""}`.trim();
  el.textContent = text;
  return el;
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}
