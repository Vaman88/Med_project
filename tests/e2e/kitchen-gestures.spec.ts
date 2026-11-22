import { test, expect, type Page, type TestInfo } from "@playwright/test";

// Chop, mash and whisk with real pointer drags: mouse on desktop, real touch
// (through the Chrome DevTools protocol) on the phone. The labelled buttons stay the
// tap and keyboard route, and 5 to 6 year olds get tap-only actions.
test.describe.configure({ timeout: 150_000 });

async function seedFamily(page: Page, age = 8) {
  await page.addInitScript((a) => localStorage.setItem("healthy-steps-family-v1", JSON.stringify({
    version: 1, age: a, nickname: "Sunny", avatar: { skin: "tan", hair: "curly", apron: "coral" },
    pantry: ["Black beans", "Oats", "Banana", "Cocoa", "Egg", "Whole wheat pita", "Tomato", "Mozzarella", "Bell pepper",
      "Plain yogurt", "Strawberries", "Carrots", "Cucumber", "Hummus", "Canned black beans", "Canned corn"],
    allergies: [], otherAllergies: "", allergyConfirmed: true, parentConfirmed: true,
  })), age);
  await page.goto("/");
  await page.getByRole("button", { name: /Child account/ }).click();
  await page.getByRole("button", { name: "See all dishes" }).click();
}
async function start(page: Page, title: string) {
  await page.locator(".km-card").filter({ hasText: title }).getByRole("button", { name: "Cook this" }).click();
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
}
const stepTitle = (page: Page) => page.locator(".ck-step-title");
const kind = (page: Page) => page.locator(".ck-app").getAttribute("data-step-kind");

/** Plays the non-gesture steps (drops, quizzes) with buttons, until a step of `until` kind. */
async function playUntil(page: Page, until: string) {
  for (let guard = 0; guard < 12; guard++) {
    const k = await kind(page);
    if (k === until) return;
    const title = await stepTitle(page).innerText();
    if (k === "drop") {
      const zone = page.locator(".ck-hot").first();
      for (let i = 0; i < 8 && (await stepTitle(page).innerText().catch(() => "")) === title; i++) {
        const chip = page.locator(".ck-chip:not(:disabled)").first();
        if (!(await chip.count())) break;
        await chip.click();
        const box = await zone.boundingBox();
        await zone.click({ position: box ? { x: Math.min(150, box.width / 2), y: Math.min(150, box.height / 2) } : undefined });
        await page.waitForTimeout(150);
      }
      const finish = page.locator(".ck-finish");
      if ((await stepTitle(page).innerText().catch(() => "")) === title && await finish.count() && await finish.isEnabled()) await finish.click();
    } else if (k === "quiz") {
      await page.getByRole("button", { name: "Skip question" }).click();
    } else throw new Error(`Unexpected step ${k} before ${until}`);
    await expect(stepTitle(page)).not.toHaveText(title, { timeout: 10_000 });
  }
  throw new Error(`Never reached a ${until} step`);
}

/** Maps a point in the scene's SVG units to page pixels. */
async function toPage(page: Page, x: number, y: number) {
  const layer = page.locator(".ck-gesture-layer");
  const [vx, vy, vw, vh] = (await layer.getAttribute("viewBox"))!.split(/\s+/).map(Number);
  const box = (await page.locator(".ck-stage").boundingBox())!;
  const s = Math.min(box.width / vw, box.height / vh);
  return { x: box.x + (box.width - vw * s) / 2 + (x - vx) * s, y: box.y + (box.height - vh * s) / 2 + (y - vy) * s };
}

/** A real drag along SVG points: mouse on desktop, a finger on touch devices. */
async function drag(page: Page, info: TestInfo, path: { x: number; y: number }[], pauseMs = 0) {
  const pts = await Promise.all(path.map((p) => toPage(page, p.x, p.y)));
  if (info.project.use.hasTouch) {
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", p?: { x: number; y: number }) =>
      cdp.send("Input.dispatchTouchEvent", { type, touchPoints: p ? [{ x: p.x, y: p.y, id: 1, radiusX: 8, radiusY: 8, force: 1 }] : [] });
    await touch("touchStart", pts[0]);
    for (const p of pts.slice(1)) { await touch("touchMove", p); if (pauseMs) await page.waitForTimeout(pauseMs); }
    await touch("touchEnd");
    await cdp.detach();
  } else {
    await page.mouse.move(pts[0].x, pts[0].y);
    await page.mouse.down();
    for (const p of pts.slice(1)) { await page.mouse.move(p.x, p.y, { steps: 2 }); if (pauseMs) await page.waitForTimeout(pauseMs); }
    await page.mouse.up();
  }
}

