import { z } from "zod";
import type { LittleRecipe } from "./little-kitchen";
import {
  BOARD_FOOD, BOWL, PAN, PITA, PLATE, PAINT_VALID, autoSpot, clampToEllipse,
  glassSurface, paintCoverage, type Ellipse, type Point, type Surface,
} from "./cooking-geometry";

// An asset is "food:state", e.g. "banana:whole", "banana:slice", "banana:mash".
export type AssetKey = string;

export interface Item { asset: AssetKey; count: number }
/** A fixed place an item must go, in surface units (for example a spot on a skewer). */
export interface Slot { x: number; y: number; rot: number }
type Base = { id: string; surface: Surface; title: string; hint: string };
export type Step =
  | (Base & { kind: "drop"; items: Item[]; zone: Surface; fixed?: boolean; slots?: Slot[] })
  | (Base & { kind: "cut"; food: string; cuts: number; result: AssetKey })
  | (Base & { kind: "mash"; food: string; spots: number })
  | (Base & { kind: "scoop"; asset: AssetKey; into: Surface; count: number; verb: string })
  | (Base & { kind: "pour"; asset: AssetKey })
  | (Base & { kind: "spread"; medium: SpreadMedium; target: number })
  | (Base & { kind: "stir"; turns: number })
  | (Base & { kind: "cook"; appliance: "oven" | "stove"; seconds: number; label: string; real: string })
  | (Base & { kind: "flip"; count: number })
  | (Base & { kind: "quiz"; index: 0 | 1 });
export type StepKind = Step["kind"];
export type SpreadMedium = "sauce" | "cheese" | "avocado" | "hummus";

export interface Drop {
  id: number;
  step: string;
  asset: AssetKey;
  x: number;
  y: number;
  rot: number;
  zone: Surface;
  lvl: number; // yogurt scoops in the glass when this was placed
}
export interface DishState {
  drops: Drop[];
  cuts: Record<string, number[]>;
  mash: Record<string, number[]>;
  scoops: Record<string, number>;
  paint: Record<string, number[]>;
  stir: Record<string, number>;
  poured: Record<string, boolean>;
  heat: Record<string, number>;
  flipped: number[];
  nextId: number;
}

const num = z.number().finite();
const idRecord = <T extends z.ZodType>(value: T) => z.record(z.string().max(40), value);
export const dishSchema = z.object({
  drops: z.array(z.object({
    id: z.number().int(), step: z.string().max(40), asset: z.string().max(40),
    x: num, y: num, rot: num,
    zone: z.enum(["board", "glass", "bowl", "pita", "pan", "plate"]),
    lvl: z.number().int().min(0).max(8),
  })).max(60),
  cuts: idRecord(z.array(z.number().int().min(0).max(8)).max(9)),
  mash: idRecord(z.array(z.number().int().min(0).max(8)).max(9)),
  scoops: idRecord(z.number().int().min(0).max(8)),
  paint: idRecord(z.array(z.number().int().min(0).max(255)).max(256)),
  stir: idRecord(num),
  poured: idRecord(z.boolean()),
  heat: idRecord(num),
  flipped: z.array(z.number().int().min(0).max(5)).max(6),
  nextId: z.number().int(),
}).strict();

export const emptyDish = (): DishState => ({
  drops: [], cuts: {}, mash: {}, scoops: {}, paint: {}, stir: {},
  poured: {}, heat: {}, flipped: [], nextId: 1,
});

// ---------------------------------------------------------------- recipes ---

// Six cookies fit on the tray in two rows of three.
export const COOKIE_SLOTS: Slot[] = ([[310, 196], [400, 190], [490, 196], [310, 326], [400, 332], [490, 326]] as const)
  .map(([x, y], i) => ({ x, y, rot: [-12, 8, -6, 10, -9, 5][i] }));

// Fruit kabobs: three skewers lie across the plate, each with three open spots.
export const KABOB_SKEWERS = [
  { x1: 252, y1: 196, x2: 548, y2: 172 },
  { x1: 248, y1: 266, x2: 552, y2: 266 },
  { x1: 252, y1: 336, x2: 548, y2: 360 },
] as const;
export const KABOB_SLOTS: Slot[] = KABOB_SKEWERS.flatMap((s) =>
  [0.25, 0.5, 0.75].map((t) => ({
    x: Math.round(s.x1 + (s.x2 - s.x1) * t),
    y: Math.round(s.y1 + (s.y2 - s.y1) * t),
    rot: Math.round((Math.atan2(s.y2 - s.y1, s.x2 - s.x1) * 180) / Math.PI),
  })));

