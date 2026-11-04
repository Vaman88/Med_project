export type ChefChallenge = {
  question: string;
  answers: [string, string, string];
  correct: number;
  explanation: string;
};

const challenges: Record<string, [ChefChallenge, ChefChallenge]> = {
  brownies: [
    {
      question: "Which fruit did you mash for the brownies?",
      answers: ["Banana", "Apple", "Strawberry"],
      correct: 0,
      explanation: "You mashed banana to help make the brownie batter sweet and soft.",
    },
    {
      question: "What can oats give our bodies?",
      answers: ["A cape", "Fiber", "Purple hair"],
      correct: 1,
      explanation: "Oats contain fiber, which helps digestion.",
    },
  ],
  pizza: [
    {
      question: "Which food did you chop for your pizza?",
      answers: ["Pita", "Bell pepper", "Cheese"],
      correct: 1,
      explanation: "You chopped bell pepper into small pieces.",
    },
    {
      question: "What should a grown-up handle in a real kitchen?",
      answers: ["The hot oven", "The napkin", "The plate"],
      correct: 0,
      explanation:
        "A grown-up should handle a hot oven and help with sharp tools.",
    },
  ],
  pancakes: [
    {
      question: "Which fruit did you mash?",
      answers: ["Apple", "Banana", "Strawberry"],
      correct: 1,
      explanation: "You mashed banana for the batter.",
    },
    {
      question: "Which food in this recipe is a whole grain?",
      answers: ["Oats", "Egg", "Yogurt"],
      correct: 0,
      explanation: "Oats are a whole grain and contain fiber.",
    },
  ],
  parfait: [
    {
      question: "Which fruit did you slice for your yogurt glass?",
      answers: ["Banana", "Apple", "Orange"],
      correct: 0,
      explanation: "You sliced a banana. Banana and strawberries are both fruits.",
    },
    {
      question: "Where should leftover yogurt go?",
      answers: ["In the fridge", "On the counter", "In a toy box"],
      correct: 0,
      explanation: "A grown-up can put leftover yogurt in the fridge.",
    },
  ],
  "veggie-dippers": [
    {
      question: "Which vegetable did you slice for your dippers?",
      answers: ["Carrots", "Potato", "Broccoli"],
      correct: 0,
      explanation: "You sliced carrots to dip into the hummus.",
    },
    {
      question: "Who helps cut real vegetables?",
      answers: ["A grown-up", "A toy", "Nobody"],
      correct: 0,
      explanation: "A grown-up helps with real cutting.",
    },
  ],
  "bean-salad": [
    {
      question: "Which vegetable did you dice for your rainbow bowl?",
      answers: ["Tomato", "Carrot", "Cucumber"],
      correct: 0,
      explanation: "You diced a tomato for your bean and corn bowl.",
    },
    {
      question: "What kind of beans go in this no-cook bowl?",
      answers: ["Fully cooked beans", "Dry raw beans", "Toy beans"],
      correct: 0,
      explanation: "The real recipe uses fully cooked beans.",
    },
  ],
  "fruit-salad": [
    {
      question: "Which two fruits did you slice for your fruit salad?",
      answers: ["Kiwi and mango", "Banana and strawberry", "Apple and pear"],
      correct: 1,
      explanation: "You sliced a banana and a strawberry. Fruit in many colors makes a bright bowl.",
    },
    {
      question: "Which little fruit in your bowl is blue?",
      answers: ["Blueberries", "Bananas", "Oranges"],
      correct: 0,
      explanation: "Blueberries are small and blue, and they grow on bushes.",
    },
  ],
  "smoothie-bowl": [
    {
      question: "Which fruits did you slice for your smoothie bowl?",
      answers: ["Banana and strawberry", "Carrot and cucumber", "Tomato and pepper"],
      correct: 0,
      explanation: "You sliced a banana and a strawberry. The strawberries make the smoothie pink!",
    },
    {
      question: "What does blending do to the yogurt and berries?",
      answers: ["Makes them hot", "Mixes them smooth", "Turns them blue"],
      correct: 1,
      explanation: "A blender spins very fast and mixes everything into a smooth, creamy smoothie.",
    },
  ],
  "taco-bowl": [
    {
      question: "Which two veggies did you dice for your taco bowl?",
      answers: ["Banana and grapes", "Tomato and bell pepper", "Bread and cheese"],
      correct: 1,
      explanation: "You diced a red tomato and a bell pepper to add color and crunch.",
    },
    {
      question: "Which food in your bowl comes from a cob?",
      answers: ["Corn", "Beans", "Rice"],
      correct: 0,
      explanation: "Corn kernels grow in rows on a cob. Beans grow in pods, and rice grows on tall grass.",
    },
  ],
  "hummus-toast": [
    {
      question: "Which orange veggie did you cut into coins?",
      answers: ["Cucumber", "Carrot", "Tomato"],
      correct: 1,
      explanation: "Carrots are orange and crunchy. They grow under the ground!",
    },
    {
      question: "Hummus is made mostly from which food?",
      answers: ["Chickpeas", "Strawberries", "Rice"],
      correct: 0,
      explanation: "Hummus is made from mashed chickpeas, a kind of bean full of plant protein.",
    },
  ],
  "fruit-kabobs": [
    {
      question: "Which two fruits did you slice for your kabobs?",
      answers: ["Banana and strawberry", "Carrot and pepper", "Bread and cheese"],
      correct: 0,
      explanation: "You sliced a banana and a strawberry, then added grapes.",
    },
    {
      question: "What is a pattern?",
      answers: ["A loud sound", "Something that repeats", "A kind of plate"],
      correct: 1,
      explanation: "A pattern repeats, like strawberry, banana, grape, strawberry, banana, grape.",
    },
  ],
  "avocado-toast": [
    {
      question: "Which red food did you dice for your toast?",
      answers: ["Cucumber", "Banana", "Tomato"],
      correct: 2,
      explanation: "A tomato has seeds inside, which makes it a fruit.",
    },
    {
      question: "What color is the inside of an avocado?",
      answers: ["Green", "Purple", "Blue"],
      correct: 0,
      explanation: "An avocado is soft and green inside, with one big seed in the middle.",
    },
  ],
  quesadilla: [
    {
      question: "Which red food did you dice for your quesadilla?",
      answers: ["Tomato", "Banana", "Oats"],
      correct: 0,
      explanation: "You diced a tomato to go with the beans and cheese.",
    },
    {
      question: "What happens to cheese when it gets warm?",
      answers: ["It freezes solid", "It melts", "It disappears"],
      correct: 1,
      explanation: "Warm cheese melts and gets soft, stretchy and gooey.",
    },
  ],
  "veggie-wrap": [
    {
      question: "Which two vegetables did you slice for your wrap?",
      answers: ["Banana and egg", "Rice and peas", "Bell pepper and carrot"],
      correct: 2,
      explanation: "You sliced a bell pepper and a carrot. They add crunch and color.",
    },
    {
      question: "Hummus is made from chickpeas. What is a chickpea?",
      answers: ["A bean", "A fruit", "A kind of bread"],
      correct: 0,
      explanation: "Chickpeas belong to the bean family, and they have fiber and protein.",
    },
  ],
  "oatmeal-bowl": [
    {
      question: "Which two fruits did you slice for your oatmeal?",
      answers: ["Plum and pear", "Banana and strawberry", "Orange and lemon"],
      correct: 1,
      explanation: "You sliced a banana and a strawberry for the top of your bowl.",
    },
    {
      question: "Which food soaks up milk and gets soft and creamy when it cooks?",
      answers: ["Oats", "Banana", "Blueberries"],
      correct: 0,
      explanation: "Oats are a whole grain. They soak up milk and get creamy, and they have fiber.",
    },
  ],
  "banana-oat-cookies": [
    {
      question: "Which fruit did you mash to sweeten the cookies?",
      answers: ["Apple", "Banana", "Strawberry"],
      correct: 1,
      explanation: "You mashed a banana. Very ripe bananas are extra sweet.",
    },
    {
      question: "Why are bananas with brown spots extra sweet?",
      answers: ["They have more sugar as they ripen", "They are dirty", "They are frozen"],
      correct: 0,
      explanation: "As a banana ripens, starch turns into sugar, so it tastes sweeter.",
    },
  ],
  "tomato-pasta": [
    {
      question: "Which red food did you dice for your pasta?",
      answers: ["Cucumber", "Tomato", "Banana"],
      correct: 1,
      explanation: "You diced a tomato to add to the sauce.",
    },
    {
      question: "What does hot water do to dry pasta?",
      answers: ["It makes it soft", "It turns it to ice", "It makes it vanish"],
      correct: 0,
      explanation: "Hot water soaks into dry pasta and makes it soft. A grown-up handles the boiling pot.",
    },
  ],
  "egg-muffins": [
    {
      question: "Which food did you chop for your egg muffins?",
      answers: ["Banana", "Oats", "Bell pepper"],
      correct: 2,
      explanation: "You chopped a bell pepper into small pieces.",
    },
    {
      question: "What happens to a runny egg when it gets hot?",
      answers: ["It turns blue", "It sets firm", "It floats away"],
      correct: 1,
      explanation: "Heat makes egg turn from runny to firm. That is why the muffins hold their shape.",
    },
  ],
  "veggie-fried-rice": [
    {
      question: "Which two vegetables did you dice for the fried rice?",
      answers: ["Carrot and bell pepper", "Banana and grapes", "Spinach and tomato"],
      correct: 0,
      explanation: "You diced a carrot and a bell pepper. Small pieces cook quickly.",
    },
    {
      question: "Where should leftover cooked rice go?",
      answers: ["On the counter all day", "In a backpack", "In the fridge soon"],
      correct: 2,
      explanation: "Cooked rice goes in the fridge within an hour to keep it fresh and safe.",
    },
  ],
};

export function recipeChallenges(
  recipeId: string,
  age: number,
): [ChefChallenge, ChefChallenge] {
  const pair = challenges[recipeId] ?? challenges.brownies;
  if (age < 8) return pair;
  return [
    pair[0],
    {
      ...pair[1],
      question: `${pair[1].question} Think about what each ingredient does.`,
    },
  ];
}
