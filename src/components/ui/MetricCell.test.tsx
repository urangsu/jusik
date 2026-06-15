import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricCell } from "./MetricCell";

describe("MetricCell Component", () => {
  it("should not render 0 if the value is null", () => {
    render(<MetricCell value={null} status="api_required" />);
    // Verify '0' is not rendered
    const zeroElement = screen.queryByText("0");
    expect(zeroElement).toBeNull();
    // Verify 'API 필요' status badge is rendered
    expect(screen.getByText("API 필요")).toBeInTheDocument();
  });

  it("should render value along with a delayed badge when status is delayed", () => {
    render(
      <MetricCell
        value={54300}
        status="delayed"
        formatter={(val) => val.toLocaleString()}
      />
    );
    expect(screen.getByText("54,300")).toBeInTheDocument();
    expect(screen.getByText("지연")).toBeInTheDocument();
  });

  it("should prioritize status badge for api_required even if value is provided", () => {
    render(<MetricCell value={100} status="api_required" />);
    expect(screen.queryByText("100")).toBeNull();
    expect(screen.getByText("API 필요")).toBeInTheDocument();
  });

  it("should prioritize status badge for error states", () => {
    render(<MetricCell value={500} status="error" />);
    expect(screen.queryByText("500")).toBeNull();
    expect(screen.getByText("오류")).toBeInTheDocument();
  });
});
