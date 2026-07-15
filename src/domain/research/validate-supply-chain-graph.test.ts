import { describe, it, expect } from "vitest";
import { validateSupplyChainGraph } from "./validate-supply-chain-graph";
import type { SupplyChainGraph, SupplyChainNode, SupplyChainEdge } from "./supply-chain-graph";

const mockNode = (id: string, type: SupplyChainNode["nodeType"], assetId: string | null = null): SupplyChainNode => ({
  nodeId: id,
  nodeType: type,
  label: `${type} - ${id}`,
  assetId,
});

const mockEdge = (
  id: string,
  from: string,
  to: string,
  state: SupplyChainEdge["evidenceState"],
  evidenceIds: string[] = [],
  expiryAt: string | null = null,
): SupplyChainEdge => ({
  edgeId: id,
  fromNodeId: from,
  toNodeId: to,
  relationship: "supplies",
  evidenceState: state,
  evidenceIds,
  claimIds: [],
  validFrom: "2026-01-01",
  expiryAt,
});

const makeGraph = (nodes: SupplyChainNode[], edges: SupplyChainEdge[]): SupplyChainGraph => ({
  graphId: "g_test",
  theme: "semiconductor_materials",
  nodes,
  edges,
  asOfDate: "2026-06-01",
  dataVersionIds: ["ver_1"],
});

describe("validateSupplyChainGraph", () => {
  it("detects dangling edges where fromNodeId or toNodeId does not exist", () => {
    const nodes = [mockNode("n1", "listed_asset", "KR_005930")];
    const edges = [mockEdge("e1", "n1", "n_non_existent", "hypothesis")];
    const graph = makeGraph(nodes, edges);

    const result = validateSupplyChainGraph(graph, "2026-06-01");
    expect(result.isValid).toBe(false);
    expect(result.errors.some(err => err.includes("Dangling edge"))).toBe(true);
    expect(result.value).toBeNull();
  });

  it("detects verified edges that lack evidenceIds", () => {
    const nodes = [
      mockNode("n1", "listed_asset", "KR_005930"),
      mockNode("n2", "component"),
    ];
    const edges = [mockEdge("e1", "n1", "n2", "verified", [])]; // Verified but no evidence IDs
    const graph = makeGraph(nodes, edges);

    const result = validateSupplyChainGraph(graph, "2026-06-01");
    expect(result.isValid).toBe(false);
    expect(result.errors.some(err => err.includes("must have at least one evidenceId"))).toBe(true);
  });

  it("detects listed_asset nodes that lack a canonical assetId", () => {
    const nodes = [
      mockNode("n1", "listed_asset", null), // Missing assetId
      mockNode("n2", "component"),
    ];
    const edges = [mockEdge("e1", "n1", "n2", "hypothesis")];
    const graph = makeGraph(nodes, edges);

    const result = validateSupplyChainGraph(graph, "2026-06-01");
    expect(result.isValid).toBe(false);
    expect(result.errors.some(err => err.includes("must have a canonical assetId"))).toBe(true);
  });

  it("excludes expired edges from active edges during path analysis", () => {
    const nodes = [
      mockNode("n1", "listed_asset", "KR_005930"),
      mockNode("n2", "component"),
    ];
    // Expiry date is before the asOfDate "2026-06-01"
    const edges = [mockEdge("e1", "n1", "n2", "verified", ["ev_1"], "2026-05-01")];
    const graph = makeGraph(nodes, edges);

    const result = validateSupplyChainGraph(graph, "2026-06-01");
    expect(result.isValid).toBe(true);
    expect(result.activeEdges).toHaveLength(0); // Expired, so not active
    expect(result.bottleneckStatus).toBe("insufficient_data");
  });

  it("does not allow contradicted edges to contribute to bottleneck status", () => {
    const nodes = [
      mockNode("n1", "listed_asset", "KR_005930"),
      mockNode("n2", "component"),
    ];
    // Edge is active but contradicted
    const edges = [mockEdge("e1", "n1", "n2", "contradicted", ["ev_1"])];
    const graph = makeGraph(nodes, edges);

    const result = validateSupplyChainGraph(graph, "2026-06-01");
    expect(result.isValid).toBe(true);
    expect(result.activeEdges).toHaveLength(1);
    expect(result.bottleneckStatus).toBe("insufficient_data"); // Contradicted, so cannot support
  });

  it("returns insufficient_data bottleneck status if all active edges are hypothesis-only", () => {
    const nodes = [
      mockNode("n1", "listed_asset", "KR_005930"),
      mockNode("n2", "component"),
    ];
    const edges = [mockEdge("e1", "n1", "n2", "hypothesis")];
    const graph = makeGraph(nodes, edges);

    const result = validateSupplyChainGraph(graph, "2026-06-01");
    expect(result.isValid).toBe(true);
    expect(result.bottleneckStatus).toBe("insufficient_data");
  });

  it("returns verified or inferred status appropriately on a valid graph", () => {
    const nodes = [
      mockNode("n1", "listed_asset", "KR_005930"),
      mockNode("n2", "component"),
    ];
    const graph1 = makeGraph(nodes, [mockEdge("e1", "n1", "n2", "verified", ["ev_1"])]);
    const graph2 = makeGraph(nodes, [mockEdge("e2", "n1", "n2", "inferred")]);

    const res1 = validateSupplyChainGraph(graph1, "2026-06-01");
    expect(res1.isValid).toBe(true);
    expect(res1.bottleneckStatus).toBe("verified");

    const res2 = validateSupplyChainGraph(graph2, "2026-06-01");
    expect(res2.isValid).toBe(true);
    expect(res2.bottleneckStatus).toBe("inferred");
  });
});
