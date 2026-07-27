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
  await expect(page.getByRole("heading", { name: "Read-only viewer preview" })).toBeVisible();
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

test("validates and restores World Document v1 JSON", async ({ page }) => {
  await page.goto("/world-format");
  await expect(page).toHaveTitle("World format v1 | Axiom Garden");
  await expect(page.getByText("Valid v1 document")).toBeVisible();
  const input = page.getByLabel("World JSON");
  await input.fill("{");
  await page.getByRole("button", { name: "Validate" }).click();
  await expect(page.getByText("invalid_json")).toBeVisible();

  await page.getByRole("button", { name: "Reset example" }).click();
  await expect(page.getByText("Valid v1 document")).toBeVisible();
  const source = await input.inputValue();
  await input.fill(source.replace('"x": 8', '"x": 12'));
  await page.getByRole("button", { name: "Validate" }).click();
  await expect(page.getByText("coordinate_out_of_bounds")).toBeVisible();
});

test("produces and copies canonical World JSON", async ({ context, page }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/world-format");
  const output = page.getByLabel("Read-only canonical JSON");
  await expect(output).toContainText('"format": "axiom-garden/world"');
  await page.getByRole("button", { name: "Copy canonical JSON" }).click();
  await expect(page.getByText("Canonical JSON copied.")).toBeVisible();
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText.replace(/\r\n/gu, "\n")).toBe(await output.inputValue());
});

test("World Format Lab has no horizontal overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/world-format");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("steps and resets the deterministic Engine Playground", async ({ page }) => {
  await page.goto("/engine");
  await expect(page).toHaveTitle("Engine playground | Axiom Garden");
  const tick = page.getByTestId("engine-tick");
  const digest = page.getByTestId("engine-digest");
  await expect(tick).toHaveText("0");
  const initialDigest = await digest.textContent();

  await page.getByRole("button", { name: "No-op step" }).click();
  await expect(tick).toHaveText("1");
  await page.getByRole("button", { name: "Run 10 no-op ticks" }).click();
  await expect(tick).toHaveText("11");
  await page.getByRole("button", { name: "Apply demonstration transition" }).click();
  await expect(tick).toHaveText("12");
  expect(await digest.textContent()).not.toBe(initialDigest);

  await page.getByRole("button", { name: "Reset" }).click();
  await expect(tick).toHaveText("0");
  await expect(digest).toHaveText(initialDigest ?? "");
});

test("verifies and rejects Engine snapshot states", async ({ page }) => {
  await page.goto("/engine");
  const tick = page.getByTestId("engine-tick");
  await page.getByRole("button", { name: "Create snapshot" }).click();
  await page.getByRole("button", { name: "No-op step" }).click();
  await expect(tick).toHaveText("1");
  await page.getByRole("button", { name: "Restore snapshot" }).click();
  await expect(tick).toHaveText("0");
  await page.getByRole("button", { name: "Tamper snapshot demo" }).click();
  await expect(page.getByText("snapshot_digest_mismatch")).toBeVisible();
});

test("opens Engine from Workspace and has no mobile overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/workspace");
  await page.getByRole("link", { name: "Open Engine Playground" }).first().click();
  await expect(page).toHaveURL(/\/engine$/u);
  await expect(page.getByRole("heading", { name: "Engine Playground" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("inspects, pans, zooms, and fits the read-only World Viewer", async ({ page }) => {
  await page.goto("/viewer");
  await expect(page).toHaveTitle("World viewer | Axiom Garden");
  const canvas = page.getByTestId("world-canvas");
  await expect(canvas).toBeVisible();
  await expect(page.getByTestId("viewer-tick")).toHaveText("0");
  const initialDigest = await page.getByTestId("viewer-digest").textContent();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  const zoom = Math.min((box.width - 64) / (12 * 48), (box.height - 64) / (8 * 48));
  const offsetX = (box.width - 12 * 48 * zoom) / 2;
  const offsetY = (box.height - 8 * 48 * zoom) / 2;
  const pointFor = (x: number, y: number) => ({
    x: offsetX + (x + 0.5) * 48 * zoom,
    y: offsetY + (y + 0.5) * 48 * zoom,
  });

  await canvas.click({ position: pointFor(2, 1) });
  await expect(page.getByText("entity:circle-002").first()).toBeVisible();
  await canvas.click({ position: pointFor(0, 0) });
  await expect(page.getByText("No object at this coordinate").first()).toBeVisible();
  await canvas.hover({ position: pointFor(8, 5) });
  await expect(page.getByTestId("viewer-digest")).toHaveText(initialDigest ?? "");

  const offsetBefore = Number(await canvas.getAttribute("data-offset-x"));
  await page.getByRole("button", { name: "Pan" }).click();
  await canvas.hover({ position: { x: box.width / 2, y: box.height / 2 } });
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 20);
  await page.mouse.up();
  expect(Number(await canvas.getAttribute("data-offset-x"))).not.toBe(offsetBefore);

  const zoomBefore = Number(await canvas.getAttribute("data-zoom"));
  await canvas.dispatchEvent("wheel", {
    clientX: box.x + box.width / 2,
    clientY: box.y + box.height / 2,
    deltaY: -100,
  });
  expect(Number(await canvas.getAttribute("data-zoom"))).toBeGreaterThan(zoomBefore);
  await page.getByRole("button", { name: "Fit" }).click();
  expect(Number(await canvas.getAttribute("data-zoom"))).toBeCloseTo(zoom, 5);
});

test("respects Viewer layers, keyboard inspection, and demonstration state", async ({ page }) => {
  await page.goto("/viewer");
  const canvas = page.getByTestId("world-canvas");
  await canvas.focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByText("entity:circle-002").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Nothing selected").first()).toBeVisible();

  await page.getByRole("button", { name: /Objects/u }).click();
  await canvas.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("cell:anchor-a").first()).toBeVisible();

  const digest = page.getByTestId("viewer-digest");
  const initialDigest = await digest.textContent();
  await page.getByRole("button", { name: "Demonstration state" }).click();
  await expect(page.getByTestId("viewer-tick")).toHaveText("1");
  expect(await digest.textContent()).not.toBe(initialDigest);
  await page.getByRole("button", { name: "Initial state" }).click();
  await expect(page.getByTestId("viewer-tick")).toHaveText("0");
  await expect(digest).toHaveText(initialDigest ?? "");
});

test("opens Viewer from Workspace, supports dark theme, and fits mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/workspace");
  await page
    .getByRole("link", { name: /World Viewer/u })
    .first()
    .click();
  await expect(page).toHaveURL(/\/viewer$/u);
  await page.getByRole("button", { name: /Theme:/u }).click();
  await page.getByRole("menuitem", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Layers" }).click();
  await expect(page.getByRole("dialog", { name: "Viewer layers" })).toBeVisible();
  await page.keyboard.press("Escape");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
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
