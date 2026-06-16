import { providerRegistry } from "./provider-registry";
import { ProviderProfile } from "@/domain/source/provider-profile";
import { ProviderCapability } from "@/domain/source/provider-profile";
import { MarketRegion } from "@/domain/common/data-status";

export function getPriorityList(
  market: MarketRegion,
  capability: ProviderCapability
): ProviderProfile[] {
  const allProfiles = providerRegistry.getProfiles();

  return allProfiles
    .filter((profile) => {
      // 1. Must be enabled in the registry
      if (!providerRegistry.isEnabled(profile.id)) return false;
      // 2. Must cover the target market region
      if (!profile.markets.includes(market)) return false;
      // 3. Must support the requested capability
      if (!profile.capabilities.includes(capability)) return false;
      return true;
    })
    // 4. Sort by priority ascending (lower value has higher priority, e.g., 10 over 80)
    .sort((a, b) => a.priority - b.priority);
}
