# Healthy Steps visual refresh

## Direction and references

Audience: families planning practical meals with pantry food and a grocery budget. A warm, modern kitchen aesthetic using native CSS, a single light theme, forest green actions, readable self-hosted Nunito Sans, and consistent Tabler icons. Design variance 5/10; motion 1/10; density 4/10. The planning screens use practical form layouts, while the frontend design skill informed the landing page.

Browsed October 9, 2026:

- [Mealime](https://www.mealime.com/): a clear meal-planning entry point and plan/shop/cook sequence.
- [Samsung Food](https://samsungfood.com/): distinct recipe, grocery and planning navigation.
- [SideChef](https://www.sidechef.com/recipes/): browsing food by meal, ingredient and cooking needs.

These informed the visual direction and hierarchy. Healthy Steps retains its own branding, copy, interactions and source data.

## Changes

- Replaced the plain landing block with a two-column food-photo hero and a simple explanation of the pantry/budget/meals sequence.
- Brought navigation into the desktop header; mobile navigation remains a full-width row with readable labels.
- Rebuilt kitchen spacing and hierarchy, with a compact welcome area, pantry entry/list and a distinct family budget panel.
- Kept storage disclosure and clearing visible without a large notification banner.
- Added eight illustrative recipe images, structured meal facts and a wider card layout when a group has one recipe.
- Updated resource cards, focus styles, responsive breakpoints and print styles.
- Applied the same font and forest green action color to the caregiver screens.

## Generated assets

All images were generated with the built-in image generation tool, inspected, and copied into `public/images/`. They are illustrative images, not verified photographs of the prototype recipes. The recipe page says this visibly.

### Homepage prompt

Use case: photorealistic-natural. Asset type: website homepage food photograph for Healthy Steps, a practical family pantry meal planner. Create a warm editorial food photograph, landscape 3:2 composition, softly lit natural daylight. On a pale warm cream kitchen table, an off-white ceramic bowl filled with white rice, black beans and golden corn, a second smaller bowl of oats with sliced banana, a few carrots and a plain glass of water, folded muted green linen and a simple spoon. Honest affordable home cooking, natural appetizing food texture, relaxed composition with the rice bowl as primary focus. No expensive exotic ingredients, no text, no labels, no logos, no watermark. Image is an illustrative scene, not a recipe instruction.

Saved as `public/images/kitchen-table.png`.

### Recipe prompt set

Each file used this complete prompt, replacing `{subject}` with its subject below:

Use case: photorealistic-natural. Asset type: meal card image for a family pantry planner. Subject: {subject}. Create a square editorial food photograph of this one dish, gently angled from above, on a warm pale cream table, with soft natural daylight and a muted green linen off to one side. Plain off-white ceramic dishware, simple affordable home cooking, food sharply focused and appetizing, consistent understated styling. Composition centered, whole dish visible with breathing room for a landscape card crop. Show only the specified food ingredients; no garnish, herbs, nuts, spices, dressing, toppings, honey or extra ingredients. No people, text, logos, packaging, watermark.

| Saved path | Subject |
| --- | --- |
| `public/images/banana-oats.png` | a small oatmeal bowl of softened rolled oats prepared with water, topped only with sliced banana |
| `public/images/bean-rice.png` | a ceramic bowl of white rice with black beans and diced canned tomatoes, no corn |
| `public/images/bean-corn-salad.png` | a small ceramic bowl of black beans, golden corn and diced canned tomatoes mixed together, no rice |
| `public/images/banana-toast.png` | two slices of soft whole wheat bread spread with peanut butter and topped with banana slices, bread not toasted |
| `public/images/yogurt-banana.png` | a small ceramic bowl of plain white yogurt topped only with sliced banana |
| `public/images/carrot-hummus.png` | an off-white plate of fresh carrot batons beside a small plain bowl of hummus, no garnishes |
| `public/images/hummus-carrot-sandwich.png` | two halves of a soft whole wheat bread sandwich filled only with a generous layer of pale hummus and shredded orange carrots, no lettuce or other fillings |
| `public/images/bean-corn-rice.png` | a ceramic bowl of cooked white rice, black beans and golden corn mixed together, no tomatoes |

Next.js serves responsive optimized images, with lazy loading on recipe cards and eager loading of the landing photo. The font files came from Google Fonts and the OFL license is included in `public/fonts/OFL.txt`.

## Verification

- TypeScript and production build passed.
- All 18 existing mobile/desktop guest and caregiver browser checks passed.
- Inspected landing and kitchen screens at 360, 768 and 1440 pixels; no horizontal overflow.
- Final meal and resource layouts checked at the same widths, including image loading and expanded recipe steps.
- The development website remains on `http://localhost:3197`.

Recipe review, Supabase configuration and later guide features remain separate pending work; this refresh does not establish medical or nutrition validation.
