import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { requireProviderAdmin } from "./provider-admin-guard";

function makeReq(headers: Record<string, string> = {}, method = "GET", url = "http://localhost:3000/api/settings/providers") {
  return new NextRequest(url, {
    method,
    headers: new Headers(headers),
  });
}

const VALID_TOKEN = "super_secret_admin_token_123456";

describe("requireProviderAdmin guard", () => {
  beforeEach(() => {
    vi.stubEnv("PROVIDER_ADMIN_TOKEN", VALID_TOKEN);
    vi.stubEnv("INTERNAL_APP_ORIGIN", "http://localhost:3000");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails 500 when PROVIDER_ADMIN_TOKEN is unconfigured or too short", () => {
    vi.stubEnv("PROVIDER_ADMIN_TOKEN", "short");
    const result = requireProviderAdmin(makeReq());
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(500);
    }
  });

  it("fails 401 when x-provider-admin-token is missing", () => {
    const result = requireProviderAdmin(makeReq());
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(401);
    }
  });

  it("fails 401 when x-provider-admin-token is wrong", () => {
    const result = requireProviderAdmin(makeReq({ "x-provider-admin-token": "wrong_token_123456789012345" }));
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(401);
    }
  });

  it("passes when valid token is provided for GET", () => {
    const result = requireProviderAdmin(makeReq({ "x-provider-admin-token": VALID_TOKEN }));
    expect(result.authorized).toBe(true);
  });

  it("fails 403 when mutation origin does not match allowed origin", () => {
    const result = requireProviderAdmin(
      makeReq(
        { "x-provider-admin-token": VALID_TOKEN, origin: "http://evil.com" },
        "POST"
      )
    );
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(403);
    }
  });

  it("passes when mutation origin matches allowed origin", () => {
    const result = requireProviderAdmin(
      makeReq(
        { "x-provider-admin-token": VALID_TOKEN, origin: "http://localhost:3000" },
        "POST"
      )
    );
    expect(result.authorized).toBe(true);
  });
});
