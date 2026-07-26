import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { THEME_STORAGE_KEY, ThemeProvider, type ThemePreference, useTheme } from "../src";

function ThemeProbe() {
  const { preference, resolvedTheme, setPreference } = useTheme();
  return (
    <>
      <output>{`${preference}:${resolvedTheme}`}</output>
      <button
        type="button"
        onClick={() => {
          setPreference("dark");
        }}
      >
        Use dark
      </button>
    </>
  );
}

function setStoredTheme(theme: ThemePreference) {
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("defaults to the system preference", () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByText("system:light")).toBeVisible();
  });

  it("loads, applies, and persists an explicit preference", async () => {
    setStoredTheme("light");
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Use dark" }));
    expect(screen.getByText("dark:dark")).toBeVisible();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
