import { ThemeProvider, ToastProvider } from "@axiom-garden/ui";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { App } from "./App";

const validHealthResponse = {
  status: "ok",
  service: "axiom-garden-worker",
  version: "0.1.0",
  timestamp: "2026-01-01T00:00:00.000Z",
};

function renderApp(path = "/") {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </ToastProvider>
    </ThemeProvider>,
  );
}

function pendingHealth() {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>(() => undefined)),
  );
}

describe("Axiom Garden app shell", () => {
  it("shows navigation, product information, capability cards, and loading health", () => {
    pendingHealth();
    renderApp();

    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
    expect(screen.getByRole("heading", { name: /Axiom Garden\s*公理花园/u })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Build Rules" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Run Worlds" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Explain Outcomes" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Checking connection");
  });

  it("shows healthy and unavailable Worker states", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(validHealthResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const { unmount } = renderApp();
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Worker healthy");
    });
    unmount();

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network error")));
    renderApp();
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Worker unavailable");
    });
  });

  it("renders the static Workspace regions", async () => {
    renderApp("/workspace");
    expect(await screen.findByRole("heading", { name: "Workspace shell preview" })).toBeVisible();
    expect(screen.getByRole("complementary", { name: "Preview tools" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Canvas placeholder" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Inspector placeholder" })).toBeVisible();
  });

  it("renders the Components page and Not Found page with correct titles", async () => {
    renderApp("/components");
    expect(await screen.findByRole("heading", { name: "Design system" })).toBeVisible();
    await waitFor(() => {
      expect(document.title).toBe("Components | Axiom Garden");
    });
  });

  it("validates, reports, resets, and copies World Document v1 JSON", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    renderApp("/world-format");
    expect(
      await screen.findByRole("heading", { name: "World Document v1" }, { timeout: 5_000 }),
    ).toBeVisible();
    expect(screen.getByText("Valid v1 document")).toBeVisible();
    await waitFor(() => {
      expect(document.title).toBe("World format v1 | Axiom Garden");
    });

    const input = screen.getByLabelText("World JSON");
    fireEvent.change(input, { target: { value: "{" } });
    await user.click(screen.getByRole("button", { name: "Validate" }));
    expect(screen.getByText("invalid_json")).toBeVisible();
    expect(screen.getByText("Input is not valid JSON")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Reset example" }));
    expect(screen.getByText("Valid v1 document")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Copy canonical JSON" }));
    expect(writeText).toHaveBeenCalledOnce();
  });

  it("runs the deterministic Engine Playground controls and snapshot integrity flow", async () => {
    const user = userEvent.setup();
    renderApp("/engine");
    expect(
      await screen.findByRole("heading", { name: "Engine Playground" }, { timeout: 5_000 }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "This playground applies precomputed transition data. No rule language is implemented.",
      ),
    ).toBeVisible();
    expect(screen.getByTestId("engine-tick")).toHaveTextContent("0");
    await waitFor(() => {
      expect(document.title).toBe("Engine playground | Axiom Garden");
    });

    await user.click(screen.getByRole("button", { name: "No-op step" }));
    expect(screen.getByTestId("engine-tick")).toHaveTextContent("1");
    await user.click(screen.getByRole("button", { name: "Run 10 no-op ticks" }));
    expect(screen.getByTestId("engine-tick")).toHaveTextContent("11");

    const digestBefore = screen.getByTestId("engine-digest").textContent;
    await user.click(screen.getByRole("button", { name: "Apply demonstration transition" }));
    expect(screen.getByTestId("engine-digest").textContent).not.toBe(digestBefore);
    expect(screen.getByText("transition:demonstration")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Create snapshot" }));
    await user.click(screen.getByRole("button", { name: "No-op step" }));
    expect(screen.getByTestId("engine-tick")).toHaveTextContent("13");
    await user.click(screen.getByRole("button", { name: "Restore snapshot" }));
    expect(screen.getByTestId("engine-tick")).toHaveTextContent("12");

    await user.click(screen.getByRole("button", { name: "Tamper snapshot demo" }));
    expect(screen.getByText("snapshot_digest_mismatch")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByTestId("engine-tick")).toHaveTextContent("0");
  });

  it("renders Not Found and returns to Home", async () => {
    pendingHealth();
    const user = userEvent.setup();
    renderApp("/missing");
    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeVisible();
    expect(document.title).toBe("Page not found | Axiom Garden");
    await user.click(screen.getByRole("link", { name: "Return Home" }));
    expect(screen.getByRole("heading", { name: /Axiom Garden\s*公理花园/u })).toBeVisible();
  });

  it("changes and persists the theme from the top bar", async () => {
    pendingHealth();
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: "Theme: System" }));
    await user.click(screen.getByRole("menuitem", { name: "Dark" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("axiom-garden-theme")).toBe("dark");
  });
});
