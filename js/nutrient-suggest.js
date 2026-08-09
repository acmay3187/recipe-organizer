// Suggests nutrient tags from a pasted ingredient list.
//
// The keyword table below is derived from the "Key nutrients & sources" table and the
// "Eat lots of" section on guidelines.html — the same standard applied by hand when
// tagging recipes. If that page changes, change this table to match.
//
// Two confidence tiers:
//   strong  — the ingredient is itself the source (walnuts -> Omega-3s). Auto-ticked.
//   weak    — depends on quantity or on a choice the ingredient list doesn't settle
//             (pasta could be whole wheat or white). Suggested for review, never ticked.
//
// `unless` guards against lookalikes: "coconut milk" must not count as dairy.

const STRONG = "strong";
const WEAK = "weak";

const TABLE = [
  // ---- Key nutrients & sources table ----
  ["Folic acid", STRONG, ["spinach", "brussels sprout", "asparagus", "orange", "lentil", "romaine", "arugula", "kale"]],
  ["Folic acid", STRONG, [{ term: "milk", unless: ["coconut milk", "almond milk", "oat milk", "soy milk", "cashew milk", "rice milk"] }, "yogurt"]],

  ["Vitamin D", STRONG, ["mushroom", "egg", "cheese", "parmesan", "feta", "ricotta", "mozzarella", "cheddar"]],

  ["Omega-3s", STRONG, ["walnut", "chia", "flax", "algae"]],

  ["Melatonin", STRONG, ["cherry", "pistachio", "almond", "cashew", "banana", "pineapple", "oats", "oatmeal",
    { term: "corn", unless: ["corn tortilla", "cornstarch", "corn starch", "corn syrup", "cornmeal"] }]],

  ["Vitamin C", STRONG, ["bell pepper", "red pepper", "green pepper", "poblano", "jalapeño", "jalapeno", "orange", "grapefruit", "lemon", "lime", "broccoli", "strawberry", "brussels sprout", "cantaloupe", "cauliflower", "tomato", "cabbage", "snap pea"]],

  ["Vitamin E", STRONG, ["walnut", "hazelnut", "almond", "sunflower seed", "pistachio", "spinach", "broccoli"]],

  ["Vitamin B12", STRONG, ["egg", "yogurt", "cheese", "parmesan", "feta", "nutritional yeast", "chicken", "turkey", "milk"]],

  ["Myo-inositol", STRONG, ["cantaloupe", "orange", "grapefruit", "quinoa", "brown rice", "oatmeal", "steel-cut oat", "chickpea", "bean"]],

  // Sesame *seeds* and tahini are the mineral source; sesame oil is used by the
  // teaspoon and only really counts as a fat.
  ["Magnesium", STRONG, ["spinach", "kale", "chard", "collard", "almond", "cashew", "pumpkin seed", "sesame seed", "tahini", "quinoa", "brown rice", "whole wheat", "whole grain"]],

  ["Zinc", STRONG, ["chicken", "turkey", "yogurt", "cheese", "cashew", "almond", "pumpkin seed", "whole wheat", "whole grain"]],

  ["Selenium", STRONG, ["brazil nut", "chicken", "turkey", "tofu", "egg", "yogurt", "cheese", "whole wheat", "whole grain"]],

  ["Calcium", STRONG, ["kale", "collard", "bok choy", "spinach", "chard", "yogurt", "cheese", "parmesan", "feta", "ricotta", "tahini", "tofu", "almond milk", "sesame seed"]],

  // ---- "Eat lots of" section ----
  ["Protein", STRONG, ["chicken", "turkey", "egg", "tofu", "edamame", "lentil", "chickpea", "greek yogurt", "peanut butter", "tempeh"]],

  ["Unsaturated fats", STRONG, ["olive oil", "avocado oil", "canola oil", "walnut", "almond", "cashew", "pistachio", "peanut", "pumpkin seed", "sunflower seed", "sesame", "tahini", "nut butter"]],

  ["Anti-inflammatory spices", STRONG, ["turmeric", "cumin", "coriander", "cinnamon", "garam masala", "curry powder", "curry paste", "cayenne", "allspice", "paprika", "cardamom", "harissa", "za'atar", "zaatar",
    // "ground ginger"/"fresh ginger" yes; "ginger ale" no. "clove" must not fire on
    // "4 cloves garlic", which appears in nearly every recipe.
    { term: "ginger", unless: ["ginger ale", "gingerbread"] },
    { term: "clove", unless: ["clove garlic", "cloves garlic", "clove of garlic", "cloves of garlic", "garlic clove"] }]],

  // Explicit whole-grain choices are unambiguous; bare "pasta"/"rice"/"bread" are not.
  ["Complex carbs", STRONG, ["brown rice", "whole wheat", "whole grain", "quinoa", "sweet potato", "steel-cut oat", "corn tortilla", "lentil", "chickpea", "farro", "barley", "bulgur", "soba", "buckwheat"]],
  ["Complex carbs", WEAK, [
    { term: "pasta", unless: ["whole wheat pasta", "whole grain pasta"] },
    { term: "rice", unless: ["brown rice", "rice vinegar", "rice wine"] },
    { term: "noodle", unless: ["soba"] },
    { term: "bread", unless: ["whole grain bread", "whole wheat bread"] },
    { term: "tortilla", unless: ["corn tortilla"] },
    "orzo", "couscous", "potato", "pita"
  ]]
];

