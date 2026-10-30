import type { LittleRecipe } from "./little-kitchen";

export type DishShape = "pita" | "pan" | "glass" | "plate" | "bowl";
export type PlayItem = {
  food: string;
  icon: string;
  need: number;
  mode: "spread" | "place";
  color: string;
};
export type PlayStage =
  | { kind: "prep"; title: string; hint: string; food: string; icon: string; verb: string; need: 3 }
  | { kind: "add"; title: string; hint: string; items: PlayItem[] }
  | { kind: "cook"; title: string; hint: string; appliance: "oven" | "stove" }
  | { kind: "quiz"; title: string; hint: string }
  | { kind: "serve"; title: string; hint: string };

type RecipeLayout = {
  dish: DishShape;
  prep: { food: string; verb: string };
  groups: { title: string; foods: string[] }[];
  appliance?: "oven" | "stove";
};

const layouts: Record<string, RecipeLayout> = {
  brownies: {
    dish: "pan",
    prep: { food: "Banana", verb: "Mash" },
    groups: [
      { title: "Add the mashed banana", foods: ["Banana"] },
      { title: "Mix the brownie batter", foods: ["Black beans", "Oats", "Cocoa", "Egg"] },
    ],
    appliance: "oven",
  },
  pizza: {
    dish: "pita",
    prep: { food: "Bell pepper", verb: "Chop" },
    groups: [
      { title: "Lay down the pita", foods: ["Whole wheat pita"] },
      { title: "Add tomato and cheese", foods: ["Tomato", "Mozzarella"] },
      { title: "Add colorful pepper", foods: ["Bell pepper"] },
    ],
    appliance: "oven",
  },
  pancakes: {
    dish: "pan",
    prep: { food: "Banana", verb: "Mash" },
    groups: [
      { title: "Mix the pancake batter", foods: ["Banana", "Oats", "Egg", "Plain yogurt"] },
    ],
    appliance: "stove",
  },
  parfait: {
    dish: "glass",
    prep: { food: "Banana", verb: "Slice" },
    groups: [
      { title: "Spoon in the yogurt", foods: ["Plain yogurt"] },
      { title: "Add banana and berries", foods: ["Banana", "Strawberries"] },
    ],
  },
  "veggie-dippers": {
    dish: "plate",
    prep: { food: "Carrots", verb: "Prepare" },
    groups: [
      { title: "Set out the hummus", foods: ["Hummus"] },
      { title: "Arrange the vegetables", foods: ["Carrots", "Cucumber", "Bell pepper"] },
    ],
  },
  "bean-salad": {
    dish: "bowl",
    prep: { food: "Tomato", verb: "Dice" },
    groups: [
      { title: "Fill your rainbow bowl", foods: ["Canned black beans", "Canned corn", "Tomato"] },
    ],
  },
};

const icons: Record<string, string> = {
  Banana: "🍌", "Black beans": "🫘", "Canned black beans": "🫘",
  Oats: "🌾", Cocoa: "🍫", Egg: "🥚", "Whole wheat pita": "🫓",
  Tomato: "🍅", Mozzarella: "🧀", "Bell pepper": "🫑",
  "Plain yogurt": "🥣", Strawberries: "🍓", Carrots: "🥕",
  Cucumber: "🥒", Hummus: "🫘", "Canned corn": "🌽",
};

export function foodIcon(food: string) {
  return icons[food] ?? "🍽️";
}

function playItem(food: string, recipeId: string): PlayItem {
  const spreads: Record<string, string> = {
    "Whole wheat pita": "#e8c68e",
    Mozzarella: "#f4df9d",
    "Plain yogurt": "#fff5dc",
    Hummus: "#d9b98a",
  };
  if (food === "Tomato" && recipeId === "pizza") spreads.Tomato = "#dc6a4d";
  const mode = food in spreads ? "spread" : "place";
  const multiple = ["Bell pepper", "Strawberries", "Carrots", "Cucumber", "Canned corn", "Canned black beans"].includes(food) ||
    (food === "Banana" && recipeId === "parfait") ||
    (food === "Tomato" && recipeId === "bean-salad");
  return {
    food,
    icon: foodIcon(food),
    need: mode === "spread" ? 1 : multiple ? 3 : 1,
    mode,
    color: spreads[food] ?? "#e7c99d",
  };
}

export function recipeDish(recipe: LittleRecipe): DishShape {
  return layouts[recipe.id]?.dish ?? "plate";
}

export function buildRecipeStages(recipe: LittleRecipe): PlayStage[] {
  const layout: RecipeLayout = layouts[recipe.id] ?? {
    dish: "plate" as const,
    prep: { food: recipe.ingredients[0].food, verb: "Prepare" },
    groups: [{ title: "Build your dish", foods: recipe.ingredients.map(({ food }) => food) }],
  };
  const available = new Set(recipe.ingredients.map(({ food }) => food));
  const used = new Set<string>();
  const groups = layout.groups.map((group) => {
    const foods = group.foods.filter((food) => available.has(food) && !used.has(food));
    foods.forEach((food) => used.add(food));
    return { title: group.title, foods };
  }).filter((group) => group.foods.length);
  const remaining = recipe.ingredients.map(({ food }) => food).filter((food) => !used.has(food));
  if (remaining.length) groups.push({ title: "Add the remaining ingredients", foods: remaining });

  const stages: PlayStage[] = [
    {
      kind: "prep",
      title: `${layout.prep.verb} the ${layout.prep.food.toLowerCase()}`,
      hint: `Tap or drag the ${layout.prep.food.toLowerCase()} to the prep board three times. Ask a grown-up to help with real cutting.`,
      food: layout.prep.food,
      icon: foodIcon(layout.prep.food),
      verb: layout.prep.verb,
      need: 3,
    },
    ...groups.map((group): PlayStage => ({
      kind: "add",
      title: group.title,
      hint: "Drag a food onto the dish, or tap a food and then tap the dish. Fill every marker to continue.",
      items: group.foods.map((food) => playItem(food, recipe.id)),
    })),
  ];
  if (layout.appliance) stages.push({
    kind: "cook",
    title: layout.appliance === "oven" ? "Bake your dish" : "Cook your pancakes",
    hint: `Tap the pretend ${layout.appliance} to cook. A grown-up handles real heat.`,
    appliance: layout.appliance,
  });
  stages.push(
    { kind: "quiz", title: "Chef Challenge", hint: "Answer a question about the food you just prepared." },
    { kind: "serve", title: "Serve your creation", hint: "Tap the plate when your dish is ready to share." },
  );
  return stages;
}
