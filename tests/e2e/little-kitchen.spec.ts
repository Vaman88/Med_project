import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { recipeChallenges } from "../../src/lib/chef-challenges";
import { littleRecipes } from "../../src/lib/little-kitchen";
import { createParentPin } from "../../src/lib/parent-lock";

const kidsCount = littleRecipes.length;
// Every test starts by walking the full sign-up flow (or the PIN gate), so allow more than the default 30s.
test.describe.configure({ timeout: 60_000 });
const PIN = "2468";
/** Enters the Parent PIN on the "Grown-ups only" screen. */
async function unlock(page: Page, pin = PIN) {
  await expect(page.getByRole("heading", { name: "Grown-ups only" })).toBeVisible();
  await page.getByLabel("Parent PIN", { exact: true }).fill(pin);
  await page.getByRole("button", { name: "Open parent area" }).click();
  // Checking the PIN (PBKDF2) can take a few seconds on a busy machine.
  if (pin !== WRONG_PIN) await expect(page.getByRole("heading", { name: "Grown-ups only" })).toHaveCount(0, { timeout: 15_000 });
}
const WRONG_PIN = "1111";
async function asChild(page: Page) {
  await page.getByRole("button", { name: /Child account/ }).click();
}
async function asParent(page: Page) {
  await page.getByRole("button", { name: /Parent account/ }).click();
}
const PANTRY = [
  "Black beans", "Oats", "Banana", "Cocoa", "Egg", "Whole wheat pita",
  "Tomato", "Mozzarella", "Bell pepper", "Plain yogurt",
];
const next = (page: Page) => page.getByRole("button", { name: "Continue", exact: true }).click();
/**
 * The one sign-up flow, a question per screen: parent name, child's age, household, pantry,
 * equipment, foods to avoid, diet, budget, Parent PIN. Ends on the child/parent account chooser.
 */
async function signUp(page: Page, age = 7, allergy?: string, info?: TestInfo) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Hi! I’m Seedy." })).toBeVisible();
  if (info) await page.screenshot({ path: info.outputPath("signup-welcome.png"), fullPage: true });
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByLabel("Your first name").fill("Maya");
  await next(page);
  await page.getByRole("group", { name: "Child’s age" }).getByRole("button", { name: String(age), exact: true }).click();
  await next(page);
  await page.getByRole("group", { name: "People eating at home" }).getByRole("button", { name: "4", exact: true }).click();
  await next(page);
  // The pantry is part of sign-up, not something to add later.
  await expect(page.getByRole("heading", { name: "What food do you have at home right now?" })).toBeVisible();
  const search = page.getByRole("combobox", { name: "Search for a food" });
  for (const food of PANTRY) {
    await search.fill(food);
    await page.getByRole("option", { name: food, exact: true }).click();
  }
  if (info) await page.screenshot({ path: info.outputPath("signup-pantry.png"), fullPage: true });
  await next(page);
  await expect(page.getByRole("heading", { name: "What can you cook with?" })).toBeVisible();
  await next(page);
  if (allergy) {
    await page.getByRole("group", { name: "Foods to avoid" }).getByRole("button", { name: allergy, exact: true }).click();
    await page.getByRole("checkbox", { name: "I have checked the allergy and exclusion list." }).check();
  } else await page.getByRole("button", { name: "No known food allergies" }).click();
  await next(page);
  await page.getByRole("button", { name: "No special diet" }).click();
  await next(page);
  await page.getByRole("button", { name: "$50", exact: true }).click();
  await next(page);
  // A new kitchen cannot be created without a Parent PIN.
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.locator("[role=alert]:not(#__next-route-announcer__)")).toContainText("Parent PIN of 4 to 8 digits");
  await page.getByLabel("Parent PIN (4–8 digits)").fill(PIN);
  await page.getByLabel("Type the Parent PIN again").fill(PIN);
  await page.getByRole("checkbox", { name: /I am a parent or guardian/ }).check();
  await page.getByRole("button", { name: "Finish" }).click();
  // Hashing the new PIN (PBKDF2) can take a few seconds on a busy machine; the button shows "Saving…".
  await expect(page.getByRole("heading", { name: "You’re all set, Maya!" })).toBeVisible({ timeout: 15_000 });
  if (info) await page.screenshot({ path: info.outputPath("signup-chooser.png"), fullPage: true });
}
async function setup(page: Page, age = 7, allergy?: string, info?: TestInfo) {
  await signUp(page, age, allergy, info);
  // There is no chef naming step anywhere: every child gets Chef Seedy.
  await expect(page.getByRole("textbox", { name: /nickname|chef name/i })).toHaveCount(0);
  await asChild(page);
  // Every child profile, teens included, lands in the kids' kitchen.
  if (age < 13) {
    await expect(page.getByRole("button", { name: "See all dishes" })).toBeVisible();
    await showAllDishes(page);
    await expect(page.locator(".km-card")).toHaveCount(allergy ? kidsCount - 4 : kidsCount);
  }
  else
    await expect(page.getByRole("heading", { name: /Hey, Chef Seedy/ })).toBeVisible();
}
/** The kids' home is the "Let's cook!" kitchen; the full grid of dishes is one tap away. */
async function showAllDishes(page: Page) {
  const button = page.getByRole("button", { name: "See all dishes" });
  if (await button.isVisible().catch(() => false)) await button.click();
}
async function start(page: Page, title: string) {
  await showAllDishes(page);
  await page
    .locator(".km-card")
    .filter({ hasText: title })
    .getByRole("button", { name: "Cook this" })
    .click();
  await expect(page.locator(".ck-app")).toBeVisible();
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
}
async function openSettings(page: Page) {
  await page.getByRole("button", { name: "Parent settings" }).click();
  await unlock(page);
  await page.getByRole("button", { name: "Child profile", exact: true }).click();
  await page.getByRole("button", { name: "Edit everything" }).click();
}

