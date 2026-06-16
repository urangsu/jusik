import { describe, it, expect } from "vitest";
import { kisOrderProvider } from "./kis-order-provider";

describe("KIS Order Provider Checks", () => {
  it("should always return not_supported status for placeOrder to block live trading", async () => {
    const res = await kisOrderProvider.placeOrder({
      symbol: "005930",
      qty: 10,
      price: 75000,
      side: "buy",
    });

    expect(res.status).toBe("not_supported");
    expect(res.value).toBeNull();
    expect(res.message).toContain("지원하지 않는 서비스 범위");
  });
});
