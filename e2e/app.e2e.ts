import { expect, test, type Locator } from "@playwright/test";

const healthResponse = {
  status: "ok",
  service: "axiom-garden-worker",
  version: "0.1.0",
  timestamp: "2026-07-26T12:00:00.000Z",
};

async function worldPoint(canvas: Locator, x: number, y: number) {
  const offsetX = Number(await canvas.getAttribute("data-offset-x"));
  const offsetY = Number(await canvas.getAttribute("data-offset-y"));
  const zoom = Number(await canvas.getAttribute("data-zoom"));
  return {
    x: offsetX + (x + 0.5) * 48 * zoom,
    y: offsetY + (y + 0.5) * 48 * zoom,
  };
}

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
  await expect(page.getByRole("heading", { name: "World Document v1" })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "World Document v1" })).toBeVisible();
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

test("edits an in-memory world with undo, redo, copy, paste, and delete confirmation", async ({
  page,
}) => {
  await page.goto("/editor");
  await expect(page.getByRole("heading", { name: "World Editor" })).toBeVisible();
  await expect(page).toHaveTitle("World editor | Axiom Garden");
  await expect(page.getByText("Domain valid")).toBeVisible();
  const canvas = page.getByTestId("editor-canvas");
  await expect(canvas).toBeVisible();

  await page.getByRole("button", { name: "Place entity" }).click();
  await canvas.focus();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(page.getByText("4 entities", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("3 entities", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(page.getByText("4 entities", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Inspect" }).click();
  await canvas.focus();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await page.getByRole("button", { name: "Paste", exact: true }).click();
  await expect(page.getByText("5 entities", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Duplicate" }).click();
  await expect(page.getByText("6 entities", { exact: true })).toBeVisible();
  await page
    .getByRole("region", { name: "Editor toolbar" })
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.getByRole("dialog", { name: "Delete selection?" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm delete" }).click();
  await expect(page.getByText("5 entities", { exact: true })).toBeVisible();
});

test("edits an Entity draft, places a Cell, previews JSON, resets, and restores with Undo", async ({
  page,
}) => {
  await page.goto("/editor");
  const canvas = page.getByTestId("editor-canvas");
  await page.getByRole("button", { name: "Inspect" }).click();
  await canvas.click({ position: await worldPoint(canvas, 2, 1) });
  await expect(page.getByRole("heading", { name: "Entity inspector" })).toBeVisible();

  await page.getByLabel("Orientation").selectOption("90");
  await page.getByRole("button", { name: "Add property" }).click();
  await page.getByLabel("Property 2 key").fill("tone");
  await page.getByLabel("Property 2 value").fill("quiet");
  await page.getByRole("button", { name: "Apply entity changes" }).click();
  await expect(page.getByText("Domain valid")).toBeVisible();

  await page.getByRole("button", { name: "Place cell" }).click();
  await canvas.click({ position: await worldPoint(canvas, 0, 0) });
  await expect(page.getByText("3 cells", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Preview JSON" }).click();
  const preview = page.getByRole("dialog", { name: "Canonical World JSON" });
  await expect(preview.getByLabel("Canonical World JSON")).toContainText('"tone": "quiet"');
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Reset document" }).click();
  await page.getByRole("button", { name: "Confirm reset" }).click();
  await expect(page.getByText("2 cells", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("3 cells", { exact: true })).toBeVisible();
});

test("creates Symbols and Layers and rejects removal while referenced", async ({ page }) => {
  await page.goto("/editor");
  const symbolPanel = page.locator(".editor-left-panel .editor-palette");
  await symbolPanel.getByRole("button", { name: "New" }).click();
  const symbolDialog = page.getByRole("dialog", { name: "Create symbol" });
  await symbolDialog.getByLabel("ID", { exact: true }).fill("symbol:clay-square");
  await symbolDialog.getByLabel("Name", { exact: true }).fill("Clay square");
  await symbolDialog.getByRole("combobox").first().selectOption("square");
  await symbolDialog.getByRole("button", { name: "Create symbol" }).click();
  await symbolPanel
    .getByRole("button", { name: "Clay square square · solid", exact: true })
    .click();

  const layerPanel = page.locator(".editor-right-panel .editor-layers");
  await layerPanel.getByRole("button", { name: "New" }).click();
  const layerDialog = page.getByRole("dialog", { name: "Create layer" });
  await layerDialog.getByLabel("ID", { exact: true }).fill("layer:quiet");
  await layerDialog.getByLabel("Name", { exact: true }).fill("Quiet");
  await layerDialog.getByRole("button", { name: "Create layer" }).click();
  await layerPanel.getByRole("button", { name: /Quiet Order/u }).click();

  const canvas = page.getByTestId("editor-canvas");
  await page.getByRole("button", { name: "Place entity" }).click();
  await canvas.click({ position: await worldPoint(canvas, 0, 0) });
  await symbolPanel.getByRole("button", { name: "Delete active symbol" }).click();
  await page.getByRole("button", { name: "Confirm delete" }).click();
  await expect(
    page.getByLabel("Editor validation issues").getByText("symbol_in_use"),
  ).toBeVisible();

  const quietLayer = layerPanel.getByRole("button", { name: /Quiet Order/u });
  await quietLayer.locator("xpath=..").getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Confirm delete" }).click();
  await expect(page.getByLabel("Editor validation issues").getByText("layer_in_use")).toBeVisible();
});

test("expands the grid, rejects orphaning shrink, and keeps Engine compatibility", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Resize grid" }).click();
  let dialog = page.getByRole("dialog", { name: "Resize bounded grid" });
  await dialog.getByLabel("Width").fill("16");
  await dialog.getByLabel("Height").fill("12");
  await dialog.getByRole("button", { name: "Resize grid" }).click();
  await expect(page.getByText("Engine compatible")).toBeVisible();

  await page.getByRole("button", { name: "Resize grid" }).click();
  dialog = page.getByRole("dialog", { name: "Resize bounded grid" });
  await dialog.getByLabel("Width").fill("2");
  await dialog.getByLabel("Height").fill("2");
  await dialog.getByRole("button", { name: "Resize grid" }).click();
  await expect(page.getByText("resize_would_orphan_objects")).toBeVisible();
});

test("supports keyboard tools, drag commit, and refresh reset", async ({ page }) => {
  await page.goto("/editor");
  const canvas = page.getByTestId("editor-canvas");
  await canvas.focus();
  await page.keyboard.press("e");
  await page.keyboard.press("Home");
  await page.keyboard.press("Enter");
  await expect(page.getByText("4 entities", { exact: true })).toBeVisible();

  await page.keyboard.press("v");
  await canvas.focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("Enter");
  const from = await worldPoint(canvas, 0, 0);
  const to = await worldPoint(canvas, 1, 0);
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  await page.mouse.move(box.x + from.x, box.y + from.y);
  await page.mouse.down();
  await page.mouse.move(box.x + to.x, box.y + to.y, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByTestId("editor-revision")).toHaveText("2");

  const objectsLayer = page
    .locator(".editor-right-panel .editor-layers")
    .getByRole("button", { name: /Objects Order/u });
  await objectsLayer.locator("xpath=..").getByRole("button", { name: "Edit" }).click();
  const layerDialog = page.getByRole("dialog", { name: "Edit layer" });
  await layerDialog.getByLabel("Lock layer contents").check();
  await layerDialog.getByRole("button", { name: "Apply layer changes" }).click();
  await canvas.scrollIntoViewIfNeeded();
  const lockedBox = await canvas.boundingBox();
  expect(lockedBox).not.toBeNull();
  if (!lockedBox) return;
  const lockedFrom = await worldPoint(canvas, 1, 0);
  const lockedTarget = await worldPoint(canvas, 2, 0);
  await page.mouse.move(lockedBox.x + lockedFrom.x, lockedBox.y + lockedFrom.y);
  await page.mouse.down();
  await page.mouse.move(lockedBox.x + lockedTarget.x, lockedBox.y + lockedTarget.y, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByText("locked_layer").first()).toBeVisible();
  await expect(page.getByTestId("editor-revision")).toHaveText("3");

  await page.reload();
  await expect(page.getByText("3 entities", { exact: true })).toBeVisible();
  await expect(page.getByTestId("editor-revision")).toHaveText("0");
});

test("opens the editor mobile panels and keeps the layout bounded", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/workspace");
  await page.getByRole("link", { name: "Open in-memory World Editor" }).click();
  await expect(page).toHaveURL(/\/editor$/u);
  const inspectorTrigger = page
    .locator(".editor-mobile-panel-triggers")
    .getByRole("button", { name: "Inspector" });
  await inspectorTrigger.scrollIntoViewIfNeeded();
  await inspectorTrigger.click();
  await expect(page.getByRole("dialog", { name: "Editor inspector" })).toBeVisible();
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
