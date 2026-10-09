# Healthy Steps — Website Redesign & Implementation Plan

**Project:** Healthy Steps (`https://healthysteps123.netlify.app/`)  
**Primary mission:** Help families in rural and low-access communities make practical, affordable, nourishing meals using food they already have, with local support for obtaining additional groceries.  
**Primary users:** Parents/caregivers shopping and cooking for children; children can participate in age-appropriate cooking and food education, but health data and account decisions should be parent-led.  
**Implementation approach:** Improve the existing platform rather than rebuild unnecessarily. Preserve functioning features/data, simplify screens, and prioritize a usable end-to-end demo.

> **Audit status (Oct. 9, 2026):** The publicly accessible landing page was reviewed. It says “Good meals. A little less guesswork,” lists preferences → pantry → budget, offers **“Preview the planner without an account,”** and explicitly notes account service is not yet connected and preview data is temporary. The available website viewer could not activate the guest-preview button or inspect its internal planner. Therefore, feature suggestions below are **requirements / proposed changes**, not claims that a specific internal feature is missing. An implementation agent should inspect the existing guest route, components, state, mock data and API integrations before modifying them.

---

## 1. Product direction

### What problem are we solving?
Families in rural areas may face high grocery prices, limited transportation, fewer nearby grocery choices, time constraints, unreliable connectivity, and limited cooking equipment. Many generic meal planning apps assume a fully stocked kitchen or unlimited grocery access. Healthy Steps should begin with reality: **what is already in the family's kitchen and what can they afford this week?**

### Product promise
**“More meals from what you have. Less stress at the store.”**

Every major function must support at least one of these goals:
1. Use pantry food before it expires or goes to waste.
2. Suggest affordable additions that make practical family meals.
3. Honor allergies, dietary needs, food preferences, time, and equipment.
4. Show realistic shopping costs and clearly mark estimates.
5. Connect families to nearby free/reduced-cost food support.
6. Encourage a positive, stigma-free relationship with food.

**NOT the product:** A calorie-restriction app for children, weight-loss competition, body-scoring tool, eating-disorder treatment, or medical diagnosis service.

---

## 2. Simplified information architecture

**Top navigation (5 choices maximum):**

| Tab | Purpose | Primary action |
| --- | --- | --- |
| **My Kitchen** | The home screen, pantry inventory and family setup | **Add food** |
| **Meal Ideas** | Recipes filtered by ingredients, budget and practical constraints | **Find meals** |
| **My Week** | Weekly meal suggestions and editable grocery list | **Plan my week** |
| **Find Food Help** | Food pantries, SNAP/WIC information and affordable shopping support | **Find help near me** |
| **Food & Fun** | Friendly cooking videos, nutrition education and positive messaging | **Watch & learn** |

**Do not make BMI a primary child-facing tab.** If retained, place an optional **Growth & Family Needs** panel in parent/caregiver settings, with clear clinical context and no personalized dieting targets. Budget belongs on the main dashboard and in meal planning.

**Home layout:**
- Friendly greeting: “What's in your kitchen today?”
- Large primary CTA **Add foods I have**; secondary **Take a pantry photo**.
- Small budget summary (e.g., “$28 available this week”) with Edit button.
- Pantry chips (rice, beans, eggs, tomatoes).
- “You can make these 3 meals” cards.
- “Need more ingredients?” grocery-list CTA.
- Bottom helper link: “Need food nearby? Find community resources.”
- Never force account creation before trying the main workflow.

**First-run flow:**
`Start as guest → Add pantry food → Set weekly budget → (Optional) Family needs → See 3 useful meals → Save a meal / build grocery list → Find food support if needed`.

Allow skipping setup and using sample pantry data. Persist guest data locally with a visible “Clear my information” control; explain that clearing storage removes it. If using accounts later, make authentication optional and secure.

---

## 3. Visual design system: cozy, fresh, child-friendly without being childish

