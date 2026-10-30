import type { Equipment, FoodState, Ingredient, MealType, Recipe, Unit } from './domain';

/**
 * Large static catalog of foods and meals. It is the single source of truth for
 * the food-name search API and for the extra planner ingredients and recipes.
 * Allergen, diet and gluten information is derived from the compact flag codes
 * below, so a meal can never disagree with the foods inside it.
 *
 * Flag codes (one letter each):
 *   allergens  P peanut, T tree nut, M milk, E egg, W wheat, S soy, F fish, H shellfish, Z sesame
 *   gluten     g contains gluten from barley/rye/malt (wheat is W)
 *   animal     b beef, k pork, c poultry, o other meat, a animal source unknown, h honey/other animal product
 *
 * Typical commercial formulations were used. Always check the product label.
 */

export type CatalogUnit = 'g' | 'kg' | 'oz' | 'lb' | 'each';
export type CatalogFoodState = 'dry' | 'ready-to-eat' | 'raw' | 'cooked';
export type CatalogStorage = 'pantry' | 'fridge' | 'freezer';

export interface CatalogFood {
  id: string;
  label: string;
  category: string;
  /** Planner ingredient id. Present when meals and the planner can use this food. */
  ingredientId?: string;
  unit: CatalogUnit;
  foodState: CatalogFoodState;
  storage: CatalogStorage;
  aliases?: string[];
  /** Allergen ids in the planner vocabulary: peanut, tree-nut, milk, egg, wheat, soy, fish, shellfish, sesame. */
  allergens: string[];
  vegetarian: boolean;
  vegan: boolean;
}

export interface CatalogMealIngredient { foodId: string; label: string; quantity: number; unit: CatalogUnit; foodState: CatalogFoodState }
export interface CatalogMeal {
  id: string;
  title: string;
  mealTypes: MealType[];
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  equipment: Equipment[];
  ingredients: CatalogMealIngredient[];
  steps: string[];
  allergens: string[];
  vegetarian: boolean;
  vegan: boolean;
  containsGluten: boolean;
}

const allergenNames: Record<string, string> = { P: 'peanut', T: 'tree-nut', M: 'milk', E: 'egg', W: 'wheat', S: 'soy', F: 'fish', H: 'shellfish', Z: 'sesame' };
const unitCodes: Record<string, CatalogUnit> = { g: 'g', e: 'each' };
const stateCodes: Record<string, CatalogFoodState> = { d: 'dry', r: 'raw', c: 'cooked', x: 'ready-to-eat' };
const storageCodes: Record<string, CatalogStorage> = { p: 'pantry', f: 'fridge', z: 'freezer' };

