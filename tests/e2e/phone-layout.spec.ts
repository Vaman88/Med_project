import { test, expect, type Page } from "@playwright/test";
import { createParentPin } from "../../src/lib/parent-lock";

// Every main screen must fit a 360px-wide phone: no sideways scrolling.
// One run is enough, so this file runs in the phone project only.
test.use({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true });
test.describe.configure({ timeout: 120_000 });
test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile-chromium", "phone layout check runs once, at 360px"));

const PIN = "2468";
const PANTRY = ["Black beans", "Oats", "Banana", "Cocoa", "Egg", "Whole wheat pita", "Tomato", "Mozzarella",
  "Bell pepper", "Plain yogurt", "Strawberries", "Carrots", "Cucumber", "Hummus", "Canned black beans", "Canned corn"];

/** Fails with the screen name and the elements sticking out if the page scrolls sideways. */
async function expectFits(page: Page, screen: string) {
  await page.waitForTimeout(150);
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const width = root.clientWidth;
    const clippedByParent = (el: Element) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement)
        if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX)) return true;
      return false;
    };
    const offenders = [...document.body.querySelectorAll("*")]
      .filter((el) => !el.closest("svg"))
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > width + 1 || r.left < -1); })
      .filter((el) => !clippedByParent(el) && getComputedStyle(el).position !== "fixed")
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} "${(el.textContent ?? "").trim().slice(0, 30)}"`);
    return { scrollWidth: root.scrollWidth, width, offenders };
  });
  expect(result.scrollWidth, `${screen} scrolls sideways at 360px: ${result.offenders.join(", ")}`).toBeLessThanOrEqual(result.width);
}

async function seedFamily(page: Page, age: number) {
  const pin = await createParentPin(PIN);
  await page.addInitScript((family) => {
    if (!localStorage.getItem("healthy-steps-family-v1")) localStorage.setItem("healthy-steps-family-v1", JSON.stringify(family));
  }, { version: 1, parentName: "Sam", age, pantry: PANTRY, allergies: [], otherAllergies: "", allergyConfirmed: true, parentConfirmed: true, ...pin });
  await page.goto("/");
}

test("every sign-up step fits a 360px phone", async ({ page }) => {
  await page.goto("/");
  await expectFits(page, "welcome");
  await page.getByRole("button", { name: "Get started" }).click();
  await expectFits(page, "sign-up: name");
  await page.getByLabel("Your first name").fill("Maya");
  const next = () => page.getByRole("button", { name: "Continue", exact: true }).click();
  await next();
  await expectFits(page, "sign-up: age");
  await page.getByRole("group", { name: "Child’s age" }).getByRole("button", { name: "7", exact: true }).click();
  await next();
  await expectFits(page, "sign-up: household");
  await page.getByRole("group", { name: "People eating at home" }).getByRole("button", { name: "4", exact: true }).click();
  await next();
  const search = page.getByRole("combobox", { name: "Search for a food" });
  for (const food of ["Black beans", "Whole wheat pita", "Plain yogurt"]) {
    await search.fill(food);
    await page.getByRole("option", { name: food, exact: true }).click();
  }
  await search.fill("ch");
  await expectFits(page, "sign-up: pantry search open");
  await search.fill("");
  await next();
  await expectFits(page, "sign-up: equipment");
  await next();
  await expectFits(page, "sign-up: foods to avoid");
  await page.getByRole("button", { name: "No known food allergies" }).click();
  await next();
  await expectFits(page, "sign-up: diet");
  await page.getByRole("button", { name: "No special diet" }).click();
  await next();
  await expectFits(page, "sign-up: budget");
  await page.getByRole("button", { name: "$50", exact: true }).click();
  await next();
  await page.getByLabel("Parent PIN (4–8 digits)").fill(PIN);
  await page.getByLabel("Type the Parent PIN again").fill(PIN);
  await page.getByRole("checkbox", { name: /I am a parent or guardian/ }).check();
  await expectFits(page, "sign-up: Parent PIN");
  await page.getByRole("button", { name: /^(Finish|Continue)$/ }).click();
  // With online accounts configured, an optional account step comes before the chooser.
  const skip = page.getByRole("button", { name: "Skip for now" });
  const done = page.getByRole("heading", { name: "You’re all set, Maya!" });
  await expect(done.or(skip)).toBeVisible({ timeout: 15_000 });
  if (await skip.isVisible()) {
    await expectFits(page, "sign-up: online account");
    await skip.click();
  }
  await expect(done).toBeVisible({ timeout: 15_000 });
  await expectFits(page, "account chooser");
});

test("the parent PIN screen and every meal planner tab fit a 360px phone", async ({ page }) => {
  await page.route(/\/api\/recipe-library\?q=/, (route) => route.fulfill({ json: { dishes: [
    { id: "52772", name: "Teriyaki chicken casserole with a long name", image: "/images/adult/kitchen-table.jpg", category: "Chicken" },
  ] } }));
  await page.route(/\/api\/recipe-library\?id=/, (route) => route.fulfill({ json: { recipe: {
    id: "52772", name: "Teriyaki chicken casserole with a long name", image: "/images/adult/kitchen-table.jpg",
    ingredients: [{ name: "Eggs", measure: "2" }], steps: ["Cook it."],
  } } }));
  await seedFamily(page, 9);
  await expect(page.getByRole("heading", { name: "Welcome back, Sam!" })).toBeVisible();
  await expectFits(page, "account chooser");
  await page.getByRole("button", { name: /Parent account/ }).click();
  await expect(page.getByRole("heading", { name: "Grown-ups only" })).toBeVisible();
  await expectFits(page, "Parent PIN");
  await page.getByLabel("Parent PIN", { exact: true }).fill(PIN);
  await page.getByRole("button", { name: "Open parent area" }).click();
  await expect(page.getByRole("heading", { name: "What's in your kitchen today?" })).toBeVisible({ timeout: 15_000 });
  // The top navigation used to run off the right edge at 360px.
  const help = page.getByRole("button", { name: "Find Food Help" });
  const box = (await help.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(360);
  await expectFits(page, "planner: My Kitchen");
  await page.getByRole("combobox", { name: "Food name" }).fill("ba");
  await expectFits(page, "planner: food search open");
  await page.getByRole("combobox", { name: "Food name" }).fill("");
  await page.getByRole("button", { name: "Change budget and family" }).click();
  await page.getByText("Allergies and family food needs", { exact: true }).click();
  await expectFits(page, "planner: budget and family");
  await page.getByRole("button", { name: "Meal Ideas", exact: true }).click();
  await expectFits(page, "planner: Meal Ideas");
  await page.getByRole("button", { name: "Recipes", exact: true }).click();
  await page.getByRole("button", { name: /Open recipe:/ }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectFits(page, "planner: recipe dialog");
  await page.keyboard.press("Escape");
  await expectFits(page, "planner: Recipes");
  await page.getByRole("button", { name: "Find Food Help", exact: true }).click();
  await expectFits(page, "planner: Find Food Help");
  await page.getByRole("button", { name: "Child profile", exact: true }).click();
  await expectFits(page, "child profile");
  await page.getByRole("button", { name: "Edit everything" }).click();
  await expectFits(page, "settings wizard");
});

test("the kids' kitchen, cooking studio and cookbook fit a 360px phone", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedFamily(page, 7);
  await page.getByRole("button", { name: /Child account/ }).click();
  await expect(page.getByRole("button", { name: "See all dishes" })).toBeVisible();
  await expectFits(page, "kids' home");
  await page.getByRole("button", { name: "See all dishes" }).click();
  await expectFits(page, "all dishes");
  await page.locator(".km-card").filter({ hasText: "Banana berry yogurt parfait" }).getByRole("button", { name: "Cook this" }).click();
  await expect(page.locator(".ck-app")).toBeVisible();
  await expectFits(page, "cooking studio");
  // The whole dish name shows instead of "Banana berry yogurt par…".
  const title = page.locator(".ck-title");
  expect(await title.evaluate((el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight + 1)).toBe(true);
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("dialog", { name: "Game paused" })).toBeVisible();
  await expectFits(page, "cooking studio: paused");
  await page.getByRole("button", { name: "Back to recipes" }).click();
  await page.getByRole("button", { name: "My Cookbook" }).click();
  await expect(page.getByRole("heading", { name: "My cookbook" })).toBeVisible();
  await expectFits(page, "cookbook");
});
