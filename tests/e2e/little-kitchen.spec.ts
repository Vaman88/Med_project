import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { recipeChallenges } from "../../src/lib/chef-challenges";
import { littleRecipes } from "../../src/lib/little-kitchen";

const kidsCount = littleRecipes.length;
async function asChild(page: Page) {
  await page.getByRole("button", { name: /Continue as a child/ }).click();
}
async function setup(page: Page, age = 7, allergy?: string, info?: TestInfo) {
  await page.goto("/");
  // With no child profile yet, the child choice opens the parent setup.
  await asChild(page);
  if (info)
    await page.screenshot({
      path: info.outputPath("parent-wizard.png"),
      fullPage: true,
    });
  await page.getByRole("textbox", { name: "Chef nickname" }).fill("Sunny");
  await page.getByRole("spinbutton", { name: "Child’s age" }).fill(String(age));
  await page.getByRole("button", { name: /Continue/ }).click();
  const pantry = page.getByRole("group", { name: "What’s in your pantry?" });
  const search = pantry.getByRole("combobox", { name: "Search for a food" });
  for (const food of [
    "Black beans",
    "Oats",
    "Banana",
    "Cocoa",
    "Egg",
    "Whole wheat pita",
    "Tomato",
    "Mozzarella",
    "Bell pepper",
    "Plain yogurt",
  ])
  {
    await search.fill(food);
    await pantry.getByRole("option", { name: food, exact: true }).click();
  }
  await page.getByRole("button", { name: /Continue/ }).click();
  if (allergy)
    await page
      .getByRole("group", { name: "Food allergies and exclusions" })
      .getByRole("checkbox", { name: allergy, exact: true })
      .check();
  await page
    .getByRole("checkbox", {
      name: allergy
        ? "I have checked the allergy and exclusion list."
        : "I confirm there are no known food allergies.",
    })
    .check();
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByRole("textbox", { name: /Parent PIN/ })).toHaveCount(0);
  await page
    .getByRole("checkbox", { name: "I am a parent or guardian", exact: false })
    .check();
  await page
    .getByRole("button", { name: "Create kitchen", exact: true })
    .click();
  if (age < 13)
    await expect(page.locator(".km-card")).toHaveCount(allergy ? kidsCount - 4 : kidsCount);
  else
    await expect(
      page.getByRole("heading", { name: "What's in your kitchen today?" }),
    ).toBeVisible();
}
async function start(page: Page, title: string) {
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
  await page.getByRole("button", { name: "Edit child profile" }).click();
}

test("parent settings open the original planner without a PIN and keep its changes", async ({ page }) => {
  await setup(page);
  await page.getByRole("button", { name: "Parent settings" }).click();
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
  await expect(page.getByRole("heading", { name: /Hey, Chef Sunny/ })).toBeVisible();
  await page.reload();
  await asChild(page);
  await expect(page.getByRole("heading", { name: /Hey, Chef Sunny/ })).toBeVisible();
  await page.getByRole("button", { name: "Parent settings" }).click();
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
      const chip = page.locator(".ck-chip").first();
      if (!(await chip.count())) break;
      await chip.click();
      await expect(chip).toHaveAttribute("aria-pressed", "true");
      await zone.click({ position: { x: 150, y: 150 } });
      await page.waitForTimeout(kind === "drop" ? 120 : 250);
      if (kind !== "drop") await expect(page.locator(".ck-spoon-path, .ck-pour-path")).toHaveCount(0, { timeout: 4000 });
    }
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
  // Every dish, each played step by step with buttons only.
  test.setTimeout(900000);
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
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: "Remove Tomato" }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page
    .getByRole("checkbox", { name: "I am a parent or guardian", exact: false })
    .check();
  await page.getByRole("button", { name: "Save kitchen" }).click();
  const pizza = page.locator(".km-card").filter({ hasText: "Rainbow mini pizzas" });
  await expect(pizza).toContainText("a grown-up may need to add");
  await expect(pizza).toContainText("Tomato");
  await expect(pizza.getByRole("button", { name: "Cook this" })).toBeEnabled();
});
test("an unlocked parent can save existing profile changes", async ({ page }) => {
  await setup(page);
  await openSettings(page);
  await page.getByRole("textbox", { name: "Chef nickname" }).fill("River");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { name: /Hey, Chef River/ })).toBeVisible();

  await page.reload();
  await asChild(page);
  await openSettings(page);
  for (let step = 0; step < 3; step++)
    await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("spinbutton", { name: /Weekly grocery budget/ }).fill("75");
  await page.getByRole("button", { name: "Save kitchen" }).click();
  await expect(page.getByRole("heading", { name: /Hey, Chef River/ })).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("healthy-steps-family-v1") ?? "{}"),
  );
  expect(saved.nickname).toBe("River");
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
test("the greeting never repeats the chef title", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("healthy-steps-family-v1", JSON.stringify({
    version: 1, age: 7, nickname: "Chef Eli", pantry: ["Banana"],
    allergies: [], otherAllergies: "", allergyConfirmed: true, parentConfirmed: true,
  })));
  await page.goto("/");
  await asChild(page);
  await expect(page.getByRole("heading", { name: "Hey, Chef Eli! What’s cooking?" })).toBeVisible();
});
test("My Cookbook stays visible and explains an empty cookbook", async ({ page }) => {
  await setup(page);
  const tab = page.getByRole("button", { name: "My Cookbook" });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Your cookbook is waiting!" })).toBeVisible();
});
test("older teens retain original planner", async ({ page }) => {
  await setup(page, 13, "Peanut");
  await expect(
    page.getByRole("heading", { name: "What's in your kitchen today?" }),
  ).toBeVisible();
  await expect(page.locator(".pantry-list")).toContainText("Black beans");
  await page.reload();
  // The chooser comes first; a teen's family opens the planner without a PIN.
  await page.getByRole("button", { name: /Continue as an adult/ }).click();
  await expect(
    page.getByRole("heading", { name: "What's in your kitchen today?" }),
  ).toBeVisible();
});
test("age twelve sees the child cooking game", async ({ page }) => {
  await setup(page, 12);
  await expect(page.getByRole("heading", { name: /Hey, Chef Sunny/ })).toBeVisible();
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

test("the role chooser sends a child and an adult to the right place", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Who is cooking today?" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue as a child/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue as an adult/ })).toBeVisible();
  // No child profile yet: the child choice opens the parent setup.
  await asChild(page);
  await expect(page.getByRole("textbox", { name: "Chef nickname" })).toBeVisible();
  await setup(page);
  await page.getByRole("button", { name: "Switch profile" }).click();
  await expect(page.getByRole("heading", { name: "Who is cooking today?" })).toBeVisible();
  await asChild(page);
  await expect(page.getByRole("heading", { name: /Hey, Chef Sunny/ })).toBeVisible();
  await page.getByRole("button", { name: "Switch profile" }).click();
  // A child profile exists; with no Parent PIN the adult choice opens the parent area directly.
  await page.getByRole("button", { name: /Continue as an adult/ }).click();
  await expect(page.getByRole("heading", { name: "Grown-ups only" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "What's in your kitchen today?" })).toBeVisible();
  await page.getByRole("button", { name: "Switch profile" }).click();
  await expect(page.getByRole("heading", { name: "Who is cooking today?" })).toBeVisible();
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