// Block header: @Category|unit state storage  (u: g/e, state: d/r/c/x, storage: p/f/z)
// Row: id|Label|flags|aliases (comma separated)|optional override "u s st"
const FOOD_DATA = `
@Fruit|e r f
apple|Apples||apple,red apples,gala apples
pear|Pears||pear
orange|Oranges||orange,navel oranges
clementine|Clementines||clementine,mandarin,tangerines,cuties
lemon|Lemons||lemon
lime|Limes||lime
grapefruit|Grapefruit||pink grapefruit
peach|Peaches||peach
nectarine|Nectarines||nectarine
plum|Plums||plum
apricot|Apricots||apricot
kiwi|Kiwi fruit||kiwi,kiwifruit
mango|Mangoes||mango,mangos
pomegranate|Pomegranates||pomegranate
avocado|Avocados||avocado
plantain|Plantains||plantain
banana|Banana||bananas,banana|e r p
grapes|Grapes||grape,red grapes,green grapes|g r f
cherries|Cherries||cherry|g r f
strawberries|Strawberries||strawberry|g r f
blueberries|Blueberries||blueberry|g r f
raspberries|Raspberries||raspberry|g r f
blackberries|Blackberries||blackberry|g r f
watermelon|Watermelon||melon|g r f
cantaloupe|Cantaloupe||rockmelon|g r f
honeydew|Honeydew melon||honeydew|g r f
pineapple|Pineapple, fresh||fresh pineapple|g r f
@Dried and canned fruit|g x p
canned-peaches|Peaches, canned||canned peaches,peach slices
canned-pineapple|Pineapple, canned||canned pineapple,pineapple chunks
applesauce|Unsweetened applesauce||apple sauce
mandarin-oranges-canned|Mandarin oranges, canned||canned mandarins,canned oranges
fruit-cocktail|Fruit cocktail, canned||canned fruit
raisins|Raisins||raisin|g d p
dried-cranberries|Dried cranberries||craisins,cranberries dried|g d p
dried-apricots|Dried apricots|||g d p
dates|Dates, pitted||medjool dates,date|g d p
prunes|Prunes (dried plums)||prune,dried plums|g d p
@Vegetables|g r f
broccoli|Broccoli||broccoli crowns
cauliflower|Cauliflower||cauliflower head
spinach|Spinach, fresh||baby spinach,spinach leaves
kale|Kale||curly kale
romaine|Romaine lettuce||romaine,lettuce,romaine hearts
mixed-greens|Mixed salad greens||salad mix,spring mix,salad greens
arugula|Arugula||rocket
green-cabbage|Green cabbage||cabbage
red-cabbage|Red cabbage||purple cabbage
celery|Celery||celery stalks
cucumber|Cucumbers||cucumber|e r f
bell-pepper-red|Red bell peppers||red pepper,red capsicum,sweet pepper|e r f
bell-pepper-green|Green bell peppers||green pepper,green capsicum|e r f
jalapeno|Jalapeno peppers||jalapeno,jalapenos|e r f
fresh-tomato|Tomatoes, fresh||tomatoes,fresh tomatoes,roma tomatoes|e r f
cherry-tomatoes|Cherry tomatoes||grape tomatoes
zucchini|Zucchini||courgette,summer squash|e r f
yellow-squash|Yellow squash|||e r f
eggplant|Eggplant||aubergine|e r f
mushrooms|White mushrooms||mushroom,button mushrooms,cremini
green-onions|Green onions||scallions,spring onions
yellow-onion|Yellow onions||onion,onions,brown onion|e r p
red-onion|Red onions||purple onion|e r p
garlic|Garlic||garlic cloves,fresh garlic|g r p
ginger|Fresh ginger||ginger root
potatoes|Potatoes||potato,russet potatoes,white potatoes|g r p
sweet-potatoes|Sweet potatoes||sweet potato,yams|g r p
butternut-squash|Butternut squash|||g r p
green-beans|Green beans, fresh||string beans,fresh green beans
asparagus|Asparagus|||
brussels-sprouts|Brussels sprouts||sprouts
beets|Beets||beetroot
radishes|Radishes||radish
snap-peas|Sugar snap peas||snap peas,snow peas
corn-on-the-cob|Corn on the cob||fresh corn,ears of corn|e r f
cilantro|Cilantro||coriander leaves,fresh cilantro
parsley|Parsley, fresh||fresh parsley
basil-fresh|Basil, fresh||fresh basil
mint|Mint, fresh||fresh mint
bok-choy|Bok choy||pak choi
carrot|Carrots||carrots,baby carrots|g r f
@Frozen produce|g r z
frozen-peas|Frozen peas||peas
frozen-corn|Frozen corn||frozen sweet corn
frozen-broccoli|Frozen broccoli florets||frozen broccoli
frozen-spinach|Frozen spinach|||
frozen-mixed-vegetables|Frozen mixed vegetables||mixed veg,peas and carrots
frozen-green-beans|Frozen green beans|||
frozen-stir-fry-vegetables|Frozen stir-fry vegetable blend||stir fry vegetables,stir-fry veg
frozen-cauliflower-rice|Frozen cauliflower rice|||
frozen-edamame|Frozen shelled edamame|S|edamame
frozen-hash-browns|Frozen hash browns||hashbrowns,shredded potatoes
frozen-fries|Frozen french fries||french fries,fries,potato wedges
frozen-strawberries|Frozen strawberries|||
frozen-blueberries|Frozen blueberries|||
frozen-mango|Frozen mango chunks||frozen mango
frozen-mixed-berries|Frozen mixed berries||berry blend
@Canned and jarred vegetables|g x p
tomato|Canned diced tomatoes||canned tomatoes,diced tomatoes
corn|Canned corn, drained||canned corn,corn,sweet corn
tomato-sauce|Tomato sauce, canned||canned tomato sauce
tomato-paste|Tomato paste|||
crushed-tomatoes|Crushed tomatoes, canned||canned crushed tomatoes
green-beans-canned|Canned green beans|||
canned-peas|Canned peas|||
canned-carrots|Canned carrots|||
canned-mushrooms|Canned mushrooms|||
pumpkin-puree|Pumpkin puree, canned||canned pumpkin
roasted-red-peppers|Roasted red peppers, jarred||jarred peppers
black-olives|Black olives, canned||olives,sliced olives
artichoke-hearts|Artichoke hearts, canned||artichokes
pickles|Dill pickles||pickle,gherkins
sauerkraut|Sauerkraut|||
@Beans, lentils and soy|g x p
beans|Canned beans, drained||canned beans,beans
black-beans|Black beans, canned and drained||canned black beans
pinto-beans|Pinto beans, canned and drained||canned pinto beans
kidney-beans|Kidney beans, canned and drained||canned kidney beans,red kidney beans
cannellini-beans|Cannellini beans, canned and drained||white beans,great northern beans
chickpeas|Chickpeas, canned and drained||garbanzo beans,canned chickpeas
refried-beans|Refried beans, vegetarian, canned||refried beans
baked-beans|Baked beans, vegetarian, canned||baked beans
canned-lentils|Lentils, canned and drained|||
lentils-green|Lentils, green or brown, dry||brown lentils,green lentils,lentils|g d p
red-lentils|Red lentils, dry||split red lentils|g d p
split-peas|Split peas, dry||green split peas|g d p
dry-black-beans|Black beans, dry|||g d p
dry-pinto-beans|Pinto beans, dry|||g d p
dry-chickpeas|Chickpeas, dry||dried chickpeas|g d p
hummus|Hummus|Z|houmous,chickpea dip|g x f
tofu-firm|Firm tofu|S|tofu,extra firm tofu|g x f
silken-tofu|Silken tofu|S||g x f
tempeh|Tempeh|S||g x f
@Rice, grains and pasta|g d p
rice|Ready-to-eat cooked rice||cooked rice pouch,rice,microwave rice,ready rice|g x p
white-rice|White rice, dry||long grain rice,dry rice
brown-rice|Brown rice, dry|||
basmati-rice|Basmati rice, dry|||
jasmine-rice|Jasmine rice, dry|||
quinoa|Quinoa, dry|||
couscous|Couscous|W|
barley|Pearl barley|g|
bulgur|Bulgur wheat|W||
farro|Farro|W||
cornmeal|Cornmeal|||polenta
grits|Corn grits|||hominy grits
oats|Rolled oats||oatmeal,oats,old fashioned oats,porridge oats
quick-oats|Quick oats|||instant oats
spaghetti|Spaghetti|W||pasta
penne|Penne|W||penne pasta
macaroni|Elbow macaroni|W||macaroni,pasta elbows
rotini|Rotini|W||fusilli,spiral pasta
whole-wheat-pasta|Whole wheat pasta|W||wholemeal pasta
orzo|Orzo|W||
lasagna-noodles|Lasagna noodles|W||lasagne sheets
egg-noodles|Egg noodles|WE||
ramen-noodles|Instant ramen noodle bricks|W||ramen
rice-noodles|Rice noodles|||vermicelli,pad thai noodles
soba-noodles|Soba noodles|W||buckwheat noodles
gluten-free-pasta|Gluten-free pasta|||gf pasta
@Bread and baked goods|e x p
bread|Whole wheat bread|W|wheat bread,whole wheat toast,sandwich bread
white-bread|White bread|W||sandwich bread,toast
rye-bread|Rye bread|Wg||
flour-tortillas|Flour tortillas|W||tortillas,wraps
whole-wheat-tortillas|Whole wheat tortillas|W||wheat wraps
corn-tortillas|Corn tortillas|||
pita|Pita bread|W||pita pockets,flatbread
naan|Naan|WM||
bagels|Bagels|W||bagel
english-muffins|English muffins|W||english muffin
hamburger-buns|Hamburger buns|W||burger buns
hot-dog-buns|Hot dog buns|W||
pizza-crust|Pizza crust, pre-baked|W||flatbread crust,pizza base
taco-shells|Taco shells|||hard taco shells
breadcrumbs|Breadcrumbs|W||bread crumbs|g d p
panko|Panko breadcrumbs|W|||g d p
saltines|Saltine crackers|W||saltine,soda crackers|g x p
whole-grain-crackers|Whole grain crackers|W||crackers|g x p
graham-crackers|Graham crackers|W||graham cracker|g x p
@Cereal and baking|g d p
corn-flakes|Corn flakes|g||cornflakes|g x p
bran-flakes|Bran flakes|W||bran cereal|g x p
shredded-wheat|Shredded wheat|W|||g x p
crisped-rice-cereal|Crisped rice cereal|g||rice cereal|g x p
pancake-mix|Pancake mix|W||pancake flour
flour-all-purpose|All-purpose flour|W||flour,plain flour
flour-whole-wheat|Whole wheat flour|W||wholemeal flour
cornstarch|Cornstarch|||corn flour,cornflour
baking-powder|Baking powder|||
baking-soda|Baking soda|||bicarbonate of soda
yeast|Active dry yeast|||
@Poultry|g r f
chicken-breast|Chicken breast, boneless skinless|c|chicken,chicken breasts
chicken-thighs|Chicken thighs, boneless skinless|c|chicken thigh
chicken-drumsticks|Chicken drumsticks|c|drumsticks
ground-chicken|Ground chicken|c|minced chicken
ground-turkey|Ground turkey|c|minced turkey
turkey-cutlets|Turkey breast cutlets|c|turkey breast
rotisserie-chicken|Rotisserie chicken, cooked|c|cooked chicken,roast chicken|g c f
chicken-sausage|Chicken sausage, fully cooked|c||g x f
turkey-deli|Sliced deli turkey|c|turkey slices,deli turkey|g x f
canned-chicken|Canned chicken breast|c|chicken in a can|g x p
@Beef, pork and other meat|g r f
ground-beef|Ground beef, 90% lean|b|beef mince,hamburger meat,minced beef
beef-sirloin|Beef sirloin steak|b|steak,sirloin
beef-stew-meat|Beef stew meat|b|stewing beef
chuck-roast|Beef chuck roast|b|pot roast
pork-chops|Pork chops|k|pork chop
pork-tenderloin|Pork tenderloin|k|
ground-pork|Ground pork|k|minced pork
bacon|Bacon|k|bacon strips|g r f
ham|Sliced deli ham|k|ham slices,deli ham|g x f
pork-sausage|Pork sausage links|k|sausage,italian sausage
hot-dogs|Beef hot dogs|b|franks,hot dog,frankfurters|g x f
ground-lamb|Ground lamb|o|minced lamb
lamb-steaks|Lamb leg steaks|o|lamb
@Fish and seafood|g r f
salmon-fillet|Salmon fillets|F|salmon
tilapia|Tilapia fillets|F|
cod-fillet|Cod fillets|F|cod
shrimp|Shrimp, raw peeled|H|prawns,raw shrimp
canned-tuna|Tuna, canned|F|tuna,canned tuna,tuna in water|g x p
canned-salmon|Salmon, canned|F|tinned salmon|g x p
sardines|Sardines, canned|F|tinned sardines|g x p
canned-crab|Crab meat, canned|H|crab,crab meat|g x p
@Eggs|e r f
eggs|Eggs|E|egg,large eggs,dozen eggs
hard-boiled-eggs|Hard-boiled eggs|E|boiled eggs|e c f
@Dairy|g x f
milk|Milk|M|whole milk,2% milk,skim milk,low fat milk,cow's milk
buttermilk|Buttermilk|M||
heavy-cream|Heavy cream|M|whipping cream,cream
half-and-half|Half-and-half|M|
sour-cream|Sour cream|M|
butter|Butter|M|unsalted butter,salted butter
yogurt|Plain yogurt|M|yoghurt,natural yogurt
greek-yogurt|Plain Greek yogurt|M|greek yoghurt
vanilla-yogurt|Vanilla yogurt|M|flavored yogurt
cottage-cheese|Cottage cheese|M|
cream-cheese|Cream cheese|M|
cheddar|Cheddar cheese|M|cheddar,sharp cheddar,cheese
mozzarella|Mozzarella cheese|M|mozzarella,shredded mozzarella
parmesan|Parmesan cheese|M|parmesan,grated parmesan
feta|Feta cheese|M|feta
swiss-cheese|Swiss cheese|M|swiss
american-slices|American cheese slices|M|cheese slices|e x f
shredded-mexican-cheese|Shredded Mexican-blend cheese|M|taco cheese,shredded cheese
ricotta|Ricotta cheese|M|ricotta
string-cheese|String cheese sticks|M|cheese sticks,cheese strings|e x f
@Dairy alternatives|g x f
soy-drink|Soy drink|S|soy milk,soymilk|g x p
almond-drink|Almond drink|T|almond milk|g x p
oat-drink|Oat drink||oat milk|g x p
soy-yogurt|Soy yogurt|S|dairy free yogurt,plant yogurt
margarine|Margarine|S|vegan butter,spread,margarine spread
@Nuts and seeds|g d p
peanuts|Peanuts|P|peanut,roasted peanuts
peanut-butter|Peanut butter|P|pb,creamy peanut butter,crunchy peanut butter|g x p
almonds|Almonds|T|almond,raw almonds
walnuts|Walnuts|T|walnut
cashews|Cashews|T|cashew
pecans|Pecans|T|pecan
pistachios|Pistachios|T|pistachio
hazelnuts|Hazelnuts|T|filberts
pine-nuts|Pine nuts|T|pignoli
mixed-nuts|Mixed nuts|PT|nut mix
trail-mix|Trail mix|PT|gorp
sunflower-seeds|Sunflower seeds|||
pumpkin-seeds|Pumpkin seeds|||pepitas
chia-seeds|Chia seeds|||
ground-flaxseed|Ground flaxseed|||flax,flaxseed,linseed
hemp-hearts|Hemp hearts|||hemp seeds
sesame-seeds|Sesame seeds|Z||
tahini|Tahini|Z|sesame paste|g x p
almond-spread|Almond spread|T|almond butter|g x p
sunflower-spread|Sunflower seed spread|||sunflower seed butter,sunbutter|g x p
cashew-spread|Cashew spread|T|cashew butter|g x p
shredded-coconut|Unsweetened shredded coconut|||coconut flakes,desiccated coconut
@Oils, vinegar and sweeteners|g d p
olive-oil|Olive oil|||extra virgin olive oil|g x p
canola-oil|Canola oil|||vegetable oil,cooking oil|g x p
coconut-oil|Coconut oil||||g x p
sesame-oil|Sesame oil|Z|toasted sesame oil|g x p
peanut-oil|Peanut oil|P|groundnut oil|g x p
cooking-spray|Cooking spray|||nonstick spray|g x p
white-vinegar|White vinegar|||distilled vinegar|g x p
apple-cider-vinegar|Apple cider vinegar|||cider vinegar|g x p
balsamic-vinegar|Balsamic vinegar|||balsamic|g x p
rice-vinegar|Rice vinegar|||rice wine vinegar|g x p
sugar|Granulated sugar|||white sugar,sugar
brown-sugar|Brown sugar|||
powdered-sugar|Powdered sugar|||icing sugar,confectioners sugar
honey|Honey|h||g x p
maple-syrup|Maple syrup|||pancake syrup|g x p
cocoa-powder|Cocoa powder|||unsweetened cocoa
chocolate-chips|Chocolate chips|MS|semi-sweet chocolate chips,choc chips
vanilla-extract|Vanilla extract||||g x p
@Spices and seasonings|g d p
salt|Table salt|||salt,sea salt,kosher salt
black-pepper|Black pepper|||pepper,ground pepper
cinnamon|Cinnamon|||ground cinnamon
cumin|Ground cumin|||cumin
chili-powder|Chili powder|||chilli powder
paprika|Paprika|||sweet paprika
smoked-paprika|Smoked paprika|||
garlic-powder|Garlic powder|||
onion-powder|Onion powder|||
oregano|Dried oregano|||oregano
dried-basil|Dried basil|||
thyme|Dried thyme|||thyme
rosemary|Dried rosemary|||rosemary
italian-seasoning|Italian seasoning|||italian herbs
curry-powder|Curry powder|||
turmeric|Ground turmeric|||turmeric
ground-ginger|Ground ginger|||dried ginger
nutmeg|Ground nutmeg|||nutmeg
cayenne|Cayenne pepper|||cayenne
red-pepper-flakes|Red pepper flakes|||chili flakes,crushed red pepper
bay-leaves|Bay leaves|||bay leaf
garam-masala|Garam masala|||
ground-coriander|Ground coriander|||coriander
dried-parsley|Dried parsley|||
dried-dill|Dried dill|||dill weed
everything-bagel-seasoning|Everything bagel seasoning|Z||
@Sauces and condiments|g x p
ketchup|Ketchup|||tomato ketchup
yellow-mustard|Yellow mustard|||mustard
dijon-mustard|Dijon mustard|||dijon
mayonnaise|Mayonnaise|ES|mayo|g x f
soy-sauce|Soy sauce|SW|shoyu
teriyaki-sauce|Teriyaki sauce|SW||
hoisin-sauce|Hoisin sauce|SW||
hot-sauce|Hot sauce|||tabasco,pepper sauce
sriracha|Sriracha|||chili sauce
bbq-sauce|Barbecue sauce|||bbq sauce,barbeque sauce
salsa|Salsa|||tomato salsa,pico de gallo
enchilada-sauce|Enchilada sauce|||
marinara-sauce|Marinara pasta sauce|||pasta sauce,spaghetti sauce,tomato pasta sauce
pesto|Basil pesto|TM||g x f
alfredo-sauce|Alfredo sauce|M||
ranch-dressing|Ranch dressing|MES||g x f
strawberry-jam|Strawberry jam|||jam,jelly,fruit spread
guacamole|Guacamole|||guac|g x f
tzatziki|Tzatziki|M|cucumber yogurt dip|g x f
fish-sauce|Fish sauce|F||
red-curry-paste|Red curry paste|H|curry paste,thai curry paste
miso-paste|Miso paste|S|miso|g x f
vegetable-stock|Vegetable stock|||vegetable broth,veggie stock
chicken-stock|Chicken stock|c|chicken broth
beef-stock|Beef stock|b|beef broth
coconut-drink-canned|Lite coconut drink, canned||coconut milk,canned coconut milk
@Snacks|g x p
popcorn-kernels|Popcorn kernels||popcorn,unpopped popcorn|g d p
tortilla-chips|Tortilla chips|||corn chips,nachos
potato-chips|Potato chips|||crisps
pretzels|Pretzels|W||
rice-cakes|Rice cakes|||rice cake|e x p
animal-crackers|Animal crackers|W||
dark-chocolate|Dark chocolate bar|MS|chocolate,dark chocolate
pudding-cups|Pudding cups|M|pudding|e x f
applesauce-cups|Applesauce cups|||apple sauce cup|e x p
@Frozen meals and desserts|g r z
frozen-chicken-breast|Frozen chicken breast|c||
frozen-shrimp|Frozen shrimp, raw peeled|H|frozen prawns
frozen-fish-fillets|Frozen white fish fillets|F||frozen fish
fish-sticks|Fish sticks|FW||fish fingers
chicken-nuggets|Chicken nuggets|cW||nuggets
veggie-burger-patties|Veggie burger patties|WSEM||veggie burgers,meatless burger
frozen-meatballs|Frozen meatballs|bWEM||meatballs
frozen-cheese-pizza|Frozen cheese pizza|WM||pizza|e r z
frozen-waffles|Frozen waffles|WEM||waffles|e r z
frozen-bean-burritos|Frozen bean and cheese burritos|WM||burritos|e r z
ice-cream|Ice cream|M||vanilla ice cream|g x z
@Drinks|g x p
orange-juice|Orange juice, 100%|||oj,juice
apple-juice|Apple juice, 100%|||
`;

