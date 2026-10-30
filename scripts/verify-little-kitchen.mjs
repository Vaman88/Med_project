import { chromium, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const folder = "docs/little-kitchen-audit";
await mkdir(folder, { recursive: true });
const browser = await chromium.launch();
try {
  const views = [
    ...[360, 390, 768, 1440].map((width) => ({ width, dark: false })),
    { width: 390, dark: true },
    { width: 1440, dark: true },
  ];
  for (const { width, dark } of views) {
    const page = await browser.newPage({
      ...(width === 390 ? devices["iPhone 13"] : {}),
      viewport: { width, height: 900 },
      colorScheme: dark ? "dark" : "light",
      reducedMotion: dark ? "reduce" : "no-preference",
    });
    const failed = [];
    page.on("response", (response) => {
      if (response.status() >= 400)
        failed.push(`${response.status()} ${response.url()}`);
    });
    await page.addInitScript(() =>
      localStorage.setItem(
        "healthy-steps-family-v1",
        JSON.stringify({
          version: 1,
          age: 7,
          pantry: [
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
          ],
          allergies: [],
          otherAllergies: "",
          allergyConfirmed: true,
          parentConfirmed: true,
        }),
      ),
    );
    await page.goto("http://127.0.0.1:3197/");
    await page.locator(".km-card").first().waitFor();
    await page.reload();
    await page.locator(".km-card").first().waitFor();
    for (const img of await page.locator(".little-app img").all()) {
      await img.scrollIntoViewIfNeeded();
      await img.evaluate(async (element) => {
        await element.decode();
      });
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: `${folder}/menu-${width}${dark ? "-dark" : ""}.png`,
      fullPage: true,
    });
    console.log(
      JSON.stringify({
        width,
        dark,
        overflow: await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        images: await page.locator("img").evaluateAll((images) =>
          images.map((i) => ({
            src: i.currentSrc,
            loaded: i.complete && i.naturalWidth > 0,
          })),
        ),
        failed,
      }),
    );
    await page.getByRole("button", { name: "Parent settings" }).click();
    await page.screenshot({
      path: `${folder}/parent-${width}${dark ? "-dark" : ""}.png`,
      fullPage: true,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