### Style
Aim for a warm community-kitchen atmosphere, not a hospital, fitness tracker, or overly bright children's game. Use generous whitespace, chunky but tasteful rounded cards, authentic food photos, friendly illustrations/icons, and short plain-English labels. Adults should feel respected, children should feel welcome.

| Token | Color | Role |
| --- | --- | --- |
| `--forest` | `#245B47` | Navigation, headings, primary actions |
| `--leaf` | `#A9D7A0` | Progress indicators, supporting illustrations |
| `--cream` | `#FFF9EE` | Page background |
| `--paper` | `#FFFFFF` | Cards and input fields |
| `--coral` | `#EF9073` | Accents and welcoming illustrations |
| `--sunshine` | `#F6D76B` | Highlight banners, food discovery moments |
| `--ink` | `#24352D` | High-contrast body text |
| `--muted` | `#59675F` | Supporting text |

**Typography:** Headings: Nunito (or another friendly rounded font), body: Atkinson Hyperlegible / Inter / system sans. Use 16–18px minimum body text, visible focus indicators, 44px+ touch targets, and sufficient WCAG AA contrast. Avoid light green text on cream.

**Components:** 16–20px card radius; consistent 8px spacing grid; large clickable food chips; icon + text navigation; simple progress bar “1 of 3” for optional onboarding; no unnecessary gradients, animated counters, or cluttered dashboards.

**Food cards show:** meal photo, name, cook time, pantry ingredients used, **estimated added cost**, cooking method, family-size servings, allergy caveat, and “View steps” CTA. Place essential facts before nutrient details.

**Microcopy examples:**
- Instead of “Your nutrition deficiencies”: **“Want to add more iron-rich foods?”**
- Instead of “Bad foods”: **“Foods that help us grow and feel good”**
- Instead of “Lose weight”: **“Build balanced meals for your family”**
- Instead of “You failed your goal”: **“Let's try another meal that fits your week.”**

**Responsive:** Mobile-first at ~360px; tablet and desktop adapt to 2–3 card columns. Low-bandwidth mode disables decorative images/video autoplay. Printable shopping lists and recipe pages.

---

## 4. Core feature: pantry inventory (P0 — highest priority)

### Input methods
1. **Add manually (must always work):** Search or type a food name and tap a suggestion. Accept free text if no database match. Select quantity and unit optionally: “2 cans black beans,” “1 bag rice,” “4 eggs.”
2. **Quick-add categories:** Grains, vegetables, fruit, protein foods, dairy/alternatives, canned/frozen, seasonings. Examples relevant to budget shopping.
3. **Photo input (optional enhancement):** Let user upload/take a pantry photo. Vision service suggests recognized items, each with a confidence indicator. **Never auto-add items without user review**; ingredients/amounts may be wrong.
4. **Edit/remove:** Every item can be renamed, deleted, or marked used; optionally set “use soon” dates.
5. **Sample pantry:** One-click test inventory for judges / guests.

### Pantry rules
- Keep both standardized ingredient ID and original user label.
- Track `quantity`, `unit`, `storageType`, `optionalBestByDate` where known.
- Do not treat a photo as proof of food safety, freshness, allergen status, or exact quantity.
- Save guest pantry state locally; only upload photos with informed consent; minimize image retention and allow deletion.
- Never assume spices/oil/milk are available. Ask about “common staples” once or label optional items.

**Acceptance test:** Add `rice + canned black beans + frozen corn + eggs`, reload (same browser), and still see the pantry. Remove eggs and confirm all recipe matching updates immediately.

---

## 5. Core feature: real weekly budget & household setup (P0)

**Required:** weekly food budget; household size; cooking equipment available; optional ZIP code; optional dietary constraints. All other fields must be skippable.