const drop = (
  id: string, surface: Surface, title: string, hint: string, items: Item[],
  extra: { zone?: Surface; fixed?: boolean; slots?: Slot[] } = {},
): Step => ({ kind: "drop", id, surface, title, hint, items, zone: extra.zone ?? surface, fixed: extra.fixed, slots: extra.slots });
const quiz = (index: 0 | 1, surface: Surface): Step => ({
  kind: "quiz", id: `quiz-${index + 1}`, surface, index,
  title: "Quick chef question", hint: "Look at your dish and pick an answer.",
});
const placeOnBoard = (food: string, label: string): Step =>
  drop(`place-${food}`, "board", `Put the ${label} on the board`,
    `Drag the ${label} onto the cutting board, or tap it and then tap the board.`,
    [{ asset: `${food}:whole`, count: 1 }], { fixed: true });
const cut = (food: string, label: string, cuts: number, result: AssetKey, verb = "Slice"): Step => ({
  kind: "cut", id: `cut-${food}`, surface: "board", food, cuts, result,
  title: `${verb} the ${label}`,
  hint: `Swipe the knife across the dashed marks, or tap a mark. Each cut makes a new piece. Ask a grown-up to help with real knives.`,
});
const mash = (food: string): Step => ({
  kind: "mash", id: `mash-${food}`, surface: "board", food, spots: 4,
  title: "Mash the banana",
  hint: "Press the masher on each glowing spot. The banana gets softer every time.",
});
const bowlMix = (): Step[] => [
  { kind: "stir", id: "stir", surface: "bowl", turns: 2, title: "Stir it together",
    hint: "Drag the spoon around the bowl in circles, or tap the bowl to stir a quarter turn at a time." },
];
const bake = (label: string, real: string, seconds = 6, surface: Surface = "pan"): Step => ({
  kind: "cook", id: "bake", surface, appliance: "oven", seconds, label, real,
  title: "Bake it", hint: "Press Start and watch it turn golden. This is pretend baking: a grown-up handles a real hot oven.",
});