interface FoodFlags { allergens: string[]; vegetarian: boolean; vegan: boolean; gluten: boolean; tags: string[] }
const flagsById = new Map<string, FoodFlags>();

function parseFlags(flags: string): FoodFlags {
  const allergens: string[] = []; const tags: string[] = [];
  let wheat = false; let otherGluten = false; let meat = false; let animal = false; let honey = false; let milk = false; let egg = false; let fish = false;
  for (const code of flags) {
    if (allergenNames[code]) {
      allergens.push(allergenNames[code]);
      if (code === 'W') wheat = true;
      if (code === 'M') milk = true;
      if (code === 'E') egg = true;
      if (code === 'F') { fish = true; tags.push('fish'); }
      if (code === 'H') { fish = true; tags.push('shellfish'); }
    } else if (code === 'g') otherGluten = true;
    else if (code === 'b') { meat = true; tags.push('beef', 'meat'); }
    else if (code === 'k') { meat = true; tags.push('pork', 'meat'); }
    else if (code === 'c') { meat = true; tags.push('poultry', 'meat'); }
    else if (code === 'o') { meat = true; tags.push('meat'); }
    else if (code === 'a') { animal = true; tags.push('animal-source-unknown'); }
    else if (code === 'h') honey = true;
    else throw new Error(`Unknown food flag ${code}`);
  }
  if (milk) tags.push('dairy');
  if (wheat || otherGluten) tags.push('gluten');
  const vegetarian = !meat && !fish && !animal;
  return { allergens, vegetarian, vegan: vegetarian && !milk && !egg && !honey, gluten: wheat || otherGluten, tags: [...new Set(tags)] };
}

