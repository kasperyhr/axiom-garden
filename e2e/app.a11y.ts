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
  ["/world-format", "World format v1 | Axiom Garden"],
  ["/engine", "Engine playground | Axiom Garden"],
  ["/viewer", "World viewer | Axiom Garden"],
  ["/editor", "World editor | Axiom Garden"],
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

test("axe scan passes with an Engine receipt", async ({ page }) => {
  await page.goto("/engine");
  await page.getByRole("button", { name: "No-op step" }).click();
  await expect(page.getByText("transition:no-op-0")).toBeVisible();
  await expectNoA11yViolations(page);
});

test("axe scan passes with an Engine issue", async ({ page }) => {
  await page.goto("/engine");
  await page.getByRole("button", { name: "Tamper snapshot demo" }).click();
  await expect(page.getByText("snapshot_digest_mismatch")).toBeVisible();
  await expectNoA11yViolations(page);
});

test("axe scan passes with a Viewer entity selection", async ({ page }) => {
  await page.goto("/viewer");
  const canvas = page.getByTestId("world-canvas");
  await canvas.focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByText("entity:circle-002").first()).toBeVisible();
  await expectNoA11yViolations(page);
});

test("axe scan passes for the mobile Viewer panels in dark theme", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/viewer");
  await page.getByRole("button", { name: /Theme:/u }).click();
  await page.getByRole("menuitem", { name: "Dark" }).click();
  await page.getByRole("button", { name: "Inspector" }).click();
  await expect(page.getByRole("dialog", { name: "Viewer inspector" })).toBeVisible();
  await expectNoA11yViolations(page);
});

test("axe scan passes for Editor selection and confirmation dialog", async ({ page }) => {
  await page.goto("/editor");
  const canvas = page.getByTestId("editor-canvas");
  await canvas.focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Entity inspector" })).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByLabel("Property 1 key").fill("__proto__");
  await page.getByRole("button", { name: "Apply entity changes" }).click();
  await expect(
    page.getByLabel("Editor validation issues").getByText("invalid_command"),
  ).toBeVisible();
  await expectNoA11yViolations(page);
  await page
    .getByRole("region", { name: "Editor toolbar" })
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.getByRole("dialog", { name: "Delete selection?" })).toBeVisible();
  await expectNoA11yViolations(page);
});

test("axe scan passes for Editor creation and JSON preview dialogs", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByRole("heading", { name: "World Editor" })).toBeVisible();

  const symbolPanel = page.locator(".editor-left-panel .editor-palette");
  await symbolPanel.getByRole("button", { name: "New" }).click();
  await expect(page.getByRole("dialog", { name: "Create symbol" })).toBeVisible();
  await expectNoA11yViolations(page);
  await page.keyboard.press("Escape");

  const layerPanel = page.locator(".editor-right-panel .editor-layers");
  await layerPanel.getByRole("button", { name: "New" }).click();
  await expect(page.getByRole("dialog", { name: "Create layer" })).toBeVisible();
  await expectNoA11yViolations(page);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Preview JSON" }).click();
  await expect(page.getByRole("dialog", { name: "Canonical World JSON" })).toBeVisible();
  await expectNoA11yViolations(page);
});

test("axe scan passes for the mobile Editor panels in dark theme", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/editor");
  await page.getByRole("button", { name: /Theme:/u }).click();
  await page.getByRole("menuitem", { name: "Dark" }).click();
  await page.getByRole("button", { name: "Tools & symbols" }).click();
  await expect(page.getByRole("dialog", { name: "Editor tools and symbols" })).toBeVisible();
  await expectNoA11yViolations(page);
});