export function planFor(recipe: LittleRecipe): Step[] {
  switch (recipe.id) {
    case "parfait":
      return [
        placeOnBoard("banana", "banana"),
        cut("banana", "banana", 3, "banana:slice"),
        cut("strawberry", "strawberry", 2, "strawberry:slice"),
        quiz(0, "board"),
        { kind: "scoop", id: "yogurt-base", surface: "glass", asset: "yogurt:bowl", into: "glass", count: 2,
          verb: "Scoop", title: "Spoon yogurt into the glass",
          hint: "Drag the yogurt bowl to the glass, or tap the bowl and then the glass. Two scoops build the base." },
        drop("banana-layer", "glass", "Add banana slices",
          "Drag a slice into the glass, or tap a slice and then the glass. Pick where each one goes.",
          [{ asset: "banana:slice", count: 3 }]),
        { kind: "scoop", id: "yogurt-top", surface: "glass", asset: "yogurt:bowl", into: "glass", count: 1,
          verb: "Scoop", title: "Add one more scoop",
          hint: "One more scoop of yogurt covers the banana layer." },
        drop("toppings", "glass", "Arrange your toppings",
          "Place the strawberry and banana slices on top. Arrange them any way you like!",
          [{ asset: "banana:slice", count: 1 }, { asset: "strawberry:slice", count: 3 }]),
        quiz(1, "glass"),
      ];
    case "pancakes":
      return [
        placeOnBoard("banana", "banana"),
        mash("banana"),
        quiz(0, "board"),
        drop("bowl-banana", "bowl", "Scrape the banana into the bowl",
          "Drag the mashed banana into the mixing bowl.", [{ asset: "banana:mash", count: 1 }]),
        drop("bowl-rest", "bowl", "Add oats, egg and yogurt",
          "Drag each ingredient into the bowl, or tap one and then tap the bowl.",
          [{ asset: "oats:pile", count: 1 }, { asset: "egg:whole", count: 1 }, { asset: "yogurt:dollop", count: 1 }]),
        ...bowlMix(),
        { kind: "pour", id: "pour", surface: "pan", asset: "batter:bowl", title: "Pour batter into the pan",
          hint: "Drag the bowl over the pan, or tap the bowl and then the pan." },
        { kind: "cook", id: "cook-1", surface: "pan", appliance: "stove", seconds: 5, label: "first side", real: "Real pancakes cook 2 to 3 minutes on the first side over medium-low heat.",
          title: "Cook the first side", hint: "Press Start. Bubbles show the first side is cooking. A grown-up handles a real hot stove." },
        { kind: "flip", id: "flip", surface: "pan", count: 3, title: "Flip the pancakes",
          hint: "Tap each pancake to slide the spatula under it and turn it over." },
        { kind: "cook", id: "cook-2", surface: "pan", appliance: "stove", seconds: 4, label: "second side", real: "Real pancakes cook another 2 to 3 minutes on the second side.",
          title: "Cook the other side", hint: "Press Start to finish the second side." },
        quiz(1, "pan"),
      ];
    case "brownies":
      return [
        placeOnBoard("banana", "banana"),
        mash("banana"),
        quiz(0, "board"),
        drop("bowl-banana", "bowl", "Scrape the banana into the bowl",
          "Drag the mashed banana into the mixing bowl.", [{ asset: "banana:mash", count: 1 }]),
        drop("bowl-rest", "bowl", "Add beans, oats, cocoa and egg",
          "Drag each ingredient into the bowl, or tap one and then tap the bowl.",
          [{ asset: "beans:pile", count: 1 }, { asset: "oats:pile", count: 1 },
            { asset: "cocoa:pile", count: 1 }, { asset: "egg:whole", count: 1 }]),
        ...bowlMix(),
        { kind: "pour", id: "pour", surface: "pan", asset: "batter:bowl", title: "Pour batter into the tray",
          hint: "Drag the bowl over the tray, or tap the bowl and then the tray." },
        bake("brownies", "Real brownies bake at 350°F for about 18 to 22 minutes."),
        quiz(1, "pan"),
      ];
    case "pizza":
      return [
        placeOnBoard("pepper", "bell pepper"),
        cut("pepper", "pepper", 3, "pepper:piece", "Chop"),
        quiz(0, "board"),
        drop("place-pita", "pita", "Set the pita on the tray",
          "Drag the pita onto the tray.", [{ asset: "pita:whole", count: 1 }], { fixed: true }),
        { kind: "spread", id: "spread-sauce", surface: "pita", medium: "sauce", target: 0.8,
          title: "Spread the tomato sauce",
          hint: "Drag the spoon around the pita to cover it, or tap the pita to spread a patch." },
        { kind: "spread", id: "sprinkle-cheese", surface: "pita", medium: "cheese", target: 0.6,
          title: "Sprinkle the cheese",
          hint: "Drag across the pizza to sprinkle cheese, or tap to add a pinch." },
        drop("toppings", "pita", "Place the pepper pieces",
          "Put the pepper pieces wherever you like.", [{ asset: "pepper:piece", count: 4 }]),
        bake("pizza", "Real pizzas bake at 400°F for 8 to 10 minutes.", 6, "pita"),
        quiz(1, "pita"),
      ];
    case "bean-salad":
      return [
        placeOnBoard("tomato", "tomato"),
        cut("tomato", "tomato", 2, "tomato:dice", "Dice"),
        quiz(0, "board"),
        { kind: "scoop", id: "beans", surface: "bowl", asset: "beans:bowl", into: "bowl", count: 2, verb: "Scoop",
          title: "Scoop in the black beans", hint: "Drag the bean bowl over the big bowl, or tap the bean bowl and then the big bowl." },
        { kind: "scoop", id: "corn", surface: "bowl", asset: "corn:bowl", into: "bowl", count: 2, verb: "Scoop",
          title: "Scoop in the corn", hint: "Drag the corn over the big bowl, or tap the corn and then the big bowl." },
        drop("tomato-add", "bowl", "Add the tomato",
          "Drop the tomato pieces on top.", [{ asset: "tomato:dice", count: 3 }]),
        ...bowlMix(),
        quiz(1, "bowl"),
      ];
    case "fruit-salad":
      return [
        placeOnBoard("banana", "banana"),
        cut("banana", "banana", 3, "banana:slice"),
        cut("strawberry", "strawberry", 2, "strawberry:slice"),
        quiz(0, "board"),
        drop("fruit-bowl", "bowl", "Tip the banana and strawberries into the bowl",
          "Drag the pieces into the big bowl, or tap one and then tap the bowl.",
          [{ asset: "banana:slice", count: 4 }, { asset: "strawberry:slice", count: 3 }]),
        drop("fruit-more", "bowl", "Add grapes, blueberries and orange",
          "Drag each fruit into the bowl, or tap one and then tap the bowl.",
          [{ asset: "grape:pile", count: 1 }, { asset: "blueberry:pile", count: 1 }, { asset: "orange:segments", count: 1 }]),
        { kind: "stir", id: "stir", surface: "bowl", turns: 1, title: "Toss the fruit gently",
          hint: "Drag the spoon around the bowl in a circle, or tap the bowl to turn it a quarter at a time." },
        quiz(1, "bowl"),
      ];
    case "fruit-kabobs":
      return [
        placeOnBoard("banana", "banana"),
        cut("banana", "banana", 3, "banana:slice"),
        cut("strawberry", "strawberry", 2, "strawberry:slice"),
        quiz(0, "board"),
        drop("thread", "plate", "Thread the fruit onto the skewers",
          "Drag a fruit onto the plate, or tap a fruit and then the plate. Each piece slides onto the next free spot, so choose the order and make a pattern!",
          [{ asset: "banana:slice", count: 3 }, { asset: "strawberry:slice", count: 3 }, { asset: "grape:single", count: 3 }],
          { slots: KABOB_SLOTS }),
        quiz(1, "plate"),
      ];
    case "avocado-toast":
      return [
        placeOnBoard("tomato", "tomato"),
        cut("tomato", "tomato", 2, "tomato:dice", "Dice"),
        quiz(0, "board"),
        drop("place-bread", "pita", "Put the bread in the toaster",
          "Drag the slice of bread onto the plate, or tap it and then tap the plate.", [{ asset: "bread:slice", count: 1 }], { fixed: true }),
        { kind: "cook", id: "toast", surface: "pita", appliance: "oven", seconds: 4, label: "toast",
          real: "Real toast takes about 2 to 3 minutes in a toaster.",
          title: "Toast the bread", hint: "Press Start and watch the bread turn golden. This is pretend toasting: a grown-up handles a real toaster." },
        { kind: "spread", id: "spread-avocado", surface: "pita", medium: "avocado", target: 0.8,
          title: "Spread the mashed avocado",
          hint: "Drag the spoon around the toast to cover it, or tap the toast to spread a patch." },
        drop("toppings", "pita", "Place the tomato pieces",
          "Put the tomato pieces wherever you like.", [{ asset: "tomato:dice", count: 3 }]),
        quiz(1, "pita"),
      ];
    case "quesadilla":
      return [
        placeOnBoard("tomato", "tomato"),
        cut("tomato", "tomato", 2, "tomato:dice", "Dice"),
        quiz(0, "board"),
        drop("place-tortilla", "pan", "Lay the tortilla in the pan",
          "Drag the tortilla into the pan, or tap it and then tap the pan.", [{ asset: "tortilla:whole", count: 1 }], { fixed: true }),
        drop("fill", "pan", "Add the beans, cheese and tomato",
          "Drag each ingredient onto the tortilla, or tap one and then tap the pan.",
          [{ asset: "beans:pile", count: 1 }, { asset: "cheese:pile", count: 2 }, { asset: "tomato:dice", count: 2 }]),
        { kind: "cook", id: "cook-1", surface: "pan", appliance: "stove", seconds: 4, label: "melt the cheese",
          real: "A real quesadilla cooks 2 to 3 minutes on the first side over medium heat.",
          title: "Melt the cheese", hint: "Press Start and watch the cheese melt. A grown-up handles a real hot stove." },
        { kind: "flip", id: "flip", surface: "pan", count: 1, title: "Fold it and flip it",
          hint: "Tap the quesadilla to fold it in half and turn it over." },
        { kind: "cook", id: "cook-2", surface: "pan", appliance: "stove", seconds: 4, label: "crisp it up",
          real: "Real quesadillas cook another 2 minutes on the second side until golden.",
          title: "Cook until crispy", hint: "Press Start to crisp the other side. A grown-up handles the real hot pan." },
        quiz(1, "pan"),
      ];
    case "veggie-wrap":
      return [
        placeOnBoard("pepper", "bell pepper"),
        cut("pepper", "pepper", 3, "pepper:strip"),
        placeOnBoard("carrot", "carrot"),
        cut("carrot", "carrot", 3, "carrot:coin"),
        quiz(0, "board"),
        drop("place-tortilla", "pita", "Lay the tortilla on the plate",
          "Drag the tortilla onto the plate, or tap it and then tap the plate.", [{ asset: "tortilla:whole", count: 1 }], { fixed: true }),
        { kind: "spread", id: "spread-hummus", surface: "pita", medium: "hummus", target: 0.7,
          title: "Spread the hummus",
          hint: "Drag the spoon around the tortilla to cover it, or tap the tortilla to spread a patch." },
        drop("fillings", "pita", "Add the crunchy veggies",
          "Place spinach, cucumber, carrot and pepper on the hummus. Make a rainbow!",
          [{ asset: "spinach:leaves", count: 2 }, { asset: "cucumber:slice", count: 3 }, { asset: "carrot:coin", count: 4 }, { asset: "pepper:strip", count: 3 }]),
        { kind: "flip", id: "roll", surface: "pita", count: 1, title: "Roll up the wrap",
          hint: "Tap the tortilla to fold in the sides and roll it up tight." },
        quiz(1, "plate"),
      ];
    case "oatmeal-bowl":
      return [
        placeOnBoard("banana", "banana"),
        cut("banana", "banana", 3, "banana:slice"),
        cut("strawberry", "strawberry", 2, "strawberry:slice"),
        quiz(0, "board"),
        drop("pot-oats", "pan", "Add the oats to the pot",
          "Drag the oats into the pot, or tap them and then tap the pot.", [{ asset: "oats:pile", count: 2 }]),
        { kind: "pour", id: "pour-milk", surface: "pan", asset: "milk:jug", title: "Pour in the milk",
          hint: "Drag the milk over the pot, or tap the milk and then the pot." },
        { kind: "stir", id: "stir", surface: "pan", turns: 2, title: "Stir the oatmeal",
          hint: "Drag the spoon around the pot in circles, or tap the pot to stir a quarter turn at a time." },
        { kind: "cook", id: "simmer", surface: "pan", appliance: "stove", seconds: 5, label: "simmer",
          real: "Real oatmeal simmers about 5 minutes, and a grown-up stirs it now and then.",
          title: "Simmer until creamy", hint: "Press Start and watch the oatmeal bubble. A grown-up handles a real hot stove." },
        drop("toppings", "bowl", "Spoon it into a bowl and add the fruit",
          "Place the banana, strawberries and blueberries on top. Arrange them any way you like!",
          [{ asset: "banana:slice", count: 4 }, { asset: "strawberry:slice", count: 3 }, { asset: "blueberry:pile", count: 1 }]),
        quiz(1, "bowl"),
      ];
    case "banana-oat-cookies":
      return [
        placeOnBoard("banana", "banana"),
        mash("banana"),
        quiz(0, "board"),
        drop("bowl-banana", "bowl", "Scrape the banana into the bowl",
          "Drag the mashed banana into the mixing bowl.", [{ asset: "banana:mash", count: 1 }]),
        drop("bowl-rest", "bowl", "Add oats, raisins and cinnamon",
          "Drag each ingredient into the bowl, or tap one and then tap the bowl.",
          [{ asset: "oats:pile", count: 2 }, { asset: "raisin:pile", count: 1 }, { asset: "cinnamon:pile", count: 1 }]),
        ...bowlMix(),
        drop("scoop-dough", "pan", "Scoop the dough onto the tray",
          "Drag a spoonful of dough onto the tray, or tap the dough and then tap the tray.",
          [{ asset: "cookie:dough", count: 6 }], { slots: COOKIE_SLOTS }),
        bake("cookies", "Real banana oat cookies bake at 350°F for 12 to 15 minutes."),
        quiz(1, "pan"),
      ];
    case "tomato-pasta":
      return [
        placeOnBoard("tomato", "tomato"),
        cut("tomato", "tomato", 2, "tomato:dice", "Dice"),
        quiz(0, "board"),
        drop("pot-pasta", "pan", "Drop the pasta into the pot",
          "Drag the pasta into the pot of water, or tap it and then tap the pot.", [{ asset: "pasta:pile", count: 1 }]),
        { kind: "cook", id: "boil", surface: "pan", appliance: "stove", seconds: 5, label: "boil the pasta",
          real: "Real pasta boils for 8 to 10 minutes, and a grown-up drains the hot water.",
          title: "Boil the pasta", hint: "Press Start and watch the water bubble. A grown-up handles a real boiling pot." },
        { kind: "pour", id: "pour-sauce", surface: "pan", asset: "sauce:bowl", title: "Pour in the tomato sauce",
          hint: "Drag the sauce over the pan, or tap the sauce and then the pan." },
        drop("tomato-add", "pan", "Add the tomato pieces",
          "Drag the tomato pieces into the pan.", [{ asset: "tomato:dice", count: 3 }]),
        { kind: "stir", id: "stir", surface: "pan", turns: 2, title: "Toss the pasta in the sauce",
          hint: "Drag the spoon around the pan in circles, or tap the pan to stir a quarter turn at a time." },
        drop("cheese", "pan", "Sprinkle on the cheese",
          "Drag the cheese onto the pasta, or tap it and then tap the pan.", [{ asset: "cheese:pile", count: 2 }]),
        quiz(1, "pan"),
      ];
    case "egg-muffins":
      return [
        placeOnBoard("pepper", "bell pepper"),
        cut("pepper", "pepper", 3, "pepper:piece", "Chop"),
        quiz(0, "board"),
        drop("bowl-eggs", "bowl", "Crack the eggs into the bowl",
          "Drag the eggs into the bowl, or tap one and then tap the bowl.", [{ asset: "egg:whole", count: 2 }]),
        drop("bowl-rest", "bowl", "Add the spinach, pepper and cheese",
          "Drag each ingredient into the bowl, or tap one and then tap the bowl.",
          [{ asset: "spinach:leaves", count: 1 }, { asset: "pepper:piece", count: 1 }, { asset: "cheese:pile", count: 1 }]),
        ...bowlMix(),
        { kind: "pour", id: "pour", surface: "pan", asset: "eggmix:bowl", title: "Pour the egg mixture into the muffin tin",
          hint: "Drag the bowl over the tin, or tap the bowl and then the tin." },
        bake("egg muffins", "Real egg muffins bake at 350°F for 15 to 18 minutes until set."),
        quiz(1, "pan"),
      ];
    case "veggie-fried-rice":
      return [
        placeOnBoard("carrot", "carrot"),
        cut("carrot", "carrot", 3, "carrot:coin", "Dice"),
        placeOnBoard("pepper", "bell pepper"),
        cut("pepper", "pepper", 3, "pepper:piece", "Chop"),
        quiz(0, "board"),
        drop("pan-veg", "pan", "Add the vegetables to the pan",
          "Drag the carrots, pepper and peas into the pan, or tap one and then tap the pan.",
          [{ asset: "carrot:coin", count: 4 }, { asset: "pepper:piece", count: 2 }, { asset: "peas:pile", count: 1 }]),
        drop("pan-rice", "pan", "Add the rice and the egg",
          "Drag the rice and egg into the pan, or tap one and then tap the pan.",
          [{ asset: "rice:pile", count: 1 }, { asset: "egg:whole", count: 1 }]),
        { kind: "pour", id: "pour-soy", surface: "pan", asset: "soy:cup", title: "Splash in the soy sauce",
          hint: "Drag the soy sauce over the pan, or tap it and then the pan." },
        { kind: "stir", id: "stir", surface: "pan", turns: 2, title: "Toss it all together",
          hint: "Drag the spoon around the pan in circles, or tap the pan to stir a quarter turn at a time." },
        { kind: "cook", id: "fry", surface: "pan", appliance: "stove", seconds: 5, label: "stir-fry",
          real: "Real fried rice stir-fries 5 to 7 minutes over medium-high heat.",
          title: "Stir-fry it hot", hint: "Press Start and watch the egg set. A grown-up handles a real hot pan." },
        quiz(1, "pan"),
      ];
    default:
      return [
        placeOnBoard("carrot", "carrot"),
        cut("carrot", "carrot", 3, "carrot:coin"),
        quiz(0, "board"),
        { kind: "scoop", id: "hummus", surface: "plate", asset: "hummus:bowl", into: "plate", count: 2, verb: "Scoop",
          title: "Spoon hummus into the little bowl",
          hint: "Drag the hummus to the little bowl on the plate, or tap one and then the other." },
        drop("arrange", "plate", "Arrange the veggies",
          "Place carrots, cucumber and pepper around the hummus. Make a rainbow!",
          [{ asset: "carrot:coin", count: 4 }, { asset: "cucumber:slice", count: 3 }, { asset: "pepper:strip", count: 3 }]),
        quiz(1, "plate"),
      ];
  }
}

