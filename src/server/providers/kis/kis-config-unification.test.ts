import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { KisConfig } from "./kis-config";

describe("KIS Config Unification & Port Resolution", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.KIS_APP_KEY;
    delete process.env.KIS_APP_SECRET;
    delete process.env.KIS_BASE_URL;
    delete process.env.KIS_IS_PAPER;
    delete process.env.KIS_APP_TYPE;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("resolves paper URL with mandatory port :29443 by default", () => {
    process.env.KIS_IS_PAPER = "true";
    const config = new KisConfig();
    expect(config.isPaper).toBe(true);
    expect(config.baseUrl).toBe("https://openapivts.koreainvestment.com:29443");
  });

  it("resolves real URL with mandatory port :9443 when paper is false", () => {
    process.env.KIS_IS_PAPER = "false";
    const config = new KisConfig();
    expect(config.isPaper).toBe(false);
    expect(config.baseUrl).toBe("https://openapi.koreainvestment.com:9443");
  });

  it("normalizes user-provided KIS paper URL without port by appending :29443", () => {
    process.env.KIS_IS_PAPER = "true";
    process.env.KIS_BASE_URL = "https://openapivts.koreainvestment.com";
    const config = new KisConfig();
    expect(config.baseUrl).toBe("https://openapivts.koreainvestment.com:29443");
  });

  it("normalizes user-provided KIS real URL without port by appending :9443", () => {
    process.env.KIS_IS_PAPER = "false";
    process.env.KIS_BASE_URL = "https://openapi.koreainvestment.com";
    const config = new KisConfig();
    expect(config.baseUrl).toBe("https://openapi.koreainvestment.com:9443");
  });
});
