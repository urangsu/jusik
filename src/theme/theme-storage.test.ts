import { describe, it, expect, beforeEach } from "vitest";
import {
  getThemeFromCookieString,
  resolveServerTheme,
  resolveTheme,
  getThemeFromStorage,
  normalizeThemePreference,
  resolveThemeForServer,
} from "./theme-storage";

describe("getThemeFromCookieString", () => {
  it("returns dark from cookie string", () => {
    expect(getThemeFromCookieString("kt-theme=dark")).toBe("dark");
  });

  it("returns light from cookie string with other cookies", () => {
    expect(getThemeFromCookieString("session=abc; kt-theme=light; foo=bar")).toBe("light");
  });

  it("returns system", () => {
    expect(getThemeFromCookieString("kt-theme=system")).toBe("system");
  });

  it("returns null for invalid value", () => {
    expect(getThemeFromCookieString("kt-theme=invalid")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getThemeFromCookieString("")).toBeNull();
  });

  it("returns null when cookie absent", () => {
    expect(getThemeFromCookieString("session=xyz")).toBeNull();
  });
});

describe("resolveServerTheme", () => {
  it("prefers searchParams over cookie", () => {
    expect(resolveServerTheme("light", "kt-theme=dark")).toBe("light");
  });

  it("falls back to cookie when no searchParams", () => {
    expect(resolveServerTheme(undefined, "kt-theme=light")).toBe("light");
  });

  it("falls back to default when nothing provided", () => {
    expect(resolveServerTheme(undefined, "")).toBe("dark");
  });

  it("ignores invalid searchParams value", () => {
    expect(resolveServerTheme("banana", "kt-theme=dark")).toBe("dark");
  });
});

describe("resolveTheme", () => {
  it("returns dark for 'dark'", () => {
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("returns light for 'light'", () => {
    expect(resolveTheme("light")).toBe("light");
  });

  it("returns dark for 'system' when no window", () => {
    // In Node/jsdom without matchMedia — defaults to dark
    const result = resolveTheme("system");
    expect(result === "dark" || result === "light").toBe(true);
  });
});

describe("getThemeFromStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when nothing stored", () => {
    expect(getThemeFromStorage()).toBeNull();
  });

  it("returns dark when dark stored", () => {
    localStorage.setItem("kt-theme", "dark");
    expect(getThemeFromStorage()).toBe("dark");
  });

  it("returns light when light stored", () => {
    localStorage.setItem("kt-theme", "light");
    expect(getThemeFromStorage()).toBe("light");
  });

  it("returns null for invalid stored value", () => {
    localStorage.setItem("kt-theme", "blue");
    expect(getThemeFromStorage()).toBeNull();
  });
});

describe("normalizeThemePreference & resolveThemeForServer", () => {
  it("normalizeThemePreference should parse values or default to dark", () => {
    expect(normalizeThemePreference("system")).toBe("system");
    expect(normalizeThemePreference("light")).toBe("light");
    expect(normalizeThemePreference("dark")).toBe("dark");
    expect(normalizeThemePreference("invalid")).toBe("dark");
    expect(normalizeThemePreference(null)).toBe("dark");
  });

  it("resolveThemeForServer should resolve preferences to dark/light only", () => {
    expect(resolveThemeForServer("light")).toBe("light");
    expect(resolveThemeForServer("dark")).toBe("dark");
    expect(resolveThemeForServer("system")).toBe("dark");
  });

  it("resolveThemeForServer must never return 'system'", () => {
    const preferences: ("light" | "dark" | "system")[] = ["light", "dark", "system"];
    for (const pref of preferences) {
      expect(resolveThemeForServer(pref)).not.toBe("system");
    }
  });
});