test("parent settings ask for the Parent PIN, then open the planner and keep its changes", async ({ page }) => {
  await setup(page);
  await page.getByRole("button", { name: "Parent settings" }).click();
  await unlock(page);
  await expect(page.getByRole("heading", { name: "What's in your kitchen today?" })).toBeVisible();
  await expect(page.getByText("Black beans", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Change budget and family" }).click();
  await page.getByRole("textbox", { name: "Weekly grocery budget (USD)" }).fill("72");
  await page.getByRole("textbox", { name: "Weekly grocery budget (USD)" }).blur();
  await page.getByRole("combobox", { name: "Food name" }).fill("Carrots");
  await page.getByRole("textbox", { name: /Amount/ }).fill("300");
  await page.getByRole("button", { name: "Add food", exact: true }).click();
  await expect(page.locator(".pantry-list").getByText("Carrots", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Meal Ideas" }).click();
  await expect(page.getByRole("heading", { name: "A few useful meals." })).toBeVisible();
  await page.getByRole("button", { name: "Back to child kitchen" }).click();
  await expect(page.getByRole("heading", { name: /Hey, Chef Seedy/ })).toBeVisible();
  await page.reload();
  await asChild(page);
  await expect(page.getByRole("heading", { name: /Hey, Chef Seedy/ })).toBeVisible();
  await page.getByRole("button", { name: "Parent settings" }).click();
  await unlock(page);
  await expect(page.locator(".pantry-list").getByText("Carrots", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Change budget and family" }).click();
  await expect(page.getByRole("textbox", { name: "Weekly grocery budget (USD)" })).toHaveValue("72");
});

async function seedAllRecipes(page: Page) {
  await page.addInitScript(() => localStorage.setItem("healthy-steps-family-v1", JSON.stringify({
    version: 1,
    age: 7,
    nickname: "Sunny",
    avatar: { skin: "tan", hair: "curly", apron: "coral" },
    pantry: ["Black beans", "Oats", "Banana", "Cocoa", "Egg", "Whole wheat pita",
      "Tomato", "Mozzarella", "Bell pepper", "Plain yogurt", "Strawberries",
      "Carrots", "Cucumber", "Hummus", "Canned black beans", "Canned corn"],
    allergies: [], otherAllergies: "", allergyConfirmed: true, parentConfirmed: true,
  })));
  await page.goto("/");
  await asChild(page);
  await expect(page.getByRole("button", { name: "See all dishes" })).toBeVisible();
  await showAllDishes(page);
  await expect(page.locator(".km-card")).toHaveCount(kidsCount);
}


// Plays the current step using only buttons, which is also the keyboard route.
async function playStep(page: Page) {
  const app = page.locator(".ck-app");
  const kind = await app.getAttribute("data-step-kind");
  const title = await page.locator(".ck-step-title").innerText();
  const zone = page.locator(".ck-hot").first();
  if (kind === "drop" || kind === "scoop" || kind === "pour") {
    for (let guard = 0; guard < 12; guard++) {
      // Play only this step: stop once the game has moved on, as a child would.
      if ((await page.locator(".ck-step-title").innerText().catch(() => "")) !== title) break;
      const chip = page.locator(".ck-chip:not(:disabled)").first();
      if (!(await chip.count())) break;
      await chip.click();
      await expect(chip).toHaveAttribute("aria-pressed", "true");
      // Tap well inside the drop zone, whatever size the dish frame is on this screen.
      const box = await zone.boundingBox();
      await zone.click({ position: box ? { x: Math.min(150, box.width / 2), y: Math.min(150, box.height / 2) } : undefined });
      await page.waitForTimeout(kind === "drop" ? 120 : 250);
      if (kind !== "drop") await expect(page.locator(".ck-spoon-path, .ck-pour-path")).toHaveCount(0, { timeout: 4000 });
    }
    // Free-decorating steps (optional extra toppings) end when the child taps Finish.
    const finish = page.locator(".ck-finish");
    if ((await page.locator(".ck-step-title").innerText().catch(() => "")) === title && await finish.count() && await finish.isEnabled().catch(() => false)) await finish.click();
  } else if (kind === "cut" || kind === "mash") {
    const mark = page.getByRole("button", { name: kind === "cut" ? /Cut mark/ : /Mash spot/ });
    while (await mark.count()) {
      await mark.first().click();
      await page.waitForTimeout(350);
    }
  } else if (kind === "spread" || kind === "stir") {
    await zone.focus();
    for (let guard = 0; guard < 60; guard++) {
      if ((await page.locator(".ck-step-title").innerText().catch(() => title)) !== title) break;
      await page.keyboard.press("Enter");
      await page.waitForTimeout(60);
    }
  } else if (kind === "cook") {
    await page.locator(".ck-cook .ck-primary").click();
  } else if (kind === "flip") {
    const flip = page.getByRole("button", { name: /Flip pancake|Fold it and flip it|Roll up the wrap/ });
    while (await flip.count()) {
      await flip.first().click();
      await page.waitForTimeout(800);
    }
  } else if (kind === "quiz") {
    const keep = page.getByRole("button", { name: "Keep cooking" });
    await expect(keep).toBeDisabled();
    const answers = page.locator(".ck-answer");
    for (let index = 0; index < 3 && !(await keep.isEnabled()); index++) await answers.nth(index).click();
    await keep.click();
  } else throw new Error(`Unexpected step: ${kind}`);
  // The step settles, then the game moves on by itself.
  await expect(page.locator(".ck-step-title, .ck-finale-text h1").first()).not.toHaveText(title, { timeout: 15000 });
}
async function finishRecipe(page: Page) {
  for (let turn = 0; turn < 30; turn++) {
    if (await page.locator(".ck-finale").count()) return;
    await playStep(page);
  }
  throw new Error("The recipe did not finish");
}

test("every dish plays through the cooking game to a finished dish", async ({ page }, info) => {
  // Every dish (19 of them), each played step by step with buttons only.
  test.setTimeout(1800000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedAllRecipes(page);
  for (const recipe of littleRecipes) {
    await start(page, recipe.title);
    await expect(page.locator(".ck-progress li").first()).toHaveAttribute("aria-current", "step");
    await finishRecipe(page);
    await expect(page.getByRole("heading", { name: "Look what you made!" })).toBeVisible();
    await expect(page.locator(".ck-hero-photo img, .ck-frame svg.ck-scene").first()).toBeVisible();
    await expect(page.locator(".ck-creation svg.ck-scene, .ck-frame svg.ck-scene").first()).toBeVisible();
    await expect.poll(() => page.evaluate((id) => JSON.parse(localStorage.getItem("healthy-steps-child-progress-v1") ?? "{}").completed?.[id], recipe.id)).toBe(1);
    await page.getByRole("button", { name: "Make it with a grown-up" }).click();
    const recipeCard = page.getByRole("dialog", { name: "Recipe for grown-ups" });
    await expect(recipeCard).toContainText("pretend time");
    for (const { amount } of recipe.ingredients) await expect(recipeCard).toContainText(amount);
    await recipeCard.getByRole("button", { name: "Close" }).click();
    await page.getByRole("button", { name: "Save to my cookbook" }).click();
    await expect(page.getByRole("button", { name: "Saved! Open my cookbook" })).toBeVisible();
    if (recipe.id === "parfait") await page.screenshot({ path: info.outputPath("parfait-finale.png") });
    await page.getByRole("button", { name: "Make another" }).click();
    await expect(page.locator(".km-card")).toHaveCount(kidsCount);
  }
  await page.getByRole("button", { name: "My Cookbook" }).click();
  await expect(page.locator(".km-card .ck-preview")).toHaveCount(kidsCount);
  await page.screenshot({ path: info.outputPath("cookbook.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("the cookbook keeps the dish the child actually arranged", async ({ page }) => {
  test.setTimeout(120000);
  await seedAllRecipes(page);
  await start(page, "Banana berry yogurt parfait");
  await finishRecipe(page);
  await page.getByRole("button", { name: "Save to my cookbook" }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("healthy-steps-child-progress-v1") ?? "{}"));
  const drops = saved.creations.parfait.drops as { asset: string }[];
  expect(drops.filter((d) => d.asset === "banana:slice")).toHaveLength(4);
  expect(drops.filter((d) => d.asset === "strawberry:slice")).toHaveLength(3);
  await page.getByRole("button", { name: "Saved! Open my cookbook" }).click();
  await expect(page.locator(".km-card").filter({ hasText: "Banana berry yogurt parfait" }).locator(".ck-preview")).toBeVisible();
});

test("dragging, tapping, undo, pause and rapid input keep the dish correct", async ({ page }, info) => {
  test.skip(info.project.name.includes("mobile"), "Pointer dragging is checked on desktop.");
  await seedAllRecipes(page);
  await start(page, "Banana berry yogurt parfait");
  const stage = page.locator(".ck-stage");
  const banana = page.locator(".ck-chip").first();
  await expect(page.locator(".ck-step-title")).toHaveText("Put the banana on the board");
  // Dropping outside the dish does nothing.
  const box = (await banana.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(20, 200, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator(".ck-step-title")).toHaveText("Put the banana on the board");
  // Dragging onto the board places it, and the game moves on once.
  await banana.dragTo(stage, { targetPosition: { x: 300, y: 200 } });
  await expect(page.locator(".ck-step-title")).toHaveText("Slice the banana", { timeout: 5000 });
  // Each mark is one visible cut; repeated taps cannot double count.
  const first = page.getByRole("button", { name: /Cut mark 1 of 3/ });
  await first.click();
  await expect(page.getByRole("button", { name: /Cut mark/ })).toHaveCount(2);
  await page.getByRole("button", { name: "Undo last move" }).click();
  await expect(page.getByRole("button", { name: /Cut mark/ })).toHaveCount(3);
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("dialog", { name: "Game paused" })).toBeVisible();
  await page.getByRole("button", { name: "Resume cooking" }).click();
  await expect(page.getByRole("button", { name: /Cut mark/ })).toHaveCount(3);
  for (const index of [1, 2, 3]) {
    await page.getByRole("button", { name: new RegExp(`Cut mark ${index} of 3`) }).click();
    await page.waitForTimeout(300);
  }
  await expect(page.locator(".ck-step-title")).toHaveText("Slice the strawberry", { timeout: 5000 });
});

test("allergy and pantry edits keep their safety rules without hiding the fun", async ({
  page,
}) => {
  await setup(page, 6, "Egg");
  await expect(page.locator(".km-card")).toHaveCount(kidsCount - 4);
  await expect(page.getByRole("heading", { name: "Rainbow mini pizzas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mini veggie egg muffins" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Veggie fried rice" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Cheesy bean quesadilla" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fudgy bean brownies" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Banana oat pancakes" })).toHaveCount(0);
  await openSettings(page);
  await page.getByRole("button", { name: "Remove Tomato" }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page
    .getByRole("checkbox", { name: "I am a parent or guardian", exact: false })
    .check();
  await page.getByRole("button", { name: "Save kitchen" }).click();
  await expect(page.getByRole("button", { name: "See all dishes" })).toBeVisible();
  await showAllDishes(page);
  const pizza = page.locator(".km-card").filter({ hasText: "Rainbow mini pizzas" });
  await expect(pizza).toContainText("a grown-up may need to add");
  await expect(pizza).toContainText("Tomato");
  await expect(pizza.getByRole("button", { name: "Cook this" })).toBeEnabled();
});
test("an unlocked parent can save existing profile changes", async ({ page }) => {
  // A profile saved before the naming step was removed: its old chef name is never shown.
  await seedFamily(page, { nickname: "River" });
  await expect(page.getByRole("heading", { name: /Hey, Chef Seedy/ })).toBeVisible();
  await openSettings(page);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { name: /Hey, Chef Seedy/ })).toBeVisible();

  await page.reload();
  await asChild(page);
  await openSettings(page);
  for (let step = 0; step < 2; step++)
    await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByRole("spinbutton", { name: "Child’s age" })).toHaveValue("7");
  await page.getByRole("spinbutton", { name: /Weekly grocery budget/ }).fill("75");
  await page.getByRole("button", { name: "Save kitchen" }).click();
  await expect(page.getByRole("heading", { name: /Hey, Chef Seedy/ })).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("healthy-steps-family-v1") ?? "{}"),
  );
  expect(saved.nickname).toBeUndefined();
  expect(saved.weeklyBudget).toBe(75);
});
test("meal choices show readable names and food photos in dark mode", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await setup(page);
  for (const card of await page.locator(".km-card").all()) {
    await expect(card.locator("h2")).toBeVisible();
    const imageLoaded = await card.locator("img").evaluate(async (image) => {
      await (image as HTMLImageElement).decode();
      return (image as HTMLImageElement).naturalWidth > 0;
    });
    expect(imageLoaded).toBe(true);
    const contrast = await card.locator("h2").evaluate((title) => {
      const channels = (color: string) =>
        (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map((value) => {
          const normalized = value / 255;
          return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
        });
      const luminance = (color: string) => {
        const [red, green, blue] = channels(color);
        return red * 0.2126 + green * 0.7152 + blue * 0.0722;
      };
      let node: Element | null = title;
      let background = "rgba(0, 0, 0, 0)";
      while (node && /rgba\(.*, 0\)$/.test(background)) {
        background = getComputedStyle(node).backgroundColor;
        node = node.parentElement;
      }
      const foreground = luminance(getComputedStyle(title).color);
      const back = luminance(background);
      return (Math.max(foreground, back) + 0.05) / (Math.min(foreground, back) + 0.05);
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  }
});
test("an older saved chef name is replaced by Chef Seedy and removed from the device", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("healthy-steps-family-v1", JSON.stringify({
    version: 1, age: 7, nickname: "Chef Eli", pantry: ["Banana"],
    allergies: [], otherAllergies: "", allergyConfirmed: true, parentConfirmed: true,
  })));
  await page.goto("/");
  // A saved profile is a returning visitor: straight to the account chooser, no sign-up again.
  await expect(page.getByRole("heading", { name: "Welcome back!" })).toBeVisible();
  await asChild(page);
  await expect(page.getByRole("heading", { name: "Hey, Chef Seedy! What’s cooking?" })).toBeVisible();
  await expect(page.getByText(/Eli/)).toHaveCount(0);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("healthy-steps-family-v1") ?? "{}"));
  expect(saved.nickname).toBeUndefined();
});
test("My Cookbook stays visible and explains an empty cookbook", async ({ page }) => {
  await setup(page);
  const tab = page.getByRole("button", { name: "My Cookbook" });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Your cookbook is waiting!" })).toBeVisible();
});
test("teens get the kids' kitchen and can still open the original planner", async ({ page }) => {
  await setup(page, 13, "Peanut");
  await showAllDishes(page);
  await expect(page.locator(".km-card").first()).toBeVisible();
  await page.reload();
  await asChild(page);
  await expect(page.getByRole("heading", { name: /Hey, Chef Seedy/ })).toBeVisible();
  await page.getByRole("button", { name: "Switch profile" }).click();
  // The chooser comes first; the planner holds the teen's food settings, so it asks for the PIN.
  await asParent(page);
  await unlock(page);
  await expect(
    page.getByRole("heading", { name: "What's in your kitchen today?" }),
  ).toBeVisible();
});
test("age twelve sees the child cooking game", async ({ page }) => {
  await setup(page, 12);
  // setup() already confirmed the "Let's cook!" kitchen and opened the full dish grid.
  await expect(page.getByRole("heading", { name: "All dishes" })).toBeVisible();
  await page.getByRole("button", { name: "Back to the kitchen" }).click();
  await expect(page.getByRole("heading", { name: /Hey, Chef Seedy/ })).toBeVisible();
  await start(page, "Rainbow mini pizzas");
});
test("dark mode and reduced motion keep the cooking workspace in one screen", async ({
  page,
}, info) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await setup(page);
  await start(page, "Fudgy bean brownies");
  await expect(page.locator(".ck-step-title")).toBeVisible();
  await expect(page.locator(".ck-stage svg.ck-scene")).toBeVisible();
  const fits = await page.evaluate(() => {
    const stage = document.querySelector(".ck-stage")!.getBoundingClientRect();
    const tray = document.querySelector(".ck-tray")!.getBoundingClientRect();
    return stage.top >= 0 && tray.bottom <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth;
  });
  expect(fits).toBe(true);
  await page.screenshot({ path: info.outputPath("studio-dark.png") });
});

test("a fresh visitor signs up once, then the chooser sends a child and a parent to the right place", async ({ page }, info) => {
  await signUp(page, 7, undefined, info);
  // Child account: the kids' cooking game, no PIN.
  await asChild(page);
  await expect(page.getByRole("heading", { name: /Hey, Chef Seedy/ })).toBeVisible();
  await page.getByRole("button", { name: "Switch profile" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back, Maya!" })).toBeVisible();
  // Parent account: always behind the Parent PIN, even straight after sign-up.
  await asParent(page);
  await expect(page.getByRole("heading", { name: "Grown-ups only" })).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome back, Maya!" })).toBeVisible();
  await asParent(page);
  await unlock(page);
  await expect(page.getByRole("heading", { name: "What's in your kitchen today?" })).toBeVisible();
  await expect(page.getByText(/Hi Maya/)).toBeVisible();
  // The pantry from sign-up is already in the planner; there is no "add it later".
  await expect(page.locator(".pantry-list")).toContainText("Black beans");
  await page.getByRole("button", { name: "Switch profile" }).click();
  // Returning visitors land on the same chooser, not on sign-up again.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Welcome back, Maya!" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Get started" })).toHaveCount(0);
});

test("the menu shows all nineteen dishes and filters them by kind", async ({ page }) => {
  await seedAllRecipes(page);
  expect(kidsCount).toBe(19);
  const labels = { breakfast: "Breakfast", lunch: "Lunch & dinner", snack: "Snacks", sweet: "Sweet treats" } as const;
  for (const kind of ["breakfast", "lunch", "snack", "sweet"] as const) {
    await page.getByRole("button", { name: labels[kind] }).click();
    await expect(page.locator(".km-card")).toHaveCount(littleRecipes.filter((r) => r.category === kind).length);
  }
  await page.getByRole("button", { name: "All dishes" }).click();
  await expect(page.locator(".km-card")).toHaveCount(kidsCount);
  for (const title of ["Rainbow fruit salad", "Avocado tomato toast", "Cheesy bean quesadilla", "Crunchy veggie wraps",
    "Berry banana oatmeal bowl", "Banana oat cookies", "Cozy tomato pasta", "Mini veggie egg muffins",
    "Rainbow fruit kabobs", "Veggie fried rice", "Pink power smoothie bowl", "Rainbow taco bowl", "Crunchy garden hummus toast"])
    await expect(page.locator(".km-card h2", { hasText: title })).toHaveCount(1);
});

test("a stove-and-pan dish and a no-cook dish both play from the menu", async ({ page }) => {
  test.setTimeout(180000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedAllRecipes(page);
  for (const title of ["Cheesy bean quesadilla", "Rainbow fruit kabobs"]) {
    await start(page, title);
    await finishRecipe(page);
    await expect(page.getByRole("heading", { name: "Look what you made!" })).toBeVisible();
    await page.getByRole("button", { name: "Make another" }).click();
  }
});

test("a wrong Parent PIN keeps the parent area closed and waits after repeated misses", async ({ page }) => {
  await setup(page);
  await page.getByRole("button", { name: "Parent settings" }).click();
  await unlock(page, WRONG_PIN);
  await expect(page.locator("[role=alert]:not(#__next-route-announcer__)")).toContainText("That PIN did not match. 2 more tries before a short wait.");
  await expect(page.getByRole("heading", { name: "Grown-ups only" })).toBeVisible();
  for (const miss of ["2222", "3333"]) {
    await page.getByLabel("Parent PIN", { exact: true }).fill(miss);
    await page.getByRole("button", { name: "Open parent area" }).click();
  }
  await expect(page.getByText(/Too many wrong PINs. Try again in/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Open parent area" })).toBeDisabled();
  // Reloading does not reset the wait.
  await page.reload();
  await asChild(page);
  await page.getByRole("button", { name: "Parent settings" }).click();
  await expect(page.getByRole("button", { name: "Open parent area" })).toBeDisabled();
  // Back returns to the child kitchen without opening anything.
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Hey, Chef Seedy/ })).toBeVisible();
});

test("an older profile with no Parent PIN must create one before the parent area opens", async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem("healthy-steps-family-v1", JSON.stringify({
        version: 1, age: 7, nickname: "Sunny", pantry: ["Banana"],
        allergies: [], otherAllergies: "", allergyConfirmed: true, parentConfirmed: true,
      }));
    }
  });
  await page.goto("/");
  await asChild(page);
  await page.getByRole("button", { name: "Parent settings" }).click();
  await expect(page.getByRole("heading", { name: "Create a Parent PIN" })).toBeVisible();
  await page.getByLabel("New Parent PIN (4–8 digits)").fill("1357");
  await page.getByLabel("Type the PIN again").fill("1358");
  await page.getByRole("button", { name: "Save PIN and continue" }).click();
  await expect(page.locator("[role=alert]:not(#__next-route-announcer__)")).toContainText("do not match");
  await page.getByLabel("Type the PIN again").fill("1357");
  // A grown-up has to confirm they are choosing the PIN.
  await page.getByRole("button", { name: "Save PIN and continue" }).click();
  await expect(page.locator("[role=alert]:not(#__next-route-announcer__)")).toContainText("parent or guardian");
  await page.getByRole("checkbox", { name: /I am a parent or guardian/ }).check();
  await page.getByRole("button", { name: "Save PIN and continue" }).click();
  await expect(page.getByRole("heading", { name: "What's in your kitchen today?" })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("healthy-steps-family-v1") ?? "{}"));
  expect(saved.pinHash).toMatch(/^[a-f0-9]{64}$/);
  // Leaving for the child kitchen locks it again; the new PIN opens it.
  await page.getByRole("button", { name: "Back to child kitchen" }).click();
  await page.getByRole("button", { name: "Parent settings" }).click();
  await unlock(page, "1357");
  await expect(page.getByRole("heading", { name: "What's in your kitchen today?" })).toBeVisible();
});

