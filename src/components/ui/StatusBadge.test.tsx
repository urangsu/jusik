import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";
import { DataStatus } from "@/domain/common/data-status";

describe("StatusBadge Component", () => {
  it("should render localized label for each DataStatus type", () => {
    const testCases: { status: DataStatus; expectedLabel: string }[] = [
      { status: "real_time", expectedLabel: "실시간" },
      { status: "delayed", expectedLabel: "지연" },
      { status: "eod", expectedLabel: "종가" },
      { status: "cached", expectedLabel: "캐시" },
      { status: "api_required", expectedLabel: "API 필요" },
      { status: "rate_limited", expectedLabel: "호출 제한" },
      { status: "not_supported", expectedLabel: "미지원" },
      { status: "not_found", expectedLabel: "없음" },
      { status: "error", expectedLabel: "오류" },
    ];

    for (const testCase of testCases) {
      const { unmount } = render(<StatusBadge status={testCase.status} />);
      expect(screen.getByText(testCase.expectedLabel)).toBeInTheDocument();
      unmount();
    }
  });
});
