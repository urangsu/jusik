import { NextRequest } from "next/server";
import { strategyTrialStore } from "@/server/strategy/strategy-trial-store";
import { checkSettingsWriteEnabled } from "@/server/security/settings-write-guard";
import { assignBiasWarnings } from "@/server/strategy/strategy-bias-checker";
import { StrategyTrialRecord } from "@/domain/strategy/strategy-trial-record";

function generateId(): string {
  return `trial_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateParameterHash(
  parameters: Record<string, unknown>
): string {
  // Stable hash: sort keys, then simple checksum
  const sorted = JSON.stringify(
    Object.fromEntries(
      Object.entries(parameters).sort(([a], [b]) => a.localeCompare(b))
    )
  );
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    hash = (hash << 5) - hash + sorted.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

export async function GET() {
  try {
    const trials = await strategyTrialStore.getAll();
    return Response.json({
      status: "cached",
      value: { trials },
      count: trials.length,
    });
  } catch (err) {
    console.error("[strategy/trials GET]", err);
    return Response.json(
      { status: "error", message: "Failed to load strategy trials" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const guard = checkSettingsWriteEnabled({ routeName: "POST /api/strategy/trials" });
  if (guard) return guard;

  try {
    const body = await req.json();
    const {
      strategyId,
      variantId,
      strategyFamily,
      thesisKo,
      thesisEn,
      hypothesis,
      parameters,
      universeId,
      dataWindow,
      backtestRunId,
      observedMetrics,
      validationStatus,
      rejectionReason,
    } = body;

    if (!strategyId || !variantId || !thesisKo || !hypothesis || !universeId) {
      return Response.json(
        {
          status: "error",
          message: "필수 필드 누락: strategyId, variantId, thesisKo, hypothesis, universeId",
        },
        { status: 400 }
      );
    }

    const parameterHash = generateParameterHash(parameters ?? {});

    // Check for duplicate hash
    const existing = await strategyTrialStore.findDuplicateByHash(
      parameterHash,
      strategyId
    );
    if (existing) {
      return Response.json(
        {
          status: "conflict",
          message: `동일 파라미터 해시가 이미 존재합니다 (trial_id: ${existing.id}). 데이터 스누핑 방지: 동일 파라미터 중복 실험 경고.`,
          existingTrialId: existing.id,
        },
        { status: 409 }
      );
    }

    // Get existing trials for this strategy to check bias
    const existingTrials = await strategyTrialStore.getByStrategyId(strategyId);

    const now = new Date().toISOString();
    const trial: StrategyTrialRecord = {
      id: generateId(),
      strategyId,
      variantId,
      strategyFamily: strategyFamily ?? "other",
      thesisKo,
      thesisEn,
      hypothesis,
      parameters: parameters ?? {},
      parameterHash,
      universeId,
      dataWindow: dataWindow ?? {
        startDate: "",
        endDate: "",
      },
      backtestRunId: backtestRunId ?? null,
      observedMetrics: observedMetrics ?? {
        oosReturn: null,
        sharpe: null,
        maxDrawdown: null,
        spearmanIc: null,
        icir: null,
        hitRate: null,
        turnover: null,
      },
      validationStatus: validationStatus ?? "draft",
      rejectionReason: rejectionReason ?? null,
      biasWarnings: assignBiasWarnings(
        {
          id: "",
          strategyId,
          variantId,
          strategyFamily: strategyFamily ?? "other",
          thesisKo,
          hypothesis,
          parameters: parameters ?? {},
          parameterHash,
          universeId,
          dataWindow: dataWindow ?? { startDate: "", endDate: "" },
          backtestRunId: backtestRunId ?? null,
          observedMetrics: observedMetrics ?? {
            oosReturn: null,
            sharpe: null,
            maxDrawdown: null,
            spearmanIc: null,
            icir: null,
            hitRate: null,
            turnover: null,
          },
          validationStatus: validationStatus ?? "draft",
          rejectionReason: rejectionReason ?? null,
          createdAt: now,
          updatedAt: now,
        },
        existingTrials
      ),
      createdAt: now,
      updatedAt: now,
    };

    const saved = await strategyTrialStore.create(trial);
    return Response.json({ status: "cached", value: saved }, { status: 201 });
  } catch (err) {
    console.error("[strategy/trials POST]", err);
    return Response.json(
      { status: "error", message: "Failed to create strategy trial" },
      { status: 500 }
    );
  }
}
