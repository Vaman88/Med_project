import { z } from "zod";
import {
  guestProfile,
  guestKitchenSchema,
  resolveKitchenFood,
} from "./guest-kitchen";
import { newMember } from "./food-settings";

export const FAMILY_KEY = "healthy-steps-family-v1";
export const CHILD_PLANNER_KEY = "healthy-steps-child-planner-v1";
export const pantryFoods = [
  "Black beans",
  "Canned black beans",
  "Oats",
  "Banana",
  "Cocoa",
  "Egg",
  "Whole wheat pita",
  "Tomato",
  "Mozzarella",
  "Bell pepper",
  "Plain yogurt",
  "Strawberries",
  "Apple", "Apricot", "Avocado", "Blueberries", "Blackberries", "Cantaloupe",
  "Cherries", "Clementines", "Dates", "Grapefruit", "Grapes", "Kiwi",
  "Lemon", "Lime", "Mango", "Orange", "Peach", "Pear", "Pineapple",
  "Plum", "Raspberries", "Watermelon",
  "Asparagus", "Beets", "Broccoli", "Cabbage", "Carrots", "Cauliflower",
  "Celery", "Cucumber", "Eggplant", "Garlic", "Green beans", "Kale",
  "Lettuce", "Mushrooms", "Onion", "Peas", "Potato", "Pumpkin",
  "Spinach", "Sweet potato", "Zucchini", "Corn",
  "Chickpeas", "Kidney beans", "Lentils", "Pinto beans", "Tofu",
  "Brown rice", "White rice", "Quinoa", "Whole wheat bread", "Pasta",
  "Tortillas", "Cereal", "Granola", "Flour", "Whole wheat flour",
  "Milk", "Cheddar cheese", "Cottage cheese", "Greek yogurt", "Butter",
  "Chicken", "Turkey", "Ground beef", "Salmon", "Tuna", "Shrimp",
  "Peanut butter", "Almond butter", "Hummus", "Sunflower seeds",
  "Pumpkin seeds", "Almonds", "Walnuts", "Olive oil", "Canola oil",
  "Tomato sauce", "Salsa", "Canned diced tomatoes", "Canned corn",
  "Raisins", "Cinnamon", "Honey", "Soy sauce",
] as const;
export const allergyChoices = [
  "Milk",
  "Egg",
  "Wheat",
  "Peanut",
  "Tree nuts",
  "Soy",
  "Sesame",
  "Fish",
  "Shellfish",
  "Oats",
  "Banana",
  "Beans",
  "Cocoa",
  "Tomato",
  "Bell pepper",
  "Strawberries",
  "Apple",
  "Carrots",
  "Cucumber",
  "Corn",
  "Avocado",
  "Grapes",
  "Orange",
  "Blueberries",
  "Spinach",
  "Peas",
  "Rice",
] as const;
export const equipmentChoices = [
  "Oven",
  "Stove",
  "Microwave",
  "No-cook",
] as const;
export const dietaryChoices = [
  "Vegetarian",
  "Dairy-free",
  "Gluten-free",
] as const;
export const skinChoices = ["peach", "tan", "brown", "deep"] as const;
export const hairChoices = ["curly", "short", "long", "buns"] as const;
export const apronChoices = ["coral", "mint", "lavender", "yellow"] as const;
export const familySchema = z
  .object({
    version: z.literal(1),
    age: z.number().int().min(5).max(17),
    pantry: z
      .array(z.string().trim().min(1).max(80))
      .max(100)
      .refine((items) => new Set(items.map((item) => item.toLowerCase())).size === items.length),
    allergies: z
      .array(z.enum(allergyChoices))
      .max(allergyChoices.length)
      .refine((items) => new Set(items).size === items.length),
    otherAllergies: z.string().trim().max(200),
    allergyConfirmed: z.literal(true),
    parentConfirmed: z.literal(true),
    nickname: z.string().trim().min(1).max(20).optional(),
    avatar: z
      .object({
        skin: z.enum(skinChoices),
        hair: z.enum(hairChoices),
        apron: z.enum(apronChoices),
      })
      .optional(),
    weeklyBudget: z.number().int().min(0).max(1000).optional(),
    householdSize: z.number().int().min(1).max(12).optional(),
    equipment: z
      .array(z.enum(equipmentChoices))
      .max(equipmentChoices.length)
      .optional(),
    store: z.string().trim().max(80).optional(),
    favorites: z.array(z.string().trim().min(1).max(80)).max(100).optional(),
    dietary: z
      .array(z.enum(dietaryChoices))
      .max(dietaryChoices.length)
      .optional(),
    pinSalt: z.string().optional(),
    pinHash: z.string().optional(),
  })
  .strict();
