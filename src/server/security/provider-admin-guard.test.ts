import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { requireProviderAdmin } from "./provider-admin-guard";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/app/api/auth/admin/login/route";

function makeReq(
  headers: Record<string, string> = {},
  method = "GET",
  url = "http://localhost:3000/api/settings/providers",
  cookies: Record<string, string> = {}
) {
  const req = new NextRequest(url, {
    method,
    headers: new Headers(headers),
  });
  for (const [k, v] of Object.entries(cookies)) {
    req.cookies.set(k, v);
  }
  return req;
}

const VALID_TOKEN = "super_secret_admin_token_123456789012345"; // 39 chars >= 32

describe("requireProviderAdmin guard", () => {
  beforeEach(() => {
    vi.stubEnv("PROVIDER_ADMIN_TOKEN", VALID_TOKEN);
    vi.stubEnv("INTERNAL_APP_ORIGIN", "http://localhost:3000");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails 500 when PROVIDER_ADMIN_TOKEN is under 32 chars", () => {
    vi.stubEnv("PROVIDER_ADMIN_TOKEN", "short_16_char_token_123");
    const result = requireProviderAdmin(makeReq());
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(500);
    }
  });

  it("fails 401 when token and session are both missing", () => {
    const result = requireProviderAdmin(makeReq());
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(401);
    }
  });

  it("fails 401 when token is wrong", () => {
    const result = requireProviderAdmin(makeReq({ "x-provider-admin-token": "wrong_token_1234567890123456789012345" }));
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(401);
    }
  });

  it("passes when valid header token is provided for GET", () => {
    const result = requireProviderAdmin(makeReq({ "x-provider-admin-token": VALID_TOKEN }));
    expect(result.authorized).toBe(true);
  });

  it("passes when valid session cookie is provided for GET", () => {
    const sessionToken = createSessionToken();
    const result = requireProviderAdmin(makeReq({}, "GET", "http://localhost:3000/api/settings/providers", {
      [SESSION_COOKIE_NAME]: sessionToken,
    }));
    expect(result.authorized).toBe(true);
  });

  it("fails 403 when mutation request is missing Origin header", () => {
    const result = requireProviderAdmin(
      makeReq({ "x-provider-admin-token": VALID_TOKEN }, "POST")
    );
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(403);
    }
  });

  it("fails 403 when mutation origin scheme or host does not match", () => {
    const result = requireProviderAdmin(
      makeReq(
        { "x-provider-admin-token": VALID_TOKEN, origin: "https://localhost:3000" }, // scheme mismatch http vs https
        "POST"
      )
    );
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(403);
    }
  });

  it("passes when mutation origin matches allowed origin exactly", () => {
    const result = requireProviderAdmin(
      makeReq(
        { "x-provider-admin-token": VALID_TOKEN, origin: "http://localhost:3000" },
        "POST"
      )
    );
    expect(result.authorized).toBe(true);
  });
});