function parseFoods(): CatalogFood[] {
  const foods: CatalogFood[] = [];
  let category = ''; let defaults: string[] = [];
  for (const raw of FOOD_DATA.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('@')) { const [name, spec] = line.slice(1).split('|'); category = name; defaults = spec.trim().split(' '); continue; }
    const fields = line.split('|');
    const [id, label] = fields; const rest = fields.slice(2);
    // An optional trailing "u s st" override, then flags, then the first non-empty field is the alias list.
    const override = rest.length && /^[ge] [drcx] [pfz]$/.test(rest[rest.length - 1].trim()) ? rest.pop()!.trim() : '';
    const flags = rest[0] ?? ''; const aliases = rest.slice(1).find(field => field.trim()) ?? '';
    const [u, s, st] = override ? override.split(' ') : defaults;
    const parsed = parseFlags(flags.trim());
    flagsById.set(id, parsed);
    foods.push({
      id, label, category, unit: unitCodes[u], foodState: stateCodes[s], storage: storageCodes[st],
      ...(aliases.trim() ? { aliases: aliases.split(',').map(alias => alias.trim()).filter(Boolean) } : {}),
      allergens: parsed.allergens, vegetarian: parsed.vegetarian, vegan: parsed.vegan,
    });
  }
  return foods;
}

