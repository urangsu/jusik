import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { I18nProvider } from "../../i18n/use-i18n";
import { RecentFilingsList } from "./RecentFilingsList";

describe("RecentFilingsList Component", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders loading state initially and then displays filings", async () => {
    const mockResponse = {
      status: "cached",
      value: [
        {
          id: "OpenDART_1",
          provider: "OpenDART",
          corpClass: "Y",
          corpName: "삼성전자",
          corpCode: "00126380",
          stockCode: "005930",
          reportName: "분기보고서",
          receiptNo: "1",
          filerName: "삼성전자",
          receiptDate: "20260515",
          dataAvailableAt: "2026-05-15T09:00:00+09:00",
          filingUrl: "https://dart.fss.or.kr",
          createdAt: "2026-06-17",
          dataStatus: "cached",
          source: "OpenDART",
          sourceTier: "official",
          warnings: [],
        },
      ],
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as any);

    await act(async () => {
      render(
        <I18nProvider initialLocale="ko">
          <RecentFilingsList stockCode="005930" />
        </I18nProvider>
      );
    });

    expect(screen.getAllByText("삼성전자")[0]).toBeInTheDocument();
    expect(screen.getByText("분기보고서")).toBeInTheDocument();
  });

  it("renders api_required state correctly", async () => {
    const mockResponse = {
      status: "api_required",
      value: null,
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as any);

    await act(async () => {
      render(
        <I18nProvider initialLocale="ko">
          <RecentFilingsList stockCode="005930" />
        </I18nProvider>
      );
    });

    expect(screen.getByText("OpenDART API 설정 필요")).toBeInTheDocument();
  });

  it("renders rate_limited state correctly", async () => {
    const mockResponse = {
      status: "rate_limited",
      value: null,
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as any);

    await act(async () => {
      render(
        <I18nProvider initialLocale="ko">
          <RecentFilingsList stockCode="005930" />
        </I18nProvider>
      );
    });

    expect(screen.getByText("OpenDART 요청 제한")).toBeInTheDocument();
  });

  it("renders empty state correctly when filings list is empty", async () => {
    const mockResponse = {
      status: "not_found",
      value: [],
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as any);

    await act(async () => {
      render(
        <I18nProvider initialLocale="ko">
          <RecentFilingsList stockCode="005930" />
        </I18nProvider>
      );
    });

    expect(screen.getByText("최근 공시 없음")).toBeInTheDocument();
  });
});
