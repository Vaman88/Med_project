# Cooking studio

The child's cooking game. It replaces the emoji-and-shapes `RecipeBuilderGame`
(that file and `customer-order.tsx` are no longer used by the app).

## Files

| File | Role |
| --- | --- |
| `src/lib/cooking.ts` | Pure game logic: per-recipe step plans, the `DishState` model, measured progress, undo-friendly updates, `completeDish` for previews. |
| `src/lib/cooking-geometry.ts` | One SVG coordinate system per surface (viewBox, ellipses, cut marks, paint grid, glass levels) and the layer order. |
| `src/components/food-art.tsx` | Original ingredient illustrations: whole, sliced, mashed, piled, bowled. Shared gradients, one light direction. |
| `src/components/cooking-scene.tsx` | Draws a surface (board, glass, bowl, pita, pan, plate) from a `DishState`. |
| `src/components/cooking-studio.tsx` | The workspace: gestures, drag and tap, locks, undo, hints, quiz, finale. |
| `src/components/dish-preview.tsx` | The cookbook picture: real photo with the child's dish as a badge, or the illustration alone. |
| `src/lib/sound.ts` | Synthesized, quiet sound effects (optional). |

## How a surface works

Every position is stored in SVG units, never pixels, so a resize cannot move
food. Hotspot buttons are placed with percentages of the same viewBox. Layers
are painted in a fixed order inside each scene: counter, shadow, container
back, contents, toppings, container front, tools. The dragged ghost is an HTML
element above everything and settles into its layer when dropped.

Glass: yogurt is built in bands, one per scoop. Slices placed on a layer lie
flat on the yogurt; once the next scoop covers them they sit against the glass
wall at the layer boundary, behind the front rim and glare.

## Measured progress

- cut: marks crossed or tapped (each mark counts once)
- mash: spots pressed
- scoop and pour: transfers that finished their animation
- spread: share of a 14x14 grid covered (`PAINT_VALID` cells)
- stir: degrees travelled around the bowl
- cook: pretend heat 0 to 1; each cook step states real-kitchen time
- flip: pancakes turned

Every action also has a button route (hotspots and tray chips are real
buttons), so the game works with a keyboard.

## Finale and cookbook

The finale shows the recipe's real food photograph (`recipe.image`) as the hero,
with the child's own illustrated dish in a smaller "Your creation" card beside
or under it. If the photo fails to load (missing file, offline), the illustrated
dish takes its place at full size and the card is hidden.

`DishPreview` (used by the cookbook) shows the photo by default with the
child's dish as a small corner badge. The badge appears only when a saved dish
is passed. `photo={false}` draws the illustration alone; `photo="/path.webp"`
uses another picture. Photos are square 1254 px WebP files and are cropped to
4:3 with `object-fit: cover` on cards and phones.

## Art

Style: a clean, warm, polished cookbook illustration, not a photo imitation.
Smooth shapes, fresh natural colors, soft gradients, one gentle highlight
(light from the upper left everywhere) and a light soft shadow. Rules for new
art: no speckle or noise patterns, no root hairs or random scatter marks, no
dark heavy outlines (edge shading is a thin, low-opacity stroke of the food's
own darker color), a few evenly spaced detail lines at most (carrot rings,
kernel rows), and items on one surface share a scale and sit fully inside
their container. The finale photograph carries the realism. No SVG filters or
tiling patterns are used, so nothing blurs or rasterises. Shared silhouettes are clip paths in `FoodDefs`
(`fa-clip-carrot`, `-tomato`, `-pepper`, `-banana`, `-strawberry`) so surface
detail stays inside the food when it is cut. Loose beans and kernels are the
`Bean` and `Kernel` components; `CornCob` is a husked cob with kernel rows.
`carrot:stick` and `corn:cob` exist in the registry for recipes that need them.

## Known limits

- The art is hand-built SVG in a deliberately clean illustrated style, not a
  photograph. The finale photograph is the realistic picture.
- Photographs are per recipe, not per child: the photo shows a typical dish
  and will not match the child's exact arrangement (for example carrot sticks
  in the photo versus coins in the game). The "Your creation" card keeps the
  child's own version visible next to it.
- Pancakes are shown as three single cakes in the pan and stacked on a plate
  at the end; the stack is a fixed arrangement, not a child-placed one.
- A cut food's decorations (stem, calyx) are clipped to the segment they sit
  in, so they are sized to stay inside one piece. A tomato calyx is smaller
  than a real one for that reason.
- Cut faces are drawn as thin ellipses at the cut, a simplified view of the
  cross-section, not a full rotation of the cut piece.
- Not every ingredient is a whole-food drawing: oats, cocoa, hummus and batter
  are mounds and bowls.
