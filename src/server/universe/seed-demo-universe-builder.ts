import { UniverseSnapshot } from "@/domain/universe/universe-snapshot";
import { UniverseBuilder } from "./universe-builder";

export class SeedDemoUniverseBuilder implements UniverseBuilder {
  async buildSnapshot(params: Parameters<UniverseBuilder["buildSnapshot"]>[0]): Promise<UniverseSnapshot> {
    if (params.universeId !== "SEED_DEMO") {
      throw new Error("SeedDemoUniverseBuilder only supports SEED_DEMO.");
    }

    return {
      universeId: "SEED_DEMO",
      asOfDate: params.asOfDate,
      assetIds: ["KR:005930", "US:AAPL"],
      dataVersionId: `dv_seed_demo_${params.asOfDate.replaceAll("-", "")}`,
      generatedAt: params.knownAt,
    };
  }
}
