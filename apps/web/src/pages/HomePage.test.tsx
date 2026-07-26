import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HomePage } from "./HomePage";

const validHealthResponse = {
  status: "ok",
  service: "axiom-garden-worker",
  version: "0.1.0",
  timestamp: "2026-01-01T00:00:00.000Z",
};

describe("HomePage", () => {
  it("shows the product name, capability cards, and loading state", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => undefined)),
    );

    render(<HomePage />);

    expect(screen.getAllByText("Axiom Garden").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Build Rules" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Run Worlds" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Explain Outcomes" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Checking connection");
  });

  it("shows healthy after a valid response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(validHealthResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Healthy");
    });
  });

  it("shows unavailable when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network error")));

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Unavailable");
    });
  });
});