test("library recipes are labelled unchecked and show known conflicts with the child's allergies", async ({ page }) => {
  await page.route(/\/api\/recipe-library\?q=/, (route) => route.fulfill({ json: { dishes: [
    { id: "52772", name: "Egg pasta", image: "https://www.themealdb.com/images/media/meals/x.jpg", category: "Pasta" },
  ] } }));
  await page.route(/\/api\/recipe-library\?id=/, (route) => route.fulfill({ json: { recipe: {
    id: "52772", name: "Egg pasta", image: "https://www.themealdb.com/images/media/meals/x.jpg",
    ingredients: [{ name: "Eggs", measure: "2" }, { name: "Spaghetti", measure: "200g" }, { name: "Sumac", measure: "1 tsp" }],
    steps: ["Cook the pasta.", "Toss with beaten egg."],
  } } }));
  await setup(page, 7, "Egg");
  await page.getByRole("button", { name: "Parent settings" }).click();
  await unlock(page);
  await page.getByRole("button", { name: "Recipes", exact: true }).click();
  const library = page.getByRole("region", { name: "Recipe library" });
  await expect(library.locator(".library-unchecked-note")).toContainText("Not checked against your food settings");
  const card = page.getByRole("button", { name: "Open recipe: Egg pasta" });
  await expect(card).toContainText("Not checked against your food settings");
  await card.click();
  const dialog = page.getByRole("dialog");
  const safety = dialog.getByRole("note", { name: "Check against your food settings" });
  await expect(safety).toContainText("Known conflicts with your food settings");
  await expect(safety).toContainText("Eggs");
  await expect(safety).toContainText("Not verified: Sumac");
  await expect(dialog.locator(".library-ingredients li.conflict")).toHaveCount(1);
});