// What a finished dish shows. Pancakes are served on a plate.
export function finalSurface(recipe: LittleRecipe): Surface {
  switch (recipe.id) {
    case "parfait": return "glass";
    case "pizza": return "pita";
    case "bean-salad": return "bowl";
    case "veggie-dippers": return "plate";
    case "fruit-salad": case "oatmeal-bowl": return "bowl";
    case "fruit-kabobs": case "veggie-wrap": return "plate";
    case "avocado-toast": return "pita";
    default: return "pan";
  }
}

// -------------------------------------------------------------- queries ----

export const placedCount = (dish: DishState, step: string, asset?: AssetKey) =>
  dish.drops.filter((d) => d.step === step && (!asset || d.asset === asset)).length;

export function totalScoops(dish: DishState, plan: Step[], into: Surface): number {
  return plan.reduce((sum, step) =>
    step.kind === "scoop" && step.into === into ? sum + (dish.scoops[step.id] ?? 0) : sum, 0);
}

// Pieces the child made earlier and may still hold, minus those already placed.
export function trayItems(step: Step, dish: DishState): { asset: AssetKey; left: number }[] {
  if (step.kind === "drop")
    return step.items.map((i) => ({ asset: i.asset, left: i.count - placedCount(dish, step.id, i.asset) }));
  if (step.kind === "scoop") return [{ asset: step.asset, left: step.count - (dish.scoops[step.id] ?? 0) }];
  if (step.kind === "pour") return [{ asset: step.asset, left: dish.poured[step.id] ? 0 : 1 }];
  return [];
}

