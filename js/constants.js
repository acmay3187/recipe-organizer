export const CUISINES = [
  "Asian",
  "Tex-Mex / Mexican",
  "Middle Eastern",
  "Italian / American",
  "Indian",
  "Mediterranean / Greek"
];

export const PROTEINS = [
  { value: "chicken", label: "Chicken" },
  { value: "turkey", label: "Turkey" },
  { value: "eggs", label: "Eggs" },
  { value: "tofu", label: "Tofu" },
  { value: "none", label: "None / Other" }
];

export const DIETARY_TAGS = ["vegetarian", "vegan"];

// "Main ingredient / diet" filter chips — combines protein + dietary axes
// into the single mental model the user requested.
export const INGREDIENT_FILTERS = [
  { key: "chicken", label: "Chicken" },
  { key: "turkey", label: "Turkey" },
  { key: "eggs", label: "Eggs" },
  { key: "tofu", label: "Tofu" },
  { key: "vegetarian", label: "Vegetarian" }
];

// All nutrients tracked by the fertility-diet guidelines, in the order used on the site.
export const NUTRIENTS = [
  "Protein",
  "Complex carbs",
  "Unsaturated fats",
  "Folic acid",
  "Vitamin D",
  "Omega-3s",
  "Melatonin",
  "Vitamin C",
  "Vitamin E",
  "Vitamin B12",
  "Myo-inositol",
  "Magnesium",
  "Zinc",
  "Selenium",
  "Calcium",
  "Anti-inflammatory spices",
  "Lots of vegetables"
];

// True if the recipe should pass an "ingredient/diet" filter for the given key.
// Vegetarian matches any recipe that has the "vegetarian" tag OR has a vegetarian
// primary protein (eggs/tofu).
export function recipeMatchesIngredient(recipe, key) {
  if (key === "vegetarian") {
    if ((recipe.dietaryTags || []).includes("vegetarian")) return true;
    if ((recipe.dietaryTags || []).includes("vegan")) return true;
    return recipe.protein === "eggs" || recipe.protein === "tofu";
  }
  return recipe.protein === key;
}
