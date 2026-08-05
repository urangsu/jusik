export type SupplyChainNodeType =
  | "demand_driver"
  | "system"
  | "component"
  | "material"
  | "supplier"
  | "customer"
  | "listed_asset";

export type SupplyChainEvidenceState =
  | "verified"
  | "inferred"
  | "hypothesis"
  | "contradicted";

export type SupplyChainNode = {
  nodeId: string;
  nodeType: SupplyChainNodeType;
  label: string;
  assetId: string | null;
};

export type SupplyChainEdge = {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  relationship: "demands" | "contains" | "supplies" | "qualifies" | "contracts_with";
  evidenceState: SupplyChainEvidenceState;
  evidenceIds: string[];
  claimIds: string[];
  validFrom: string;
  expiryAt: string | null;
};

export type SupplyChainGraph = {
  graphId: string;
  theme: string;
  nodes: SupplyChainNode[];
  edges: SupplyChainEdge[];
  asOfDate: string;
  dataVersionIds: string[];
};