/** Swipes the knife down through every dashed line on the board. */
async function chopAll(page: Page, info: TestInfo) {
  const marks = page.getByRole("button", { name: /Cut mark/ });
  const title = await stepTitle(page).innerText();
  for (let guard = 0; guard < 8 && await marks.count() && (await stepTitle(page).innerText()) === title; guard++) {
    const before = await marks.count();
    const line = page.locator(".ck-chop-guide").first();
    const x = Number(await line.getAttribute("x1")), y1 = Number(await line.getAttribute("y1")), y2 = Number(await line.getAttribute("y2"));
    // A slightly slanted, not-quite-on-the-line swipe still counts (forgiving).
    await drag(page, info, Array.from({ length: 9 }, (_, i) => ({ x: x + 10 + i * 1.5, y: y1 - 50 + ((y2 - y1 + 70) * i) / 8 })));
    // The last cut finishes the step, and the next food's marks may already be showing.
    await expect.poll(async () => (await stepTitle(page).innerText()) !== title || (await marks.count()) === before - 1).toBe(true);
    await page.waitForTimeout(200);
  }
  // Every line is cut: the step settles, then the game moves on by itself.
  await expect(stepTitle(page)).not.toHaveText(title, { timeout: 8000 });
}

test("chop, then stir, with real swipes and circles (fruit salad)", async ({ page }, info) => {
  await seedFamily(page);
  await start(page, "Rainbow fruit salad");
  await playUntil(page, "cut");
  await expect(stepTitle(page)).toHaveText("Slice the banana");
  await expect(page.locator(".ck-gmeter")).toHaveAttribute("aria-valuenow", "0");
  await chopAll(page, info);
  await page.screenshot({ path: info.outputPath("chop-banana-done.png") });
  await expect(stepTitle(page)).toHaveText("Slice the strawberry", { timeout: 5000 });
  await chopAll(page, info);
  await playUntil(page, "stir");
  // Draw circles in the bowl: the meter fills from "Separate" to "Mixed".
  const circle = Array.from({ length: 3 * 16 + 1 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return { x: 400 + Math.cos(a) * 110, y: 262 + Math.sin(a) * 110 };
  });
  const title = await stepTitle(page).innerText();
  await drag(page, info, circle.slice(0, 12));
  await expect.poll(async () => Number(await page.locator(".ck-gmeter").getAttribute("aria-valuenow"))).toBeGreaterThan(30);
  await page.screenshot({ path: info.outputPath("stir-half.png") });
  await drag(page, info, circle);
  await expect(stepTitle(page)).not.toHaveText(title, { timeout: 5000 });
});

test("mash with presses and a scrub, then whisk (pancakes)", async ({ page }, info) => {
  await seedFamily(page);
  await start(page, "Banana oat pancakes");
  await playUntil(page, "mash");
  const spots = page.getByRole("button", { name: /Mash spot/ });
  await expect(spots).toHaveCount(4);
  // One press flattens the first lump a stage; it isn't mash yet (3 presses each).
  const lump = page.locator("[data-lump='0']");
  await spots.first().click();
  await expect(lump).toHaveAttribute("data-presses", "1");
  await expect(spots).toHaveCount(4);
  await page.screenshot({ path: info.outputPath("mash-one-press.png") });
  // Hold and scrub back and forth across the bowl to mash the rest.
  const xs = [287, 362, 437, 512];
  const path = Array.from({ length: 40 }, (_, i) => ({ x: xs[Math.abs(((i + 3) % 6) - 3)], y: 262 + (i % 2 ? 6 : -6) }));
  await drag(page, info, path, 170);
  await expect(spots).toHaveCount(0, { timeout: 5000 });
  await expect(stepTitle(page)).not.toHaveText("Mash the banana", { timeout: 5000 });
  await playUntil(page, "stir");
  await expect(page.locator(".ck-whisk")).toBeVisible();
  const circle = Array.from({ length: 3 * 16 + 1 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return { x: 400 + Math.cos(a) * 100, y: 262 + Math.sin(a) * 100 };
  });
  await drag(page, info, circle);
  await expect(stepTitle(page)).toHaveText("Pour batter into the pan", { timeout: 5000 });
});