// Each meal: id | title | meal types (b l d s) | servings | prep | cook | equipment (m s o r a k) | food:quantity,... | steps separated by ||
const MEAL_DATA = `
overnight-berry-chia|Overnight berry chia oats|b|2|5|0|r|oats:80,milk:240,chia-seeds:20,blueberries:100,honey:15|Stir the oats, milk and chia seeds together in a clean container with a lid.||Cover and refrigerate for at least 6 hours or overnight.||Top with the blueberries and drizzle with honey before eating.
pb-banana-oatmeal|Peanut butter banana oatmeal|b|2|3|3|m|oats:80,milk:300,banana:1,peanut-butter:30,cinnamon:2|Stir the oats, milk and cinnamon in a large microwave-safe bowl and cover loosely.||Microwave 2 to 3 minutes, stirring once, until thick. Let stand 1 minute.||Slice in the banana, swirl in the peanut butter and serve warm.
apple-cinnamon-oatmeal|Apple cinnamon oatmeal|b|2|3|3|m|oats:80,applesauce:200,milk:240,cinnamon:2,raisins:30|Mix oats, applesauce, milk and cinnamon in a large microwave-safe bowl and cover loosely.||Microwave 2 to 3 minutes, stirring once, until thick.||Stir in the raisins and let stand 1 minute.
scrambled-eggs-toast|Scrambled eggs with spinach and toast|b|2|5|5|s|eggs:4,butter:10,milk:40,spinach:40,bread:4|Whisk the eggs with the milk. Wash and chop the spinach.||Melt the butter in a pan over medium heat, add the spinach until wilted, then pour in the eggs.||Stir gently until the eggs are firm throughout with no runny parts. Serve with toast.
microwave-egg-muffin|Microwave egg and cheese muffin|b|1|3|2|m|eggs:2,english-muffins:1,cheddar:20|Crack the eggs into a greased microwave-safe mug or bowl, break the yolks and stir. Cover loosely.||Microwave in 30-second bursts, stirring between each, until firm throughout.||Toast the muffin, then fill with the egg and cheddar and serve.
veggie-omelet|Veggie omelet|b,l|2|10|8|s|eggs:4,bell-pepper-red:1,mushrooms:80,cheddar:40,olive-oil:10|Wash and dice the pepper and mushrooms. Beat the eggs.||Cook the vegetables in the oil over medium heat for 4 minutes, then pour in the eggs.||Cook until firm throughout, add the cheese, fold and serve.
breakfast-burrito|Egg and bean breakfast burritos|b|2|10|6|s|eggs:4,flour-tortillas:2,black-beans:120,shredded-mexican-cheese:40,salsa:40|Scramble the eggs in a lightly oiled pan until firm throughout.||Warm the beans and tortillas.||Fill each tortilla with eggs, beans, cheese and salsa and roll up.
egg-muffin-cups|Spinach and cheese egg muffin cups|b,s|4|10|22|o|eggs:6,spinach:60,bell-pepper-red:1,cheddar:60,milk:60|Heat the oven to 350 F (175 C) and grease a 12-cup muffin tin.||Whisk the eggs and milk. Divide chopped spinach, diced pepper and cheese among 8 cups and pour in the egg mixture.||Bake 20 to 25 minutes until set and the centers reach 160 F (71 C).
avocado-toast-egg|Avocado toast with egg|b,l|2|8|6|s|bread:2,avocado:1,eggs:2,red-pepper-flakes:1|Toast the bread. Mash the avocado and spread it on the toast.||Fry the eggs until the whites and yolks are firm.||Top each toast with an egg and a pinch of red pepper flakes.
pancakes-blueberry|Blueberry pancakes|b|4|10|15|s|pancake-mix:200,milk:240,eggs:1,butter:15,blueberries:100,maple-syrup:60|Mix the pancake mix with the milk and egg until just combined, then fold in the blueberries.||Heat a lightly buttered pan over medium heat. Pour in about a quarter cup of batter per pancake.||Cook 2 to 3 minutes per side until golden and cooked through. Serve with syrup.
french-toast|Cinnamon French toast|b|4|8|10|s|bread:8,eggs:3,milk:120,cinnamon:2,butter:15,maple-syrup:60|Whisk the eggs, milk and cinnamon in a shallow dish.||Dip each bread slice on both sides and cook in a buttered pan over medium heat for 2 to 3 minutes per side until the egg is set.||Serve with maple syrup.
baked-apple-oatmeal|Baked apple oatmeal|b|4|10|35|o|oats:200,milk:360,eggs:2,apple:2,cinnamon:3,brown-sugar:40,baking-powder:5|Heat the oven to 350 F (175 C) and grease a baking dish. Dice the apples.||Mix all ingredients and pour into the dish.||Bake 30 to 35 minutes until set and golden. Let cool slightly before serving.
greek-yogurt-parfait|Greek yogurt berry parfait|b,s|2|5|0||greek-yogurt:340,strawberries:150,almonds:30,honey:10|Wash and slice the strawberries.||Layer the yogurt and strawberries in two glasses.||Top with chopped almonds and a drizzle of honey.
spinach-banana-smoothie|Spinach banana smoothie|b,s|2|5|0||banana:2,spinach:60,milk:300,frozen-mango:150|Peel the bananas and wash the spinach.||Blend everything until smooth, adding a little more milk if too thick.||Pour into glasses and drink right away.
cottage-cheese-peaches|Cottage cheese with peaches|b,s|2|3|0||cottage-cheese:300,canned-peaches:250|Drain the peaches.||Divide the cottage cheese between two bowls and top with the peaches.
pb-banana-roll|Peanut butter banana roll-ups|b,s|2|5|0||whole-wheat-tortillas:2,peanut-butter:50,banana:2|Spread the peanut butter over each tortilla.||Place a banana on the edge and roll up tightly.||Slice into pieces and serve.
fruit-salad|Fresh fruit salad|b,s|4|10|0||strawberries:200,blueberries:150,grapes:150,orange:2|Rinse all the fruit. Peel the oranges and cut into pieces; halve the grapes and slice the strawberries.||Toss everything together in a large bowl and refrigerate until serving.
pb-jelly-sandwich|Peanut butter and jelly sandwiches|l|2|5|0||white-bread:4,peanut-butter:60,strawberry-jam:40|Spread peanut butter on two slices and jam on the other two.||Press together and cut as desired.
apple-peanut-butter|Apple slices with peanut butter|s|2|5|0||apple:2,peanut-butter:40|Wash and core the apples and cut into slices.||Serve with the peanut butter for dipping.
cheese-apple-plate|Cheese, apple and cracker plate|s|2|5|0||cheddar:60,apple:2,saltines:30|Wash and slice the apples and slice the cheese.||Arrange with the crackers on a plate.
tuna-salad-sandwich|Tuna salad sandwiches|l|2|10|0||canned-tuna:150,mayonnaise:30,celery:40,bread:4|Drain the tuna and mix with the mayonnaise and finely chopped celery.||Spread on two slices of bread and top with the other slices. Refrigerate leftovers promptly.
chicken-salad-wrap|Chicken salad wraps|l|2|10|0||canned-chicken:200,greek-yogurt:60,celery:40,flour-tortillas:2,grapes:80|Drain and flake the chicken and mix with the yogurt, chopped celery and halved grapes.||Spoon into the tortillas, roll up and cut in half.
turkey-cheese-sandwich|Turkey and cheese sandwiches|l|2|5|0||bread:4,turkey-deli:100,swiss-cheese:40,romaine:40,yellow-mustard:10|Spread mustard on the bread.||Layer the turkey, cheese and washed romaine on two slices and close the sandwiches.
egg-salad-sandwich|Egg salad sandwiches|l|2|10|0||hard-boiled-eggs:4,mayonnaise:30,celery:30,yellow-mustard:5,bread:4|Peel and chop the eggs and mix with the mayonnaise, mustard and finely chopped celery.||Spread on two slices of bread and top with the other slices. Keep chilled.
ham-cheese-melt|Ham and cheese melts|l|2|5|5|s|bread:4,ham:100,swiss-cheese:60,yellow-mustard:10,butter:10|Spread mustard on the bread and fill with ham and cheese.||Butter the outsides and cook in a pan over medium heat 2 to 3 minutes per side until golden and the cheese melts.
tuna-melt-muffins|Tuna melt muffins|l|2|8|3|m|canned-tuna:150,mayonnaise:30,english-muffins:2,cheddar:60|Drain the tuna and mix with the mayonnaise.||Split and toast the muffins, top with the tuna and cheese.||Microwave on a plate 30 to 45 seconds until the cheese melts.
hummus-veggie-pita|Hummus and veggie pitas|l|2|10|0||pita:2,hummus:100,cucumber:1,fresh-tomato:1,spinach:30|Wash and slice the cucumber and tomato.||Spread hummus inside each pita and fill with the vegetables and spinach.
mezze-plate|Mezze snack plate|l,s|2|10|0||hummus:100,tzatziki:100,cucumber:1,carrot:150,pita:2,black-olives:40|Wash the cucumber and cut into sticks; cut the carrots into pieces suitable for everyone eating.||Arrange with the dips, pita and olives on a plate.
egg-fried-rice|Veggie egg fried rice|l,d|4|10|10|s|rice:500,eggs:3,frozen-mixed-vegetables:300,soy-sauce:30,canola-oil:15,green-onions:30,sesame-oil:5|Scramble the eggs in the oil until firm throughout and set aside.||Stir-fry the vegetables for 4 minutes until hot, then add the rice and soy sauce until steaming.||Stir in the eggs, green onions and sesame oil and serve.
bean-quesadillas|Bean and cheese quesadillas|l,d|2|5|8|m|flour-tortillas:4,black-beans:240,shredded-mexican-cheese:80,salsa:60|Spread beans and cheese over two tortillas and top with the remaining tortillas.||Microwave each on a plate for 45 to 60 seconds until the cheese melts.||Cut into wedges and serve with salsa.
bean-cheese-burritos|Bean and cheese burritos|l,d|2|5|5|m|flour-tortillas:4,refried-beans:300,shredded-mexican-cheese:60,salsa:60|Warm the refried beans in a covered microwave-safe bowl, stirring once.||Fill the tortillas with beans, cheese and salsa and roll up.||Microwave 20 to 30 seconds more if the cheese is not melted.
black-bean-rice-bowls|Black bean and rice bowls|l,d|2|5|5|m|rice:250,black-beans:240,corn:100,salsa:100,avocado:1,shredded-mexican-cheese:40|Heat the rice and the beans with the corn in covered microwave-safe bowls, stirring partway.||Divide into two bowls and top with salsa, sliced avocado and cheese.
nachos-black-bean|Black bean nachos|s,l|2|5|3|m|tortilla-chips:120,black-beans:240,shredded-mexican-cheese:80,salsa:100,avocado:1|Spread the chips on a microwave-safe plate and top with beans and cheese.||Microwave 1 to 2 minutes until the cheese melts.||Top with salsa and sliced avocado.
guacamole-chips|Guacamole and chips|s|2|10|0||tortilla-chips:100,avocado:2,lime:1,fresh-tomato:1,red-onion:1,cilantro:10|Mash the avocados with the lime juice.||Stir in finely diced tomato, onion and chopped cilantro.||Serve with the chips.
baked-potato-chili|Microwave chili baked potatoes|d,l|2|10|12|m|potatoes:400,kidney-beans:240,tomato:200,chili-powder:3,shredded-mexican-cheese:40|Scrub and pierce the potatoes and microwave 8 to 10 minutes until soft.||Heat the beans, tomatoes and chili powder in a covered bowl for 3 minutes.||Split the potatoes and top with the chili and cheese.
broccoli-cheese-potato|Broccoli cheddar baked potatoes|d,l|2|10|15|m|potatoes:600,frozen-broccoli:200,cheddar:80,sour-cream:60|Scrub and pierce the potatoes and microwave 10 to 12 minutes until soft.||Microwave the broccoli in a covered bowl for 3 to 4 minutes until hot.||Split the potatoes and top with broccoli, cheese and sour cream.
sweet-potato-black-bean|Black bean stuffed sweet potatoes|d|2|10|12|m|sweet-potatoes:450,black-beans:240,salsa:80,sour-cream:60|Scrub and pierce the sweet potatoes and microwave 8 to 10 minutes until soft.||Heat the beans in a covered bowl for 2 minutes.||Split the potatoes and top with beans, salsa and sour cream.
english-muffin-pizzas|English muffin pizzas|l,s|2|5|3|m|english-muffins:4,marinara-sauce:120,mozzarella:120|Split and toast the muffins.||Top each half with sauce and cheese and microwave on a plate 30 to 45 seconds until the cheese melts.
bean-corn-salad-cold|Three bean salad|l,d|4|10|0|r|kidney-beans:240,black-beans:240,chickpeas:240,corn:200,red-onion:1,olive-oil:20,apple-cider-vinegar:30|Drain and rinse the beans and corn.||Mix with the finely diced onion, oil and vinegar. Refrigerate at least 30 minutes before serving.
greek-chickpea-salad|Greek chickpea salad|l,d|2|10|0||chickpeas:240,cucumber:1,cherry-tomatoes:150,feta:60,black-olives:50,olive-oil:15,apple-cider-vinegar:15|Drain the chickpeas. Chop the cucumber and halve the tomatoes.||Toss everything together with the oil and vinegar.
rotisserie-chicken-salad|Rotisserie chicken salad|l,d|2|10|0||rotisserie-chicken:250,mixed-greens:120,cherry-tomatoes:150,cucumber:1,ranch-dressing:40|Remove the chicken from the bones and shred it.||Toss the greens, halved tomatoes and sliced cucumber and top with the chicken and dressing.
tuna-pasta-salad|Tuna pasta salad|l,d|4|10|12|s|rotini:250,canned-tuna:300,mayonnaise:60,celery:80,canned-peas:150|Cook the pasta in boiling water as directed, drain and cool under cold water.||Drain the tuna and peas. Mix everything with the mayonnaise and chopped celery.||Refrigerate until serving.
pasta-marinara|Spaghetti with marinara|d|4|5|15|s|spaghetti:340,marinara-sauce:400,parmesan:30,olive-oil:10|Cook the spaghetti in boiling water as directed and drain.||Warm the sauce in a pan until steaming hot.||Toss the pasta with the sauce and oil and top with parmesan.
veggie-penne|Garlic tomato zucchini penne|d|4|10|15|s|penne:340,zucchini:2,cherry-tomatoes:200,garlic:10,olive-oil:20,parmesan:30,dried-basil:2|Cook the penne in boiling water as directed and drain.||Saute the sliced zucchini and garlic in the oil for 5 minutes, add the tomatoes for 3 minutes.||Toss with the pasta, basil and parmesan.
mac-and-cheese-peas|Stovetop mac and cheese with peas|d|4|5|20|s|macaroni:340,milk:360,cheddar:200,butter:20,frozen-peas:150,flour-all-purpose:20|Cook the macaroni as directed and drain.||Melt the butter, whisk in the flour for 1 minute, then slowly whisk in the milk until slightly thick.||Stir in the cheese until melted, then the pasta and peas heated through.
spaghetti-meat-sauce|Spaghetti with meat sauce|d|4|10|25|s|spaghetti:340,ground-beef:450,marinara-sauce:500,yellow-onion:1,parmesan:30|Brown the beef and diced onion in a pan until no pink remains and it reaches 160 F (71 C). Drain the fat.||Stir in the sauce and simmer 10 minutes.||Cook the spaghetti as directed, drain and top with the sauce and parmesan.
baked-ziti|Baked ziti|d|6|15|35|s,o|penne:450,marinara-sauce:500,ricotta:250,mozzarella:200,parmesan:40|Heat the oven to 375 F (190 C). Cook the pasta 2 minutes less than directed and drain.||Mix with the sauce and ricotta and spread in a baking dish. Top with mozzarella and parmesan.||Cover and bake 25 minutes, then uncover for 10 minutes until bubbling.
shrimp-garlic-pasta|Garlic lemon shrimp pasta|d|2|10|15|s|shrimp:300,spaghetti:200,garlic:10,olive-oil:20,lemon:1,parsley:10,red-pepper-flakes:1|Cook the spaghetti as directed and drain.||Saute the garlic in the oil for 1 minute, add the shrimp and cook 3 to 4 minutes until pink and opaque.||Toss with the pasta, lemon juice, parsley and red pepper flakes.
peanut-noodles|Peanut noodles with carrots|d,l|2|10|10|s|rice-noodles:200,peanut-butter:60,soy-sauce:30,carrot:100,green-onions:20,rice-vinegar:15,honey:10|Cook the noodles as directed, drain and rinse.||Whisk the peanut butter, soy sauce, vinegar, honey and a little warm water until smooth.||Toss with the noodles, shredded carrot and green onions.
chicken-stir-fry|Chicken vegetable stir-fry|d|4|10|15|s|chicken-breast:500,frozen-stir-fry-vegetables:400,soy-sauce:45,white-rice:280,canola-oil:15,garlic:10,ginger:10|Cook the rice as directed.||Stir-fry the sliced chicken in the oil until it reaches 165 F (74 C) and no pink remains.||Add the vegetables, garlic, ginger and soy sauce and cook until hot. Serve over rice.
beef-broccoli-stir-fry|Beef and broccoli stir-fry|d|4|10|15|s|beef-sirloin:400,broccoli:400,soy-sauce:45,garlic:10,ginger:10,white-rice:280,canola-oil:15,cornstarch:10|Cook the rice as directed.||Stir-fry the sliced beef in the oil until browned and cooked through.||Add the broccoli, garlic, ginger and soy sauce mixed with the cornstarch and a little water until thick and the broccoli is tender.
teriyaki-chicken-bowls|Teriyaki chicken rice bowls|d|4|10|20|s|chicken-breast:500,teriyaki-sauce:80,broccoli:300,jasmine-rice:280,sesame-seeds:5|Cook the rice as directed.||Cook the diced chicken in a pan until it reaches 165 F (74 C), then stir in the sauce.||Steam the broccoli until tender. Serve over rice with sesame seeds.
chicken-fajitas|Chicken fajitas|d|4|15|15|s|chicken-breast:500,bell-pepper-red:2,bell-pepper-green:1,yellow-onion:1,flour-tortillas:8,chili-powder:6,cumin:3,canola-oil:20,lime:1,sour-cream:80|Slice the chicken, peppers and onion and toss the chicken with the spices.||Cook the chicken in the oil until it reaches 165 F (74 C), then cook the vegetables until tender.||Squeeze over the lime and serve in warm tortillas with sour cream.
chicken-burrito-bowls|Chicken burrito bowls|d|4|10|25|s|chicken-breast:500,white-rice:250,black-beans:480,corn:200,salsa:120,shredded-mexican-cheese:80,cumin:3|Cook the rice as directed.||Cook the diced chicken with the cumin until it reaches 165 F (74 C).||Warm the beans and corn. Fill bowls with rice, chicken, beans, corn, salsa and cheese.
chicken-quesadillas|Chicken quesadillas|d|2|10|10|s|flour-tortillas:4,rotisserie-chicken:200,shredded-mexican-cheese:100,bell-pepper-green:1,sour-cream:40|Shred the chicken and slice the pepper.||Fill two tortillas with chicken, pepper and cheese and top with the other tortillas.||Cook in a dry pan 2 to 3 minutes per side until crisp and the cheese melts. Serve with sour cream.
sheet-pan-chicken-veg|Sheet pan chicken, broccoli and sweet potatoes|d|4|15|35|o|chicken-thighs:600,broccoli:300,sweet-potatoes:400,olive-oil:30,paprika:3,garlic-powder:3|Heat the oven to 425 F (220 C). Cube the sweet potatoes and cut the broccoli into florets.||Toss everything with the oil and seasonings on a sheet pan.||Roast 30 to 35 minutes until the chicken reaches 165 F (74 C) and the potatoes are tender.
baked-drumsticks-corn|Baked chicken drumsticks with corn|d|4|10|45|o|chicken-drumsticks:900,corn-on-the-cob:4,olive-oil:20,paprika:4,garlic-powder:3|Heat the oven to 425 F (220 C). Rub the drumsticks with oil and seasonings on a sheet pan.||Bake 25 minutes, add the corn and bake 20 minutes more until the chicken reaches 165 F (74 C).
chicken-noodle-soup|Chicken noodle soup|d|4|15|25|s|chicken-breast:400,egg-noodles:150,carrot:200,celery:100,yellow-onion:1,chicken-stock:1000,thyme:2|Bring the stock, diced onion, carrots, celery and thyme to a simmer for 10 minutes.||Add the chicken pieces and noodles and simmer until the noodles are tender and the chicken reaches 165 F (74 C).
baked-salmon-rice-broccoli|Baked salmon with rice and broccoli|d|2|10|25|s,o|salmon-fillet:340,brown-rice:150,broccoli:250,lemon:1,olive-oil:15|Cook the rice as directed. Heat the oven to 400 F (200 C).||Place the salmon on a lined tray, drizzle with oil and lemon and bake 12 to 15 minutes until it reaches 145 F (63 C) and flakes.||Steam the broccoli until tender and serve together.
lemon-herb-cod|Lemon herb baked cod with potatoes|d|2|10|30|o|cod-fillet:340,lemon:1,olive-oil:15,potatoes:400,green-beans:250,dried-parsley:2|Heat the oven to 425 F (220 C). Cube the potatoes and roast with half the oil for 15 minutes.||Add the green beans and cod, drizzle with oil and lemon and sprinkle with parsley.||Bake 12 to 15 minutes more until the fish reaches 145 F (63 C) and flakes.
tilapia-tacos|Baked tilapia tacos|d|2|10|15|o|tilapia:340,corn-tortillas:6,red-cabbage:100,lime:1,greek-yogurt:60,chili-powder:3,canola-oil:10|Heat the oven to 400 F (200 C). Rub the fish with oil and chili powder and bake 10 to 12 minutes until it reaches 145 F (63 C).||Flake into warm tortillas and top with shredded cabbage, yogurt and lime.
salmon-patties|Canned salmon patties|l,d|4|10|10|s|canned-salmon:400,eggs:2,breadcrumbs:60,canola-oil:20,lemon:1|Drain and flake the salmon and mix with the eggs and breadcrumbs. Shape into patties.||Cook in the hot oil 4 to 5 minutes per side until golden and 160 F (71 C) in the center.||Serve with lemon.
beef-chili|Beef and bean chili|d|4|10|30|s|ground-beef:450,kidney-beans:240,pinto-beans:240,tomato:400,tomato-sauce:200,yellow-onion:1,chili-powder:10,cumin:5|Brown the beef and diced onion until no pink remains and it reaches 160 F (71 C). Drain the fat.||Add the beans, tomatoes, sauce and spices and simmer 20 minutes.
beef-tacos|Beef tacos|d|4|10|15|s|ground-beef:450,taco-shells:8,shredded-mexican-cheese:80,romaine:80,fresh-tomato:2,chili-powder:8,cumin:3|Brown the beef until no pink remains and it reaches 160 F (71 C). Drain and stir in the spices with a little water.||Fill the shells with beef, cheese, shredded lettuce and diced tomato.
turkey-burgers|Turkey burgers|d|4|10|15|s|ground-turkey:500,hamburger-buns:4,romaine:40,fresh-tomato:1,breadcrumbs:30,eggs:1|Mix the turkey, breadcrumbs and egg and shape into 4 patties.||Cook in a pan 6 to 7 minutes per side until the center reaches 165 F (74 C).||Serve in buns with lettuce and tomato.
pork-chops-green-beans|Pork chops with potatoes and green beans|d|4|10|30|s|pork-chops:600,green-beans:400,potatoes:600,olive-oil:20,garlic-powder:3|Cube the potatoes and boil 12 minutes until tender, then drain.||Season the chops and cook in the oil 5 to 6 minutes per side until they reach 145 F (63 C).||Steam the green beans and serve everything together.
sausage-pepper-skillet|Sausage and pepper skillet|d|4|10|20|s|pork-sausage:450,bell-pepper-red:2,bell-pepper-green:1,yellow-onion:1,olive-oil:10|Slice the peppers and onion.||Brown the sausage in the oil until it reaches 160 F (71 C).||Add the vegetables and cook 8 minutes until tender.
lentil-soup|Hearty lentil soup|d|4|15|35|s|lentils-green:200,carrot:200,celery:100,yellow-onion:1,tomato:400,vegetable-stock:800,cumin:3,garlic:10|Saute the diced onion, carrots, celery and garlic for 5 minutes.||Add the rinsed lentils, tomatoes, stock and cumin and simmer 25 to 30 minutes until tender.
split-pea-soup|Split pea soup|d|4|10|60|s|split-peas:300,carrot:200,celery:100,yellow-onion:1,vegetable-stock:1000,thyme:2,bay-leaves:1|Combine everything in a pot and bring to a boil.||Simmer 50 to 60 minutes, stirring now and then, until the peas are soft. Remove the bay leaf.
black-bean-soup|Black bean soup|d|4|10|25|s|black-beans:480,vegetable-stock:500,yellow-onion:1,carrot:150,cumin:4,garlic:10,salsa:120|Saute the diced onion, carrots and garlic for 5 minutes.||Add the beans, stock, cumin and salsa and simmer 15 minutes. Mash some beans for a thicker soup.
kale-white-bean-soup|Kale and white bean soup|d|4|10|25|s|cannellini-beans:480,kale:100,carrot:150,yellow-onion:1,vegetable-stock:800,garlic:10,olive-oil:15,italian-seasoning:3|Saute the diced onion, carrots and garlic in the oil for 5 minutes.||Add the beans, stock and seasoning and simmer 10 minutes, then stir in the chopped kale for 5 minutes.
minestrone|Minestrone soup|d|6|15|30|s|kidney-beans:240,tomato:400,green-beans-canned:200,carrot:150,celery:100,zucchini:1,macaroni:100,vegetable-stock:1000,italian-seasoning:4,parmesan:30|Simmer the chopped carrots, celery and zucchini in the stock for 10 minutes.||Add the beans, tomatoes, green beans, pasta and seasoning and simmer until the pasta is tender. Top with parmesan.
tomato-soup-grilled-cheese|Tomato soup with grilled cheese|l,d|2|5|15|s|crushed-tomatoes:400,vegetable-stock:300,milk:120,bread:4,cheddar:80,butter:20|Heat the tomatoes and stock for 8 minutes, then stir in the milk and warm through.||Butter the bread outsides, fill with cheese and cook in a pan 2 to 3 minutes per side until golden and melted.
chickpea-curry|Chickpea and spinach curry|d|4|10|25|s|chickpeas:480,tomato:400,coconut-drink-canned:400,curry-powder:8,yellow-onion:1,spinach:100,garlic:10,basmati-rice:280|Cook the rice as directed.||Saute the diced onion and garlic for 5 minutes, add the curry powder for 1 minute.||Add the chickpeas, tomatoes and coconut drink and simmer 15 minutes, then stir in the spinach. Serve over rice.
coconut-lentil-dal|Coconut red lentil dal|d|4|10|30|s|red-lentils:250,coconut-drink-canned:400,tomato:200,curry-powder:8,yellow-onion:1,garlic:10,ginger:10,basmati-rice:280|Cook the rice as directed.||Saute the diced onion, garlic and ginger, then add the curry powder.||Add the rinsed lentils, tomatoes, coconut drink and 400 g water and simmer about 20 minutes until soft.
roasted-veg-quinoa-bowls|Roasted vegetable quinoa bowls|l,d|4|15|30|s,o|quinoa:180,zucchini:2,bell-pepper-red:2,cherry-tomatoes:200,olive-oil:25,feta:60,chickpeas:240|Heat the oven to 425 F (220 C). Roast the chopped vegetables and chickpeas with the oil for 25 minutes.||Cook the rinsed quinoa as directed.||Serve the quinoa topped with the vegetables and feta.
sweet-potato-chickpea-tray|Roasted sweet potato and chickpeas|d|4|10|35|o|sweet-potatoes:600,chickpeas:480,olive-oil:25,cumin:3,paprika:3,greek-yogurt:120|Heat the oven to 425 F (220 C). Cube the sweet potatoes.||Toss with the drained chickpeas, oil and spices and roast 30 to 35 minutes until tender.||Serve with the yogurt.
cheesy-polenta-beans|Cheesy polenta with black beans|d|4|5|25|s|cornmeal:150,vegetable-stock:800,black-beans:240,cheddar:80|Bring the stock to a boil and slowly whisk in the cornmeal.||Stir over low heat 15 to 20 minutes until thick.||Stir in the cheese and top with warmed beans.
veggie-pizza-flatbread|Veggie flatbread pizza|d|4|10|12|o|pizza-crust:1,marinara-sauce:120,mozzarella:150,mushrooms:80,bell-pepper-green:1,black-olives:40|Heat the oven to 425 F (220 C).||Spread the sauce on the crust and top with cheese and sliced vegetables.||Bake 10 to 12 minutes until the cheese is bubbling.
veggie-fajita-bowls|Veggie fajita bowls|d|4|10|15|s|bell-pepper-red:2,bell-pepper-green:1,yellow-onion:1,black-beans:480,white-rice:250,chili-powder:6,cumin:3,canola-oil:15,salsa:100|Cook the rice as directed.||Cook the sliced peppers and onion in the oil with the spices until tender, add the beans until hot.||Serve over rice with salsa.
popcorn-snack|Microwave bowl popcorn|s|2|2|4|m|popcorn-kernels:50,olive-oil:5|Put the kernels and oil in a large microwave-safe bowl with a vented lid.||Microwave in short bursts until popping slows to 2 seconds between pops. Use oven mitts, the bowl is hot.
banana-oat-bites|Banana oat bites|b,s|4|10|15|o|oats:150,banana:2,peanut-butter:60,cinnamon:2|Heat the oven to 350 F (175 C). Mash the bananas.||Mix with the oats, peanut butter and cinnamon and scoop onto a lined tray.||Bake 12 to 15 minutes until firm.
veggie-sticks-ranch|Veggie sticks with ranch|s|2|10|0||carrot:200,celery:80,cucumber:1,ranch-dressing:60|Wash and cut the vegetables into sticks suitable for everyone eating.||Serve with the dressing for dipping.
`;

