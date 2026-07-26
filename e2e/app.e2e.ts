import { expect, test } from "@playwright/test";

const healthResponse = {
  status: "ok",
  service: "axiom-garden-worker",
  version: "0.1.0",
  timestamp: "2026-07-26T12:00:00.000Z",
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", async (route) => {
    await route.fulfill({ json: healthResponse });
  });
});

test("home opens and reports a healthy controlled Worker response", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Home | Axiom Garden");
  await expect(page.getByRole("heading", { name: /Axiom Garden\s*公理花园/u })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Worker healthy");
});

test("moves from Home into the static Workspace", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Explore workspace shell/u }).click();
  await expect(page).toHaveURL(/\/workspace$/u);
  await expect(page.getByRole("heading", { name: "Workspace shell preview" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Canvas placeholder" })).toBeVisible();
});

test("opens and closes the mobile Inspector drawer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/workspace");
  await page.getByRole("button", { name: "Open inspector" }).click();
  await expect(page.getByRole("dialog", { name: "Inspector preview" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("switches theme and persists the preference", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Theme:/u }).click();
  await page.getByRole("menuitem", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("opens Help and closes it with Escape", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open help" });
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "About this foundation" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("opens Components and returns from a missing route", async ({ page }) => {
  await page.goto("/components");
  await expect(page).toHaveTitle("Components | Axiom Garden");
  await expect(page.getByRole("heading", { name: "Design system" })).toBeVisible();

  await page.goto("/not-a-route");
  await expect(page).toHaveTitle("Page not found | Axiom Garden");
  await page.getByRole("link", { name: "Return Home" }).click();
  await expect(page).toHaveURL(/\/$/u);
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
]) {
  test(`has no horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/components");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
