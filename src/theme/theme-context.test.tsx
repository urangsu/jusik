import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider, useTheme } from "./theme-context";

// Expose theme state via a test component
const ThemeDisplay = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button data-testid="set-light" onClick={() => setTheme("light")}>
        light
      </button>
      <button data-testid="set-dark" onClick={() => setTheme("dark")}>
        dark
      </button>
      <button data-testid="set-system" onClick={() => setTheme("system")}>
        system
      </button>
    </div>
  );
};

describe("ThemeProvider", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    localStorage.clear();
  });

  it("initializes with initialTheme prop", () => {
    render(
      <ThemeProvider initialTheme="light">
        <ThemeDisplay />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("defaults to dark when no prop given", () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("setTheme updates theme state", async () => {
    render(
      <ThemeProvider initialTheme="dark">
        <ThemeDisplay />
      </ThemeProvider>
    );
    await act(async () => {
      screen.getByTestId("set-light").click();
    });
    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(screen.getByTestId("resolved").textContent).toBe("light");
  });

  it("setTheme applies data-theme to document.documentElement", async () => {
    render(
      <ThemeProvider initialTheme="dark">
        <ThemeDisplay />
      </ThemeProvider>
    );
    await act(async () => {
      screen.getByTestId("set-light").click();
    });
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("useTheme outside provider returns default dark fallback", () => {
    render(<ThemeDisplay />);
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });
});