export const catalogFoods: CatalogFood[] = parseFoods();

const foodById = new Map(catalogFoods.map(food => [food.id, food]));
const mealCodes: Record<string, MealType> = { b: 'breakfast', l: 'lunch', d: 'dinner', s: 'snack' };
const equipmentCodes: Record<string, Equipment> = { m: 'microwave', s: 'stovetop', o: 'oven', r: 'refrigerator', a: 'air-fryer', k: 'kettle' };

function parseMealLine(line: string): CatalogMeal {
  const parts = line.split('|');
  const [id, title, types, servings, prep, cook, equip, items] = parts;
  // After the 8th field the remainder is the steps text, with "||" separating steps.
  const stepsText = parts.slice(8).join('|');
  const steps = stepsText.split('||').map(step => step.trim()).filter(Boolean);
  const mealTypes = types.split(',').map(code => mealCodes[code.trim()]);
  const ingredients: CatalogMealIngredient[] = items.split(',').map(pair => {
    const [foodId, quantity] = pair.split(':');
    const food = foodById.get(foodId);
    if (!food) throw new Error(`Meal ${id} uses unknown food ${foodId}`);
    return { foodId, label: food.label, quantity: Number(quantity), unit: food.unit, foodState: food.foodState };
  });
  const foods = ingredients.map(item => foodById.get(item.foodId)!);
  return {
    id, title, mealTypes, servings: Number(servings), prepMinutes: Number(prep), cookMinutes: Number(cook),
    equipment: equip.trim() ? equip.split(',').map(code => equipmentCodes[code.trim()]) : [],
    ingredients, steps,
    allergens: [...new Set(foods.flatMap(food => food.allergens))],
    vegetarian: foods.every(food => food.vegetarian), vegan: foods.every(food => food.vegan),
    containsGluten: foods.some(food => flagsById.get(food.id)!.gluten),
  };
}