test("the keyboard and plain taps still chop, mash and stir", async ({ page }, info) => {
  test.skip(!!info.project.use.hasTouch, "The keyboard route is checked on desktop.");
  await seedFamily(page);
  await start(page, "Banana oat pancakes");
  await playUntil(page, "mash");
  // Enter on a spot mashes it all the way.
  const spots = page.getByRole("button", { name: /Mash spot/ });
  for (let i = 4; i > 0; i--) {
    await spots.first().focus();
    await page.keyboard.press("Enter");
    await expect(spots).toHaveCount(i - 1);
  }
  await expect(stepTitle(page)).not.toHaveText("Mash the banana", { timeout: 5000 });
  await playUntil(page, "stir");
  const title = await stepTitle(page).innerText();
  await page.getByRole("button", { name: "Stir the bowl" }).focus();
  for (let i = 0; i < 8 && (await stepTitle(page).innerText()) === title; i++) { await page.keyboard.press("Enter"); await page.waitForTimeout(60); }
  await expect(stepTitle(page)).not.toHaveText(title, { timeout: 5000 });

  await page.getByRole("button", { name: "Back to menu" }).click();
  await start(page, "Rainbow fruit salad");
  await playUntil(page, "cut");
  const marks = page.getByRole("button", { name: /Cut mark/ });
  await marks.first().focus();
  await page.keyboard.press("Enter");
  await expect(marks).toHaveCount(2);
  // A plain click on a mark chops it too.
  await marks.first().click();
  await expect(marks).toHaveCount(1);
});

test("tap-only for the youngest chefs: a tap anywhere chops, presses snap to lumps", async ({ page }, info) => {
  await seedFamily(page, 6);
  await start(page, "Rainbow fruit salad");
  await playUntil(page, "cut");
  await expect(page.locator(".ck-stage")).toHaveAttribute("data-tap-only", "true");
  const marks = page.getByRole("button", { name: /Cut mark/ });
  for (let n = 3; n > 0; n--) {
    // Tap on the food itself, away from the numbered buttons.
    const p = await toPage(page, 400, 300);
    await page.mouse.click(p.x, p.y);
    await expect(marks).toHaveCount(n - 1);
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: info.outputPath("tap-only-chopped.png") });
});

test("a swipe that starts just above the dish frame still chops a tall food", async ({ page }, info) => {
  // Only phones have an empty band around the dish; on a wide screen the food has room inside the frame.
  test.skip(!info.project.use.hasTouch, "The band around the dish exists on phones.");
  await seedFamily(page);
  await start(page, "Cozy tomato pasta");
  await playUntil(page, "cut");
  await expect(stepTitle(page)).toHaveText("Dice the tomato");
  const marks = page.getByRole("button", { name: /Cut mark/ });
  await expect(marks).toHaveCount(2);
  const line = page.locator(".ck-chop-guide").first();
  const x = Number(await line.getAttribute("x1")), y2 = Number(await line.getAttribute("y2"));
  const frame = (await page.locator(".ck-stage").boundingBox())!;
  const viewTop = Number((await page.locator(".ck-gesture-layer").getAttribute("viewBox"))!.split(/\s+/)[1]);
  // 16 CSS px above the frame, in the empty band between the instruction and the dish.
  const above = viewTop - (16 * Number((await page.locator(".ck-gesture-layer").getAttribute("viewBox"))!.split(/\s+/)[2])) / frame.width;
  await drag(page, info, Array.from({ length: 10 }, (_, i) => ({ x: x + 4, y: above + ((y2 - above) * i) / 9 })));
  await expect(marks).toHaveCount(1);
  // A plain tap out there does nothing: no cut and no nudge.
  const p = await toPage(page, x + 120, above);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(300);
  await expect(marks).toHaveCount(1);
  await expect(page.locator(".ck-hint")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("tomato-one-cut.png") });
});

test("swiping does not scroll the page and the console stays clean", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await seedFamily(page);
  await start(page, "Rainbow fruit salad");
  await playUntil(page, "cut");
  const before = await page.evaluate(() => scrollY);
  await chopAll(page, info);
  expect(await page.evaluate(() => scrollY)).toBe(before);
  expect(await page.locator(".ck-stage").evaluate((el) => getComputedStyle(el).touchAction)).toBe("none");
  expect(errors).toEqual([]);
});