**Additional settings:**
- Preferred stores (Walmart, Aldi, Dollar General, local grocer, no preference), store distance or transportation availability, ability to shop once per week, SNAP/EBT shopping preference if the user wants it.
- Meal prep time (`<15 min`, `15–30`, `30–60`), cooking skill, fridge/freezer availability.
- Appliances: microwave, oven, stovetop, air fryer, slow cooker, rice cooker, **no cooking equipment**.
- Pantry essentials (water, oil, salt, basic spices)—ask rather than infer.
- Optional food preferences: picky eaters, cultural food styles, foods family dislikes.
- Optional physical activity general category for age-appropriate meal variety **without prescribing calorie targets**.
- Optional health-related constraints entered by caregivers, e.g. diagnosed diabetes, celiac disease, lactose intolerance, clinician-advised needs. Never infer diagnoses.
- Family history: **optional private caregiver-only field**, collect only if demonstrably needed, preferably replace with “Has a healthcare professional recommended a dietary change?” Avoid storing detailed hereditary disease histories in the MVP.

### Dietary and allergy UX
Keep **allergies** separate from **preferences** and **medical needs**:
- Allergies: free-text entry + common chips (peanut, tree nut, milk, egg, wheat, soy, fish, shellfish, sesame). Flag recipes conservatively and remind users to read packaging for cross-contact.
- Preferences: vegetarian, vegan, pescatarian, halal, kosher, no beef, no pork, etc.
- Medical needs: celiac / gluten-free, dairy-free, clinician-guided diabetes-friendly patterns as applicable.
- “Foods to include more often”: protein sources, fiber-rich foods, iron-rich foods, calcium-rich foods, potassium-rich foods. Provide meal ideas, not laboratory interpretation or supplement prescriptions.

**Budget behavior:** Show three distinct numbers: **estimated grocery additions**, **budget remaining**, and **food already in pantry (no new cost)**. Do not claim a basket is affordable based only on recipe unit costs if whole packages need purchasing.

---

## 6. Core feature: pantry-first recipe matching (P0)