export function stepProgress(step: Step, dish: DishState): { done: number; total: number } {
  switch (step.kind) {
    case "drop": {
      const total = step.items.reduce((s, i) => s + i.count, 0);
      return { done: Math.min(total, dish.drops.filter((d) => d.step === step.id).length), total };
    }
    case "cut": return { done: (dish.cuts[step.id] ?? []).length, total: step.cuts };
    case "mash": return { done: (dish.mash[step.id] ?? []).length, total: step.spots };
    case "scoop": return { done: dish.scoops[step.id] ?? 0, total: step.count };
    case "pour": return { done: dish.poured[step.id] ? 1 : 0, total: 1 };
    case "spread": {
      const c = paintCoverage(dish.paint[step.id] ?? []);
      return { done: Math.round(Math.min(1, c / step.target) * 100), total: 100 };
    }
    case "stir": return { done: Math.min(step.turns * 360, Math.round(dish.stir[step.id] ?? 0)), total: step.turns * 360 };
    case "cook": return { done: Math.round((dish.heat[step.id] ?? 0) * 100), total: 100 };
    case "flip": return { done: dish.flipped.length, total: step.count };
    case "quiz": return { done: 0, total: 1 };
  }
}
export const stepDone = (step: Step, dish: DishState) => {
  const { done, total } = stepProgress(step, dish);
  return step.kind === "quiz" ? false : done >= total;
};