test("sign-up asks one question at a time, checks each answer and keeps answers through Back and reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Get started" }).click();
  const progress = page.getByRole("progressbar", { name: "Sign-up progress" });
  const alert = page.locator("[role=alert]:not(#__next-route-announcer__)");
  // Each question needs an answer before Continue moves on.
  await next(page);
  await expect(alert).toContainText("first name");
  await page.getByLabel("Your first name").fill("Ari");
  await page.getByLabel("Your first name").press("Enter");
  await expect(page.getByRole("heading", { name: "Nice to meet you, Ari! How old is your child?" })).toBeFocused();
  // The age can only be 5 to 17: those are the only choices.
  const ages = page.getByRole("group", { name: "Child’s age" }).getByRole("button");
  await expect(ages).toHaveCount(13);
  await expect(ages.first()).toHaveText("5");
  await expect(ages.last()).toHaveText("17");
  await next(page);
  await expect(alert).toContainText("Pick your child’s age.");
  await page.getByRole("button", { name: "14", exact: true }).click();
  await expect(page.getByRole("button", { name: "14", exact: true })).toHaveAttribute("aria-pressed", "true");
  const before = Number(await progress.getAttribute("aria-valuenow"));
  await next(page);
  expect(Number(await progress.getAttribute("aria-valuenow"))).toBeGreaterThan(before);
  // Back keeps the answer.
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("button", { name: "14", exact: true })).toHaveAttribute("aria-pressed", "true");
  await next(page);
  await page.getByRole("button", { name: "3", exact: true }).click();
  await next(page);
  // The pantry cannot be skipped.
  await next(page);
  await expect(alert).toContainText("Add at least one food");
  await page.getByRole("group", { name: "Common foods" }).getByRole("button", { name: "Banana" }).click();
  await next(page);
  await next(page);
  // Foods to avoid: an explicit "none", or a list the grown-up confirms.
  await next(page);
  await expect(alert).toContainText("No known food allergies");
  await page.getByRole("group", { name: "Foods to avoid" }).getByRole("button", { name: "Peanut" }).click();
  await next(page);
  await expect(alert).toContainText("tick the box");
  await page.getByRole("checkbox", { name: "I have checked the allergy and exclusion list." }).check();
  // A reload keeps the answers (but never a PIN).
  await page.reload();
  await expect(page.getByRole("group", { name: "Foods to avoid" }).getByRole("button", { name: "Peanut" })).toHaveAttribute("aria-pressed", "true");
  await next(page);
  await page.getByRole("button", { name: "Vegetarian" }).click();
  await next(page);
  await page.getByRole("button", { name: "Not sure yet" }).click();
  await next(page);
  expect(await page.evaluate(() => localStorage.getItem("healthy-steps-family-v1"))).toBeNull();
  await page.getByLabel("Parent PIN (4–8 digits)").fill(PIN);
  await page.getByLabel("Type the Parent PIN again").fill("1111");
  await page.getByRole("checkbox", { name: /I am a parent or guardian/ }).check();
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(alert).toContainText("do not match");
  await page.getByLabel("Type the Parent PIN again").fill(PIN);
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.getByRole("heading", { name: "You’re all set, Ari!" })).toBeVisible({ timeout: 15_000 });
  const saved = await savedFamily(page);
  expect(saved).toMatchObject({ parentName: "Ari", age: 14, householdSize: 3, pantry: ["Banana"], allergies: ["Peanut"],
    allergyConfirmed: true, parentConfirmed: true, dietary: ["Vegetarian"], equipment: ["Oven", "Stove"] });
  expect(saved.weeklyBudget).toBeUndefined();
  expect(saved.nickname).toBeUndefined();
  expect(saved.pinHash).toMatch(/^[a-f0-9]{64}$/);
  expect(saved.avatar).toEqual({ skin: "tan", hair: "curly", apron: "coral" });
  expect(await page.evaluate(() => localStorage.getItem("healthy-steps-signup-draft-v1"))).toBeNull();
});

