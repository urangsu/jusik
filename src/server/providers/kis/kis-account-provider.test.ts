import { describe, it, expect, vi, beforeEach } from "vitest";
import { kisAccountProvider } from "./kis-account-provider";
import { kisConfig } from "./kis-config";

describe("KisAccountProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("never fabricates a configured account balance", async () => {
    vi.spyOn(kisConfig, "isConfigured", "get").mockReturnValue(true);
    const result = await kisAccountProvider.getBalance();
    expect(result).toMatchObject({ value: null, status: "not_supported" });
  });

  it("returns api_required when unconfigured", async () => {
    vi.spyOn(kisConfig, "isConfigured", "get").mockReturnValue(false);
    const result = await kisAccountProvider.getBalance();
    expect(result).toMatchObject({ value: null, status: "api_required" });
  });
});
