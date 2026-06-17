import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@/theme/theme-context";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  it("renders all three theme buttons (dark, light, system) in default mode", () => {
    render(
      <ThemeProvider initialTheme="dark">
        <ThemeToggle locale="ko" />
      </ThemeProvider>
    );

    // Verify dark, light, and system button options exist by text/aria attributes
    expect(screen.getByText("다크")).toBeInTheDocument();
    expect(screen.getByText("라이트")).toBeInTheDocument();
    expect(screen.getByText("시스템")).toBeInTheDocument();
  });

  it("renders english labels when locale is set to en", () => {
    render(
      <ThemeProvider initialTheme="dark">
        <ThemeToggle locale="en" />
      </ThemeProvider>
    );

    expect(screen.getByText("Dark")).toBeInTheDocument();
    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("calls setTheme and updates html data-theme attribute on click", async () => {
    render(
      <ThemeProvider initialTheme="dark">
        <ThemeToggle locale="ko" />
      </ThemeProvider>
    );

    const lightButton = screen.getByText("라이트");
    await act(async () => {
      lightButton.click();
    });

    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("renders correctly in compact mode", () => {
    render(
      <ThemeProvider initialTheme="dark">
        <ThemeToggle locale="ko" compact={true} />
      </ThemeProvider>
    );

    // In compact mode, labels are in title attribute, not text span
    const darkBtn = document.getElementById("theme-toggle-dark");
    const lightBtn = document.getElementById("theme-toggle-light");
    const systemBtn = document.getElementById("theme-toggle-system");

    expect(darkBtn).toHaveAttribute("title", "다크");
    expect(lightBtn).toHaveAttribute("title", "라이트");
    expect(systemBtn).toHaveAttribute("title", "시스템");
  });
});
