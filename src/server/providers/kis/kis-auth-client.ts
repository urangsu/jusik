import { kisConfig } from "./kis-config";
import { KisTokenResponse } from "./kis-types";

let cachedToken: KisTokenResponse | null = null;
let inFlightTokenRequest: Promise<KisTokenResponse> | null = null;

export class KisAuthClient {
  /**
   * Retrieves the access token, using memory cache or single-flight network request.
   */
  public static async getAccessToken(): Promise<string> {
    if (!kisConfig.appKey || !kisConfig.appSecret) {
      throw new Error("KIS API credentials are not configured.");
    }

    const now = Date.now();

    // 1. Check if we have a valid cached token (with 60-second buffer)
    if (cachedToken && cachedToken.expires_at && cachedToken.expires_at > now + 60 * 1000) {
      return cachedToken.access_token;
    }

    // 2. If there is already an in-flight request, await it (single-flight)
    if (inFlightTokenRequest) {
      const res = await inFlightTokenRequest;
      return res.access_token;
    }

    // 3. Initiate the request
    inFlightTokenRequest = this.fetchToken();
    try {
      const res = await inFlightTokenRequest;
      return res.access_token;
    } finally {
      inFlightTokenRequest = null;
    }
  }

  private static async fetchToken(): Promise<KisTokenResponse> {
    // Return mock token for testing if mock credentials are set
    if (
      kisConfig.appKey === "mock_kis_app_key" ||
      kisConfig.appSecret === "mock_kis_app_secret"
    ) {
      const mockToken: KisTokenResponse = {
        access_token: "mock_access_token_12345",
        token_type: "Bearer",
        expires_in: 86400,
        expires_at: Date.now() + 86400 * 1000,
      };
      cachedToken = mockToken;
      return mockToken;
    }

    const url = `${kisConfig.restUrl}/oauth2/tokenP`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        appkey: kisConfig.appKey,
        secretkey: kisConfig.appSecret,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch KIS token: Status ${res.status}, response: ${text}`);
    }

    const data = (await res.json()) as KisTokenResponse;
    data.expires_at = Date.now() + data.expires_in * 1000;
    cachedToken = data;
    return data;
  }

  /**
   * Resets the cache (primarily used in tests).
   */
  public static clearCache(): void {
    cachedToken = null;
    inFlightTokenRequest = null;
  }
}
