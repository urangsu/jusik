import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { I18nProvider } from "@/i18n/use-i18n";
import { LocaleToggle } from "./LocaleToggle";

describe("LocaleToggle", () => {
  beforeEach(() => {
    // Mock window.location to prevent JSDOM navigation error when setting window.location.href
    const mockLocation = {
      href: "http://localhost/",
      pathname: "/",
      search: "",
    };
    Object.defineProperty(window, "location", {
      value: mockLocation,
      writable: true,
      configurable: true,
    });
  });

  it("renders both KO and EN buttons", () => {
    render(
      <I18nProvider initialLocale="ko">
        <LocaleToggle />
      </I18nProvider>
    );

    expect(screen.getByText("KO")).toBeInTheDocument();
    expect(screen.getByText("EN")).toBeInTheDocument();
  });

  it("sets locale and updates window.location.href when clicked", async () => {
    render(
      <I18nProvider initialLocale="ko">
        <LocaleToggle />
      </I18nProvider>
    );

    const enButton = screen.getByText("EN");
    await act(async () => {
      enButton.click();
    });

    expect(window.location.href).toContain("lang=en");
  });
});