/** Where a drop for this step may land, in surface coordinates. */
export function dropZone(step: Step & { kind: "drop" }, dish: DishState, plan: Step[]): { area: Ellipse; keepOut?: { cx: number; cy: number; r: number } } {
  switch (step.zone) {
    case "glass": return { area: glassSurface(totalScoops(dish, plan, "glass")) };
    case "bowl": return { area: { ...BOWL, rx: BOWL.rx * 0.72, ry: BOWL.ry * 0.72 } };
    case "pita": return { area: PITA };
    case "pan": return { area: { ...PAN, rx: PAN.rx * 0.74, ry: PAN.ry * 0.74 } };
    case "plate":
      // Only the hummus plate has a little bowl in the middle to keep clear.
      return plan.some((s) => s.kind === "scoop" && s.into === "plate")
        ? { area: PLATE, keepOut: { cx: PLATE.cx, cy: PLATE.cy, r: 84 } }
        : { area: { ...PLATE, rx: PLATE.rx * 0.8, ry: PLATE.ry * 0.8 } };
    default: return { area: { cx: BOARD_FOOD.cx, cy: BOARD_FOOD.cy, rx: 10, ry: 10 } };
  }
}

// ------------------------------------------------------------- updates -----

export function dropItem(
  dish: DishState, step: Step, plan: Step[], asset: AssetKey, point?: Point,
): DishState {
  if (step.kind !== "drop") return dish;
  const item = step.items.find((i) => i.asset === asset);
  if (!item || placedCount(dish, step.id, asset) >= item.count) return dish;
  const { area, keepOut } = dropZone(step, dish, plan);
  const existing = dish.drops.filter((d) => d.zone === step.zone && d.lvl === totalScoops(dish, plan, "glass"));
  let at: Point;
  const slot = step.slots?.[dish.drops.filter((d) => d.step === step.id).length];
  if (step.slots && !slot) return dish;
  if (slot) at = { x: slot.x, y: slot.y };
  else if (step.fixed) at = { x: area.cx, y: area.cy };
  else {
    at = point ? clampToEllipse(area, point, step.zone === "glass" ? 0.72 : 0.86) : autoSpot(area, existing, 0.66);
    if (keepOut) {
      const d = Math.hypot(at.x - keepOut.cx, at.y - keepOut.cy);
      if (d < keepOut.r) {
        const k = d === 0 ? 1 : keepOut.r / d;
        at = clampToEllipse(area, {
          x: keepOut.cx + (at.x - keepOut.cx || 1) * k,
          y: keepOut.cy + (at.y - keepOut.cy) * k,
        }, 0.92);
      }
    }
  }
  const id = dish.nextId;
  return {
    ...dish,
    nextId: id + 1,
    drops: [...dish.drops, {
      id, step: step.id, asset, x: Math.round(at.x), y: Math.round(at.y),
      rot: slot ? slot.rot : ((id * 53) % 70) - 35, zone: step.zone,
      lvl: totalScoops(dish, plan, "glass"),
    }],
  };
}
export function undoDrop(dish: DishState, stepId: string): DishState {
  const last = [...dish.drops].reverse().find((d) => d.step === stepId);
  return last ? { ...dish, drops: dish.drops.filter((d) => d.id !== last.id) } : dish;
}

