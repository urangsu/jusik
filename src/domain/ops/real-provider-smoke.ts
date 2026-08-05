import type { DataStatus } from "@/domain/common/data-status";
import type {
  ProviderRealDataSmokeCapability,
  RuntimeProviderId,
} from "@/domain/ops/provider-readiness";
import type { EvidencePack } from "@/domain/evidence/evidence-pack";

export type RealProviderSmokeTarget = {
  id: string;
  providerId: RuntimeProviderId | "system";
  capability: ProviderRealDataSmokeCapability | "provider_health";
  method: "GET" | "POST";
  endpoint: string;
  body?: unknown;
  symbol: string | null;
  region: "KR" | "US" | null;
  requiresApiKey: boolean;
  expectedWithoutKey: "api_required_allowed" | "data_available" | "not_supported_allowed";
  expectedWithKey: "data_available" | "not_supported_allowed";
};

export type RealProviderSmokeExpectation =
  | RealProviderSmokeTarget["expectedWithoutKey"]
  | RealProviderSmokeTarget["expectedWithKey"];

export type RealProviderSmokeExpectationMode = "auto" | "without_key" | "with_key";

export type DataEnvelopeContractValidation = {
  passed: boolean;
  status: DataStatus | null;
  dataAvailable: boolean;
  source: string | null;
  sourceTier: string | null;
  warnings: string[];
  updatedAt: string | null;
  failures: string[];
};

export type RealProviderSmokeResult = {
  targetId: string;
  providerId: RuntimeProviderId | "system";
  capability: RealProviderSmokeTarget["capability"];
  symbol: string | null;
  region: "KR" | "US" | null;
  configured: boolean;
  attempted: boolean;
  expectationMode: Exclude<RealProviderSmokeExpectationMode, "auto">;
  expected: RealProviderSmokeExpectation;
  httpStatus: number | null;
  envelopeStatus: DataStatus | null;
  status: DataStatus | null;
  dataAvailable: boolean;
  source: string | null;
  sourceTier: string | null;
  warnings: string[];
  updatedAt: string | null;
  contractPassed: boolean;
  providerMatched: boolean;
  expectationPassed: boolean;
  passed: boolean;
  failures: string[];
  message: string | null;
  evidencePack: EvidencePack;
  sampleMetadata: {
    symbol?: string;
    recordCount?: number;
    firstDate?: string;
    lastDate?: string;
  };
  checkedAt: string;
};

export type RealProviderSmokeReport = {
  id: string;
  targets: RealProviderSmokeTarget[];
  results: RealProviderSmokeResult[];
  passed: boolean;
  failureCount: number;
  dataAvailableCount: number;
  apiRequiredCount: number;
  expectationMode: RealProviderSmokeExpectationMode;
  createdAt: string;
  engineVersion: string;
};
