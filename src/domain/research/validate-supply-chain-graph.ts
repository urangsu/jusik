import type { SupplyChainGraph, SupplyChainEdge, SupplyChainNode } from "./supply-chain-graph";

export type GraphValidationResult = {
  isValid: boolean;
  errors: string[];
  value: SupplyChainGraph | null;
  /** Edges that are not expired as of the graph's asOfDate */
  activeEdges: SupplyChainEdge[];
  /** Bottleneck status based on evidence levels in the active graph */
  bottleneckStatus: "verified" | "inferred" | "insufficient_data";
};

export function validateSupplyChainGraph(
  graph: SupplyChainGraph,
  asOfDate: string,
): GraphValidationResult {
  const errors: string[] = [];
  const nodeIds = new Set(graph.nodes.map((n) => n.nodeId));

  // 1. Check listed asset node types have valid assetId
  for (const node of graph.nodes) {
    if (node.nodeType === "listed_asset") {
      if (!node.assetId || node.assetId.trim() === "") {
        errors.push(`Listed asset node "${node.nodeId}" ("${node.label}") must have a canonical assetId.`);
      }
    }
  }

  // 2. Check dangling edges
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.fromNodeId)) {
      errors.push(`Dangling edge "${edge.edgeId}": fromNodeId "${edge.fromNodeId}" does not exist in nodes.`);
    }
    if (!nodeIds.has(edge.toNodeId)) {
      errors.push(`Dangling edge "${edge.edgeId}": toNodeId "${edge.toNodeId}" does not exist in nodes.`);
    }

    // 3. Check verified edge has evidence
    if (edge.evidenceState === "verified" && edge.evidenceIds.length === 0) {
      errors.push(`Verified edge "${edge.edgeId}" must have at least one evidenceId.`);
    }
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
      value: null,
      activeEdges: [],
      bottleneckStatus: "insufficient_data",
    };
  }

  // 4. Filter expired edges
  const activeEdges = graph.edges.filter((edge) => {
    if (edge.expiryAt && edge.expiryAt < asOfDate) {
      return false; // Excluded from current-path analysis
    }
    return true;
  });

  // 5. Determine bottleneck conclusion status based on remaining active, non-contradicted edges
  // - Contradicted edges cannot contribute to a bottleneck conclusion
  const viableEdges = activeEdges.filter((edge) => edge.evidenceState !== "contradicted");

  let bottleneckStatus: "verified" | "inferred" | "insufficient_data" = "insufficient_data";

  if (viableEdges.length > 0) {
    const hasVerified = viableEdges.some((edge) => edge.evidenceState === "verified");
    const hasInferred = viableEdges.some((edge) => edge.evidenceState === "inferred");
    const hasHypothesisOnly = viableEdges.every((edge) => edge.evidenceState === "hypothesis");

    if (hasHypothesisOnly) {
      bottleneckStatus = "insufficient_data";
    } else if (hasVerified) {
      bottleneckStatus = "verified";
    } else if (hasInferred) {
      bottleneckStatus = "inferred";
    }
  }

  return {
    isValid: true,
    errors: [],
    value: graph,
    activeEdges,
    bottleneckStatus,
  };
}