### Matching and ranking
For each candidate recipe:
1. Hard-exclude known allergens and incompatible restrictions; if unclear, mark “cannot verify ingredient safety” and withhold as a safe recommendation until checked.
2. Check available equipment, storage, prep time, family servings, and ingredients.
3. Calculate used-in-pantry ingredients and missing items.
4. Price the **quantity/package of missing food that must actually be bought** (not just a teaspoon's cost), where known.
5. Filter out meals above remaining budget or explicitly label over-budget alternatives.
6. Rank by fewest missing ingredients, additional grocery cost, use-soon ingredients, accessible cooking method, and variety across the week.

Suggested deterministic ranking (tune later): `0.35 * pantryCoverage + 0.30 * affordability + 0.15 * equipmentFit + 0.10 * prepTimeFit + 0.10 * variety` after safety hard filters. Treat unknown price separately; don't quietly count it as $0.

**Show 3 sections:**
- **Make it now** — no missing essentials.
- **Just 1–2 extra items** — affordable additions.
- **Plan for later** — appealing meals that need a bigger shop.

**Each recipe page:** Servings, time, equipment, ingredient substitutions, safety/allergen notes, instructions with 1 short step per card, optional narrated/read-aloud mode, source credit, approximate grocery additions, “Use from pantry,” “Add missing items to list,” and “Save to My Week.”

**Accessible cooking emphasis:** Prioritize microwave, oven, no-cook and one-pot recipes when compatible with available appliances, **not because one appliance is always cheaper than another**. Appliance electricity/gas cost depends on power, duration, local tariffs and kitchen conditions; don't promise utility-bill savings without evidence.

**Food safety:** For eggs/meat leftovers and reheating, use vetted food-safety guidance; don't generate untested microwave cook times as definite guarantees. Children should have adult supervision around hot equipment.

---

## 7. Weekly planner and grocery list (P1)

- Choose `3-day quick plan` or `7-day family plan` and number of dinners; optionally breakfasts/lunches/snacks.
- Avoid repetitive meals; intentionally reuse shared ingredients (e.g. beans in burrito bowls and soup).
- Manual swaps with a “Why this fits” explanation.
- Editable list combines duplicate ingredients and subtracts pantry quantities.
- Group list by produce, canned, frozen, grains, proteins, dairy/alternatives.
- Display quantity to buy, price source/time, estimated package cost, total, and remaining budget.
- Allow removing items, marking purchased, and print/export text or PDF later.
- If prices are unknown, mark **“price not verified”** and offer a conservative estimate or manually entered store price.
- Account for existing pantry items before proposing purchases.
- Clearly separate estimated SNAP-eligible food items from any unknown eligibility; do not promise benefits or that a particular retailer accepts EBT without verification.

### Example (illustrative only, NOT live store prices)
**Pantry:** rice, canned beans, frozen corn, eggs. **Budget:** $30 additional groceries. **Family:** 4. **Equipment:** microwave + oven.

System might offer: rice-and-bean bowls, baked egg-and-vegetable cups, corn-and-bean quesadillas (tortillas/cheese to buy). Display a transparent ingredient checklist and a **sample estimate**, not invented live pricing.

---

## 8. Food assistance and rural access (P1)

**Find Food Help** page: ZIP input and optional precise location permission (never mandatory); list view must work without a map.

Show categories:
1. **Free groceries today:** Local food banks/pantries with verified address, phone, opening hours and last-check date; note when schedules may change.
2. **SNAP / EBT:** Explain the program simply and link to the user's official state agency application; do not collect Social Security numbers or submit an application inside Healthy Steps.
3. **WIC / children’s meal programs:** Age-appropriate family and school/summer meal resource links.
4. **Budget grocery options:** Food co-ops, local grocers, farmers markets accepting relevant programs (verify), and low-cost stores based on ZIP and travel mode.
5. **Transportation-aware results:** Distance and directions, public transportation if available, and “call before traveling” prompts.

**Initial reliable links:**
- Feeding America food bank finder: https://www.feedingamerica.org/need-help-find-food
- Official USDA SNAP state directory: https://www.fna.usda.gov/snap/state-directory
- USA.gov SNAP application guidance: https://www.usa.gov/food-stamps

Use official/maintained sources where possible. **Do not invent pantry locations, hours or real-time inventory.** If no geolocated providers are available in the demo, provide these external links plus a clearly labeled sample dataset.

---

## 9. Food & Fun: videos + positive relationship with food (P1)

**Content categories:** “Cook with your family,” “Make a snack from pantry staples,” “Budget-friendly grocery tips,” “Try a new fruit or vegetable,” “Food is fuel, culture, and connection.” Include short clips (~30 sec–3 min), subtitles, captions, transcripts, and an off-site source link. Do not autoplay media on mobile or slow connections.

**USDA source supplied by project:** `https://www.fna.usda.gov/tn/cooks` (the page could not be independently verified in this review; check link accessibility and licensing before embedding). If it redirects or fails, choose other publicly available official USDA/MyPlate or SNAP nutrition-education recipes and credit the original source.

**Food-positive safeguards:**
- No “good kid / bad kid,” “cheat day,” food guilt, moral ranking of body sizes, before/after body photos, or public weight sharing.
- Explain that different foods serve different needs and that affordable/canned/frozen foods can fit balanced meals.
- Don't recommend fasting, skipping meals, appetite suppression, or restrictive diets for children.
- Include gentle caregiver guidance for repeated overeating / loss-of-control eating or distress: speak to a pediatrician or qualified mental health professional; **do not diagnose binge-eating disorder from a quiz**.
- Avoid unmoderated user-generated videos/comments in the MVP.

---

## 10. Optional BMI / growth information — caregiver only (P2)

The primary objective is **access to healthy meals**, not weight classification. Consider omitting a BMI calculator entirely in the first release. If included:
- Access through caregiver settings, with context stating it is a screening measure and not a diagnosis.
- For ages 2–19, BMI must be interpreted via **BMI-for-age percentiles that account for age and sex**, not adult BMI cutoffs. Recommend discussing growth questions with a pediatric healthcare professional.
- No calorie deficit calculations, target weight, daily weigh-in prompts, child BMI leaderboards, or automated individualized weight-loss prescriptions.
- Never change a child's recommended food intake based purely on a self-entered BMI.
- Prefer a link to the CDC tool rather than building a clinical-looking calculator without validation: https://www.cdc.gov/bmi/child-teen-calculator/

References: https://www.cdc.gov/bmi/child-teen-calculator/bmi-categories.html and https://www.cdc.gov/obesity/child-obesity-screening/index.html

---

## 11. AI assistant: constrained and genuinely useful (P1)

**Assistant identity:** “Meal Helper” — a friendly, short-answer cooking guide, **not** a doctor or therapist.

**Supported asks:** “What can I make with rice and beans?”, “Can I swap milk for oat milk?”, “Make this recipe microwave-friendly,” “How do I feed four people for under $25 in extra groceries?”, “What can I use instead of fresh spinach?”

**Guardrails:**
- Feed it structured pantry, verified recipe records, allergy rules, selected appliances and budget.
- Prefer retrieval from a vetted recipe database over inventing dishes/ingredients/prices.
- It cannot diagnose, recommend medicine, prescribe supplements, or create weight-loss diets for minors.
- Never override allergy filters based on generated text.
- If unsure of cost, nutrition, or ingredient safety, say so explicitly.
- Keep conversations ephemeral by default; do not share minors' personal/health details with third-party AI without appropriate privacy review and guardian consent where required.
- Provide three tap-to-ask prompts so the user does not have to type.

**Assistant output structure:** `Meal suggestion → What you have → What to buy → Approximate added cost + confidence → Easy steps → Important safety note (if applicable)`.

---

## 12. Suggested technical architecture and data models

**First inspect the current project**: frontend framework, routing, package manager, state management, existing types, current guest-preview data, local storage use, mock/API services, environment secrets, and deployment settings. Do not switch frameworks just for styling.

Recommended scalable separation:
- `data/recipes` — vetted recipes with source, equipment, ingredients, allergens and instructions.
- `services/recipeMatch` — deterministic hard filters and ranking.
- `services/pricing` — store/ZIP price estimates, cache dates, confidence labels.
- `services/foodAccess` — external verified directory links/providers with last-updated timestamps.
- `services/photoRecognition` — optional adapter, outputs unconfirmed pantry suggestions.
- `services/aiAssistant` — guarded server-side orchestration, not browser-exposed API keys.
- `state/guestSession` — validated browser-side pantry/preferences/budget.

**Minimum types:**
```ts
type PantryItem = {
  id: string;
  ingredientId?: string;
  label: string;
  quantity?: number;
  unit?: string;
  storage?: 'pantry' | 'fridge' | 'freezer';
  bestByDate?: string;
  confirmedByUser: boolean;
};

type FamilySettings = {
  householdSize: number;
  weeklyGroceryBudget: number;
  zipCode?: string;
  dietaryPreferences: string[];
  allergies: string[];
  medicalFoodConstraints: string[];
  equipment: string[];
  preferredStores: string[];
  cookTimeMinutes?: number;
};

type GroceryEstimate = {
  ingredientId: string;
  requiredQuantity: number;
  purchaseQuantity?: number;
  estimatedPackagePrice?: number;
  retailer?: string;
  observedAt?: string;
  priceStatus: 'verified' | 'estimated' | 'unknown';
};

type Recipe = {
  id: string;
  title: string;
  source: string;
  ingredients: Array<{ ingredientId: string; quantity: number; unit: string }>;
  knownAllergens: string[];
  equipment: string[];
  durationMinutes: number;
  servings: number;
  instructions: string[];
};
```

**Crucial modeling details:** standardized units and conversions; aliases (“garbanzo beans”/“chickpeas”); ingredient substitutions; missing unit handling; duplicate pantry items; ingredient-specific allergen/cross-contact uncertainty; scaling servings; prices for full package purchases; unknown-price states.

**Starter demo content:** 25–40 vetted inexpensive recipes spanning microwave, oven, no-cook, stovetop, vegetarian and other diet options. Each must have realistic substitutions and basic accessibility tags. Any nutrition facts must be sourced/calculated, not fabricated by an LLM.

---

## 13. Privacy, accessibility, trust and safety requirements

- **Caregiver-led use.** Avoid standalone child account creation or collection of under-13 children's information without legal review for COPPA and other applicable laws.
- **Data minimization.** Budget, ZIP and pantry generally suffice; detailed family history, height, weight, and health conditions should not be required to use the planner.
- **Clear consent.** Explain where photos and chat data go. Offer deletion controls. Do not use uploaded pantry images for public training without clear opt-in.
- **No exposed API keys.** Guard server-side keys, rate-limit uploads/chat, validate files, and sanitize free text.
- **Practical accessibility.** Keyboard navigation, readable form errors, screen-reader labels, large tap targets, captions/transcripts, non-color-only status, and color contrast checks.
- **Low connectivity.** Cache the recipe index and the user's locally saved pantry; show graceful offline / stale-price states.
- **No false precision.** Price, nutrition and location information should include estimates, sources, and freshness. Avoid promising local availability.
- **No medical advice.** A persistent low-profile disclaimer states meal ideas are not individualized medical care.

---

## 14. Implementation roadmap: do these in order

### Phase 0 — Inspect and preserve (before editing)
- [ ] Open existing code and map components/pages/routes.
- [ ] Run locally; enter **Preview the planner without an account**.
- [ ] Record every existing tab, form, output and failure (screenshots + checklist).
- [ ] Check current data sources, persistence behavior and demo sample content.
- [ ] Preserve already functioning features; create a branch/backup.
- [ ] Flag code changes that would require migrations, API access or credentials.

### Phase 1 — MVP functional flow (P0)
- [ ] Simplify landing page: single **Try Meal Planner** primary CTA, guest-first.
- [ ] Build or simplify **My Kitchen** as home screen.
- [ ] Implement manual pantry add/edit/remove and sample inventory.
- [ ] Implement weekly budget, family size and appliance selections.
- [ ] Add preferences + separate allergy entry and exclusions.
- [ ] Seed a credible recipe dataset and deterministic matching.
- [ ] Build “Make it now” and “1–2 extra items” recipe displays.
- [ ] Show pantry items used, missing ingredients and transparent cost status.
- [ ] Make full flow work without account / API key.

### Phase 2 — Polished family experience (P1)
- [ ] Apply design tokens, fonts, illustrations/icons and responsive layout.
- [ ] Add step-based recipe details and substitutions.
- [ ] Add 3-/7-day editable meal planner and deduplicated grocery list.
- [ ] Add helpful food bank/SNAP/WIC links and ZIP-based searching where possible.
- [ ] Curate child-friendly food-positive videos with captions.
- [ ] Add budget-aware AI Meal Helper using safe recipe retrieval.
- [ ] Add local guest persistence, clear-data control and printing.

### Phase 3 — Optional enhancements (P2)
- [ ] Pantry photo recognition with editable confirmation.
- [ ] Verified store-specific pricing and price freshness metadata.
- [ ] Location-aware local partner/food pantry finder.
- [ ] Offline enhancements and multilingual support (e.g., Spanish).
- [ ] Optional caregiver-only growth education (not a child's meal prescription).
- [ ] Real accounts with consent/privacy review, only if needed.

---

## 15. UI-specific implementation instructions for the coding agent

1. **Do not wipe out the current app or replace all components blindly.** Inspect and refactor incrementally.
2. Keep branding **Healthy Steps**, with tagline **“More meals from what you have.”**
3. The landing hero should show a compelling realistic kitchen/pantry visual, 1 sentence of copy, **Try it free** CTA, and subtle **No account needed** label; move unconnected login into a small secondary action or hide until working.
4. First on guest entrance, show pantry inventory, not six long medical forms.
5. Put the weekly budget next to pantry input, not buried in a settings page.
6. Show immediate value: three meal suggestions with equipment, time, pantry coverage and added-cost status.
7. Never render bare empty screens: empty pantry prompt, no-match explanation, unknown-price caution, offline mode and image-recognition failure are all designed states.
8. Use consistent friendly food icons and real labeled buttons. Prefer text clarity over decorative animations.
9. Keep all advanced caregiver preferences in collapsible settings so the first experience remains simple.
10. Maintain explicit constraints: no calorie-counting or shaming interface for children, no invented “live” prices, no unverified medical claims.
11. Use semantic HTML, accessible dialog controls and responsive grids.
12. Keep demo fully functional without external subscriptions by using mock recipes and clearly labeled sample prices.

---

## 16. QA checklist / definition of done

**Scenario A — Rural family:** Guest adds rice, beans, frozen peas, eggs, $25 weekly budget, four household members, microwave-only. App returns only compatible meals, explains missing groceries, and does not make up package prices.

**Scenario B — Allergy:** User enters peanut allergy. No recipe containing peanuts appears as a safe option; uncertain substitutions and cross-contact are cautioned appropriately.

**Scenario C — No money for additions:** Budget $0. App prioritizes available pantry food and separately suggests finding free food resources; doesn't imply family failed.

**Scenario D — Access:** ZIP code entered, permission for precise location declined. Food-aid information and official links still display.

**Scenario E — No internet:** Previously loaded recipes / pantry remain visible if cached; assistant or live-price-dependent features clearly report unavailable.

**Scenario F — Photo mistake:** Photo recognition mistakenly labels a tin as tomato soup. User can remove it before any pantry item or recipe is generated.

**Scenario G — Children's safety:** No weight-loss targets, moral labels on food, fasting suggestions or diagnosis messages are produced, even from chatbot prompts.

**Scenario H — Visual:** Mobile 360px, 768px and 1440px. No horizontal overflow; all primary interactions keyboard and touch accessible.

**Release gate:** Working pantry → budget → safe recipe options → grocery list, on a fresh device without login, with no broken buttons and no dependence on fake live prices.

---

## 17. Useful success metrics for a senior capstone demo

- **Time to first meal suggestion:** Aim under 2 minutes for a guest user.
- **Pantry utilization:** Percent of suggested recipes using 2+ existing pantry items.
- **Actionability:** Percent of returned recipes compatible with user's selected appliances and verified allergy constraints.
- **Budget fit:** Fraction of grocery lists with credible estimates within the user's specified budget (exclude unknown prices from claims).
- **User comprehension:** Can parents explain what to buy, what they already have, and why a meal fits?
- **Usability:** Can a first-time tester successfully generate meals without instructions?
- **Food access:** Can a user reach official SNAP or food-bank assistance in 1–2 clicks?

**Suggested live demo:** “Family of four, $25 to spend this week, rice + beans + frozen corn in pantry, only a microwave.” Add pantry → see three meals → open a recipe → see necessary groceries and estimated cost → open nearby food-help links. This clearly demonstrates the project's focus on **food access**, not just recipe generation.

---

## 18. References / verification

- Live public website (landing only, Oct. 9, 2026): https://healthysteps123.netlify.app/
- Feeding America food locator: https://www.feedingamerica.org/need-help-find-food
- USDA SNAP state directory: https://www.fna.usda.gov/snap/state-directory
- SNAP eligibility/application overview (rules vary and change): https://www.fna.usda.gov/snap/recipient/eligibility
- USA.gov SNAP overview: https://www.usa.gov/food-stamps
- CDC child and teen BMI categories: https://www.cdc.gov/bmi/child-teen-calculator/bmi-categories.html
- CDC clinical context for BMI screening: https://www.cdc.gov/obesity/child-obesity-screening/index.html
- USDA cooking videos supplied by project — validate link before use: https://www.fna.usda.gov/tn/cooks

**Final instruction to coding agent:** Implement the minimal useful vertical slice first. Do not spend the first development cycle on BMI, a complex profile questionnaire, account infrastructure, or polished AI chat. The website wins if it helps a family turn **pantry food + a realistic weekly budget** into **safe, appealing meals and an actionable grocery plan**, and makes it easy to seek food assistance when needed.
