import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => ({
        selector: node.target.join(" "),
        summary: node.failureSummary,
      })),
    })),
  ).toEqual([]);
}

for (const [path, title] of [
  ["/", "Home | Axiom Garden"],
  ["/workspace", "Workspace | Axiom Garden"],
  ["/components", "Components | Axiom Garden"],
  ["/missing", "Page not found | Axiom Garden"],
] as const) {
  test(`axe scan passes for ${path}`, async ({ page }) => {
    await page.route("**/api/health", async (route) => {
      await route.fulfill({
        json: {
          status: "ok",
          service: "axiom-garden-worker",
          version: "0.1.0",
          timestamp: "2026-07-26T12:00:00.000Z",
        },
      });
    });
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    await expectNoA11yViolations(page);
  });
}

test("axe scan passes with Help dialog open", async ({ page }) => {
  await page.route("**/api/health", async (route) => {
    await route.fulfill({
      json: {
        status: "ok",
        service: "axiom-garden-worker",
        version: "0.1.0",
        timestamp: "2026-07-26T12:00:00.000Z",
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Open help" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectNoA11yViolations(page);
});
