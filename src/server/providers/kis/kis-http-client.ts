/* eslint-disable @typescript-eslint/no-explicit-any */
import { kisConfig } from "./kis-config";
import { KisAuthClient } from "./kis-auth-client";
import { providerBudgetManager } from "../provider-budget-manager";

export class KisHttpClient {
  /**
   * Performs an authenticated HTTP request to the KIS API, respecting budgets.
   */
  public static async request<T>(
    endpoint: string,
    method: "GET" | "POST",
    headers: Record<string, string>,
    queryParams?: Record<string, string>,
    body?: any
  ): Promise<T> {
    if (!kisConfig.appKey || !kisConfig.appSecret) {
      throw new Error("KIS credentials not configured");
    }

    // 1. Enforce and consume budget
    if (!providerBudgetManager.consume("kis")) {
      throw new Error("KIS API rate limit exceeded (budget limit reached)");
    }

    // 2. Resolve access token
    const token = await KisAuthClient.getAccessToken();

    // 3. Prepare headers
    const reqHeaders: Record<string, string> = {
      "content-type": "application/json; charset=utf-8",
      authorization: `Bearer ${token}`,
      appkey: kisConfig.appKey,
      appsecret: kisConfig.appSecret,
      custtype: "P",
      ...headers,
    };

    // 4. Build request URL
    let url = `${kisConfig.restUrl}${endpoint}`;
    if (queryParams) {
      const searchParams = new URLSearchParams();
      for (const [key, val] of Object.entries(queryParams)) {
        searchParams.append(key, val);
      }
      url = `${url}?${searchParams.toString()}`;
    }

    const fetchOptions: RequestInit = {
      method,
      headers: reqHeaders,
    };

    if (method === "POST" && body !== undefined) {
      fetchOptions.body = JSON.stringify(body);
    }

    const res = await fetch(url, fetchOptions);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`KIS HTTP request failed: Status ${res.status}, response: ${errText}`);
    }

    return (await res.json()) as T;
  }
}