export type Family = z.infer<typeof familySchema>;
export function childPlannerSnapshot(
  family: Family,
): z.infer<typeof guestKitchenSchema> {
  const ids: Record<string, string> = {
    Milk: "milk",
    Egg: "egg",
    "Tree nuts": "tree-nut",
    Peanut: "peanut",
    Wheat: "wheat",
    Soy: "soy",
    Sesame: "sesame",
    Fish: "fish",
    Shellfish: "shellfish",
  };
  const profile = guestProfile();
  profile.weeklyBudgetCents = (family.weeklyBudget ?? 25) * 100;
  profile.householdSize = family.householdSize ?? 4;
  profile.equipment = [
    "refrigerator",
    "freezer",
    ...new Set((family.equipment ?? ["Oven", "Stove", "Microwave"])
      .filter((item) => item !== "No-cook")
      .map((item) => item === "Stove" ? "stovetop" : item.toLowerCase())),
  ] as typeof profile.equipment;
  if (family.store) profile.preferredStoreName = family.store;
  if (family.dietary?.includes("Vegetarian")) profile.dietaryRestrictions = ["vegetarian"];
  profile.allergies = family.allergies.filter((a) => ids[a]).map((a) => ids[a]);
  profile.members = [
    {
      ...newMember("child", "My child"),
      ageGroup: family.age < 13 ? "child" : "teen",
      rules: [
        ...(family.dietary?.includes("Dairy-free") ? ["dairy_free" as const] : []),
        ...(family.dietary?.includes("Gluten-free") ? ["gluten_free" as const] : []),
      ],
      noKnownAllergies: !family.allergies.length && !family.otherAllergies,
      allergies: [
        ...family.allergies.filter((a) => !ids[a]),
        ...(family.otherAllergies ? [family.otherAllergies.slice(0, 80)] : []),
      ].map((rawText) => ({
        rawText,
        canonicalId: null,
        status: "needs_review",
      })),
    },
  ];
  return guestKitchenSchema.parse({
    version: 1,
    profile,
    foods: family.pantry.map((label, i) => ({
      id: `parent-${i}`,
      label,
      ingredientId: resolveKitchenFood(label),
      // The parent only ticked "I have this", so assume a household-sized amount.
      quantity: 500,
      unit: "g",
      foodState: label === "Oats" ? "dry" : "ready-to-eat",
      storage: "pantry",
    })),
  });
}
export type CookingAction = "slice" | "mix" | "top" | "cook" | "serve";
export interface LittleRecipe {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  minutes: number;
  ingredients: { food: string; amount: string }[];
  game?: "assembly";
  category?: "breakfast" | "lunch" | "sweet";
  icon?: string;
  prepIngredient?: string;
  /** The real-kitchen heat source a grown-up needs. Defaults: pancakes Stove, other cooked dishes Oven. */
  heat?: "Oven" | "Stove";
  /** How many people the real recipe feeds, e.g. "Makes 12 mini muffins". */
  servings?: string;
  allergens: string[];
  benefit: string;
  steps: {
    action: CookingAction;
    title: string;
    instruction: string;
    target: number;
  }[];
  adultSteps: string[];
}
export const littleRecipes: LittleRecipe[] = [
  {
    id: "brownies",
    category: "sweet",
    title: "Fudgy bean brownies",
    subtitle: "Chocolatey little squares",
    image: "/images/child/brownies.jpg",
    minutes: 25,
    benefit:
      "Beans, oats and egg bring protein and fiber. Banana adds sweetness.",
    ingredients: [
      { food: "Black beans", amount: "1 cup cooked, drained" },
      { food: "Oats", amount: "½ cup, finely ground" },
      { food: "Banana", amount: "2 ripe" },
      { food: "Cocoa", amount: "3 tbsp unsweetened" },
      { food: "Egg", amount: "1" },
    ],
    allergens: ["Egg", "Oats", "Banana", "Beans", "Cocoa"],
    steps: [
      {
        action: "slice",
        title: "Mash the bananas",
        instruction: "Tap each banana piece to squash it!",
        target: 4,
      },
      {
        action: "mix",
        title: "Mix the chocolate batter",
        instruction: "Tap the spoon to mix beans, oats, cocoa and egg.",
        target: 6,
      },
      {
        action: "cook",
        title: "Time for the oven",
        instruction:
          "Move the tray into the pretend oven. Then start the timer!",
        target: 1,
      },
      {
        action: "serve",
        title: "Serve your brownies",
        instruction: "Tap the plate to share your creation.",
        target: 1,
      },
    ],
    adultSteps: [
      "Blend all ingredients until smooth. Spread in a small parchment-lined baking dish.",
      "Adult: bake at 350°F for about 18–22 minutes until set and the egg mixture reaches 160°F. Cool before cutting. Texture is dense and soft.",
    ],
  },
  {
    id: "pizza",
    category: "lunch",
    title: "Rainbow mini pizzas",
    subtitle: "Your own colorful pizza party",
    image: "/images/child/pizza.jpg",
    minutes: 18,
    benefit:
      "Whole wheat pita, vegetables and mozzarella make a colorful meal.",
    ingredients: [
      { food: "Whole wheat pita", amount: "2 small" },
      { food: "Tomato", amount: "1, mashed" },
      { food: "Mozzarella", amount: "½ cup shredded" },
      { food: "Bell pepper", amount: "1, finely diced" },
    ],
    allergens: ["Wheat", "Milk", "Tomato", "Bell pepper"],
    steps: [
      {
        action: "slice",
        title: "Chop the peppers",
        instruction: "Tap each pepper to make little pieces.",
        target: 4,
      },
      {
        action: "top",
        title: "Build your pizza",
        instruction: "Tap the pizza to add tomato, cheese and peppers.",
        target: 3,
      },
      {
        action: "cook",
        title: "Bake your pizza",
        instruction:
          "Move the tray into the pretend oven. Then start the timer!",
        target: 1,
      },
      {
        action: "serve",
        title: "Pizza is ready!",
        instruction: "Tap the plate to serve your colorful pizza.",
        target: 1,
      },
    ],
    adultSteps: [
      "Spread mashed tomato on pita. Add shredded cheese and diced pepper.",
      "Adult: bake at 400°F for 8–10 minutes until cheese melts. Cool and cut into child-sized pieces.",
    ],
  },
  {
    id: "pancakes",
    category: "breakfast",
    title: "Banana oat pancakes",
    subtitle: "A sunny stack of goodness",
    image: "/images/child/pancakes.jpg",
    minutes: 15,
    benefit: "Oats add whole grains; egg and plain yogurt bring protein.",
    ingredients: [
      { food: "Banana", amount: "1 ripe" },
      { food: "Oats", amount: "½ cup finely ground" },
      { food: "Egg", amount: "1" },
      { food: "Plain yogurt", amount: "¼ cup" },
    ],
    allergens: ["Egg", "Milk", "Oats", "Banana"],
    steps: [
      {
        action: "slice",
        title: "Mash your banana",
        instruction: "Tap each banana piece to squash it.",
        target: 4,
      },
      {
        action: "mix",
        title: "Stir the pancake mix",
        instruction: "Tap the spoon to mix banana, oats, egg and yogurt.",
        target: 6,
      },
      {
        action: "cook",
        title: "Cook your pancakes",
        instruction:
          "Move your pan onto the pretend stove. Then start the timer!",
        target: 1,
      },
      {
        action: "serve",
        title: "Stack them up!",
        instruction: "Tap the plate to serve your pancake stack.",
        target: 1,
      },
    ],
    adultSteps: [
      "Mix mashed banana, ground oats, egg and yogurt. Rest for 5 minutes.",
      "Adult: spoon small pancakes into a nonstick pan over medium-low heat. Cook 2–3 minutes each side until set and the center reaches 160°F. Cool before serving.",
    ],
  },
  {
    id: "parfait",
    title: "Banana berry yogurt parfait",
    subtitle: "Build a bright breakfast cup",
    image: "/images/child/parfait.jpg",
    icon: "🍓",
    game: "assembly",
    prepIngredient: "Banana",
    category: "breakfast",
    minutes: 8,
    benefit: "Fruit and yogurt make a colorful breakfast cup.",
    ingredients: [
      { food: "Plain yogurt", amount: "1 cup" },
      { food: "Banana", amount: "1" },
      { food: "Strawberries", amount: "1 cup, washed" },
    ],
    allergens: ["Milk", "Banana", "Strawberries"],
    steps: [],
    adultSteps: [
      "Wash and hull the strawberries. Peel the banana. Slice both into coins about ¼ inch thick, or smaller for young children.",
      "Divide into 2 glasses: ¼ cup yogurt, a few banana slices, ¼ cup more yogurt, then the strawberries on top. Repeat if the glass is tall.",
      "No cooking needed. Serve promptly and refrigerate leftovers within 2 hours.",
    ],
  },
  {
    id: "veggie-dippers",
    title: "Rainbow veggie dippers",
    subtitle: "Crunchy colors with hummus",
    image: "/images/child/veggies.jpg",
    icon: "🥕",
    game: "assembly",
    prepIngredient: "Carrots",
    category: "lunch",
    minutes: 10,
    benefit: "Different vegetables bring different colors and textures.",
    ingredients: [
      { food: "Carrots", amount: "2" },
      { food: "Cucumber", amount: "1" },
      { food: "Bell pepper", amount: "1" },
      { food: "Hummus", amount: "1/2 cup" },
    ],
    allergens: ["Carrots", "Cucumber", "Bell pepper", "Sesame", "Beans"],
    steps: [],
    adultSteps: [
      "Wash the vegetables. Cut the carrots into coins or thin sticks, the cucumber into slices and the bell pepper into strips, sized for the child's age and chewing ability.",
      "Spoon ½ cup hummus into a small bowl, set it on a plate and arrange the vegetables around it. Check the hummus label for allergens.",
    ],
  },
  {
    id: "bean-salad",
    title: "Bean and corn rainbow bowls",
    subtitle: "Mix a colorful no-cook bowl",
    image: "/images/child/bean-bowl.jpg",
    icon: "🌽",
    game: "assembly",
    prepIngredient: "Tomato",
    category: "lunch",
    minutes: 10,
    benefit: "Beans bring fiber and the vegetables add color.",
    ingredients: [
      { food: "Canned black beans", amount: "1 cup, drained" },
      { food: "Canned corn", amount: "1 cup, drained" },
      { food: "Tomato", amount: "1, washed" },
    ],
    allergens: ["Beans", "Corn", "Tomato"],
    steps: [],
    adultSteps: [
      "Drain and rinse 1 cup canned black beans and 1 cup canned corn. Wash and dice 1 tomato.",
      "Stir everything together in a bowl, divide into servings and refrigerate leftovers within 2 hours. No cooking needed.",
    ],
  },
  {
    id: "fruit-salad",
    title: "Rainbow fruit salad",
    subtitle: "Toss a bowl of bright fruit",
    image: "/images/meals/fruit.jpg",
    icon: "🍇",
    game: "assembly",
    prepIngredient: "Banana",
    category: "breakfast",
    minutes: 10,
    servings: "Serves 4 small bowls",
    benefit: "Fruit in many colors brings vitamins, fiber and juicy crunch.",
    ingredients: [
      { food: "Banana", amount: "1 ripe, sliced" },
      { food: "Strawberries", amount: "1 cup, washed and hulled" },
      { food: "Grapes", amount: "1 cup, cut in half lengthwise" },
      { food: "Blueberries", amount: "½ cup, washed" },
      { food: "Orange", amount: "1, peeled and pulled into segments" },
    ],
    allergens: ["Banana", "Strawberries", "Grapes", "Blueberries", "Orange"],
    steps: [],
    adultSteps: [
      "Serves 4 small bowls. Wash all the fruit. Hull and halve the strawberries, peel the banana and slice it into coins about ¼ inch thick.",
      "Grown-up: cut every grape in half lengthwise (into quarters for children under 5). Whole grapes are a choking risk for young children.",
      "Gently toss all the fruit in a large bowl. Serve right away, or refrigerate for up to 2 hours. No cooking needed.",
    ],
  },
  {
    id: "avocado-toast",
    title: "Avocado tomato toast",
    subtitle: "Creamy green on crunchy toast",
    image: "/images/meals/avocado.jpg",
    icon: "🥑",
    heat: "Oven",
    category: "breakfast",
    minutes: 8,
    servings: "Makes 2 toasts",
    benefit: "Avocado is creamy, and whole wheat bread adds fiber.",
    ingredients: [
      { food: "Whole wheat bread", amount: "2 slices" },
      { food: "Avocado", amount: "½ ripe, mashed" },
      { food: "Tomato", amount: "½, finely diced" },
    ],
    allergens: ["Wheat", "Avocado", "Tomato"],
    steps: [],
    adultSteps: [
      "Makes 2 toasts. Grown-up: toast the bread in a toaster or toaster oven for about 2 to 3 minutes until golden. Toasters and toaster ovens get hot.",
      "Scoop the avocado into a bowl and mash it with a fork until creamy. Wash and finely dice the tomato (a grown-up handles the knife).",
      "Spread the mashed avocado on the cooled toast, add the tomato and serve. Check the bread label for allergens such as soy or milk.",
    ],
  },
  {
    id: "quesadilla",
    title: "Cheesy bean quesadilla",
    subtitle: "Melty, crispy and golden",
    image: "/images/kids-quesadilla.webp",
    icon: "🧀",
    heat: "Stove",
    category: "lunch",
    minutes: 15,
    servings: "Makes 1 quesadilla, serves 2",
    benefit: "Beans bring protein and fiber, and cheese brings calcium.",
    ingredients: [
      { food: "Tortillas", amount: "1 large (8-inch) flour tortilla" },
      { food: "Canned black beans", amount: "¼ cup, drained and rinsed" },
      { food: "Cheddar cheese", amount: "¼ cup shredded" },
      { food: "Tomato", amount: "½, finely diced" },
    ],
    allergens: ["Wheat", "Milk", "Beans", "Tomato"],
    steps: [],
    adultSteps: [
      "Makes 1 quesadilla (serves 2). Drain and rinse the beans. Dice the tomato (a grown-up handles the knife).",
      "Grown-up: heat a dry nonstick pan over medium heat. Lay the tortilla in the pan, sprinkle cheese over one half, then add the beans and tomato.",
      "Grown-up: cook about 2 to 3 minutes until the cheese starts to melt, fold the tortilla in half, flip it and cook another 2 minutes until golden. Let it cool for 2 minutes, then cut into wedges.",
    ],
  },
  {
    id: "veggie-wrap",
    title: "Crunchy veggie wraps",
    subtitle: "Roll up a rainbow",
    image: "/images/kids-veggie-wrap.webp",
    icon: "🌯",
    game: "assembly",
    prepIngredient: "Bell pepper",
    category: "lunch",
    minutes: 12,
    servings: "Makes 2 wraps",
    benefit: "Hummus and a rainbow of vegetables make a crunchy, filling wrap.",
    ingredients: [
      { food: "Tortillas", amount: "2 whole wheat tortillas (8-inch)" },
      { food: "Hummus", amount: "¼ cup" },
      { food: "Spinach", amount: "1 cup baby leaves" },
      { food: "Cucumber", amount: "½, in thin slices" },
      { food: "Carrots", amount: "1, in thin sticks or coins" },
      { food: "Bell pepper", amount: "½, in thin strips" },
    ],
    allergens: ["Wheat", "Sesame", "Beans", "Spinach", "Cucumber", "Carrots", "Bell pepper"],
    steps: [],
    adultSteps: [
      "Makes 2 wraps. Wash the vegetables. Grown-up: cut the carrot, cucumber and bell pepper into thin sticks, strips or coins sized for the child's age and chewing ability.",
      "Lay a tortilla flat and spread 2 tablespoons hummus over it, leaving a small edge. Check the hummus label for sesame and other allergens.",
      "Add a layer of spinach, then the vegetables. Fold in the sides, roll up tightly and cut in half. No cooking needed.",
    ],
  },
  {
    id: "oatmeal-bowl",
    title: "Berry banana oatmeal bowl",
    subtitle: "A warm, creamy morning bowl",
    image: "/images/meals/oats.jpg",
    icon: "🥣",
    heat: "Stove",
    category: "breakfast",
    minutes: 12,
    servings: "Serves 2",
    benefit: "Oats are a whole grain with fiber, and the fruit adds sweetness.",
    ingredients: [
      { food: "Oats", amount: "1 cup rolled oats" },
      { food: "Milk", amount: "2 cups" },
      { food: "Banana", amount: "1 ripe, sliced" },
      { food: "Strawberries", amount: "½ cup, sliced" },
      { food: "Blueberries", amount: "¼ cup" },
    ],
    allergens: ["Oats", "Milk", "Banana", "Strawberries", "Blueberries"],
    steps: [],
    adultSteps: [
      "Serves 2. Wash the berries. Slice the banana and strawberries into small pieces for little mouths.",
      "Grown-up: bring the milk to a gentle simmer in a small pot, stir in the oats and cook over medium-low heat for about 5 minutes, stirring often, until soft and creamy.",
      "Spoon into bowls and let the oatmeal cool for a few minutes before eating. Top with the banana, strawberries and blueberries. Water works in place of milk.",
    ],
  },
  {
    id: "banana-oat-cookies",
    title: "Banana oat cookies",
    subtitle: "Soft, chewy two-step cookies",
    image: "/images/kids-banana-oat-cookies.webp",
    icon: "🍪",
    heat: "Oven",
    category: "sweet",
    minutes: 25,
    servings: "Makes about 12 cookies",
    benefit: "Ripe banana sweetens these cookies, and oats add fiber.",
    ingredients: [
      { food: "Banana", amount: "2 very ripe" },
      { food: "Oats", amount: "1½ cups rolled oats" },
      { food: "Raisins", amount: "¼ cup" },
      { food: "Cinnamon", amount: "½ teaspoon" },
    ],
    allergens: ["Oats", "Banana"],
    steps: [],
    adultSteps: [
      "Makes about 12 cookies. Grown-up: heat the oven to 350°F and line a baking sheet with parchment paper.",
      "Mash the bananas in a bowl until smooth. Stir in the oats, raisins and cinnamon until it forms a sticky dough. Let it rest for 5 minutes.",
      "Drop 12 spoonfuls onto the sheet and flatten them slightly. Grown-up: bake for 12 to 15 minutes until golden at the edges, using oven mitts. Cool on the tray for 10 minutes before eating.",
    ],
  },
  {
    id: "tomato-pasta",
    title: "Cozy tomato pasta",
    subtitle: "Twirly noodles in red sauce",
    image: "/images/kids-tomato-pasta.webp",
    icon: "🍝",
    heat: "Stove",
    category: "lunch",
    minutes: 25,
    servings: "Serves 4",
    benefit: "Tomatoes and pasta make a warm dinner, with cheese on top.",
    ingredients: [
      { food: "Pasta", amount: "8 oz (about 3 cups) dry" },
      { food: "Tomato sauce", amount: "1½ cups, no sugar added" },
      { food: "Tomato", amount: "1 large, diced" },
      { food: "Mozzarella", amount: "½ cup shredded" },
    ],
    allergens: ["Wheat", "Tomato", "Milk"],
    steps: [],
    adultSteps: [
      "Serves 4. Dice the tomato (a grown-up handles the knife).",
      "Grown-up: boil a large pot of water, add the pasta and cook for 8 to 10 minutes, or as the package says. Carry the hot pot and drain it carefully, since steam can burn.",
      "Grown-up: warm the sauce and diced tomato in a pan over medium-low heat for 3 to 4 minutes, toss in the pasta and let it cool a little. Top with the cheese. Check the pasta label for allergens.",
    ],
  },
  {
    id: "egg-muffins",
    title: "Mini veggie egg muffins",
    subtitle: "Bite-sized eggs in a muffin tin",
    image: "/images/kids-egg-muffins.webp",
    icon: "🧁",
    heat: "Oven",
    category: "breakfast",
    minutes: 30,
    servings: "Makes 12 mini muffins",
    benefit: "Eggs bring protein, and the veggies add color.",
    ingredients: [
      { food: "Egg", amount: "6" },
      { food: "Spinach", amount: "1 cup, finely chopped" },
      { food: "Bell pepper", amount: "½ cup, finely diced" },
      { food: "Cheddar cheese", amount: "½ cup shredded" },
    ],
    allergens: ["Egg", "Milk", "Spinach", "Bell pepper"],
    steps: [],
    adultSteps: [
      "Makes 12 mini muffins. Grown-up: heat the oven to 350°F and grease a 12-cup mini muffin tin well (or use silicone cups).",
      "Crack the eggs into a bowl and whisk. Stir in the spinach, bell pepper and cheese. Wash hands and surfaces after touching raw egg.",
      "Pour the mixture into the cups, about ¾ full. Grown-up: bake for 15 to 18 minutes until set and the center reaches 160°F, using oven mitts. Cool 5 minutes, then loosen with a knife.",
    ],
  },
  {
    id: "fruit-kabobs",
    title: "Rainbow fruit kabobs",
    subtitle: "Thread a colorful pattern",
    image: "/images/kids-fruit-kabobs.webp",
    icon: "🍢",
    game: "assembly",
    prepIngredient: "Strawberries",
    category: "sweet",
    minutes: 12,
    servings: "Makes 4 kabobs",
    benefit: "Making a fruit pattern is fun, and each color brings something different.",
    ingredients: [
      { food: "Strawberries", amount: "4 large, hulled and halved" },
      { food: "Banana", amount: "1, in thick slices" },
      { food: "Grapes", amount: "1 cup, cut in half lengthwise" },
    ],
    allergens: ["Strawberries", "Banana", "Grapes"],
    steps: [],
    adultSteps: [
      "Makes 4 kabobs. Wash the fruit. Grown-up: cut the grapes in half lengthwise (into quarters for children under 5) and hull and halve the strawberries.",
      "Slice the banana into thick coins. Use blunt wooden skewers or sturdy straws with the sharp tip snipped off, and always supervise young children.",
      "Thread the fruit in a pattern, such as strawberry, banana, grape. Serve right away or refrigerate for up to 2 hours.",
    ],
  },
  {
    id: "veggie-fried-rice",
    title: "Veggie fried rice",
    subtitle: "Sizzling rice with egg and veggies",
    image: "/images/kids-veggie-fried-rice.webp",
    icon: "🍚",
    heat: "Stove",
    category: "lunch",
    minutes: 20,
    servings: "Serves 4",
    benefit: "Rice, egg and vegetables make a filling plate in one pan.",
    ingredients: [
      { food: "Brown rice", amount: "3 cups cooked and cooled" },
      { food: "Egg", amount: "2" },
      { food: "Carrots", amount: "1 medium, finely diced" },
      { food: "Bell pepper", amount: "½, finely diced" },
      { food: "Peas", amount: "½ cup, frozen or fresh" },
      { food: "Soy sauce", amount: "2 tablespoons, low sodium" },
    ],
    allergens: ["Egg", "Soy", "Wheat", "Rice", "Carrots", "Bell pepper", "Peas"],
    steps: [],
    adultSteps: [
      "Serves 4. Use rice that was cooked and cooled quickly, ideally the day before. Refrigerate cooked rice within 1 hour. Grown-up: dice the carrot and pepper.",
      "Grown-up: heat 1 tablespoon oil in a large pan over medium-high heat. Cook the carrot, pepper and peas for 3 to 4 minutes, then push them aside and scramble the beaten eggs until fully set.",
      "Grown-up: add the rice and soy sauce and stir-fry for 3 to 4 minutes until hot. Let it cool before serving. Most soy sauce contains wheat, so check the label or use tamari.",
    ],
  },
];
/** The heat source a real-kitchen version of this dish needs. */
const neededHeat = (recipe: LittleRecipe): "Oven" | "Stove" =>
  recipe.heat ?? (recipe.id === "pancakes" ? "Stove" : "Oven");
export function recipeChoices(family: Family) {
  if (family.otherAllergies.trim()) return [];
  return littleRecipes
    .filter(
      (recipe) =>
        !recipe.allergens.some((allergen) =>
          family.allergies.includes(allergen as Family["allergies"][number]),
        ) &&
        !(
          family.dietary?.includes("Dairy-free") &&
          recipe.allergens.includes("Milk")
        ) &&
        !(
          family.dietary?.includes("Gluten-free") &&
          recipe.allergens.some((item) => ["Wheat", "Oats"].includes(item))
        ),
    )
    .map((recipe) => ({
      recipe,
      missing: [
        ...recipe.ingredients
          .filter((item) => !family.pantry.includes(item.food))
          .map((item) => item.food),
        ...(recipe.game !== "assembly" && family.equipment &&
        !family.equipment.includes(neededHeat(recipe))
          ? [neededHeat(recipe) === "Stove" ? "a stove" : "an oven"]
          : []),
      ],
    }))
    .sort(
      (a, b) =>
        a.missing.length - b.missing.length ||
        b.recipe.ingredients.filter((item) =>
          family.favorites?.includes(item.food),
        ).length -
          a.recipe.ingredients.filter((item) =>
            family.favorites?.includes(item.food),
          ).length,
    );
}
