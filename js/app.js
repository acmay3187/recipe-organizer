import { subscribeRecipes } from "./recipes.js";
import { createFilterState, applyFilters } from "./filters.js";
import { renderGrid } from "./render.js";
import {
  CUISINES,
  INGREDIENT_FILTERS,
  NUTRIENTS
} from "./constants.js";
import { wireAuthButtons, onAuthChange } from "./auth.js";

const state = createFilterState();
let allRecipes = [];

function rerender() {
  const grid = document.getElementById("recipe-grid");
  const filtered = applyFilters(allRecipes, state);
  renderGrid(grid, filtered, { onAfterDelete: () => {} });
  document.getElementById("results-count").textContent =
    `Showing ${filtered.length} of ${allRecipes.length} recipe${allRecipes.length === 1 ? "" : "s"}`;
}

function buildChipGroup(container, items, set, getKey, getLabel, onChange) {
  container.innerHTML = "";
  for (const item of items) {
    const key = getKey(item);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = getLabel(item);
    btn.dataset.key = key;
    if (set.has(key)) btn.classList.add("chip--active");
    btn.setAttribute("aria-pressed", set.has(key) ? "true" : "false");
    btn.addEventListener("click", () => {
      if (set.has(key)) set.delete(key); else set.add(key);
      btn.classList.toggle("chip--active");
      btn.setAttribute("aria-pressed", set.has(key) ? "true" : "false");
      onChange();
    });
    container.appendChild(btn);
  }
}

function wireFilters() {
  buildChipGroup(
    document.getElementById("cuisine-chips"),
    CUISINES, state.cuisines,
    (c) => c, (c) => c,
    rerender
  );
  buildChipGroup(
    document.getElementById("ingredient-chips"),
    INGREDIENT_FILTERS, state.ingredients,
    (i) => i.key, (i) => i.label,
    rerender
  );
  buildChipGroup(
    document.getElementById("nutrient-chips"),
    NUTRIENTS, state.nutrients,
    (n) => n, (n) => n,
    rerender
  );

  const search = document.getElementById("search-input");
  search.addEventListener("input", (e) => {
    state.search = e.target.value;
    rerender();
  });

  const sort = document.getElementById("sort-select");
  sort.addEventListener("change", (e) => {
    state.sort = e.target.value;
    rerender();
  });

  const nutrientMode = document.getElementById("nutrient-mode");
  nutrientMode.addEventListener("change", (e) => {
    state.nutrientMode = e.target.value;
    rerender();
  });

  document.getElementById("clear-filters").addEventListener("click", () => {
    state.cuisines.clear();
    state.ingredients.clear();
    state.nutrients.clear();
    state.search = "";
    search.value = "";
    document.querySelectorAll(".chip--active").forEach((el) => {
      el.classList.remove("chip--active");
      el.setAttribute("aria-pressed", "false");
    });
    rerender();
  });

  // Mobile drawer toggle
  const filtersToggle = document.getElementById("filters-toggle");
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");
  function closeDrawer() {
    sidebar.classList.remove("sidebar--open");
    backdrop.classList.remove("backdrop--visible");
  }
  filtersToggle.addEventListener("click", () => {
    sidebar.classList.add("sidebar--open");
    backdrop.classList.add("backdrop--visible");
  });
  backdrop.addEventListener("click", closeDrawer);
  document.getElementById("close-filters").addEventListener("click", closeDrawer);
}

function wireAuthUI() {
  wireAuthButtons({
    signInBtnId: "sign-in-btn",
    signOutBtnId: "sign-out-btn",
    userLabelId: "user-label"
  });
  onAuthChange(({ isOwner }) => {
    const addLink = document.getElementById("add-recipe-link");
    if (addLink) addLink.hidden = !isOwner;
    rerender(); // re-render so edit/delete buttons appear
  });
}

function init() {
  wireFilters();
  wireAuthUI();
  subscribeRecipes(
    (recipes) => {
      allRecipes = recipes;
      rerender();
    },
    (err) => {
      const grid = document.getElementById("recipe-grid");
      grid.innerHTML = `<p class="error">Couldn't load recipes: ${err.message || err.code}.<br>
        Make sure you've completed the Firebase setup in <a href="https://github.com/" target="_blank">README.md</a>.</p>`;
    }
  );
}

init();
