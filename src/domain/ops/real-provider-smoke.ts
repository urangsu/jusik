import type { DataStatus } from "@/domain/common/data-status";
import type {
  ProviderRealDataSmokeCapability,
  RuntimeProviderId,
} from "@/domain/ops/provider-readiness";
import type { EvidencePack } from "@/domain/evidence/evidence-pack";

export type RealProviderSmokeTarget = {
  id: string;
  providerId: RuntimeProviderId;
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
  providerId: RuntimeProviderId;
  capability: RealProviderSmokeTarget["capability"];
  symbol: string | null;
  region: "KR" | "US" | null;
  attempted: boolean;
  httpStatus: number | null;
  envelopeStatus: DataStatus | null;
  dataAvailable: boolean;
  source: string | null;
  sourceTier: string | null;
  warnings: string[];
  updatedAt: string | null;
  contractPassed: boolean;
  expectationPassed: boolean;
  passed: boolean;
  failures: string[];
  message: string | null;
  evidencePack: EvidencePack;
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
  createdAt: string;
  engineVersion: string;
};
