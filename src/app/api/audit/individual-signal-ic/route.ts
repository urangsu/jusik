import { NextRequest } from "next/server";
import { auditIndividualSignalIc } from "@/server/audit/individual-signal-ic-auditor";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const universeId = (searchParams.get("universeId") ?? "KOSPI_SAMPLE") as
    | "KOSPI_SAMPLE"
    | "SP500_SAMPLE";

  if (universeId !== "KOSPI_SAMPLE" && universeId !== "SP500_SAMPLE") {
    return Response.json(
      { status: "error", message: "유효하지 않은 universeId입니다." },
      { status: 400 }
    );
  }

  try {
    const results = await auditIndividualSignalIc({ universeId });

    return Response.json({
      status: "cached",
      value: {
        universeId,
        results,
        disclaimer:
          "이 결과는 기능 검증 목적이며, 투자 판단에 사용할 수 없습니다. 표본은 샘플 유니버스 전용입니다.",
      },
    });
  } catch (err) {
    console.error("[audit/individual-signal-ic GET]", err);
    return Response.json(
      { status: "error", message: "개별 신호 IC 감사 실패" },
      { status: 500 }
    );
  }
}
