import { CUISINES, PROTEINS, DIETARY_TAGS, NUTRIENTS } from "./constants.js";
import { addRecipe, updateRecipe, getRecipe } from "./recipes.js";
import { onAuthChange, wireAuthButtons } from "./auth.js";
import { wireSeedButton } from "./seed.js";

const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get("id");

function buildCuisineOptions(select) {
  select.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "— Select cuisine —";
  select.appendChild(placeholder);
  for (const c of CUISINES) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  }
  const other = document.createElement("option");
  other.value = "__other__";
  other.textContent = "Other…";
  select.appendChild(other);
}

function buildProteinRadios(container) {
  container.innerHTML = "";
  for (const p of PROTEINS) {
    const id = `protein-${p.value}`;
    const wrap = document.createElement("label");
    wrap.className = "radio-label";
    wrap.htmlFor = id;
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "protein";
    input.id = id;
    input.value = p.value;
    wrap.appendChild(input);
    const txt = document.createElement("span");
    txt.textContent = p.label;
    wrap.appendChild(txt);
    container.appendChild(wrap);
  }
}

function buildDietaryCheckboxes(container) {
  container.innerHTML = "";
  for (const tag of DIETARY_TAGS) {
    const id = `diet-${tag}`;
    const wrap = document.createElement("label");
    wrap.className = "check-label";
    wrap.htmlFor = id;
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = id;
    input.value = tag;
    input.name = "dietaryTag";
    wrap.appendChild(input);
    const txt = document.createElement("span");
    txt.textContent = tag.charAt(0).toUpperCase() + tag.slice(1);
    wrap.appendChild(txt);
    container.appendChild(wrap);
  }
}

function buildNutrientChips(container) {
  container.innerHTML = "";
  for (const n of NUTRIENTS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.dataset.nutrient = n;
    btn.textContent = n;
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", () => {
      const active = btn.classList.toggle("chip--active");
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    container.appendChild(btn);
  }
}

function readForm() {
  const form = document.getElementById("recipe-form");
  const cuisineSelect = form.elements["cuisine"];
  const cuisineOther = form.elements["cuisineOther"];
  let cuisine = cuisineSelect.value;
  if (cuisine === "__other__") cuisine = (cuisineOther.value || "").trim();

  const protein = form.querySelector('input[name="protein"]:checked')?.value || "none";

  const dietaryTags = Array.from(
    form.querySelectorAll('input[name="dietaryTag"]:checked')
  ).map((i) => i.value);

  const nutrients = Array.from(
    document.querySelectorAll('#nutrient-chips .chip--active')
  ).map((c) => c.dataset.nutrient);

  const timeRaw = (form.elements["timeMinutes"].value || "").trim();
  const timeMinutes = timeRaw === "" ? null : Number(timeRaw);

  return {
    name: (form.elements["name"].value || "").trim(),
    url: (form.elements["url"].value || "").trim(),
    source: (form.elements["source"].value || "").trim(),
    cuisine,
    protein,
    dietaryTags,
    timeMinutes: Number.isFinite(timeMinutes) ? timeMinutes : null,
    notes: (form.elements["notes"].value || "").trim(),
    nutrients
  };
}

function populateForm(r) {
  const form = document.getElementById("recipe-form");
  form.elements["name"].value = r.name || "";
  form.elements["url"].value = r.url || "";
  form.elements["source"].value = r.source || "";
  if (CUISINES.includes(r.cuisine)) {
    form.elements["cuisine"].value = r.cuisine;
  } else if (r.cuisine) {
    form.elements["cuisine"].value = "__other__";
    form.elements["cuisineOther"].value = r.cuisine;
    document.getElementById("cuisine-other-wrap").hidden = false;
  }
  const radio = form.querySelector(`input[name="protein"][value="${r.protein || "none"}"]`);
  if (radio) radio.checked = true;
  for (const tag of (r.dietaryTags || [])) {
    const cb = form.querySelector(`input[name="dietaryTag"][value="${tag}"]`);
    if (cb) cb.checked = true;
  }
  form.elements["timeMinutes"].value = r.timeMinutes ?? "";
  form.elements["notes"].value = r.notes || "";
  for (const n of (r.nutrients || [])) {
    const chip = document.querySelector(`#nutrient-chips .chip[data-nutrient="${cssEscape(n)}"]`);
    if (chip) {
      chip.classList.add("chip--active");
      chip.setAttribute("aria-pressed", "true");
    }
  }
}

function cssEscape(s) {
  return (s || "").replace(/(["\\])/g, "\\$1");
}

function wireForm() {
  const form = document.getElementById("recipe-form");
  const cuisineSelect = form.elements["cuisine"];
  const otherWrap = document.getElementById("cuisine-other-wrap");
  cuisineSelect.addEventListener("change", () => {
    otherWrap.hidden = cuisineSelect.value !== "__other__";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = readForm();
    if (!data.name) return alert("Name is required.");
    if (!data.url) return alert("Source URL is required.");
    if (!data.cuisine) return alert("Cuisine is required.");
    const submitBtn = document.getElementById("submit-btn");
    submitBtn.disabled = true;
    try {
      if (editId) {
        await updateRecipe(editId, data);
      } else {
        await addRecipe(data);
      }
      window.location.href = "index.html";
    } catch (err) {
      console.error(err);
      alert("Save failed: " + (err.message || err.code));
      submitBtn.disabled = false;
    }
  });
}

async function init() {
  document.getElementById("page-title").textContent = editId ? "Edit Recipe" : "Add Recipe";
  document.getElementById("submit-btn").textContent = editId ? "Save changes" : "Add recipe";

  buildCuisineOptions(document.getElementById("cuisine-select"));
  buildProteinRadios(document.getElementById("protein-radios"));
  buildDietaryCheckboxes(document.getElementById("dietary-checks"));
  buildNutrientChips(document.getElementById("nutrient-chips"));
  wireForm();
  wireSeedButton();

  wireAuthButtons({
    signInBtnId: "sign-in-btn",
    signOutBtnId: "sign-out-btn",
    userLabelId: "user-label"
  });
  onAuthChange(({ isOwner }) => {
    document.getElementById("not-signed-in").hidden = isOwner;
    document.getElementById("form-section").hidden = !isOwner;
  });

  if (editId) {
    try {
      const r = await getRecipe(editId);
      if (r) populateForm(r);
      else alert("Recipe not found.");
    } catch (err) {
      console.error(err);
      alert("Could not load recipe to edit: " + (err.message || err.code));
    }
  }
}

init();
