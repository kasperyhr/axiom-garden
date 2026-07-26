import { ThemeProvider, ToastProvider } from "@axiom-garden/ui";
import { render, screen, waitFor } from "@testing-library/react";
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