test("sign-up fits a 360px phone without sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(await fits()).toBe(true);
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByLabel("Your first name").fill("Jo");
  await next(page);
  expect(await fits()).toBe(true);
  await page.getByRole("button", { name: "9", exact: true }).click();
  await next(page);
  await page.getByRole("button", { name: "2", exact: true }).click();
  await next(page);
  expect(await fits()).toBe(true);
  const box = await page.getByRole("button", { name: "Continue", exact: true }).boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(48);
});

test("an idle lock keeps unsaved settings edits for after the PIN", async ({ page }) => {
  await page.clock.install();
  await setup(page);
  await openSettings(page);
  for (let step = 0; step < 2; step++) await page.getByRole("button", { name: /Continue/ }).click();
  const budget = page.getByRole("spinbutton", { name: /Weekly grocery budget/ });
  await budget.fill("88");
  await page.clock.fastForward("05:01");
  await expect(page.getByRole("heading", { name: "Grown-ups only" })).toBeVisible();
  await expect(budget).toHaveCount(0);
  await unlock(page);
  await expect(budget).toHaveValue("88");
});

/** Seeds a saved child profile once, so reloads keep later edits. */
async function seedFamily(page: Page, extra: Record<string, unknown> = {}) {
  const pin = await createParentPin(PIN);
  await page.addInitScript((fields) => {
    if (!localStorage.getItem("healthy-steps-family-v1"))
      localStorage.setItem("healthy-steps-family-v1", JSON.stringify({
        version: 1, age: 7, pantry: ["Banana"], allergies: [], otherAllergies: "",
        allergyConfirmed: true, parentConfirmed: true, ...fields,
      }));
  }, { ...pin, ...extra });
  await page.goto("/");
  await asChild(page);
}
async function openChildProfile(page: Page) {
  await page.getByRole("button", { name: "Parent settings" }).click();
  await unlock(page);
  await page.getByRole("button", { name: "Child profile", exact: true }).click();
}
const savedFamily = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("healthy-steps-family-v1") ?? "{}"));