export const catalogMeals: CatalogMeal[] = MEAL_DATA.split('\n').filter(line => line.trim()).map(parseMealLine);

// Foods used by a meal become planner ingredients; the rest stay searchable catalog entries.
/** Ids of the original hand-written planner ingredients; their definitions stay in demo-data.ts. */
const ORIGINAL_INGREDIENT_IDS = new Set(['oats', 'banana', 'beans', 'rice', 'tomato', 'corn', 'bread', 'peanut-butter', 'yogurt', 'carrot', 'hummus']);
const usedFoodIds = new Set(catalogMeals.flatMap(meal => meal.ingredients.map(item => item.foodId)));
for (const food of catalogFoods) if (usedFoodIds.has(food.id) || ORIGINAL_INGREDIENT_IDS.has(food.id)) food.ingredientId = food.id;

/** Planner ingredients for catalog foods that meals use, excluding the original hand-written ones. */
export function catalogIngredients(): Ingredient[] {
  return catalogFoods.filter(food => food.ingredientId && !ORIGINAL_INGREDIENT_IDS.has(food.id)).map(food => {
    const flags = flagsById.get(food.id)!;
    return {
      id: food.id, name: food.label, baseUnit: (food.unit === 'each' ? 'each' : 'g') as Unit,
      allergenTags: [...food.allergens], allergenInformationKnown: true,
      vegetarian: food.vegetarian, vegan: food.vegan,
      foodTags: flags.tags,
      glutenStatus: flags.gluten ? 'contains' : 'unknown',
    } satisfies Ingredient;
  });
}

