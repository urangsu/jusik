/**
 * Task 1: Verify AuditFindingsPanel calls canonical API routes.
 * These tests confirm the component uses the correct (non-suffixed) paths.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

// Mock next/link before any dynamic import
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href }, children),
}));

// Mock i18n
vi.mock("@/i18n/use-i18n", () => ({
  useI18n: () => (key: string) => key,
}));

describe("AuditFindingsPanel — canonical route check", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Inspect the component source to verify it references the canonical routes.
   * This is a static-analysis style test: it reads the compiled module text
   * and asserts forbidden suffixes are absent.
   */
  it("must NOT contain the non-canonical suffix '/from-evidence-pack' in fetch calls", async () => {
    // Read the actual source file text
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "src/components/reliability/AuditFindingsPanel.tsx",
    );
    const source = fs.readFileSync(filePath, "utf-8");

    // The component must NOT call the non-existent suffixed routes
    expect(source).not.toContain(
      "/api/reports/finding-synthesis/from-evidence-pack",
    );
  });

  it("must NOT contain the non-canonical suffix '/from-report' in fetch calls", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "src/components/reliability/AuditFindingsPanel.tsx",
    );
    const source = fs.readFileSync(filePath, "utf-8");

    expect(source).not.toContain("/api/debate/diagnostic/from-report");
  });

  it("must contain the canonical route '/api/reports/finding-synthesis'", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "src/components/reliability/AuditFindingsPanel.tsx",
    );
    const source = fs.readFileSync(filePath, "utf-8");

    // The canonical route (without suffix) must be present
    expect(source).toContain("/api/reports/finding-synthesis");
  });

  it("must contain the canonical route '/api/debate/diagnostic'", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "src/components/reliability/AuditFindingsPanel.tsx",
    );
    const source = fs.readFileSync(filePath, "utf-8");

    expect(source).toContain("/api/debate/diagnostic");
  });
});