test("each child profile Edit button opens the matching setup step", async ({ page }) => {
  await seedFamily(page);
  await openChildProfile(page);
  for (const [button, heading] of [
    ["Edit pantry", "Your pantry"],
    ["Edit foods to avoid", "Foods to avoid"],
    ["Edit family details", "Family details"],
  ] as const) {
    await page.getByRole("button", { name: button }).click();
    await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    if (heading === "Family details")
      await expect(page.getByRole("spinbutton", { name: "Child’s age" })).toHaveValue("7");
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Chef Seedy" })).toBeVisible();
  }
  // A Seedy profile has nothing to reset.
  await expect(page.getByRole("button", { name: "Reset chef to Seedy" })).toHaveCount(0);
});

test("an older custom chef look is kept through edits and a grown-up can reset it to Seedy", async ({ page }) => {
  const avatar = { skin: "deep", hair: "buns", apron: "mint" };
  await seedFamily(page, { nickname: "Eli", avatar });
  // The old chef name is never shown: the companion is always Chef Seedy.
  await expect(page.getByRole("heading", { name: /Hey, Chef Seedy/ })).toBeVisible();
  await openChildProfile(page);
  await page.getByRole("button", { name: "Edit everything" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { name: /Hey, Chef Seedy/ })).toBeVisible();
  expect((await savedFamily(page)).avatar).toEqual(avatar);

  await openChildProfile(page);
  await expect(page.getByRole("heading", { name: "Chef Seedy" })).toBeVisible();
  await page.getByRole("button", { name: "Reset chef to Seedy" }).click();
  await expect(page.getByRole("heading", { name: "Chef Seedy" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset chef to Seedy" })).toHaveCount(0);
  const saved = await savedFamily(page);
  expect(saved.nickname).toBeUndefined();
  expect(saved.avatar).toBeUndefined();
  await page.reload();
  await asChild(page);
  await expect(page.getByRole("heading", { name: /Hey, Chef Seedy/ })).toBeVisible();
});