const addIndex = (list: number[] | undefined, index: number, max: number) =>
  !list?.includes(index) && index >= 0 && index < max ? [...(list ?? []), index] : null;

export function doCut(dish: DishState, step: Step, index: number): DishState {
  if (step.kind !== "cut") return dish;
  const next = addIndex(dish.cuts[step.id], index, step.cuts);
  return next ? { ...dish, cuts: { ...dish.cuts, [step.id]: next } } : dish;
}
export function doMash(dish: DishState, step: Step, index: number): DishState {
  if (step.kind !== "mash") return dish;
  const next = addIndex(dish.mash[step.id], index, step.spots);
  return next ? { ...dish, mash: { ...dish.mash, [step.id]: next } } : dish;
}
export function doScoop(dish: DishState, step: Step): DishState {
  if (step.kind !== "scoop") return dish;
  const have = dish.scoops[step.id] ?? 0;
  return have >= step.count ? dish : { ...dish, scoops: { ...dish.scoops, [step.id]: have + 1 } };
}
export function doPour(dish: DishState, step: Step): DishState {
  return step.kind === "pour" && !dish.poured[step.id]
    ? { ...dish, poured: { ...dish.poured, [step.id]: true } } : dish;
}
export function doPaint(dish: DishState, step: Step, cells: number[]): DishState {
  if (step.kind !== "spread") return dish;
  const valid = cells.filter((c) => PAINT_VALID.includes(c));
  const prev = dish.paint[step.id] ?? [];
  const merged = [...new Set([...prev, ...valid])].sort((a, b) => a - b);
  return merged.length === prev.length ? dish : { ...dish, paint: { ...dish.paint, [step.id]: merged } };
}
export function doStir(dish: DishState, step: Step, degrees: number): DishState {
  if (step.kind !== "stir" || degrees <= 0) return dish;
  const max = step.turns * 360;
  const have = dish.stir[step.id] ?? 0;
  return have >= max ? dish : { ...dish, stir: { ...dish.stir, [step.id]: Math.min(max, have + degrees) } };
}
export function setHeat(dish: DishState, step: Step, value: number): DishState {
  if (step.kind !== "cook") return dish;
  const next = Math.max(0, Math.min(1, value));
  return next === (dish.heat[step.id] ?? 0) ? dish : { ...dish, heat: { ...dish.heat, [step.id]: next } };
}
export function doFlip(dish: DishState, step: Step, index: number): DishState {
  if (step.kind !== "flip" || index < 0 || index >= step.count || dish.flipped.includes(index)) return dish;
  return { ...dish, flipped: [...dish.flipped, index] };
}