// Counted for the "Lots of vegetables" heuristic — presence of several distinct
// vegetables, which is about as far as an ingredient list can take you.
const VEGETABLES = [
  "spinach", "kale", "broccoli", "cauliflower", "carrot", "zucchini", "bell pepper",
  "red pepper", "green pepper", "onion", "tomato", "mushroom", "asparagus", "pea",
  "cabbage", "brussels sprout", "green bean", "eggplant", "cucumber", "corn",
  "sweet potato", "chard", "bok choy", "celery", "leek", "squash", "arugula",
  "romaine", "lettuce", "scallion", "green onion", "shallot", "snap pea", "collard"
];

function normalize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9'à-ÿ\s-]/g, " ")
    .replace(/\s+/g, " ");
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Whole-word match with naive pluralisation. Substring matching is not safe here:
// "clove" would fire on "cloves garlic", "corn" on "cornstarch", "pea" on "peanut".
const reCache = new Map();
function termRegex(term) {
  let re = reCache.get(term);
  if (!re) {
    const body = term.endsWith("y")
      ? escapeRe(term.slice(0, -1)) + "(?:y|ies)"
      : escapeRe(term) + "(?:es|s)?";
    re = new RegExp(`(?<![a-z])${body}(?![a-z])`);
    reCache.set(term, re);
  }
  return re;
}

// True if `term` appears in `hay` and none of its `unless` lookalikes explain the hit.
function hits(hay, entry) {
  const term = typeof entry === "string" ? entry : entry.term;
  const unless = (typeof entry === "string" ? [] : entry.unless) || [];
  const re = termRegex(term);
  if (!re.test(hay)) return false;
  if (unless.length === 0) return true;
  // Strip the lookalike phrases, then re-test: if the term is gone, every occurrence
  // was part of an excluded phrase.
  let stripped = hay;
  for (const u of unless) stripped = stripped.replace(new RegExp(escapeRe(u), "g"), " ");
  return re.test(stripped);
}

/**
 * @param {string} text raw pasted ingredient list
 * @returns {{strong: Array<{nutrient: string, because: string[]}>,
 *            weak: Array<{nutrient: string, because: string[]}>,
 *            vegetables: string[]}}
 */
export function suggestNutrients(text) {
  const hay = normalize(text);
  if (!hay.trim()) return { strong: [], weak: [], vegetables: [] };

  const found = new Map(); // nutrient -> { tier, because: Set }

  for (const [nutrient, tier, terms] of TABLE) {
    for (const entry of terms) {
      if (!hits(hay, entry)) continue;
      const term = typeof entry === "string" ? entry : entry.term;
      const prev = found.get(nutrient);
      if (!prev) {
        found.set(nutrient, { tier, because: new Set([term]) });
      } else {
        prev.because.add(term);
        // A strong match anywhere wins over a weak one.
        if (tier === STRONG) prev.tier = STRONG;
      }
    }
  }

  const vegetables = VEGETABLES.filter((v) => termRegex(v).test(hay));
  // Overlapping names ("bell pepper" and "red pepper") shouldn't inflate the count.
  const vegCount = new Set(vegetables.map((v) => v.split(" ").pop())).size;
  if (vegCount >= 3) {
    found.set("Lots of vegetables", { tier: STRONG, because: new Set(vegetables.slice(0, 5)) });
  } else if (vegCount === 2) {
    found.set("Lots of vegetables", { tier: WEAK, because: new Set(vegetables) });
  }

  const shape = ([nutrient, v]) => ({ nutrient, because: [...v.because].sort() });
  const entries = [...found.entries()];
  return {
    strong: entries.filter(([, v]) => v.tier === STRONG).map(shape),
    weak: entries.filter(([, v]) => v.tier === WEAK).map(shape),
    vegetables
  };
}
