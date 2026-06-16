import { UniverseId } from "@/domain/universe/universe";
import { UniverseSnapshot } from "@/domain/universe/universe-snapshot";

export interface UniverseBuilder {
  buildSnapshot(params: {
    universeId: UniverseId;
    asOfDate: string;
    knownAt: string;
  }): Promise<UniverseSnapshot>;
}