/** Total browning 0..1 for the cooked look of the dish. */
export function browning(dish: DishState, plan: Step[]): number {
  const cooks = plan.filter((s) => s.kind === "cook");
  if (!cooks.length) return 0;
  return cooks.reduce((sum, s) => sum + (dish.heat[s.id] ?? 0), 0) / cooks.length;
}
export function stirAmount(dish: DishState, plan: Step[]): number {
  const stir = plan.find((s) => s.kind === "stir");
  return stir && stir.kind === "stir" ? Math.min(1, (dish.stir[stir.id] ?? 0) / (stir.turns * 360)) : 0;
}

/** Pretend cooking seconds in the plan, for the real-versus-pretend note. */
export const simulatedSeconds = (plan: Step[]) =>
  plan.reduce((sum, s) => (s.kind === "cook" ? sum + s.seconds : sum), 0);

/** Ingredients a child handled, as pictures for learning questions. */
export function answerAsset(answer: string): AssetKey | null {
  const key = answer.toLowerCase();
  const table: [string, AssetKey][] = [
    ["banana", "banana:whole"], ["strawberr", "strawberry:whole"], ["tomato", "tomato:whole"],
    ["pepper", "pepper:whole"], ["carrot", "carrot:whole"], ["cucumber", "cucumber:slice"],
    ["oats", "oats:pile"], ["egg", "egg:whole"], ["yogurt", "yogurt:dollop"],
    ["pita", "pita:whole"], ["cheese", "cheese:pile"], ["corn", "corn:pile"], ["beans", "beans:pile"],
    ["grape", "grape:single"], ["blueberr", "blueberry:pile"], ["orange", "orange:segments"],
    ["avocado", "avocado:half"], ["spinach", "spinach:leaves"], ["rice", "rice:pile"],
    ["peas", "peas:pile"], ["tortilla", "tortilla:whole"], ["pasta", "pasta:pile"],
    ["raisin", "raisin:pile"], ["bread", "bread:slice"], ["milk", "milk:jug"],
  ];
  return table.find(([word]) => key.includes(word))?.[1] ?? null;
}

/** A fully made dish with tidy, repeatable placements, for menu cards. */
export function completeDish(recipe: LittleRecipe): DishState {
  const plan = planFor(recipe);
  let dish = emptyDish();
  for (const step of plan) {
    switch (step.kind) {
      case "drop":
        for (const item of step.items)
          for (let i = 0; i < item.count; i++) dish = dropItem(dish, step, plan, item.asset);
        break;
      case "cut": for (let i = 0; i < step.cuts; i++) dish = doCut(dish, step, i); break;
      case "mash": for (let i = 0; i < step.spots; i++) dish = doMash(dish, step, i); break;
      case "scoop": for (let i = 0; i < step.count; i++) dish = doScoop(dish, step); break;
      case "pour": dish = doPour(dish, step); break;
      case "spread":
        dish = doPaint(dish, step, step.medium === "cheese" ? PAINT_VALID.filter((i) => i % 4 !== 1) : PAINT_VALID);
        break;
      case "stir": dish = doStir(dish, step, step.turns * 360); break;
      case "cook": dish = setHeat(dish, step, 1); break;
      case "flip": for (let i = 0; i < step.count; i++) dish = doFlip(dish, step, i); break;
      case "quiz": break;
    }
  }
  return dish;
}