const catalogProvenance = 'Healthy Steps catalog meal. Original unreviewed prototype recipe; not professionally reviewed or nutrition-verified. Check product labels for allergens and follow safe food handling.';
/** Planner recipes for every catalog meal. */
export function catalogRecipes(): Recipe[] {
  return catalogMeals.map(meal => ({
    id: meal.id, title: meal.title, yieldServings: meal.servings, equipment: [...meal.equipment],
    prepMinutes: meal.prepMinutes, cookMinutes: meal.cookMinutes, mealTypes: [...meal.mealTypes],
    ingredients: meal.ingredients.map(item => ({ ingredientId: item.foodId, quantity: item.quantity, unit: item.unit as Unit, foodState: item.foodState as FoodState })),
    steps: [...meal.steps], reviewStatus: 'synthetic-demo' as const, provenance: catalogProvenance,
  }));
}

// ---------- Search ----------
const norm = (text: string) => text.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s'-]/gu, ' ').replace(/\s+/g, ' ').trim();
interface Indexed<T> { item: T; label: string; labelWords: string[]; aliases: string[] }
const index = <T extends { label?: string; title?: string; aliases?: string[] }>(items: T[]): Indexed<T>[] =>
  items.map(item => { const label = norm(item.label ?? item.title ?? ''); return { item, label, labelWords: label.split(' '), aliases: (item.aliases ?? []).map(norm) }; });
const foodIndex = index(catalogFoods);

function rank<T>(entry: Indexed<T>, q: string): number | null {
  if (entry.label.startsWith(q)) return 0;
  if (entry.labelWords.some(word => word.startsWith(q))) return 1;
  if (entry.label.includes(q)) return 2;
  if (entry.aliases.some(alias => alias.startsWith(q) || alias.split(' ').some(word => word.startsWith(q)))) return 3;
  if (entry.aliases.some(alias => alias.includes(q))) return 4;
  return null;
}
function clampLimit(limit: number, max: number): number { return Number.isFinite(limit) ? Math.min(max, Math.max(1, Math.floor(limit))) : 8; }
const MAX_QUERY = 80;

/** Case-insensitive food name search. Prefix matches first, then word-prefix, substring and aliases. Empty query returns []. */
export function searchFoods(query: string, limit = 8, category?: string): CatalogFood[] {
  const q = norm(String(query ?? '').slice(0, MAX_QUERY));
  if (!q) return [];
  const cap = clampLimit(limit, 100);
  const scored: { food: CatalogFood; score: number }[] = [];
  for (const entry of foodIndex) {
    if (category && entry.item.category !== category) continue;
    const score = rank(entry, q);
    if (score !== null) scored.push({ food: entry.item, score });
  }
  scored.sort((a, b) => a.score - b.score || a.food.label.length - b.food.label.length || a.food.label.localeCompare(b.food.label));
  return scored.slice(0, cap).map(row => row.food);
}

/** Foods in a category in catalog order, for browsing without a text query. */
export function foodsInCategory(category: string, limit = 25): CatalogFood[] {
  return catalogFoods.filter(food => food.category === category).slice(0, clampLimit(limit, 100));
}

export function listFoodCategories(): string[] { return [...new Set(catalogFoods.map(food => food.category))]; }

const mealIndex = index(catalogMeals.map(meal => ({ ...meal, label: meal.title, aliases: meal.ingredients.map(item => item.label) })));
/** Search meals by title or ingredient name. Empty query with a mealType lists meals of that type. */
export function searchMeals(query: string, limit = 8, mealType?: MealType): CatalogMeal[] {
  const q = norm(String(query ?? '').slice(0, MAX_QUERY));
  const cap = clampLimit(limit, 100);
  const pool = mealIndex.filter(entry => !mealType || entry.item.mealTypes.includes(mealType));
  if (!q) return mealType ? pool.slice(0, cap).map(entry => catalogMeals.find(meal => meal.id === entry.item.id)!) : [];
  const scored: { meal: CatalogMeal; score: number }[] = [];
  for (const entry of pool) {
    const score = rank(entry, q);
    if (score !== null) scored.push({ meal: catalogMeals.find(meal => meal.id === entry.item.id)!, score });
  }
  scored.sort((a, b) => a.score - b.score || a.meal.title.localeCompare(b.meal.title));
  return scored.slice(0, cap).map(row => row.meal);
}

const lookup = new Map<string, CatalogFood>();
for (const food of catalogFoods) for (const key of [food.id, food.label, ...(food.aliases ?? [])]) if (!lookup.has(norm(key))) lookup.set(norm(key), food);
/** Exact (case-insensitive) lookup by id, label or alias, with a simple plural fallback. */
export function findCatalogFood(text: string): CatalogFood | undefined {
  const key = norm(String(text ?? ''));
  if (!key) return undefined;
  return lookup.get(key) ?? (key.endsWith('s') ? lookup.get(key.slice(0, -1)) : undefined) ?? lookup.get(`${key}s`);
}
export function getCatalogFood(id: string): CatalogFood | undefined { return foodById.get(id); }
